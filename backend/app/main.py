import base64
import binascii
import json
import secrets
from datetime import UTC, datetime
from pathlib import Path
from typing import Annotated
from uuid import uuid4

from fastapi import Depends, FastAPI, HTTPException, Request
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from starlette.middleware.sessions import SessionMiddleware

from .agents import NegotiationError, negotiate
from .config import settings
from .critique import CritiqueRequest
from .critique import review as critique_terms
from .domain import Approval, Evidence, Negotiate, NewAgreement, Review, now
from .integrity import IntegrityError, canonical_terms, digest, verify_accepted
from .paypal import ProviderError, paypal
from .postgres import StorageUnavailable
from .public import EXAMPLE_HTML, live_capability, throttle
from .public import session as ensure_session
from .store import audit, save, transaction
from .verification import verify

app = FastAPI(title="Pact", version="0.1.0")
# A local random fallback invalidates sessions at restart; deployments must set a persistent secret.
app.add_middleware(
    SessionMiddleware,
    secret_key=settings.app_session_secret or secrets.token_urlsafe(48),
    same_site="strict",
    https_only=settings.secure_cookies,
)


@app.middleware("http")
async def protections(request, call_next):
    if settings.public_demo and request.url.path.startswith("/__test/"):
        return JSONResponse({"detail": "Not found."}, status_code=404)
    if (
        settings.app_access_password
        and not settings.public_demo
        and request.url.path != "/api/health"
    ):
        authorized = False
        try:
            scheme, encoded = request.headers.get("authorization", "").split(" ", 1)
            username, password = (
                base64.b64decode(encoded, validate=True).decode().split(":", 1)
            )
            authorized = (
                scheme.lower() == "basic"
                and username == "pact"
                and secrets.compare_digest(
                    password.encode(), settings.app_access_password.encode()
                )
            )
        except (ValueError, UnicodeDecodeError, binascii.Error):
            pass
        if not authorized:
            return JSONResponse(
                {"detail": "Operator sign-in required."},
                status_code=401,
                headers={
                    "WWW-Authenticate": 'Basic realm="Pact demo", charset="UTF-8"'
                },
            )

    if request.method in {"POST", "PUT", "PATCH", "DELETE"}:
        origin = request.headers.get("origin")
        if origin and origin != (
            settings.public_origin or str(request.base_url).rstrip("/")
        ):
            return JSONResponse(
                {"detail": "Cross-origin mutation blocked."}, status_code=403
            )
        if (
            request.headers.get("content-length", "0").isdigit()
            and int(request.headers.get("content-length", "0")) > 120000
        ):
            return JSONResponse(
                {"detail": "Request exceeds artifact size limit."}, status_code=413
            )
        chunks = []
        length = 0
        async for chunk in request.stream():
            length += len(chunk)
            if length > 120000:
                return JSONResponse(
                    {"detail": "Request exceeds artifact size limit."}, status_code=413
                )
            chunks.append(chunk)
        request._body = b"".join(chunks)
    try:
        response = await call_next(request)
    except StorageUnavailable:
        return JSONResponse(
            {"detail": "Persistent storage is unavailable. Please try again later."},
            status_code=503,
        )

    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["Referrer-Policy"] = "no-referrer"
    response.headers["Content-Security-Policy"] = (
        "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; frame-src 'none'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'"
    )
    response.headers["Cache-Control"] = "no-store"
    return response


def owner(request: Request):
    if "owner" not in request.session:
        request.session["owner"] = secrets.token_urlsafe(24)
    if request.method != "GET" and request.headers.get("x-pact-action") != "1":
        raise HTTPException(403, "Missing action protection.")
    ensure_session(request.session["owner"], request)
    return request.session["owner"]


def load(db, id, user):
    row = db.execute(
        "SELECT * FROM agreements WHERE id=? AND owner=?", (id, user)
    ).fetchone()
    if not row:
        raise HTTPException(404, "Agreement not found in this browser session.")
    a = json.loads(row["data"])
    verify_accepted(a)
    return a


def require(db, a, *states):
    if a["status"] not in states:
        audit(db, a, "action_rejected", a["status"], {"allowed_states": states})
        db.commit()
        raise HTTPException(409, "This action is unavailable at the current step.")


def change(db, a, status, action, details=None):
    prior = a["status"]
    a["status"] = status
    audit(db, a, action, prior, details)
    save(db, a)


def check_approval(a, data):
    verify_accepted(a)
    if a.get("terms_digest") and (
        not data.terms_digest or a["terms_digest"] != digest(a)
    ):
        raise HTTPException(
            409, "Review and confirm the current agreement fingerprint."
        )
    if data.terms_digest and data.terms_digest != digest(a):
        raise HTTPException(
            409, "Agreement fingerprint changed; review the current terms."
        )
    if data.version != a["version"]:
        raise HTTPException(409, "Agreement version changed; review the current terms.")


@app.exception_handler(IntegrityError)
def integrity_error(request, exc):
    return JSONResponse({"detail": str(exc)}, status_code=409)


@app.exception_handler(ProviderError)
def provider_error(request, exc):
    return JSONResponse({"detail": str(exc)}, status_code=502)


@app.get("/api/health")
def health():
    with transaction() as db:
        db.execute("SELECT 1")
    return {
        "status": "ok",
        "application": "pact",
        "public_demo": settings.public_demo,
        "storage": "postgresql" if settings.pact_database_url else "sqlite",
        "paypal_environment": "sandbox",
        "paypal_configured": bool(
            settings.paypal_client_id
            and settings.paypal_client_secret
            and settings.paypal_env == "sandbox"
        ),
        "live_ai_configured": bool(settings.llm_api_key and settings.llm_model),
    }


@app.get("/api/agreements")
def listing(user: Annotated[str, Depends(owner)]):
    with transaction() as db:
        return [
            json.loads(r["data"])
            for r in db.execute(
                "SELECT data FROM agreements WHERE owner=? ORDER BY rowid DESC", (user,)
            )
        ]


@app.post("/api/agreements", status_code=201)
def create(data: NewAgreement, request: Request, user: Annotated[str, Depends(owner)]):
    if settings.public_demo and data.mode != "deterministic":
        live_capability(request)
    if data.deadline <= datetime.now(UTC):
        raise HTTPException(422, "Choose a future delivery deadline.")
    if data.buyer_email == data.seller_email:
        raise HTTPException(
            422, "Buyer and merchant must be different sandbox accounts."
        )
    if data.seller_floor_minor > data.asking_minor:
        raise HTTPException(422, "Seller minimum exceeds asking price.")
    a = {
        "id": str(uuid4()),
        **data.model_dump(mode="json"),
        "demo": settings.public_demo or data.demo,
        "version": 1,
        "status": "DRAFT",
        "currency": "USD",
        "amount_minor": None,
        "offers": [],
        "invoice": None,
        "verification": None,
        "accepted_at": None,
        "approved_at": None,
        "created_at": now(),
    }
    with transaction() as db:
        count = db.execute(
            "SELECT COUNT(*) FROM agreements WHERE owner=?", (user,)
        ).fetchone()[0]
        if count >= (10 if settings.public_demo else 30):
            raise HTTPException(429, "Demo agreement limit reached.")
        if settings.public_demo:
            throttle(db, "daily-agreements", 500, 86400)
            if db.execute("SELECT COUNT(*) FROM agreements").fetchone()[0] >= 5000:
                raise HTTPException(429, "Public demo capacity reached.")
        db.execute(
            "INSERT INTO agreements VALUES(?,?,?)", (a["id"], user, json.dumps(a))
        )
        audit(db, a, "agreement_created")
    return a


@app.get("/api/agreements/{id}")
def get(id: str, user: Annotated[str, Depends(owner)]):
    with transaction() as db:
        return load(db, id, user)


@app.get("/api/agreements/{id}/audit")
def history(id: str, user: Annotated[str, Depends(owner)]):
    with transaction() as db:
        load(db, id, user)
        return [
            dict(r)
            for r in db.execute(
                "SELECT seq,timestamp,action,prior_status,next_status,details FROM audit WHERE agreement_id=? ORDER BY seq",
                (id,),
            )
        ]


@app.post("/api/agreements/{id}/negotiate")
def negotiation(
    id: str, data: Negotiate, request: Request, user: Annotated[str, Depends(owner)]
):
    # Reserve the maximum live call allowance durably before contacting the model.
    with transaction() as db:
        a = load(db, id, user)
        require(db, a, "DRAFT", "NEGOTIATION_FAILED")
        if a["mode"] == "live":
            live_capability(request)
            if data.scenario != "normal":
                raise HTTPException(
                    422, "Failure demonstration uses deterministic mode only."
                )
            calls = db.execute("SELECT calls FROM usage WHERE id=1").fetchone()[0]
            if calls + 6 > settings.llm_max_calls:
                raise HTTPException(
                    429,
                    "Server AI call budget exhausted; use deterministic mode or deliberately raise the configured budget.",
                )
            reserve = (
                6
                * (
                    settings.llm_max_input_bytes * settings.llm_input_usd_per_million
                    + settings.llm_max_tokens * settings.llm_output_usd_per_million
                )
                / 1_000_000
            )
            spent = db.execute("SELECT reserved_usd FROM budget WHERE id=1").fetchone()[
                0
            ]
            if spent + reserve > settings.llm_budget_usd:
                raise HTTPException(
                    429,
                    "Server estimated AI spending budget exhausted. No model request made.",
                )
            db.execute(
                "UPDATE budget SET reserved_usd=reserved_usd+? WHERE id=1", (reserve,)
            )
            db.execute("UPDATE usage SET calls=calls+6 WHERE id=1")
        change(
            db,
            a,
            "NEGOTIATING",
            "negotiation_started",
            {
                "mode": a["mode"],
                "model": settings.llm_model if a["mode"] == "live" else None,
            },
        )
    try:
        offers, amount, error = negotiate(a, data.scenario)
    except NegotiationError as exc:
        offers, amount, error = [], None, str(exc)
    with transaction() as db:
        current = load(db, id, user)
        require(db, current, "NEGOTIATING")
        current["offers"] = offers
        current["amount_minor"] = amount
        current["negotiation_error"] = error
        current["terms_digest"] = digest(current) if amount is not None else None
        change(
            db,
            current,
            "NEGOTIATION_FAILED" if error else "PROPOSED",
            "negotiation_blocked" if error else "terms_proposed",
            {"reason": error, "turns": len(offers)},
        )
        return current


@app.post("/api/agreements/{id}/critique")
def critique(
    id: str,
    data: CritiqueRequest,
    request: Request,
    user: Annotated[str, Depends(owner)],
):
    with transaction() as db:
        a = load(db, id, user)
        require(db, a, "PROPOSED")
        fingerprint = digest(a)
    if data.mode == "live":
        live_capability(request)
    text = "\n".join(f"{o['role']}: {o['explanation']}" for o in a["offers"])
    result = critique_terms(a, text, data.mode)
    with transaction() as db:
        current = load(db, id, user)
        require(db, current, "PROPOSED")
        if digest(current) != fingerprint:
            raise HTTPException(409, "Terms changed during review.")
        current["critique"] = {**result, "terms_digest": fingerprint}
        audit(
            db,
            current,
            "proposal_critique",
            current["status"],
            {
                "verdict": result["verdict"],
                "execution": result["execution"],
                "terms_digest": fingerprint,
            },
        )
        save(db, current)
        return current


@app.post("/api/agreements/{id}/accept")
def accept(id: str, data: Approval, user: Annotated[str, Depends(owner)]):
    with transaction() as db:
        a = load(db, id, user)
        check_approval(a, data)
        if a["accepted_at"]:
            return a
        if a.get("critique") and a["critique"]["verdict"] != "CLEAR":
            raise HTTPException(
                409,
                "The proposal has unresolved wording concerns. Revise the agreement before accepting.",
            )
        require(db, a, "PROPOSED")
        if (
            a["amount_minor"] is None
            or not a["seller_floor_minor"] <= a["amount_minor"] <= a["budget_minor"]
        ):
            raise HTTPException(
                409, "Proposed amount violates the authorized price limits."
            )
        a["accepted_at"] = now()
        a["accepted_terms"] = canonical_terms(a)
        a["accepted_digest"] = digest(a)
        change(
            db,
            a,
            "ACCEPTED",
            "buyer_accepted_terms",
            {"terms_digest": a["accepted_digest"], "version": a["version"]},
        )
        return a


@app.post("/api/agreements/{id}/invoice", dependencies=[Depends(live_capability)])
def invoice(id: str, data: Approval, user: Annotated[str, Depends(owner)]):
    with transaction() as db:
        a = load(db, id, user)
        if a.get("demo"):
            raise HTTPException(
                409,
                "This is a demonstration agreement; no provider operation is available.",
            )
        check_approval(a, data)
        if a["invoice"]:
            return a
        require(db, a, "ACCEPTED")
        try:
            result = (
                {"id": a["invoice_provider_id"]}
                if a.get("invoice_provider_id")
                else paypal.create(a)
            )
            provider_id = result.get("id")
            if not provider_id:
                from urllib.parse import urlparse

                link = next(
                    (
                        x["href"]
                        for x in result.get("links", [])
                        if x.get("rel") == "self"
                    ),
                    "",
                )
                parsed = urlparse(link)
                if parsed.hostname == "api-m.sandbox.paypal.com":
                    provider_id = parsed.path.rsplit("/", 1)[-1]
            if not provider_id or not provider_id.startswith("INV2-"):
                raise ProviderError("PayPal did not return a valid invoice identifier.")
            a["invoice_provider_id"] = provider_id
            save(db, a)
            provider = paypal.validate(paypal.get(provider_id), a)
            a["invoice"] = paypal.public(provider)
            a["invoice"]["checked_at"] = now()
            change(
                db,
                a,
                "INVOICED",
                "sandbox_invoice_created",
                {"provider_id": provider_id},
            )
        except ProviderError as exc:
            audit(db, a, "invoice_failed", a["status"], {"reason": str(exc)})
            error = exc
        else:
            return a
    raise error


@app.get("/api/demo/example")
def demo_example():
    return {"html": EXAMPLE_HTML}


@app.get("/api/evidence")
def recorded_evidence():
    # Frozen public receipts only: no runtime provider request or credential data.
    root = Path(__file__).resolve().parents[2] / "docs" / "evidence"
    return {
        "live_negotiation": json.loads((root / "live-negotiation.json").read_text()),
        "sandbox_payment": json.loads((root / "paypal-readback.json").read_text()),
        "note": "Recorded real API evidence from separate verified runs. Your interactive demo creates no invoice or payment.",
    }


@app.post("/api/agreements/{id}/demo-milestone")
def demo_milestone(id: str, data: Approval, user: Annotated[str, Depends(owner)]):
    with transaction() as db:
        a = load(db, id, user)
        if not a.get("demo"):
            raise HTTPException(409, "Use the provider workflow for this agreement.")
        check_approval(a, data)
        if a["status"] == "AWAITING_EVIDENCE":
            return a
        require(db, a, "ACCEPTED")
        change(
            db,
            a,
            "AWAITING_EVIDENCE",
            "demo_milestone_opened",
            {"provider_called": False},
        )
        return a


@app.post("/api/agreements/{id}/evidence")
def evidence(id: str, data: Evidence, user: Annotated[str, Depends(owner)]):
    with transaction() as db:
        a = load(db, id, user)
        require(db, a, "INVOICED", "AWAITING_EVIDENCE", "NEEDS_REVIEW", "VERIFIED")
        a["verification"] = verify(a, data.html)
        change(
            db,
            a,
            "VERIFIED" if a["verification"]["overall"] == "PASS" else "NEEDS_REVIEW",
            "artifact_verified",
            {"outcome": a["verification"]["overall"]},
        )
        return a


@app.post("/api/agreements/{id}/review")
def review(id: str, data: Review, user: Annotated[str, Depends(owner)]):
    with transaction() as db:
        a = load(db, id, user)
        require(db, a, "NEEDS_REVIEW")
        a["human_review"] = {
            "accepted": data.accepted,
            "reason": data.reason,
            "at": now(),
        }
        change(
            db,
            a,
            "VERIFIED" if data.accepted else "NEEDS_REVIEW",
            "human_review_recorded",
            data.model_dump(),
        )
        return a


@app.post(
    "/api/agreements/{id}/payment-approval", dependencies=[Depends(live_capability)]
)
def payment(id: str, data: Approval, user: Annotated[str, Depends(owner)]):
    with transaction() as db:
        a = load(db, id, user)
        if a.get("demo"):
            raise HTTPException(
                409,
                "This is a demonstration agreement; no provider operation is available.",
            )
        check_approval(a, data)
        if a["approved_at"] and a["status"] in {"PAYMENT_PENDING", "PAID"}:
            return a
        require(db, a, "VERIFIED")
        provider_id = a["invoice"]["id"]
        try:
            p = paypal.validate(paypal.get(provider_id), a)
            if p.get("status") == "PAID":
                a["invoice"] = {**paypal.public(p), "checked_at": now()}
                change(
                    db,
                    a,
                    "PAID",
                    "provider_payment_already_confirmed",
                    {"provider_status": "PAID"},
                )
                return a
            if p.get("status") not in {
                "DRAFT",
                "SENT",
                "UNPAID",
                "PARTIALLY_PAID",
                "PAYMENT_PENDING",
            }:
                raise ProviderError(
                    "PayPal invoice is not payable in its current state. Check provider status before continuing."
                )
            if p.get("status") == "DRAFT":
                paypal.send(provider_id, a["id"])
                p = paypal.validate(paypal.get(provider_id), a)
                if p.get("status") not in {
                    "SENT",
                    "UNPAID",
                    "PARTIALLY_PAID",
                    "PAYMENT_PENDING",
                }:
                    raise ProviderError(
                        "PayPal has not confirmed a payable invoice state. Payment remains unconfirmed."
                    )
            a["invoice"] = paypal.public(p)
            a["invoice"]["checked_at"] = now()
            if not a["invoice"]["approval_url"]:
                raise ProviderError(
                    "PayPal has not returned a sandbox payment link; payment remains unconfirmed."
                )
            a["approved_at"] = now()
            change(db, a, "PAYMENT_PENDING", "buyer_authorized_paypal_handoff")
        except ProviderError as exc:
            audit(db, a, "payment_handoff_failed", a["status"], {"reason": str(exc)})
            error = exc
        else:
            return a
    raise error


@app.post("/api/agreements/{id}/paypal-status", dependencies=[Depends(live_capability)])
def refresh(id: str, user: Annotated[str, Depends(owner)]):
    with transaction() as db:
        a = load(db, id, user)
        if a.get("demo"):
            raise HTTPException(
                409,
                "This is a demonstration agreement; no provider operation is available.",
            )
        if not a["invoice"]:
            raise HTTPException(409, "Create an invoice first.")
        p = paypal.validate(paypal.get(a["invoice"]["id"]), a)
        a["invoice"] = paypal.public(p)
        a["invoice"]["checked_at"] = now()
        status = a["status"]
        # Provider-confirmed payment is a fact, even if the buyer paid outside Pact.
        if p.get("status") == "PAID":
            status = "PAID"
        elif a["status"] == "PAID" or p.get("status") in {
            "CANCELLED",
            "REFUNDED",
            "PARTIALLY_REFUNDED",
            "MARKED_AS_PAID",
        }:
            status = "PAYMENT_REVIEW"
        change(
            db,
            a,
            status,
            "provider_status_checked",
            {"provider_status": p.get("status")},
        )
        return a


@app.post("/api/agreements/{id}/cancel")
def cancel(id: str, user: Annotated[str, Depends(owner)]):
    with transaction() as db:
        a = load(db, id, user)
        require(db, a, "DRAFT", "PROPOSED", "NEGOTIATION_FAILED", "ACCEPTED")
        change(db, a, "CANCELLED", "agreement_cancelled")
        return a


assets = Path(__file__).resolve().parents[2] / "frontend" / "dist"
if assets.exists():
    app.mount("/", StaticFiles(directory=assets, html=True), name="frontend")
