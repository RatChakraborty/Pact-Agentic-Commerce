"""Record the real deterministic backend lifecycle using isolated disposable storage.

No model or payment operation is permitted. Existing evidence is never overwritten.
"""

import argparse
import hashlib
import json
import os
import subprocess
import sys
import tempfile
from pathlib import Path
from unittest.mock import patch

BACKEND = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND))
HTML = '<main><section id="hero">A clear studio introduction.</section><section id="features">Design and development services.</section><section id="contact">Contact our team today.</section></main>'


def capture():
    with (
        tempfile.TemporaryDirectory(prefix="pact-guided-") as temp,
        patch.dict(
            os.environ,
            {
                "VERCEL": "false",
                "PUBLIC_DEMO": "true",
                "ENABLE_LIVE_OPERATIONS": "false",
                "PACT_DATABASE_URL": "",
                "DATABASE_URL": "",
                "DATABASE_PATH": str(Path(temp) / "fixture.db"),
                "APP_SESSION_SECRET": "public-fixture-only-not-a-deployment-secret-0000",
                "APP_ACCESS_PASSWORD": "",
                "SECURE_COOKIES": "false",
                "PUBLIC_ORIGIN": "",
                "LLM_MAX_CALLS": "0",
                "LLM_BUDGET_USD": "0",
                "LLM_API_KEY": "",
                "PAYPAL_CLIENT_ID": "",
                "PAYPAL_CLIENT_SECRET": "",
            },
        ),
    ):
        from app.domain import now
        from app.main import app
        from fastapi.testclient import TestClient

        def forbidden(*args, **kwargs):
            raise AssertionError(
                "Guided fixture must never use a model or payment provider"
            )

        with (
            patch("app.agents.provider.offer", forbidden),
            patch("app.paypal.paypal.request", forbidden),
        ):
            buyer, seller, stranger = [
                TestClient(app, headers={"X-Pact-Action": "1"}) for _ in range(3)
            ]
            base = "/api/demo-market"
            for client, role, name in [
                (buyer, "buyer", "Guided customer"),
                (seller, "seller", "Guided studio"),
                (stranger, "buyer", "Unrelated visitor"),
            ]:
                assert (
                    client.post(
                        base + "/persona", json={"role": role, "name": name}
                    ).status_code
                    == 201
                )
            service = seller.post(
                base + "/services",
                json={
                    "title": "Studio landing page",
                    "description": "Static page with hero, features and contact.",
                    "asking_minor": 36000,
                    "seller_floor_minor": 24000,
                },
            )
            assert service.status_code == 201
            response = buyer.post(
                base + f"/services/{service.json()['id']}/requests",
                json={
                    "objective": "Build a static landing page for our design studio.",
                    "budget_minor": 30000,
                    "deadline": "2026-12-01T23:59:59Z",
                    "authorize_agent": True,
                },
            )
            assert response.status_code == 201
            current = response.json()
            prefix = base + "/agreements/" + current["id"]
            snapshots = []

            def save(id, label, value):
                keys = [
                    "objective",
                    "status",
                    "version",
                    "amount_minor",
                    "currency",
                    "criteria",
                    "deadline",
                    "approvals",
                    "terms_digest",
                    "verification",
                    "human_review",
                    "critique",
                    "history",
                ]
                snapshots.append(
                    {
                        "id": id,
                        "label": label,
                        "agreement": {k: value.get(k) for k in keys},
                    }
                )

            def action(client, name, body):
                r = client.post(prefix + "/" + name, json=body)
                assert r.status_code == 200, (name, r.status_code)
                return r.json()

            save("request", "Customer request and agent authorization", current)
            current = action(seller, "authorize", {"confirmed": True})
            save("authorization", "Business authorizes its agent", current)
            current = action(buyer, "negotiate", {"confirmed": True})
            save("proposal", "Deterministic agents propose terms", current)
            approval = {
                "confirmed": True,
                "version": current["version"],
                "terms_digest": current["terms_digest"],
            }
            rejected = {
                "stale_version": buyer.post(
                    prefix + "/approve", json={**approval, "version": 2}
                ).status_code,
                "unauthorized_term_change": buyer.post(
                    prefix + "/approve", json={**approval, "amount_minor": 1}
                ).status_code,
                "unrelated_session_access": stranger.get(prefix).status_code,
            }
            current = action(buyer, "approve", approval)
            save("buyer_confirmation", "Customer confirms the exact version", current)
            current = action(seller, "approve", approval)
            save(
                "mutual_confirmation", "Business confirms the same fingerprint", current
            )
            current = action(seller, "evidence", {"html": HTML})
            save("verification", "Seller evidence receives structural checks", current)
            current = action(
                buyer,
                "review",
                {
                    "accepted": True,
                    "reason": "Fixture customer inspected the structural evidence; no payment authorized.",
                },
            )
            save("review", "Customer reviews the evidence", current)
            assert (
                current["status"] == "DEMO_COMPLETE"
                and current["payment_status"] == "NOT_CREATED"
            )
            assert seller.get(prefix).json()["status"] == "DEMO_COMPLETE"
            assert buyer.get(prefix).json()["history"] == current["history"]
            assert rejected == {
                "stale_version": 409,
                "unauthorized_term_change": 422,
                "unrelated_session_access": 404,
            }
            return {
                "schema_version": 1,
                "execution": "recorded_deterministic_backend_fixture",
                "recorded_at": now(),
                "model_calls": 0,
                "provider_calls": 0,
                "payment_status": "NOT_CREATED",
                "backend_source_commit": subprocess.check_output(
                    ["git", "rev-parse", "HEAD"], cwd=BACKEND, text=True
                ).strip(),
                "generator_sha256": hashlib.sha256(
                    Path(__file__).read_bytes()
                ).hexdigest(),
                "service": {"title": "Studio landing page", "asking_minor": 36000},
                "snapshot_source": "Actual FastAPI responses from isolated fixture sessions; allowlist projection omits identity IDs, session data and private limits.",
                "limitations": [
                    "Separate deterministic fixture, not the genuine AI negotiation or the historical PayPal transaction.",
                    "Controls reveal captured states; they do not constitute real human authorization or create a contract.",
                    "Structural checks do not prove visual quality, accessibility or legal compliance.",
                ],
                "rejected_requests": rejected,
                "snapshots": snapshots,
            }


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    if args.output.exists():
        parser.error("Preserve existing evidence; choose a new output path")
    result = capture()
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(result, indent=2) + "\n")
    print(
        json.dumps(
            {
                "snapshots": len(result["snapshots"]),
                "model_calls": 0,
                "provider_calls": 0,
                "payment_status": result["payment_status"],
                "rejected_requests": result["rejected_requests"],
            }
        )
    )
