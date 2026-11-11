import json
import sqlite3
from datetime import UTC, datetime, timedelta

import httpx
import pytest
from app import agents, main
from app.config import settings
from app.domain import Offer
from app.main import app
from app.paypal import PayPal, ProviderError
from fastapi.testclient import TestClient

HTML = '<main><section id="hero">Welcome to the design studio and our services.</section><section id="features">Thoughtful accessible design.</section><section id="contact">Contact our team today.</section></main>'


@pytest.fixture
def client(tmp_path, monkeypatch):
    monkeypatch.setattr(settings, "database_path", str(tmp_path / "test.db"))
    monkeypatch.setattr(settings, "llm_max_calls", 12)
    monkeypatch.setattr(settings, "llm_budget_usd", 10)
    return TestClient(app, headers={"X-Pact-Action": "1"})


def new(c, **overrides):
    body = {
        "buyer_email": "buyer@example.com",
        "seller_email": "seller@example.com",
        "deadline": (datetime.now(UTC) + timedelta(days=7)).isoformat(),
        **overrides,
    }
    r = c.post("/api/agreements", json=body)
    assert r.status_code == 201, r.text
    return r.json()


def post(c, a, path, body=None):
    if body and "confirmed" in body:
        body = {"terms_digest": a.get("terms_digest"), **body}
    return c.post(
        f"/api/agreements/{a['id']}/{path}", json={} if body is None else body
    )


def proposed(c, **kw):
    a = new(c, **kw)
    r = post(c, a, "negotiate")
    assert r.status_code == 200
    return r.json()


def accepted(c):
    a = proposed(c)
    return post(c, a, "accept", {"version": 1, "confirmed": True}).json()


class FakePayPal:
    def __init__(self):
        self.created = 0
        self.sent = 0
        self.state = "DRAFT"
        self.a = None

    def create(self, a):
        self.state = "DRAFT"
        self.a = a
        self.created += 1
        return {"id": "INV2-TEST"}

    def get(self, id):
        return {
            "id": id,
            "status": self.state,
            "amount": {"currency_code": "USD", "value": "300.00"},
            "invoicer": {"email_address": "seller@example.com"},
            "primary_recipients": [
                {"billing_info": {"email_address": "buyer@example.com"}}
            ],
            "detail": {
                "metadata": {
                    "recipient_view_url": "https://www.sandbox.paypal.com/invoice/p/#TEST"
                }
            },
        }

    def send(self, id, key):
        self.sent += 1
        self.state = "SENT"

    validate = PayPal.validate
    public = PayPal.public


@pytest.fixture
def pp(monkeypatch):
    fake = FakePayPal()
    monkeypatch.setattr(main, "paypal", fake)
    return fake


def invoiced(c, pp):
    a = accepted(c)
    r = post(c, a, "invoice", {"version": 1, "confirmed": True})
    assert r.status_code == 200, r.text
    return r.json()


def test_health_and_persistence(client):
    assert client.get("/api/health").json()["status"] == "ok"
    a = new(client)
    assert client.get("/api/agreements").json()[0]["id"] == a["id"]
    assert client.get("/api/agreements/" + a["id"]).json()["status"] == "DRAFT"


def test_bounded_negotiation(client):
    a = proposed(client)
    assert a["status"] == "PROPOSED"
    assert a["amount_minor"] <= a["budget_minor"]
    assert [o["role"] for o in a["offers"]] == ["seller", "buyer", "seller"]
    assert a["offers"][-1]["action"] == "accept"


@pytest.mark.parametrize(
    "scenario,reason", [("overspend", "spending"), ("recipient-swap", "Recipient")]
)
def test_malicious_offer_blocked(client, scenario, reason):
    a = new(client)
    a = post(client, a, "negotiate", {"scenario": scenario}).json()
    assert a["status"] == "NEGOTIATION_FAILED"
    assert reason in a["negotiation_error"]
    assert a["amount_minor"] is None
    assert (
        client.get(f"/api/agreements/{a['id']}/audit").json()[-1]["action"]
        == "negotiation_blocked"
    )


def test_impossible_seller_floor(client):
    a = proposed(client, budget_minor=10000, seller_floor_minor=24000)
    assert a["status"] == "NEGOTIATION_FAILED"


def test_acceptance_version_and_idempotency(client):
    a = proposed(client)
    assert (
        post(client, a, "accept", {"version": 2, "confirmed": True}).status_code == 409
    )
    assert (
        post(client, a, "accept", {"version": 1, "confirmed": False}).status_code == 422
    )
    for _ in range(2):
        assert (
            post(client, a, "accept", {"version": 1, "confirmed": True}).status_code
            == 200
        )
    events = client.get(f"/api/agreements/{a['id']}/audit").json()
    assert sum(e["action"] == "buyer_accepted_terms" for e in events) == 1
    assert post(client, a, "negotiate").status_code == 409


def test_unauthorized_invoice_and_body_mutation(client, pp):
    a = new(client)
    assert (
        post(client, a, "invoice", {"version": 1, "confirmed": True}).status_code == 409
    )
    a = accepted(client)
    assert (
        post(
            client, a, "invoice", {"version": 1, "confirmed": True, "amount_minor": 1}
        ).status_code
        == 422
    )
    assert pp.created == 0


def test_invoice_idempotency(client, pp):
    a = invoiced(client, pp)
    for _ in range(2):
        assert (
            post(client, a, "invoice", {"version": 1, "confirmed": True}).status_code
            == 200
        )
    assert pp.created == 1
    assert a["invoice"]["status"] == "DRAFT"
    assert a["status"] == "INVOICED"


def test_happy_path_and_provider_truth(client, pp):
    a = invoiced(client, pp)
    assert (
        post(
            client, a, "payment-approval", {"version": 1, "confirmed": True}
        ).status_code
        == 409
    )
    a = post(client, a, "evidence", {"html": HTML}).json()
    assert a["status"] == "VERIFIED"
    assert all(c["passed"] for c in a["verification"]["checks"])
    a = post(client, a, "payment-approval", {"version": 1, "confirmed": True}).json()
    assert a["status"] == "PAYMENT_PENDING"
    assert pp.sent == 1
    assert (
        post(
            client, a, "payment-approval", {"version": 1, "confirmed": True}
        ).status_code
        == 200
    )
    assert pp.sent == 1
    a = post(client, a, "paypal-status").json()
    assert a["status"] == "PAYMENT_PENDING"
    pp.state = "PAID"
    a = post(client, a, "paypal-status").json()
    assert a["status"] == "PAID"
    assert post(client, a, "evidence", {"html": HTML}).status_code == 409


def test_failed_evidence_and_human_review(client, pp):
    a = invoiced(client, pp)
    a = post(client, a, "evidence", {"html": "<script>alert(1)</script>"}).json()
    assert a["status"] == "NEEDS_REVIEW"
    assert (
        post(
            client, a, "payment-approval", {"version": 1, "confirmed": True}
        ).status_code
        == 409
    )
    a = post(
        client,
        a,
        "review",
        {"accepted": True, "reason": "Buyer inspected the artifact independently."},
    ).json()
    assert a["status"] == "VERIFIED"
    assert a["verification"]["overall"] == "FAIL"


def test_cross_session_and_csrf(client):
    a = new(client)
    other = TestClient(app, headers={"X-Pact-Action": "1"})
    assert other.get("/api/agreements/" + a["id"]).status_code == 404
    assert other.post(f"/api/agreements/{a['id']}/cancel", json={}).status_code == 404
    assert (
        client.post(
            f"/api/agreements/{a['id']}/cancel",
            headers={"Origin": "https://evil.example"},
            json={},
        ).status_code
        == 403
    )
    assert TestClient(app).post("/api/agreements", json={}).status_code == 403


def test_immutable_audit(client):
    new(client)
    db = sqlite3.connect(settings.database_path)
    with pytest.raises(sqlite3.IntegrityError):
        db.execute("DELETE FROM audit")
    db.close()


def test_provider_error_is_audited(client, pp, monkeypatch):
    a = accepted(client)

    def fail(_):
        raise ProviderError("PayPal sandbox authentication failed (401).")

    monkeypatch.setattr(pp, "create", fail)
    assert (
        post(client, a, "invoice", {"version": 1, "confirmed": True}).status_code == 502
    )
    assert client.get("/api/agreements/" + a["id"]).json()["status"] == "ACCEPTED"
    assert (
        client.get(f"/api/agreements/{a['id']}/audit").json()[-1]["action"]
        == "invoice_failed"
    )


@pytest.mark.parametrize(
    "field,value", [("recipient", "intruder@example.com"), ("criteria", ["hero"])]
)
def test_untrusted_live_offer(client, monkeypatch, field, value):
    def offer(role, a, history):
        return Offer(
            action="counter",
            amount_minor=30000,
            currency="USD",
            recipient=a["seller_email"],
            criteria=a["criteria"],
            explanation="Offer",
        ).model_copy(update={field: value})

    monkeypatch.setattr(agents.provider, "offer", offer)
    a = proposed(client, mode="live")
    assert a["status"] == "NEGOTIATION_FAILED"


def test_live_abstain_and_budget(client, monkeypatch):
    monkeypatch.setattr(
        agents.provider,
        "offer",
        lambda role, a, h: Offer(
            action="abstain",
            amount_minor=30000,
            currency="USD",
            recipient=a["seller_email"],
            criteria=a["criteria"],
            explanation="Cannot agree.",
        ),
    )
    a = proposed(client, mode="live")
    assert "abstained" in a["negotiation_error"]
    a = new(client, mode="live")
    assert post(client, a, "negotiate").status_code == 200
    a = new(client, mode="live")
    assert post(client, a, "negotiate").status_code == 429


def test_malformed_llm_stops(client, monkeypatch):
    def bad(*args):
        raise agents.NegotiationError("AI returned invalid offer.")

    monkeypatch.setattr(agents.provider, "offer", bad)
    a = proposed(client, mode="live")
    assert a["status"] == "NEGOTIATION_FAILED"


def test_provider_http_contract(monkeypatch):
    monkeypatch.setattr(settings, "paypal_client_id", "test-id")
    monkeypatch.setattr(settings, "paypal_client_secret", "test-secret")
    seen = []

    def handle(r):
        seen.append(r)
        if r.url.path == "/v1/oauth2/token":
            return httpx.Response(200, json={"access_token": "test-access"})
        return httpx.Response(201, json={"id": "INV2-MOCK"})

    p = PayPal(httpx.MockTransport(handle))
    a = {
        "id": "agreement-1",
        "seller_email": "seller@example.com",
        "buyer_email": "buyer@example.com",
        "amount_minor": 29999,
        "objective": "A landing page",
    }
    assert p.create(a)["id"] == "INV2-MOCK"
    assert json.loads(seen[-1].content)["items"][0]["unit_amount"]["value"] == "299.99"
    assert seen[-1].headers["PayPal-Request-Id"] == "agreement-1"
    assert seen[-1].url.host == "api-m.sandbox.paypal.com"


def test_oauth_failure_and_live_rejection(monkeypatch):
    monkeypatch.setattr(settings, "paypal_client_id", "test")
    monkeypatch.setattr(settings, "paypal_client_secret", "test")
    p = PayPal(
        httpx.MockTransport(
            lambda r: httpx.Response(401, json={"error": "invalid_client"})
        )
    )
    with pytest.raises(ProviderError, match="401"):
        p.token()
    monkeypatch.setattr(settings, "paypal_env", "live")
    with pytest.raises(ProviderError, match="Only"):
        p.token()


def test_provider_term_mismatch_and_redirect():
    p = PayPal()
    a = {
        "amount_minor": 1,
        "seller_email": "seller@example.com",
        "buyer_email": "buyer@example.com",
    }
    with pytest.raises(ProviderError):
        p.validate({"amount": {"currency_code": "USD", "value": "2.00"}}, a)
    assert (
        p.public(
            {
                "id": "INV2-TEST",
                "detail": {
                    "metadata": {"recipient_view_url": "https://evil.example/pay"}
                },
            }
        )["approval_url"]
        is None
    )


def test_estimated_ai_budget_blocks_before_request(client, monkeypatch):
    monkeypatch.setattr(settings, "llm_budget_usd", 0.01)

    def forbidden(*args):
        raise AssertionError("Must not call provider")

    monkeypatch.setattr(agents.provider, "offer", forbidden)
    a = new(client, mode="live")
    assert post(client, a, "negotiate").status_code == 429


def test_invoice_read_retry_preserves_created_id(client, pp, monkeypatch):
    a = accepted(client)
    original = pp.get

    def interrupted(id):
        raise ProviderError("Readback unavailable")

    monkeypatch.setattr(pp, "get", interrupted)
    assert (
        post(client, a, "invoice", {"version": 1, "confirmed": True}).status_code == 502
    )
    monkeypatch.setattr(pp, "get", original)
    assert (
        post(client, a, "invoice", {"version": 1, "confirmed": True}).status_code == 200
    )
    assert pp.created == 1


def test_lost_provider_create_response_reconciles(monkeypatch):
    monkeypatch.setattr(settings, "paypal_client_id", "test")
    monkeypatch.setattr(settings, "paypal_client_secret", "test")
    a = {
        "id": "lost-response-1",
        "seller_email": "seller@example.com",
        "buyer_email": "buyer@example.com",
        "amount_minor": 30000,
        "objective": "Landing page",
    }

    def handle(r):
        if r.url.path == "/v1/oauth2/token":
            return httpx.Response(200, json={"access_token": "test"})
        if r.url.path == "/v2/invoicing/invoices":
            raise httpx.ReadTimeout("lost response")
        if r.url.path == "/v2/invoicing/search-invoices":
            return httpx.Response(
                200,
                json={
                    "items": [
                        {
                            "id": "INV2-RECOVERED",
                            "detail": {"invoice_number": "PACT-lost-response-1"},
                        }
                    ]
                },
            )
        raise AssertionError("Unexpected path")

    assert PayPal(httpx.MockTransport(handle)).create(a)["id"] == "INV2-RECOVERED"


def test_provider_marked_as_paid_is_not_actual_payment(client, pp):
    a = invoiced(client, pp)
    pp.state = "MARKED_AS_PAID"
    a = post(client, a, "paypal-status").json()
    assert a["status"] == "PAYMENT_REVIEW"


@pytest.mark.parametrize(
    "content",
    [
        "not json",
        '{"action":"pay","amount_minor":30000,"currency":"USD","recipient":"seller@example.com","criteria":["hero"],"explanation":"Pay now"}',
    ],
)
def test_model_provider_rejects_bad_structured_output(client, monkeypatch, content):
    monkeypatch.setattr(settings, "llm_api_key", "test-key")
    monkeypatch.setattr(settings, "llm_model", "test-model")
    transport = httpx.MockTransport(
        lambda r: httpx.Response(
            200, json={"choices": [{"message": {"content": content}}]}
        )
    )
    real_client = httpx.Client
    monkeypatch.setattr(
        agents.httpx, "Client", lambda **kw: real_client(transport=transport, **kw)
    )
    a = new(client, mode="live")
    with pytest.raises(agents.NegotiationError, match="invalid or incomplete"):
        agents.ModelProvider().offer("seller", a, [])


def test_negotiation_turn_limit(client, monkeypatch):
    def counter(role, a, h):
        return Offer(
            action="counter",
            amount_minor=30000,
            currency="USD",
            recipient=a["seller_email"],
            criteria=a["criteria"],
            explanation="Keep negotiating.",
        )

    monkeypatch.setattr(agents.provider, "offer", counter)
    a = proposed(client, mode="live")
    assert len(a["offers"]) == 6
    assert a["status"] == "NEGOTIATION_FAILED"
    assert "Turn limit" in a["negotiation_error"]


def test_forbidden_transition_is_audited(client, pp):
    a = new(client)
    assert (
        post(client, a, "invoice", {"version": 1, "confirmed": True}).status_code == 409
    )
    assert (
        client.get(f"/api/agreements/{a['id']}/audit").json()[-1]["action"]
        == "action_rejected"
    )
