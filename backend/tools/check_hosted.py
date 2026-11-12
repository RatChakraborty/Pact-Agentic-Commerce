"""Anonymous public-demo acceptance probe. Never invokes live AI or PayPal.
Requires a URL explicitly identifying as Pact/public demo before any mutations.
"""

import argparse
import json
import re
from datetime import UTC, datetime, timedelta
from pathlib import Path
from urllib.parse import urlparse

import httpx


def check(url, allow_local=False, expected_commit=None):
    if expected_commit is not None and not re.fullmatch(
        r"[0-9a-f]{40}", expected_commit
    ):
        raise ValueError("Expected deployment commit must be a full lowercase Git SHA.")
    parsed = urlparse(url)
    if parsed.scheme != "https" and not (
        allow_local and parsed.hostname in {"127.0.0.1", "localhost"}
    ):
        raise ValueError(
            "Use HTTPS for a hosted target; --allow-local is only for loopback testing."
        )
    if (
        parsed.username
        or parsed.password
        or parsed.query
        or parsed.fragment
        or parsed.path not in {"", "/"}
    ):
        raise ValueError("Provide an origin without credentials, query, or path.")
    results = {}
    with httpx.Client(
        base_url=url.rstrip("/"),
        timeout=30,
        headers={"X-Pact-Action": "1", "Origin": url.rstrip("/")},
    ) as c:
        health = c.get("/api/health")
        health.raise_for_status()
        metadata = health.json()
        if (
            metadata.get("status") != "ok"
            or metadata.get("application") != "pact"
            or metadata.get("public_demo") is not True
            or metadata.get("storage") != "postgresql"
        ):
            raise ValueError(
                "Refusing writes: target is not the Pact public PostgreSQL demo."
            )
        release = metadata.get("release", {})
        if expected_commit is not None and release.get("commit") != expected_commit:
            raise ValueError(
                "Refusing writes: deployment commit does not match expected release."
            )
        results["health"] = True
        page = c.get("/")
        page.raise_for_status()
        assert '<div id="root">' in page.text
        results["frontend"] = True
        body = {
            "buyer_email": "buyer@demo.example.com",
            "seller_email": "seller@demo.example.com",
            "deadline": (datetime.now(UTC) + timedelta(days=7)).isoformat(),
        }
        response = c.post("/api/agreements", json=body)
        response.raise_for_status()
        a = response.json()
        prefix = "/api/agreements/" + a["id"]
        assert a["demo"] is True
        results["creation"] = True
        response = c.post(prefix + "/negotiate", json={})
        response.raise_for_status()
        a = response.json()
        assert a["status"] == "PROPOSED"
        results["negotiation"] = True
        wrong = c.post(
            prefix + "/accept",
            json={"version": 1, "confirmed": True, "terms_digest": "wrong"},
        )
        assert wrong.status_code == 409
        results["fingerprint_rejection"] = True
        approve = {
            "version": a["version"],
            "confirmed": True,
            "terms_digest": a["terms_digest"],
        }
        response = c.post(prefix + "/accept", json=approve)
        response.raise_for_status()
        response = c.post(prefix + "/demo-milestone", json=approve)
        response.raise_for_status()
        example = c.get("/api/demo/example").json()["html"]
        response = c.post(prefix + "/evidence", json={"html": example})
        response.raise_for_status()
        a = response.json()
        assert a["status"] == "VERIFIED" and a["invoice"] is None
        results["verification_without_provider"] = True
        assert c.post(prefix + "/invoice", json=approve).status_code == 403
        assert c.post(prefix + "/payment-approval", json=approve).status_code == 403
        assert (
            c.post("/api/agreements", json={**body, "mode": "live"}).status_code == 403
        )
        results["anonymous_paid_capabilities_blocked"] = True
        assert (
            c.post(
                prefix + "/cancel", headers={"Origin": "https://other.invalid"}, json={}
            ).status_code
            == 403
        )
        results["cross_origin_rejected"] = True
        history = c.get(prefix + "/audit")
        history.raise_for_status()
        assert any(e["action"] == "artifact_verified" for e in history.json())
        results["persistent_audit"] = True
        # A second independent client has no access; a restored signed session does.
        with httpx.Client(base_url=url, timeout=30) as stranger:
            assert stranger.get(prefix).status_code == 404
        with httpx.Client(base_url=url, cookies=c.cookies, timeout=30) as restored:
            assert restored.get(prefix).json()["status"] == "VERIFIED"
        results["visitor_isolation_and_session_restore"] = True
        assert c.post("/__test/provider-paid", json={}).status_code in {404, 405}
        results["test_controls_absent"] = True
        return {
            "target": url,
            "environment": "local_public_mode" if allow_local else "deployed_public",
            "checked_at": datetime.now(UTC).isoformat(),
            "release": {
                k: release[k]
                for k in ["commit", "branch", "environment", "python_version"]
                if k in release
            },
            "results": results,
            "limitations": [
                "Does not independently force a Vercel cold start or verify platform deployment protection.",
                "No provider calls or actual invoices/payments were made.",
            ],
        }


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("url")
    parser.add_argument("--allow-local", action="store_true")
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument(
        "--expected-commit",
        help="Require this full deployed SHA before any demo writes",
    )
    args = parser.parse_args()
    report = check(args.url, args.allow_local, args.expected_commit)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(report, indent=2) + "\n")
    print(json.dumps(report, indent=2))
