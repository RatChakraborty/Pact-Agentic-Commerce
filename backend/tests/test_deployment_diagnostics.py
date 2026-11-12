import json
import os
import subprocess
import sys
from pathlib import Path

import psycopg
import pytest
from app import postgres
from app.main import app
from fastapi.testclient import TestClient


def test_version_is_database_independent(monkeypatch):
    def forbidden():
        pytest.fail("Version endpoint must not depend on PostgreSQL")

    monkeypatch.setattr("app.main.transaction", forbidden)
    monkeypatch.setenv("VERCEL_GIT_COMMIT_SHA", "a" * 40)
    r = TestClient(app).get("/api/version")
    assert r.status_code == 200
    assert r.json()["release"]["commit"] == "a" * 40
    assert r.json()["database_checked"] is False


def test_invalid_hosted_config_returns_json_503_without_secrets():
    path = Path(__file__).resolve().parents[2] / "api/index.py"
    code = f"""import importlib.util,json
from fastapi.testclient import TestClient
spec=importlib.util.spec_from_file_location("startup_probe",{str(path)!r})
m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
r=TestClient(m.app).get("/api/health")
print(json.dumps({{"status":r.status_code,"body":r.json(),"type":r.headers["content-type"]}}))
"""
    env = {
        **os.environ,
        "VERCEL": "1",
        "PUBLIC_DEMO": "true",
        "PACT_DATABASE_URL": "invalid-PRIVATE-DSN",
        "DATABASE_URL": "",
        "APP_SESSION_SECRET": "PRIVATE-SIGNING-VALUE",
    }
    result = subprocess.run(
        [sys.executable, "-c", code],
        env=env,
        text=True,
        capture_output=True,
        check=True,
    )
    r = json.loads(result.stdout)
    assert r["status"] == 503 and r["body"]["status"] == "error"
    assert r["body"]["code"] == "CONFIGURATION_INVALID"
    assert r["type"].startswith("application/json")
    assert "PACT_STARTUP_FAILED" in result.stderr
    assert "PRIVATE-DSN" not in result.stderr + result.stdout
    assert "PRIVATE-SIGNING-VALUE" not in result.stderr + result.stdout


@pytest.mark.parametrize(
    "message,expected",
    [
        ("could not resolve hostname PRIVATE_DSN", "DNS_RESOLUTION_FAILED"),
        ("SSL certificate verification failed PRIVATE_DSN", "TLS_CONNECTION_FAILED"),
        ("connection timeout PRIVATE_DSN", "CONNECTION_TIMEOUT"),
    ],
)
def test_database_logs_classify_without_exposing_driver_message(
    monkeypatch, caplog, message, expected
):
    def bad(*a, **kw):
        raise psycopg.OperationalError(message)

    monkeypatch.setattr(postgres.psycopg, "connect", bad)
    with (
        pytest.raises(postgres.StorageUnavailable),
        postgres.transaction("postgresql://dummy/dummy"),
    ):
        pass
    assert expected in caplog.text and "PRIVATE_DSN" not in caplog.text


def test_spa_role_routes_do_not_intercept_unknown_api(client):
    for path in ["/customer", "/business", "/demo", "/try"]:
        result = client.get(path)
        assert (
            result.status_code == 200 and "text/html" in result.headers["content-type"]
        )
    assert client.get("/api/nonexistent").status_code == 404
