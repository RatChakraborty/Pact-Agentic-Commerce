"""Frozen adversarial evaluation. Offline by default; live model calls require a flag.
Run from backend/: python evaluate.py [--live-semantics] --output ../docs/evidence/evaluation.json
"""

import argparse
import json
import tempfile
from datetime import UTC, datetime, timedelta
from pathlib import Path
from unittest.mock import patch

from app import main
from app.config import settings
from app.critique import review
from app.store import transaction
from fastapi.testclient import TestClient

CASES = Path(__file__).parent / "evaluation_cases.json"


class MockPayPal:
    def __init__(self):
        self.created = 0
        self.state = "DRAFT"
        self.a = None

    def create(self, a):
        self.created += 1
        self.a = a
        return {"id": "INV2-EVALUATION"}

    def get(self, id):
        return {
            "id": id,
            "status": self.state,
            "amount": {
                "currency_code": "USD",
                "value": f"{self.a['amount_minor'] / 100:.2f}",
            },
            "invoicer": {"email_address": self.a["seller_email"]},
            "primary_recipients": [
                {"billing_info": {"email_address": self.a["buyer_email"]}}
            ],
        }

    def send(self, *args):
        self.state = "UNPAID"

    from app.paypal import PayPal

    validate = PayPal.validate
    public = PayPal.public


def brief(**overrides):
    return {
        "buyer_email": "buyer@example.com",
        "seller_email": "seller@example.com",
        "deadline": (datetime.now(UTC) + timedelta(days=7)).isoformat(),
        **overrides,
    }


def workflow_case(case):
    fake = MockPayPal()
    with patch.object(main, "paypal", fake):
        c = TestClient(
            main.app, base_url="https://testserver", headers={"X-Pact-Action": "1"}
        )
        a = c.post("/api/agreements", json=brief(**case.get("brief", {}))).json()
        prefix = "/api/agreements/" + a["id"]
        operation = case.get("operation", "legitimate")
        if operation == "approval_bypass":
            return (
                c.post(
                    prefix + "/invoice",
                    json={
                        "version": 1,
                        "confirmed": True,
                        "terms_digest": a.get("terms_digest"),
                    },
                ).status_code
                == 409
            )
        a = c.post(prefix + "/negotiate", json={}).json()
        if a["status"] != "PROPOSED":
            return False
        if operation == "version":
            return (
                c.post(
                    prefix + "/accept",
                    json={
                        "version": 2,
                        "confirmed": True,
                        "terms_digest": a.get("terms_digest"),
                    },
                ).status_code
                == 409
            )
        a = c.post(
            prefix + "/accept",
            json={
                "version": 1,
                "confirmed": True,
                "terms_digest": a.get("terms_digest"),
            },
        ).json()
        if operation == "legitimate":
            return a["status"] == "ACCEPTED"
        if operation in {"recipient", "currency", "amount", "scope"}:
            changes = {
                "recipient": ("seller_email", "intruder@example.com"),
                "currency": ("currency", "EUR"),
                "amount": ("amount_minor", a["amount_minor"] + 1),
                "scope": ("objective", "A materially different service scope."),
            }
            key, value = changes[operation]
            with transaction() as db:
                row = db.execute(
                    "SELECT data FROM agreements WHERE id=?", (a["id"],)
                ).fetchone()
                stored = json.loads(row["data"])
                stored[key] = value
                db.execute(
                    "UPDATE agreements SET data=? WHERE id=?",
                    (json.dumps(stored), a["id"]),
                )
            return (
                c.post(
                    prefix + "/invoice",
                    json={
                        "version": 1,
                        "confirmed": True,
                        "terms_digest": a.get("terms_digest"),
                    },
                ).status_code
                == 409
                and fake.created == 0
            )
        if operation == "duplicate_invoice":
            for _ in range(2):
                if (
                    c.post(
                        prefix + "/invoice",
                        json={
                            "version": 1,
                            "confirmed": True,
                            "terms_digest": a.get("terms_digest"),
                        },
                    ).status_code
                    != 200
                ):
                    return False
            return fake.created == 1
        if operation == "budget":
            # Injecting an unaffordable proposed amount must fail before acceptance/provider writes.
            with transaction() as db:
                row = db.execute(
                    "SELECT data FROM agreements WHERE id=?", (a["id"],)
                ).fetchone()
                stored = json.loads(row["data"])
                stored["amount_minor"] = stored["budget_minor"] + 100
                db.execute(
                    "UPDATE agreements SET data=? WHERE id=?",
                    (json.dumps(stored), a["id"]),
                )
            return (
                c.post(
                    prefix + "/invoice",
                    json={
                        "version": 1,
                        "confirmed": True,
                        "terms_digest": a.get("terms_digest"),
                    },
                ).status_code
                == 409
            )
    return False


def evaluate(live=False):
    cases = json.loads(CASES.read_text())
    results = []
    original = settings.database_path
    # All payment actions use a local fake and isolated DB, irrespective of the flag.
    for case in cases:
        if case["group"] in {"legitimate", "economic"}:
            with (
                tempfile.TemporaryDirectory() as d,
                patch.object(settings, "pact_database_url", ""),
                patch.object(settings, "vercel", False),
                patch.object(settings, "public_demo", False),
                patch.object(settings, "app_access_password", ""),
            ):
                settings.database_path = str(Path(d) / "evaluation.db")
                try:
                    passed = workflow_case(case)
                finally:
                    settings.database_path = original
        else:
            passed = None
        baseline = (
            "CLEAR" if case["group"] != "economic" else ("BLOCK" if passed else "ALLOW")
        )
        if case["group"] == "economic":
            system = baseline
            model = None
        else:
            a = {
                **brief(),
                "version": 1,
                "amount_minor": 30000,
                "currency": "USD",
                "budget_minor": 30000,
                "criteria": ["hero", "features", "contact"],
                "objective": "A responsive static landing page with hero, features and contact sections.",
            }
            result = review(a, case["text"], "live" if live else "rules")
            system = result["verdict"]
            model = result.get("metadata")
            if case["group"] == "legitimate" and not passed:
                system = "WORKFLOW_FAILED"
        expected = case["expected"]
        correct = system in expected and (
            not live or case["group"] == "economic" or model is not None
        )
        results.append(
            {
                "id": case["id"],
                "group": case["group"],
                "expected": expected,
                "baseline": baseline,
                "system": system,
                "correct": correct,
                "workflow_completed": passed if case["group"] == "legitimate" else None,
                "model": model,
                "critique_execution": result.get("execution")
                if case["group"] != "economic"
                else "deterministic_boundary",
                "critique_explanation": result.get("explanation")
                if case["group"] != "economic"
                else None,
            }
        )

    def metric(group, kind):
        selected = [r for r in results if r["group"] == group]
        return {
            "numerator": sum(kind(r) for r in selected),
            "denominator": len(selected),
        }

    models = [r["model"] for r in results if r["model"]]
    return {
        "execution": "live_model_with_deterministic_guardrails"
        if live
        else "deterministic_rules_only",
        "case_file_sha256": __import__("hashlib")
        .sha256(CASES.read_bytes())
        .hexdigest(),
        "cases": results,
        "metrics": {
            "valid_workflow_completion": metric(
                "legitimate", lambda r: bool(r["workflow_completed"])
            ),
            "valid_proposal_pass_rate": metric(
                "legitimate", lambda r: r["system"] == "CLEAR"
            ),
            "false_rejection": metric("legitimate", lambda r: r["system"] != "CLEAR"),
            "unauthorized_action_rejection": metric(
                "economic", lambda r: r["system"] == "BLOCK"
            ),
            "contradiction_detection": metric("semantic", lambda r: r["correct"]),
            "ambiguity_or_abstention": metric(
                "ambiguity",
                lambda r: r["correct"],
            ),
        },
        "actual_model_calls": len(models),
        "estimated_usd": sum(m["estimated_usd"] for m in models),
        "limitations": [
            "Small frozen demonstration set, not broad reliability evidence.",
            "Baseline and system retain identical transaction authorization controls.",
            "Economic cases use mocked PayPal; no external financial transactions occur.",
            "Cost is an estimate from usage tokens and configured rates, not verified billing.",
        ],
    }


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--live-semantics", action="store_true")
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    report = evaluate(args.live_semantics)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(report, indent=2) + "\n")
    print(
        json.dumps(
            {k: v for k, v in report.items() if k not in {"cases", "limitations"}},
            indent=2,
        )
    )
