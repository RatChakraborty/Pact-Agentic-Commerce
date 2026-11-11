"""Explicit paid smoke test, no invoice writes. Run from backend/ with test extra installed."""

import json
import sys
from datetime import UTC, datetime, timedelta
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from app.config import settings
from app.main import app
from app.store import transaction
from fastapi.testclient import TestClient

if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser()
    parser.add_argument("--buyer", required=True)
    parser.add_argument("--seller", required=True)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    with transaction() as db:
        print(
            "Existing reserved calls:",
            db.execute("SELECT calls FROM usage WHERE id=1").fetchone()[0],
        )
        print(
            "Existing reserved dollars:",
            db.execute("SELECT reserved_usd FROM budget WHERE id=1").fetchone()[0],
        )
    c = TestClient(app, headers={"X-Pact-Action": "1"})
    r = c.post(
        "/api/agreements",
        json={
            "buyer_email": args.buyer,
            "seller_email": args.seller,
            "deadline": (datetime.now(UTC) + timedelta(days=7)).isoformat(),
            "mode": "live",
        },
    )
    r.raise_for_status()
    a = r.json()
    r = c.post("/api/agreements/" + a["id"] + "/negotiate", json={})
    r.raise_for_status()
    a = r.json()
    result = {
        "state": a["status"],
        "model": settings.llm_model,
        "reason": a.get("negotiation_error"),
        "amount_minor": a["amount_minor"],
        "offers": [
            {k: v for k, v in offer.items() if k != "recipient"}
            for offer in a["offers"]
        ],
        "terms_digest": a.get("terms_digest"),
    }
    args.output.write_text(json.dumps(result, indent=2) + "\n")
    print(
        a["status"],
        len(a["offers"]),
        "turns; no terms accepted and no invoice created.",
    )
