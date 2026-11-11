"""Isolated two-persona commerce demo. No accounts, live inference or payment capability.

A signed browser session owns one immutable demo role. A second browser context
is required for the counterparty. Shared responses are explicit allowlists.
"""

import hashlib
import hmac
import json
import secrets
import time
from datetime import UTC, datetime
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import AwareDatetime, Field

from .agents import negotiate
from .config import settings
from .critique import rules
from .domain import Approval, Evidence, NewAgreement, Review, Strict, now
from .integrity import canonical_terms
from .public import throttle
from .store import transaction
from .verification import verify

router = APIRouter(prefix="/api/demo-market")
_seal_key = settings.app_session_secret or secrets.token_urlsafe(48)


class Persona(Strict):
    role: Literal["buyer", "seller"]
    name: str = Field(min_length=2, max_length=60)


class Service(Strict):
    title: str = Field(min_length=5, max_length=100)
    description: str = Field(min_length=10, max_length=600)
    asking_minor: int = Field(ge=100, le=200000, strict=True)
    seller_floor_minor: int = Field(ge=100, le=100000, strict=True)


class Brief(Strict):
    objective: str = Field(min_length=10, max_length=1000)
    budget_minor: int = Field(ge=100, le=100000, strict=True)
    deadline: AwareDatetime
    criteria: list[Literal["hero", "features", "contact"]] = Field(
        default=["hero", "features", "contact"], min_length=1, max_length=3
    )
    authorize_agent: Literal[True]


class Consent(Strict):
    confirmed: Literal[True]


def get_record(db, id, kind):
    row = db.execute(
        "SELECT owner,data FROM demo_records WHERE id=? AND kind=?", (id, kind)
    ).fetchone()
    if not row:
        raise HTTPException(404, "Demo record not found.")
    return row["owner"], json.loads(row["data"])


def put(db, id, kind, user, data):
    db.execute(
        "INSERT INTO demo_records(id,kind,owner,data) VALUES(?,?,?,?)",
        (id, kind, user, json.dumps(data)),
    )


def update(db, id, data):
    db.execute("UPDATE demo_records SET data=? WHERE id=?", (json.dumps(data), id))


def identity(db, user, role=None):
    _, p = get_record(db, user, "persona")
    if p["revoked"] or p["expires"] < int(time.time()):
        raise HTTPException(
            401, "Demo persona ended or expired. Start a new browser session."
        )
    if role and p["role"] != role:
        raise HTTPException(403, "This action belongs to the other demo role.")
    return p


def seal(record):
    immutable = {
        key: record[key] for key in ("buyer", "seller", "service_id", "agreement")
    }
    # Lifecycle/transcript are deliberately excluded; private constraints and shared terms are bound.
    a = immutable["agreement"]
    immutable["agreement"] = {
        key: a[key]
        for key in (
            "id",
            "objective",
            "budget_minor",
            "asking_minor",
            "seller_floor_minor",
            "buyer_email",
            "seller_email",
            "criteria",
            "deadline",
            "version",
            "mode",
            "demo",
        )
    }
    return hmac.new(
        _seal_key.encode(),
        json.dumps(immutable, sort_keys=True).encode(),
        hashlib.sha256,
    ).hexdigest()


def terms(a):
    result = canonical_terms(a)
    result.pop("budget_minor")
    result["approval_policy"] = "both_demo_parties_confirm; no_provider_capability"
    return result


def fingerprint(a):
    return hashlib.sha256(json.dumps(terms(a), sort_keys=True).encode()).hexdigest()


def shared(db, id, user, role=None):
    p = identity(db, user, role)
    _, r = get_record(db, id, "agreement")
    if r.get(p["role"]) != user:
        raise HTTPException(404, "Shared agreement not found for this persona.")
    if not hmac.compare_digest(r["policy_seal"], seal(r)):
        raise HTTPException(409, "Demo agreement policy integrity check failed.")
    a = r["agreement"]
    if r["approvals"] and r["terms_digest"] != fingerprint(a):
        raise HTTPException(409, "Approved terms changed; create a new request.")
    return r, p["role"]


def view(r, role):
    a = r["agreement"]
    # Never return the full stored agreement, participant identifiers, policy seal,
    # or opposite role's private limit (including in public fingerprints).
    keys = (
        "id",
        "objective",
        "status",
        "version",
        "amount_minor",
        "currency",
        "criteria",
        "deadline",
        "created_at",
        "offers",
        "verification",
        "negotiation_error",
    )
    out = {key: a.get(key) for key in keys}
    out.update(
        role=role,
        demo=True,
        mode="deterministic",
        service_title=r["service_title"],
        buyer_name=r["buyer_name"],
        seller_name=r["seller_name"],
        seller_authorized=r["seller_authorized"],
        approvals=r["approvals"],
        terms_digest=r["terms_digest"],
        critique=r["critique"],
        history=r["history"],
        payment_status="NOT_CREATED",
        human_review=r.get("human_review"),
    )
    if role == "buyer":
        out["budget_minor"] = a["budget_minor"]
    else:
        out["seller_floor_minor"] = a["seller_floor_minor"]
    return out


def event(r, action, role):
    r["history"].append(
        {
            "at": now(),
            "action": action,
            "role": role,
            "status": r["agreement"]["status"],
        }
    )


def require(r, *statuses):
    if r["agreement"]["status"] not in statuses:
        raise HTTPException(409, "This action is unavailable at this step.")


def register(app, owner):
    user_dependency = Depends(owner)

    @router.get("/persona")
    def current(user=user_dependency):
        with transaction() as db:
            row = db.execute(
                "SELECT data FROM demo_records WHERE id=? AND kind='persona'", (user,)
            ).fetchone()
            if not row:
                return None
            p = identity(db, user)
            return {key: p[key] for key in ("role", "name", "expires")}

    @router.post("/persona", status_code=201)
    def select(data: Persona, user=user_dependency):
        with transaction() as db:
            if db.execute("SELECT id FROM demo_records WHERE id=?", (user,)).fetchone():
                raise HTTPException(
                    409,
                    "A demo role is fixed for this browser session. Use a separate browser context for the other party.",
                )
            p = {
                **data.model_dump(),
                "expires": int(time.time()) + 86400,
                "revoked": False,
            }
            put(db, user, "persona", user, p)
            return {key: p[key] for key in ("role", "name", "expires")}

    @router.post("/logout")
    def logout(request: Request):
        if request.headers.get("x-pact-action") != "1":
            raise HTTPException(403, "Missing action protection.")
        user = request.session.get("owner")
        with transaction() as db:
            row = db.execute(
                "SELECT data FROM demo_records WHERE id=? AND kind='persona'", (user,)
            ).fetchone()
            if row:
                p = json.loads(row["data"])
                p["revoked"] = True
                update(db, user, p)
        request.session.clear()
        return {"ended": True}

    @router.get("/services")
    def services(user=user_dependency):
        with transaction() as db:
            rows = db.execute(
                "SELECT s.id,s.owner,s.data,p.data AS persona FROM demo_records s JOIN demo_records p ON p.id=s.owner AND p.kind='persona' WHERE s.kind='service' ORDER BY s.id LIMIT 200"
            ).fetchall()
            results = []
            for row in rows:
                persona = json.loads(row["persona"])
                if persona["revoked"] or persona["expires"] < int(time.time()):
                    continue
                s = json.loads(row["data"])
                result = {
                    key: s[key]
                    for key in ("title", "description", "asking_minor", "seller_name")
                }
                result.update(
                    id=row["id"],
                    category="Static landing page",
                    demo=True,
                    mine=row["owner"] == user,
                )
                if row["owner"] == user:
                    result["seller_floor_minor"] = s["seller_floor_minor"]
                results.append(result)
            return results

    @router.post("/services", status_code=201)
    def create_service(data: Service, user=user_dependency):
        if data.seller_floor_minor > data.asking_minor:
            raise HTTPException(422, "Minimum cannot exceed asking price.")
        with transaction() as db:
            p = identity(db, user, "seller")
            throttle(db, "demo-services:" + user, 5, 86400)
            throttle(db, "demo-services-global", 100, 86400)
            id = secrets.token_urlsafe(18)
            put(
                db, id, "service", user, {**data.model_dump(), "seller_name": p["name"]}
            )
            return {"id": id}

    @router.post("/services/{service_id}/requests", status_code=201)
    def request_service(service_id: str, data: Brief, user=user_dependency):
        if data.deadline <= datetime.now(UTC):
            raise HTTPException(422, "Choose a future deadline.")
        with transaction() as db:
            buyer = identity(db, user, "buyer")
            seller_id, service = get_record(db, service_id, "service")
            identity(db, seller_id, "seller")
            throttle(db, "demo-requests:" + user, 10, 86400)
            throttle(db, "demo-requests-global", 500, 86400)
            id = secrets.token_urlsafe(18)
            a = NewAgreement(
                **data.model_dump(exclude={"authorize_agent"}),
                asking_minor=service["asking_minor"],
                seller_floor_minor=service["seller_floor_minor"],
                buyer_email="customer@demo.example.com",
                seller_email="business@demo.example.com",
                demo=True,
            ).model_dump(mode="json")
            a.update(
                id=id,
                version=1,
                status="AWAITING_SELLER",
                amount_minor=None,
                currency="USD",
                offers=[],
                verification=None,
                created_at=now(),
                negotiation_error=None,
            )
            r = {
                "buyer": user,
                "seller": seller_id,
                "service_id": service_id,
                "service_title": service["title"],
                "buyer_name": buyer["name"],
                "seller_name": service["seller_name"],
                "agreement": a,
                "seller_authorized": False,
                "approvals": [],
                "terms_digest": None,
                "critique": None,
                "history": [],
            }
            r["policy_seal"] = seal(r)
            event(r, "buyer_authorized_request", "buyer")
            put(db, id, "agreement", user, r)
            return view(r, "buyer")

    @router.get("/agreements")
    def listing(user=user_dependency):
        with transaction() as db:
            p = identity(db, user)
            rows = db.execute(
                "SELECT id,data FROM demo_records WHERE kind='agreement' ORDER BY id LIMIT 1000"
            ).fetchall()
            return [
                view(shared(db, row["id"], user)[0], p["role"])
                for row in rows
                if json.loads(row["data"])[p["role"]] == user
            ]

    @router.get("/agreements/{id}")
    def get(id: str, user=user_dependency):
        with transaction() as db:
            r, role = shared(db, id, user)
            return view(r, role)

    @router.post("/agreements/{id}/authorize")
    def authorize(id: str, data: Consent, user=user_dependency):
        with transaction() as db:
            r, role = shared(db, id, user, "seller")
            require(r, "AWAITING_SELLER")
            r["seller_authorized"] = True
            r["agreement"]["status"] = "DRAFT"
            event(r, "seller_authorized_agent", role)
            update(db, id, r)
            return view(r, role)

    @router.post("/agreements/{id}/negotiate")
    def start(id: str, data: Consent, user=user_dependency):
        with transaction() as db:
            r, role = shared(db, id, user, "buyer")
            require(r, "DRAFT")
            if not r["seller_authorized"]:
                raise HTTPException(409, "Seller must authorize their agent first.")
            a = r["agreement"]
            a["offers"], a["amount_minor"], a["negotiation_error"] = negotiate(a)
            a["status"] = (
                "PROPOSED" if a["amount_minor"] is not None else "NEGOTIATION_FAILED"
            )
            if a["amount_minor"] is not None:
                r["terms_digest"] = fingerprint(a)
                verdict = rules(
                    terms(a),
                    a["objective"]
                    + " "
                    + " ".join(o["explanation"] for o in a["offers"]),
                )
                r["critique"] = {
                    **verdict.model_dump(),
                    "execution": "rules",
                    "limitation": "Pattern checks, not trained SLM or semantic inference.",
                }
            event(r, "negotiation_completed", role)
            update(db, id, r)
            return view(r, role)

    @router.post("/agreements/{id}/approve")
    def approve(id: str, data: Approval, user=user_dependency):
        with transaction() as db:
            r, role = shared(db, id, user)
            require(r, "PROPOSED", "AWAITING_EVIDENCE")
            a = r["agreement"]
            if (
                data.version != a["version"]
                or not data.terms_digest
                or data.terms_digest != fingerprint(a)
                or r["terms_digest"] != fingerprint(a)
            ):
                raise HTTPException(409, "Review the current version and fingerprint.")
            if r["critique"]["verdict"] != "CLEAR":
                raise HTTPException(
                    409, "Resolve the wording concern in a new request."
                )
            if role not in r["approvals"]:
                r["approvals"].append(role)
                if set(r["approvals"]) == {"buyer", "seller"}:
                    a["status"] = "AWAITING_EVIDENCE"
                event(r, "human_confirmed_terms", role)
                update(db, id, r)
            return view(r, role)

    @router.post("/agreements/{id}/decline")
    def decline(id: str, data: Consent, user=user_dependency):
        with transaction() as db:
            r, role = shared(db, id, user)
            require(r, "AWAITING_SELLER", "DRAFT", "PROPOSED", "NEGOTIATION_FAILED")
            r["agreement"]["status"] = "CANCELLED"
            event(r, "human_declined", role)
            update(db, id, r)
            return view(r, role)

    @router.post("/agreements/{id}/evidence")
    def evidence(id: str, data: Evidence, user=user_dependency):
        with transaction() as db:
            r, role = shared(db, id, user, "seller")
            require(r, "AWAITING_EVIDENCE", "NEEDS_REVIEW")
            a = r["agreement"]
            a["verification"] = verify(a, data.html)
            a["status"] = (
                "AWAITING_BUYER_REVIEW"
                if a["verification"]["overall"] == "PASS"
                else "NEEDS_REVIEW"
            )
            event(r, "seller_submitted_evidence", role)
            update(db, id, r)
            return view(r, role)

    @router.post("/agreements/{id}/review")
    def review(id: str, data: Review, user=user_dependency):
        with transaction() as db:
            r, role = shared(db, id, user, "buyer")
            require(r, "AWAITING_BUYER_REVIEW", "NEEDS_REVIEW")
            r["human_review"] = {**data.model_dump(), "at": now()}
            r["agreement"]["status"] = (
                "DEMO_COMPLETE" if data.accepted else "NEEDS_REVIEW"
            )
            event(r, "buyer_reviewed_deliverable", role)
            update(db, id, r)
            return view(r, role)

    app.include_router(router)
