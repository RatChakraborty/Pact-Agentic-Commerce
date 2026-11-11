from pathlib import Path

import pytest
from app.config import Settings, settings
from app.main import app
from fastapi.testclient import TestClient
from test_workflow import new, post


@pytest.fixture
def public(client, monkeypatch):
    monkeypatch.setattr(settings, "public_demo", True)

    def forbidden(*args, **kwargs):
        raise AssertionError("Public demo called a live provider")

    monkeypatch.setattr("app.main.paypal.create", forbidden)
    monkeypatch.setattr("app.main.paypal.get", forbidden)
    monkeypatch.setattr("app.agents.provider.offer", forbidden)
    monkeypatch.setattr("app.critique.ModelCritic.review", forbidden)
    return client


def test_public_complete_demo_never_calls_provider(public):
    assert public.get("/api/health").json()["public_demo"]
    a = new(public)
    assert a["demo"]
    a = post(public, a, "negotiate").json()
    assert a["status"] == "PROPOSED"
    a = post(public, a, "accept", {"version": 1, "confirmed": True}).json()
    assert (
        post(public, a, "invoice", {"version": 1, "confirmed": True}).status_code == 403
    )
    a = post(public, a, "demo-milestone", {"version": 1, "confirmed": True}).json()
    assert a["status"] == "AWAITING_EVIDENCE"
    example = public.get("/api/demo/example").json()["html"]
    a = post(public, a, "evidence", {"html": example}).json()
    assert a["status"] == "VERIFIED"
    assert a["invoice"] is None
    assert (
        post(
            public, a, "payment-approval", {"version": 1, "confirmed": True}
        ).status_code
        == 403
    )
    assert post(public, a, "paypal-status").status_code == 403
    history = public.get(f"/api/agreements/{a['id']}/audit").json()
    assert "demo_milestone_opened" in [e["action"] for e in history]
    restored = TestClient(app, headers={"X-Pact-Action": "1"})
    restored.cookies.update(public.cookies)
    assert restored.get("/api/agreements").json()[0]["status"] == "VERIFIED"
    other = TestClient(app, headers={"X-Pact-Action": "1"})
    assert other.get("/api/agreements/" + a["id"]).status_code == 404


def test_public_cannot_select_live_or_bypass_demo_flag(public):
    response = public.post(
        "/api/agreements",
        json={
            "buyer_email": "b@example.com",
            "seller_email": "s@example.com",
            "deadline": "2099-01-01T00:00:00Z",
            "mode": "live",
        },
    )
    assert response.status_code == 403
    a = new(public, demo=False)
    assert a["demo"]
    a = post(public, a, "negotiate").json()
    assert post(public, a, "critique", {"mode": "live"}).status_code == 403


def test_public_recipient_swap_is_audited(public):
    a = new(public)
    a = post(public, a, "negotiate", {"scenario": "recipient-swap"}).json()
    assert a["status"] == "NEGOTIATION_FAILED"
    assert "Recipient" in a["negotiation_error"]
    assert (
        public.get(f"/api/agreements/{a['id']}/audit").json()[-1]["action"]
        == "negotiation_blocked"
    )


def test_public_limits_survive_new_clients(public):
    a = new(public)
    for _ in range(35):
        response = post(public, a, "cancel")
        if response.status_code == 429:
            break
    assert response.status_code == 429
    restored = TestClient(app, headers={"X-Pact-Action": "1"})
    restored.cookies.update(public.cookies)
    assert post(restored, a, "cancel").status_code == 429


def test_public_storage_failure_does_not_fallback(public, monkeypatch, tmp_path):
    monkeypatch.setattr(
        settings,
        "pact_database_url",
        "postgresql://no_user:no_secret@127.0.0.1:9/missing",
    )
    monkeypatch.setattr(settings, "database_path", str(tmp_path / "must-not-exist.db"))
    response = public.get("/api/agreements")
    assert response.status_code == 503
    assert "no_secret" not in response.text
    assert not (tmp_path / "must-not-exist.db").exists()


def test_vercel_refuses_ephemeral_database(monkeypatch):
    from pydantic import ValidationError

    with pytest.raises(ValidationError):
        Settings(
            vercel=True,
            public_demo=True,
            pact_database_url="",
            app_session_secret="x" * 32,
            public_origin="https://pact.vercel.app",
        )


def test_recorded_evidence_never_performs_live_requests(public):
    result = public.get("/api/evidence")
    assert result.status_code == 200
    assert result.json()["sandbox_payment"]["status"] == "PAID"
    assert "separate" in result.json()["note"]


def test_developer_controls_are_not_in_product(public):
    assert public.post("/__test/provider-paid", json={}).status_code in {404, 405}


def test_oversized_stream_is_blocked_before_state_write(public):
    response = public.post("/api/agreements", content=b"x" * 120001)
    assert response.status_code == 413


def test_vercel_settings_force_secure_sessions_and_do_not_need_provider_credentials(
    monkeypatch,
):
    monkeypatch.setenv("VERCEL_URL", "pact-isolated-preview.vercel.app")
    configured = Settings(
        vercel=True,
        public_demo=True,
        pact_database_url="postgresql://not-used-in-this-test/pact",
        app_session_secret="x" * 32,
        public_origin="",
    )
    assert configured.secure_cookies
    assert configured.public_origin == "https://pact-isolated-preview.vercel.app"


def test_vercel_function_entrypoint_exports_actual_api(public):
    import importlib.util

    path = Path(__file__).resolve().parents[2] / "api" / "index.py"
    spec = importlib.util.spec_from_file_location("pact_vercel_test", path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    c = TestClient(module.app)
    assert c.get("/api/health").json()["application"] == "pact"


def test_settings_validation_does_not_echo_secret_inputs():
    with pytest.raises(ValueError) as error:
        Settings(
            vercel=True,
            public_demo=True,
            pact_database_url="not-a-dsn-PRIVATE-TEST",
            app_session_secret="secret-PRIVATE-TEST",
        )
    assert "not-a-dsn-PRIVATE-TEST" not in str(error.value)
    assert "secret-PRIVATE-TEST" not in str(error.value)


def test_public_live_switch_requires_strong_operator_secret():
    with pytest.raises(ValueError):
        Settings(
            public_demo=True, enable_live_operations=True, app_access_password="short"
        )


def test_hosted_probe_refuses_other_projects_before_any_write(monkeypatch):
    import httpx
    from tools import check_hosted

    requests = []
    original = httpx.Client

    def respond(request):
        requests.append(request)
        return httpx.Response(
            200,
            json={
                "application": "other-project",
                "public_demo": True,
                "storage": "postgresql",
            },
        )

    monkeypatch.setattr(
        check_hosted.httpx,
        "Client",
        lambda **kw: original(transport=httpx.MockTransport(respond), **kw),
    )
    with pytest.raises(ValueError, match="Refusing writes"):
        check_hosted.check("https://not-pact.vercel.app")
    assert len(requests) == 1 and requests[0].method == "GET"


def test_postgres_hosted_tls_cannot_be_disabled(monkeypatch):
    import psycopg
    from app import postgres

    seen = {}

    def connect(url, **kwargs):
        seen.update(kwargs)
        raise psycopg.OperationalError("deliberate test failure")

    monkeypatch.setattr(postgres.psycopg, "connect", connect)
    with (
        pytest.raises(postgres.StorageUnavailable),
        postgres.transaction("postgresql://user:dummy@localhost/pact", hosted=True),
    ):
        pass
    assert seen["sslmode"] == "verify-full" and seen["sslrootcert"] == "system"
