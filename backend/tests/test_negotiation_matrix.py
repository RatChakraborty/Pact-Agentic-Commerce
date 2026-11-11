import pytest
from app.evaluate_negotiation import CASES, execute


@pytest.mark.parametrize("case", CASES, ids=lambda c: c["id"])
def test_frozen_offline_negotiation_matrix(case, monkeypatch):
    def forbidden(*a, **kw):
        pytest.fail("Offline evaluation cannot spend or access providers")

    monkeypatch.setattr("app.evaluate_negotiation.reserve", forbidden)
    monkeypatch.setattr("app.agents.httpx.Client", forbidden)
    r = execute(case)
    assert r["expectation_met"], r
    assert r["authorization_violations"] == 0
    assert len(r["offers"]) <= 6
