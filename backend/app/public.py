"""Anonymous demo protections. No secret, paid inference, or provider-write capability."""

import base64
import binascii
import hashlib
import secrets
import time

from fastapi import HTTPException, Request

from .config import settings
from .store import transaction

EXAMPLE_HTML = '<!doctype html><html lang="en"><head><title>Studio North</title></head><body><main><section id="hero">Thoughtful design for growing businesses.</section><section id="features">Responsive websites and accessible brand experiences.</section><section id="contact">Contact our studio to discuss your next project.</section></main></body></html>'


def operator(request):
    if not settings.app_access_password:
        return False
    try:
        scheme, encoded = request.headers.get("authorization", "").split(" ", 1)
        username, password = (
            base64.b64decode(encoded, validate=True).decode().split(":", 1)
        )
        return (
            scheme.lower() == "basic"
            and username == "pact"
            and secrets.compare_digest(
                password.encode(), settings.app_access_password.encode()
            )
        )
    except (ValueError, UnicodeDecodeError, binascii.Error):
        return False


def live_capability(request: Request):
    if settings.public_demo and (
        not settings.enable_live_operations or not operator(request)
    ):
        raise HTTPException(
            403,
            "Live AI and PayPal operations are disabled for public visitors. The interactive demo never creates invoices or payments.",
        )


def throttle(db, key, limit, period=60):
    window_id = int(time.time()) // period
    db.execute("INSERT OR IGNORE INTO throttles VALUES(?,?,?)", (key, window_id, 0))
    row = db.execute(
        "SELECT window_id,count FROM throttles WHERE id=?", (key,)
    ).fetchone()
    count = row["count"] if row["window_id"] == window_id else 0
    if count >= limit:
        raise HTTPException(
            429,
            "Demo request limit reached. Please try again later.",
            headers={"Retry-After": str(period)},
        )
    db.execute(
        "UPDATE throttles SET window_id=?,count=? WHERE id=?",
        (window_id, count + 1, key),
    )


def session(user, request):
    if not settings.public_demo:
        return
    with transaction() as db:
        expiry = int(time.time()) + 7 * 86400
        row = db.execute("SELECT expires FROM sessions WHERE id=?", (user,)).fetchone()
        if row and row["expires"] < int(time.time()):
            raise HTTPException(
                401, "This demo session expired. Start a new browser session."
            )
        if not row:
            throttle(db, "new-sessions", 2000, 86400)
            db.execute("INSERT INTO sessions VALUES(?,?)", (user, expiry))
        if request.method != "GET":
            throttle(db, "session:" + user, 30)
            address = request.client.host if request.client else "unknown"
            key = hashlib.sha256(
                (settings.app_session_secret + address).encode()
            ).hexdigest()
            throttle(db, "ip:" + key, 120)
            throttle(db, "all-mutations", 600)
