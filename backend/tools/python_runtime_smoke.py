"""Offline entrypoint import smoke; never connects to storage or providers."""

import importlib.metadata
import importlib.util
import json
import os
import sys
from pathlib import Path
from unittest.mock import patch

os.environ.update(
    VERCEL="1",
    PUBLIC_DEMO="true",
    ENABLE_LIVE_OPERATIONS="false",
    APP_SESSION_SECRET="sanitized-fixture-session-key-32-characters",
    PACT_DATABASE_URL="",
    DATABASE_URL="postgresql://fixture.invalid/pact",
    PUBLIC_ORIGIN="",
    VERCEL_URL="pact-fixture.vercel.app",
    VERCEL_ENV="preview",
    SECURE_COOKIES="false",
    APP_ACCESS_PASSWORD="",
    LLM_MAX_CALLS="0",
    LLM_BUDGET_USD="0",
    OPENAI_API_KEY="",
    PAYPAL_CLIENT_ID="",
    PAYPAL_CLIENT_SECRET="",
)
import psycopg
from fastapi.testclient import TestClient

with patch.object(psycopg, "connect", side_effect=RuntimeError("blocked")) as db:
    spec = importlib.util.spec_from_file_location(
        "compat_entry", str(Path(__file__).resolve().parents[2] / "api/index.py")
    )
    m = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(m)
    r = TestClient(m.app).get("/api/version")
    print(
        json.dumps(
            {
                "python": sys.version.split()[0],
                "dependencies": {
                    n: importlib.metadata.version(n)
                    for n in [
                        "fastapi",
                        "pydantic",
                        "pydantic-core",
                        "psycopg",
                        "psycopg-binary",
                    ]
                },
                "status": r.status_code,
                "application": r.json().get("application"),
                "database_calls": db.call_count,
            }
        )
    )
    assert r.status_code == 200 and db.call_count == 0
