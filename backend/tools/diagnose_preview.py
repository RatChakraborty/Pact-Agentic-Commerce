"""GET-only release/routing probe; no business/provider mutations or secret bodies."""

import argparse
import json
from urllib.parse import urlparse

import httpx


def diagnose(origin):
    parsed = urlparse(origin)
    if (
        parsed.scheme != "https"
        or parsed.username
        or parsed.password
        or parsed.query
        or parsed.fragment
        or parsed.path not in {"", "/"}
    ):
        raise ValueError(
            "Use an HTTPS origin only, without credentials or query parameters."
        )
    rows = []
    with httpx.Client(timeout=15, follow_redirects=False) as c:
        for path in [
            "/assets/pact-build.json",
            "/api/version",
            "/api/health",
            "/api/demo-market/persona",
        ]:
            row = {"path": path}
            try:
                r = c.get(origin.rstrip("/") + path)
                row.update(
                    status=r.status_code,
                    content_type=r.headers.get("content-type"),
                    vercel_id=r.headers.get("x-vercel-id"),
                )
                row["platform_codes"] = [
                    code
                    for code in [
                        "FUNCTION_INVOCATION_FAILED",
                        "DEPLOYMENT_NOT_FOUND",
                        "NOT_FOUND",
                        "AUTHENTICATION_REQUIRED",
                    ]
                    if code in r.text
                ]
                if "application/json" in r.headers.get("content-type", ""):
                    value = r.json()
                    if isinstance(value, dict):
                        row["metadata"] = {
                            key: value[key]
                            for key in [
                                "status",
                                "application",
                                "public_demo",
                                "storage",
                                "code",
                                "commit",
                                "branch",
                                "api_contract",
                                "release",
                            ]
                            if key in value
                        }
                    else:
                        row["json_kind"] = type(value).__name__
                else:
                    row["non_json"] = True
            except httpx.HTTPError as exc:
                row.update(
                    transport_failure=type(exc).__name__,
                    proxy_connect_denied="403 Forbidden" in str(exc),
                )
            rows.append(row)
    return {"origin": origin, "business_or_provider_writes": False, "requests": rows}


if __name__ == "__main__":
    p = argparse.ArgumentParser()
    p.add_argument("origin")
    args = p.parse_args()
    print(json.dumps(diagnose(args.origin), indent=2))
