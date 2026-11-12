"""Financial writes stay unavailable to anonymous/public demo personas."""

import base64

import pytest
from app.config import settings
from test_workflow import new, post

PASSWORD = "sanitized-test-operator-password-32"


def authorization(password=PASSWORD):
    return "Basic " + base64.b64encode(("pact:" + password).encode()).decode()


@pytest.mark.parametrize(
    "enabled,authenticated", [(False, False), (False, True), (True, False)]
)
def test_public_financial_capability_stays_closed_without_both_switch_and_operator(
    client, monkeypatch, enabled, authenticated
):
    monkeypatch.setattr(settings, "public_demo", True)
    monkeypatch.setattr(settings, "enable_live_operations", enabled)
    monkeypatch.setattr(settings, "app_access_password", PASSWORD)

    def forbidden(*a, **kw):
        pytest.fail("No actual provider call is authorized by this test")

    monkeypatch.setattr("app.main.paypal.create", forbidden)
    if authenticated:
        client.headers["Authorization"] = authorization()
    a = new(client)
    response = post(client, a, "invoice", {"confirmed": True, "version": 1})
    assert response.status_code == 403


def test_even_authenticated_operator_cannot_convert_public_demo_to_real_invoice(
    client, monkeypatch
):
    monkeypatch.setattr(settings, "public_demo", True)
    monkeypatch.setattr(settings, "enable_live_operations", True)
    monkeypatch.setattr(settings, "app_access_password", PASSWORD)
    client.headers["Authorization"] = authorization()

    def forbidden(*a, **kw):
        pytest.fail("Public demo contract must remain nonpayable")

    monkeypatch.setattr("app.main.paypal.create", forbidden)
    a = new(client, demo=False)
    assert a["demo"] is True
    assert (
        post(client, a, "invoice", {"confirmed": True, "version": 1}).status_code == 409
    )


def test_private_operator_gate_rejects_missing_or_incorrect_credentials(
    client, monkeypatch
):
    monkeypatch.setattr(settings, "public_demo", False)
    monkeypatch.setattr(settings, "app_access_password", PASSWORD)
    assert client.get("/api/agreements").status_code == 401
    client.headers["Authorization"] = authorization("wrong")
    assert client.get("/api/agreements").status_code == 401
    client.headers["Authorization"] = authorization()
    assert client.get("/api/agreements").status_code == 200
