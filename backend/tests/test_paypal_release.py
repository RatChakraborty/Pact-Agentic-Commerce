"""Release regressions use provider fixtures only; never create or pay real invoices."""

import pytest
from app.paypal import PayPal, ProviderError
from test_workflow import HTML, invoiced, post


@pytest.mark.parametrize(
    "provider_status,application_status",
    [
        ("DRAFT", "INVOICED"),
        ("SENT", "INVOICED"),
        ("UNPAID", "INVOICED"),
        ("PAID", "PAID"),
        ("UNKNOWN", "INVOICED"),
        ("CANCELLED", "PAYMENT_REVIEW"),
    ],
)
def test_repeat_refresh_preserves_actual_provider_state(
    client, pp, provider_status, application_status
):
    a = invoiced(client, pp)
    pp.state = provider_status
    for _ in range(2):
        result = post(client, a, "paypal-status")
        assert result.status_code == 200
        assert result.json()["status"] == application_status
        assert result.json()["invoice"]["status"] == provider_status
    assert pp.created == 1 and pp.sent == 0


def test_refresh_provider_outage_does_not_fabricate_payment(client, pp, monkeypatch):
    a = invoiced(client, pp)

    def unavailable(*args):
        raise ProviderError("Fixture outage")

    monkeypatch.setattr(pp, "get", unavailable)
    assert post(client, a, "paypal-status").status_code == 502
    restored = client.get("/api/agreements/" + a["id"]).json()
    assert restored["status"] == "INVOICED" and restored["invoice"]["status"] == "DRAFT"


def test_duplicate_authorization_uses_one_provider_send_and_no_local_paid_state(
    client, pp
):
    a = invoiced(client, pp)
    a = post(client, a, "evidence", {"html": HTML}).json()
    for _ in range(2):
        response = post(
            client, a, "payment-approval", {"version": 1, "confirmed": True}
        )
        assert response.status_code == 200
        assert response.json()["status"] == "PAYMENT_PENDING"
    assert pp.created == 1 and pp.sent == 1


@pytest.mark.parametrize(
    "url",
    [
        "https://user:password@sandbox.paypal.com/invoice",
        "https://sandbox.paypal.com:444/invoice",
        "https://[invalid",
        "http://sandbox.paypal.com/invoice",
        "https://sandbox.paypal.com.attacker.example/invoice",
        {"untrusted": "shape"},
    ],
)
def test_provider_checkout_link_rejects_unsafe_or_malformed_values(url):
    assert (
        PayPal().public(
            {"id": "INV2-FIXTURE", "detail": {"metadata": {"recipient_view_url": url}}}
        )["approval_url"]
        is None
    )
