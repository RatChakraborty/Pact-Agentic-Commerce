"""Independent signed browser sessions exercise shared demo authorization."""

import json
import time
from datetime import UTC, datetime, timedelta

import pytest
from app.main import app
from app.store import transaction
from fastapi.testclient import TestClient
from test_workflow import HTML

BASE = "/api/demo-market"


def call(c, path, data=None):
    return c.post(BASE + path, json={} if data is None else data)


def personas(client, monkeypatch):
    def forbidden(*a, **kw):
        pytest.fail("Two-persona demo must never call live services")

    monkeypatch.setattr("app.agents.provider.offer", forbidden)
    monkeypatch.setattr("app.paypal.paypal.create", forbidden)
    seller = TestClient(app, headers={"X-Pact-Action": "1"})
    other = TestClient(app, headers={"X-Pact-Action": "1"})
    for c, role, name in [
        (client, "buyer", "Customer Demo"),
        (seller, "seller", "Studio Demo"),
        (other, "buyer", "Stranger Demo"),
    ]:
        assert call(c, "/persona", {"role": role, "name": name}).status_code == 201
    return client, seller, other


def request(b, s):
    service = call(
        s,
        "/services",
        {
            "title": "Studio landing page",
            "description": "A static page with hero, features and contact.",
            "asking_minor": 36000,
            "seller_floor_minor": 24000,
        },
    )
    assert service.status_code == 201, service.text
    response = call(
        b,
        f"/services/{service.json()['id']}/requests",
        {
            "objective": "Build a static landing page for our design studio.",
            "budget_minor": 30000,
            "deadline": (datetime.now(UTC) + timedelta(days=7)).isoformat(),
            "authorize_agent": True,
        },
    )
    assert response.status_code == 201, response.text
    return response.json()


def action(c, a, name, data=None):
    return call(c, f"/agreements/{a['id']}/{name}", data)


def proposal(b, s, a):
    assert action(b, a, "negotiate", {"confirmed": True}).status_code == 409
    assert action(b, a, "authorize", {"confirmed": True}).status_code == 403
    assert action(s, a, "authorize", {"confirmed": True}).status_code == 200
    response = action(b, a, "negotiate", {"confirmed": True})
    assert response.status_code == 200, response.text
    return response.json()


def test_two_persona_end_to_end_roles_privacy_and_payment_truth(client, monkeypatch):
    b, s, other = personas(client, monkeypatch)
    a = request(b, s)
    assert "seller_floor_minor" not in b.get(BASE + "/services").json()[0]
    assert s.get(BASE + "/services").json()[0]["seller_floor_minor"] == 24000
    assert (
        call(
            b,
            "/services",
            {
                "title": "Not a seller",
                "description": "This must be denied.",
                "asking_minor": 30000,
                "seller_floor_minor": 24000,
            },
        ).status_code
        == 403
    )
    assert other.get(BASE + f"/agreements/{a['id']}").status_code == 404
    assert other.get(BASE + "/agreements").json() == []
    assert b.get("/api/agreements/" + a["id"]).status_code == 404
    a = proposal(b, s, a)
    sv = s.get(BASE + f"/agreements/{a['id']}").json()
    assert "budget_minor" not in sv and "seller_floor_minor" not in a
    assert not any(
        k in json.dumps(sv) for k in ["policy_seal", "buyer_email", "seller_email"]
    )
    assert sv["offers"] == a["offers"] and sv["terms_digest"] == a["terms_digest"]
    assert a["status"] == "PROPOSED" and a["amount_minor"] == 30000
    approval = {"confirmed": True, "version": 1, "terms_digest": a["terms_digest"]}
    assert action(b, a, "approve", {**approval, "version": 2}).status_code == 409
    assert (
        action(s, a, "approve", {**approval, "terms_digest": "stale"}).status_code
        == 409
    )
    assert action(other, a, "approve", approval).status_code == 404
    assert action(s, a, "negotiate", {"confirmed": True}).status_code == 403
    assert action(b, a, "approve", approval).json()["status"] == "PROPOSED"
    assert action(s, a, "evidence", {"html": HTML}).status_code == 409
    assert action(s, a, "approve", approval).json()["status"] == "AWAITING_EVIDENCE"
    assert action(b, a, "evidence", {"html": HTML}).status_code == 403
    assert (
        action(
            s, a, "review", {"accepted": True, "reason": "All sections inspected."}
        ).status_code
        == 403
    )
    assert (
        action(s, a, "evidence", {"html": HTML}).json()["status"]
        == "AWAITING_BUYER_REVIEW"
    )
    a = action(
        b,
        a,
        "review",
        {"accepted": True, "reason": "I inspected the structural checks."},
    ).json()
    assert a["status"] == "DEMO_COMPLETE" and a["payment_status"] == "NOT_CREATED"
    assert s.get(BASE + f"/agreements/{a['id']}").json()["status"] == "DEMO_COMPLETE"
    assert action(s, a, "decline", {"confirmed": True}).status_code == 409
    assert action(b, a, "invoice", approval).status_code in {404, 405}
    assert (
        action(
            b, a, "review", {"accepted": True, "reason": "Duplicate blocked."}
        ).status_code
        == 409
    )


def test_fixed_roles_logout_revokes_old_cookie_and_expiry(client, monkeypatch):
    b, s, _ = personas(client, monkeypatch)
    assert (
        call(b, "/persona", {"role": "seller", "name": "Impersonator"}).status_code
        == 409
    )
    stolen = TestClient(app, headers={"X-Pact-Action": "1"})
    stolen.cookies.update(b.cookies)
    assert call(b, "/logout").status_code == 200
    assert stolen.get(BASE + "/agreements").status_code == 401
    assert b.get(BASE + "/persona").json() is None
    with transaction() as db:
        row = db.execute(
            "SELECT id,data FROM demo_records WHERE kind='persona' AND data LIKE ?",
            ("%Studio Demo%",),
        ).fetchone()
        p = json.loads(row["data"])
        p["expires"] = int(time.time()) - 1
        db.execute(
            "UPDATE demo_records SET data=? WHERE id=?", (json.dumps(p), row["id"])
        )
    assert s.get(BASE + "/agreements").status_code == 401
    assert call(s, "/logout").status_code == 200


@pytest.mark.parametrize(
    "field,value",
    [
        ("amount_minor", 29999),
        ("budget_minor", 99999),
        ("seller_floor_minor", 100),
        ("objective", "A substituted scope with missing requirements."),
    ],
)
def test_material_and_private_policy_tampering_rejected(
    client, monkeypatch, field, value
):
    b, s, _ = personas(client, monkeypatch)
    a = proposal(b, s, request(b, s))
    approval = {"confirmed": True, "version": 1, "terms_digest": a["terms_digest"]}
    assert action(s, a, "approve", approval).status_code == 200
    with transaction() as db:
        row = db.execute(
            "SELECT data FROM demo_records WHERE id=?", (a["id"],)
        ).fetchone()
        r = json.loads(row["data"])
        r["agreement"][field] = value
        db.execute(
            "UPDATE demo_records SET data=? WHERE id=?", (json.dumps(r), a["id"])
        )
    assert b.get(BASE + f"/agreements/{a['id']}").status_code == 409
    assert action(b, a, "approve", approval).status_code == 409


def test_decline_and_failed_evidence_remain_human_controlled(client, monkeypatch):
    b, s, _ = personas(client, monkeypatch)
    a = request(b, s)
    assert action(s, a, "decline", {"confirmed": True}).json()["status"] == "CANCELLED"
    assert action(s, a, "authorize", {"confirmed": True}).status_code == 409
    a = proposal(b, s, request(b, s))
    approval = {"confirmed": True, "version": 1, "terms_digest": a["terms_digest"]}
    for c in (b, s):
        assert action(c, a, "approve", approval).status_code == 200
    assert (
        action(s, a, "evidence", {"html": "<script>alert(1)</script>"}).json()["status"]
        == "NEEDS_REVIEW"
    )
    assert (
        action(
            b,
            a,
            "review",
            {"accepted": False, "reason": "The required sections are missing."},
        ).json()["status"]
        == "NEEDS_REVIEW"
    )
    assert (
        action(s, a, "evidence", {"html": HTML}).json()["status"]
        == "AWAITING_BUYER_REVIEW"
    )


def test_expired_seller_listing_is_not_discoverable(client, monkeypatch):
    b, s, _ = personas(client, monkeypatch)
    request(b, s)
    assert len(b.get(BASE + "/services").json()) == 1
    assert call(s, "/logout").status_code == 200
    assert b.get(BASE + "/services").json() == []


@pytest.mark.parametrize("role", ["buyer", "seller"])
def test_unrelated_participants_cannot_access_or_mutate(client, monkeypatch, role):
    b, s, _ = personas(client, monkeypatch)
    a = proposal(b, s, request(b, s))
    outsider = TestClient(app, headers={"X-Pact-Action": "1"})
    assert (
        call(outsider, "/persona", {"role": role, "name": "Unrelated demo"}).status_code
        == 201
    )
    assert outsider.get(BASE + "/agreements").json() == []
    assert outsider.get(BASE + f"/agreements/{a['id']}").status_code == 404
    assert (
        action(
            outsider,
            a,
            "approve",
            {"confirmed": True, "version": 1, "terms_digest": a["terms_digest"]},
        ).status_code
        == 404
    )
    assert action(outsider, a, "decline", {"confirmed": True}).status_code == 404
