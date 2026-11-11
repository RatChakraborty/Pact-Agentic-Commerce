"""Actual PostgreSQL tests. Require a dedicated *_test database, never production."""

import os
import subprocess
import sys
from concurrent.futures import ThreadPoolExecutor
from urllib.parse import urlparse

import pytest
from app.ai import ModelError, reserve
from app.config import settings
from app.main import app
from app.store import transaction
from fastapi.testclient import TestClient
from test_workflow import FakePayPal, accepted, post


@pytest.fixture
def pg(monkeypatch):
    url = os.environ.get("PACT_TEST_DATABASE_URL")
    if not url:
        pytest.skip("Dedicated PostgreSQL test database not configured")
    if not (
        urlparse(url).path.rsplit("/", 1)[-1].startswith("pact_")
        and urlparse(url).path.endswith("_test")
    ):
        pytest.fail("Refusing to reset a database not explicitly named *_test")
    monkeypatch.setattr(settings, "pact_database_url", url)
    monkeypatch.setattr(settings, "public_demo", False)
    with transaction() as db:
        db.execute(
            "TRUNCATE pact.agreements, pact.audit, pact.usage, pact.budget, pact.ai_reservations, pact.ai_observations, pact.sessions, pact.throttles, pact.demo_records RESTART IDENTITY CASCADE"
        )
    return url


def client_copy(c):
    result = TestClient(app, headers={"X-Pact-Action": "1"})
    result.cookies.update(c.cookies)
    return result


def test_postgres_concurrent_acceptance_is_idempotent(pg):
    from test_workflow import proposed

    c = TestClient(app, headers={"X-Pact-Action": "1"})
    a = proposed(c)
    with ThreadPoolExecutor(max_workers=4) as pool:
        responses = list(
            pool.map(
                lambda _: post(
                    client_copy(c), a, "accept", {"version": 1, "confirmed": True}
                ),
                range(4),
            )
        )
    assert all(r.status_code == 200 for r in responses)
    with transaction() as db:
        assert (
            db.execute(
                "SELECT COUNT(*) FROM audit WHERE action='buyer_accepted_terms'"
            ).fetchone()[0]
            == 1
        )


def test_postgres_concurrent_invoice_calls_create_once(pg, monkeypatch):
    fake = FakePayPal()
    monkeypatch.setattr("app.main.paypal", fake)
    c = TestClient(app, headers={"X-Pact-Action": "1"})
    a = accepted(c)
    with ThreadPoolExecutor(max_workers=4) as pool:
        responses = list(
            pool.map(
                lambda _: post(
                    client_copy(c), a, "invoice", {"version": 1, "confirmed": True}
                ),
                range(4),
            )
        )
    assert all(r.status_code == 200 for r in responses)
    assert fake.created == 1


def test_postgres_shared_budget_is_atomic_across_connections_and_restart(
    pg, monkeypatch
):
    monkeypatch.setattr(settings, "llm_max_calls", 4)
    monkeypatch.setattr(settings, "llm_budget_usd", 1)

    def attempt(_):
        try:
            reserve(purpose="concurrency_test")
            return True
        except ModelError:
            return False

    with ThreadPoolExecutor(max_workers=8) as pool:
        results = list(pool.map(attempt, range(8)))
    assert sum(results) == 4
    env = {**os.environ, "PACT_DATABASE_URL": pg}
    run = subprocess.run(
        [
            sys.executable,
            "-c",
            "from app.store import transaction\nwith transaction() as db: print(db.execute('SELECT calls FROM usage WHERE id=1').fetchone()[0])",
        ],
        env=env,
        text=True,
        capture_output=True,
        check=True,
    )
    assert run.stdout.strip() == "4"


def test_postgres_public_flow_persists_and_isolated(pg, monkeypatch):
    from test_public_demo import test_public_complete_demo_never_calls_provider

    monkeypatch.setattr(settings, "public_demo", True)
    c = TestClient(app, headers={"X-Pact-Action": "1"})
    test_public_complete_demo_never_calls_provider(c)


def test_postgres_audit_is_append_only(pg):

    c = TestClient(app, headers={"X-Pact-Action": "1"})
    accepted(c)
    from app.postgres import StorageUnavailable

    with pytest.raises(StorageUnavailable), transaction() as db:
        db.execute("DELETE FROM audit")
    with transaction() as db:
        assert db.execute("SELECT COUNT(*) FROM audit").fetchone()[0] > 0


def test_postgres_shared_two_persona_lifecycle(pg, monkeypatch):
    from test_two_sided import (
        test_two_persona_end_to_end_roles_privacy_and_payment_truth,
    )

    c = TestClient(app, headers={"X-Pact-Action": "1"})
    test_two_persona_end_to_end_roles_privacy_and_payment_truth(c, monkeypatch)
