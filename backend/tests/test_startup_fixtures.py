"""Fresh interpreter fixtures reproduce hosted import failures before a DB call."""

import json
import os
import subprocess
import sys
from pathlib import Path

import pytest

ENTRY = Path(__file__).resolve().parents[2] / "api/index.py"
VALID = {
    "VERCEL": "1",
    "PUBLIC_DEMO": "true",
    "ENABLE_LIVE_OPERATIONS": "false",
    "APP_SESSION_SECRET": "sanitized-fixture-session-key-32-characters",
    "PACT_DATABASE_URL": "",
    "DATABASE_URL": "postgresql://fixture.invalid/pact",
    "PUBLIC_ORIGIN": "",
    "VERCEL_URL": "pact-fixture.vercel.app",
    "VERCEL_ENV": "preview",
    "SECURE_COOKIES": "false",
    "APP_ACCESS_PASSWORD": "",
    "LLM_MAX_CALLS": "0",
    "LLM_BUDGET_USD": "0",
}


def probe(overrides, block_module=None):
    code = """import importlib.util,json
from unittest.mock import patch
from fastapi.testclient import TestClient
import psycopg
"""
    if block_module:
        code += f"""import builtins
original_import=builtins.__import__
def guarded(name,*args,**kwargs):
 if name=={block_module!r}: raise ModuleNotFoundError("PRIVATE_IMPORT_ERROR",name=name)
 return original_import(name,*args,**kwargs)
builtins.__import__=guarded
"""
    code += f"""
with patch.object(psycopg,"connect",side_effect=RuntimeError("DATABASE_CONNECTION_MUST_NOT_OCCUR")) as db:
 spec=importlib.util.spec_from_file_location("fixture_entry",{str(ENTRY)!r})
 m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
 r=TestClient(m.app).get("/api/version")
 print(json.dumps({{"status":r.status_code,"body":r.json(),"database_calls":db.call_count}}))
"""
    result = subprocess.run(
        [sys.executable, "-c", code],
        env={**os.environ, **VALID, **overrides},
        capture_output=True,
        text=True,
        check=True,
    )
    for private in [
        "PRIVATE_IMPORT_ERROR",
        VALID["APP_SESSION_SECRET"],
        "postgresql://",
    ]:
        assert private not in result.stderr + result.stdout
    return json.loads(result.stdout)


def test_valid_vercel_neon_configuration_imports_without_contacting_database():
    r = probe({})
    assert r["status"] == 200 and r["body"]["application"] == "pact"
    assert r["database_calls"] == 0


@pytest.mark.parametrize(
    "overrides,problem",
    [
        ({"PUBLIC_DEMO": "false"}, "PUBLIC_DEMO_REQUIRED"),
        ({"APP_SESSION_SECRET": ""}, "APP_SESSION_SECRET_MISSING_OR_SHORT"),
        ({"APP_SESSION_SECRET": "short"}, "APP_SESSION_SECRET_MISSING_OR_SHORT"),
        ({"DATABASE_URL": ""}, "DATABASE_URL_REQUIRED"),
        ({"PACT_DATABASE_URL": "PRIVATE_LITERAL"}, "PACT_DATABASE_URL_INVALID_SCHEME"),
        ({"PUBLIC_ORIGIN": "https://example.invalid/"}, "PUBLIC_ORIGIN_INVALID"),
        ({"PUBLIC_ORIGIN": "http://example.invalid"}, "PUBLIC_ORIGIN_INVALID"),
        ({"PUBLIC_ORIGIN": "https://[invalid"}, "PUBLIC_ORIGIN_INVALID"),
        ({"PUBLIC_DEMO": "not-a-boolean"}, "PUBLIC_DEMO_INVALID_BOOLEAN"),
        ({"ENABLE_LIVE_OPERATIONS": "true"}, "LIVE_OPERATOR_PASSWORD_REQUIRED"),
    ],
)
def test_invalid_hosted_settings_fail_closed_with_actionable_value_free_diagnostics(
    overrides, problem
):
    r = probe(overrides)
    assert r["status"] == 503 and r["body"]["code"] == "CONFIGURATION_INVALID"
    assert problem in r["body"]["diagnostics"]["problems"]
    assert r["database_calls"] == 0


def test_bad_explicit_database_url_does_not_silently_use_a_different_database():
    r = probe(
        {
            "PACT_DATABASE_URL": "PRIVATE_LITERAL",
            "DATABASE_URL": "postgresql://fixture.invalid/pact",
        }
    )
    assert r["body"]["diagnostics"]["database_source"] == "PACT_DATABASE_URL"
    assert r["status"] == 503


def test_missing_runtime_dependency_is_classified_without_exposing_error_message():
    r = probe({}, "itsdangerous")
    assert r["status"] == 503 and r["body"]["code"] == "DEPENDENCY_IMPORT_FAILED"
    assert r["body"]["diagnostics"]["missing_module"] == "itsdangerous"
    assert r["database_calls"] == 0
