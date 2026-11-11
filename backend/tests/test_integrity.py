import copy
import json
import subprocess
import sys

import pytest
from app import main
from app.ai import ModelError
from app.config import settings
from app.critique import rules
from app.integrity import IntegrityError, digest, verify_accepted
from test_workflow import accepted, invoiced, post, proposed


@pytest.mark.parametrize(
    "field,value",
    [
        ("amount_minor", 1),
        ("currency", "EUR"),
        ("seller_email", "other@example.com"),
        ("buyer_email", "otherbuyer@example.com"),
        ("criteria", ["hero"]),
        ("objective", "A completely different deliverable"),
        ("deadline", "2099-01-01T00:00:00Z"),
        ("version", 2),
        ("budget_minor", 99999),
    ],
)
def test_every_material_field_is_locked(client, pp, field, value):
    a = accepted(client)
    with main.transaction() as db:
        row = db.execute(
            "SELECT data FROM agreements WHERE id=?", (a["id"],)
        ).fetchone()
        stored = json.loads(row["data"])
        stored[field] = value
        db.execute(
            "UPDATE agreements SET data=? WHERE id=?", (json.dumps(stored), a["id"])
        )
    assert (
        post(client, a, "invoice", {"version": 1, "confirmed": True}).status_code == 409
    )
    assert pp.created == 0


def test_canonical_order_timezone_and_email_stability(client):
    a = proposed(client)
    b = copy.deepcopy(a)
    b["criteria"] = list(reversed(a["criteria"]))
    b["buyer_email"] = a["buyer_email"].upper()
    b["deadline"] = a["deadline"].replace("Z", "+00:00")
    assert digest(a) == digest(b)


def test_bad_fingerprint_is_rejected(client):
    a = proposed(client)
    assert (
        post(
            client,
            a,
            "accept",
            {"version": 1, "confirmed": True, "terms_digest": "stale"},
        ).status_code
        == 409
    )
    assert (
        post(
            client,
            a,
            "accept",
            {"version": 1, "confirmed": True, "terms_digest": digest(a)},
        ).status_code
        == 200
    )


def test_digest_does_not_change_with_provider_status(client, pp):
    a = invoiced(client, pp)
    before = a["accepted_digest"]
    a["invoice"]["status"] = "PAID"
    assert digest(a) == before
    verify_accepted(a)


def test_legacy_snapshot_checks_without_rewriting_history(client):
    a = accepted(client)
    a.pop("accepted_digest")
    a["accepted_terms"] = {
        k: a[k]
        for k in [
            "version",
            "amount_minor",
            "currency",
            "seller_email",
            "buyer_email",
            "criteria",
            "objective",
            "deadline",
        ]
    }
    verify_accepted(a)
    a["amount_minor"] += 1
    with pytest.raises(IntegrityError):
        verify_accepted(a)


def test_optimized_python_cannot_disable_invoice_validation():
    result = subprocess.run(
        [
            sys.executable,
            "-O",
            "-c",
            "from app.paypal import PayPal,ProviderError; a={'amount_minor':30000,'currency':'USD','seller_email':'s@example.com','buyer_email':'b@example.com'}; p={'amount':{'value':'1.00','currency_code':'USD'},'invoicer':{'email_address':'s@example.com'},'primary_recipients':[{'billing_info':{'email_address':'b@example.com'}}]};\ntry: PayPal().validate(p,a)\nexcept ProviderError: print('blocked')",
        ],
        capture_output=True,
        text=True,
        check=True,
    )
    assert result.stdout.strip() == "blocked"


@pytest.mark.parametrize(
    "clause,verdict",
    [
        ("Payment is due automatically regardless of verification.", "CONTRADICTION"),
        ("No contact section will be included.", "CONTRADICTION"),
        ("Delivery will be finished when ready.", "AMBIGUOUS"),
        (
            "All hero, features and contact sections remain included at the accepted deadline.",
            "CLEAR",
        ),
    ],
)
def test_rule_critique_is_transparently_labeled(clause, verdict):
    assert rules({}, clause).verdict == verdict


def test_critique_failure_never_authorizes(client, monkeypatch):
    a = proposed(client)

    def unavailable(*args):
        raise ModelError("Provider unavailable")

    monkeypatch.setattr("app.critique.ModelCritic.review", unavailable)
    result = post(client, a, "critique", {"mode": "live"}).json()
    assert result["critique"]["verdict"] == "NEEDS_REVIEW"
    assert (
        post(client, a, "accept", {"version": 1, "confirmed": True}).status_code == 409
    )


def test_critique_is_bound_to_actual_offer_history(client):
    a = proposed(client)
    assert (
        post(
            client, a, "critique", {"mode": "rules", "text": "arbitrary replacement"}
        ).status_code
        == 422
    )
    r = post(client, a, "critique", {"mode": "rules"})
    assert r.status_code == 200
    assert r.json()["critique"]["terms_digest"] == digest(a)
    assert r.json()["critique"]["execution"] == "deterministic_rules"


def test_hosted_mode_requires_https_origin_and_operator_secret():
    from app.config import Settings
    from pydantic import ValidationError

    with pytest.raises(ValidationError):
        Settings(
            secure_cookies=True,
            public_origin="http://example.com",
            app_access_password="x" * 32,
            app_session_secret="x" * 32,
        )
    with pytest.raises(ValidationError):
        Settings(
            secure_cookies=True,
            public_origin="https://example.com",
            app_access_password="",
            app_session_secret="x" * 32,
        )
    assert Settings(
        secure_cookies=True,
        public_origin="https://example.com",
        app_access_password="x" * 32,
        app_session_secret="x" * 32,
    ).secure_cookies


def test_operator_gate_is_optional_and_protects_hosted_demo(client, monkeypatch):
    import base64

    monkeypatch.setattr(settings, "app_access_password", "operator-test-password-only")
    assert client.get("/api/health").status_code == 200
    assert client.get("/api/agreements").status_code == 401
    assert (
        client.get(
            "/api/agreements", headers={"Authorization": "Basic bad"}
        ).status_code
        == 401
    )
    token = base64.b64encode(b"pact:operator-test-password-only").decode()
    assert (
        client.get(
            "/api/agreements", headers={"Authorization": "Basic " + token}
        ).status_code
        == 200
    )


def test_fingerprint_confirmation_required_for_new_proposals(client):
    a = proposed(client)
    assert (
        client.post(
            f"/api/agreements/{a['id']}/accept", json={"version": 1, "confirmed": True}
        ).status_code
        == 409
    )


@pytest.mark.parametrize("provider_status", ["CANCELLED", "MARKED_AS_PAID", "UNKNOWN"])
def test_nonpayable_provider_status_blocks_payment_handoff(client, pp, provider_status):
    from test_workflow import HTML

    a = invoiced(client, pp)
    a = post(client, a, "evidence", {"html": HTML}).json()
    pp.state = provider_status
    assert (
        post(
            client, a, "payment-approval", {"version": 1, "confirmed": True}
        ).status_code
        == 502
    )
    assert pp.sent == 0


def test_current_unpaid_status_cannot_retain_paid_banner(client, pp):
    a = invoiced(client, pp)
    pp.state = "PAID"
    a = post(client, a, "paypal-status").json()
    assert a["status"] == "PAID"
    pp.state = "UNPAID"
    a = post(client, a, "paypal-status").json()
    assert a["status"] == "PAYMENT_REVIEW"
    assert a["invoice"]["status"] == "UNPAID"


def test_paid_provider_invoice_is_not_sent_or_paid_twice(client, pp):
    from test_workflow import HTML

    a = invoiced(client, pp)
    a = post(client, a, "evidence", {"html": HTML}).json()
    pp.state = "PAID"
    a = post(client, a, "payment-approval", {"version": 1, "confirmed": True}).json()
    assert a["status"] == "PAID"
    assert pp.sent == 0


def test_hosted_session_cookie_is_secure_in_actual_app(tmp_path):
    import os

    script = """import base64
from fastapi.testclient import TestClient
from app.main import app
c=TestClient(app,base_url='https://testserver',headers={'Authorization':'Basic '+base64.b64encode(b'pact:xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx').decode()})
r=c.get('/api/agreements')
assert r.status_code==200
assert 'secure' in r.headers['set-cookie'].lower()
assert 'httponly' in r.headers['set-cookie'].lower()
assert c.post('/api/agreements',headers={'origin':'https://evil.example','x-pact-action':'1'},json={}).status_code==403
print('secure hosted session verified')
"""
    environment = {
        **os.environ,
        "SECURE_COOKIES": "true",
        "PUBLIC_ORIGIN": "https://testserver",
        "APP_ACCESS_PASSWORD": "x" * 32,
        "APP_SESSION_SECRET": "x" * 32,
        "DATABASE_PATH": str(tmp_path / "hosted.db"),
    }
    result = subprocess.run(
        [sys.executable, "-c", script],
        env=environment,
        capture_output=True,
        text=True,
        check=True,
    )
    assert "secure hosted session verified" in result.stdout
