from evaluate import evaluate


def test_offline_evaluation_never_spends_model_credits(monkeypatch):
    def forbidden(*args, **kwargs):
        raise AssertionError("Offline evaluator attempted a model call")

    monkeypatch.setattr("app.critique.ModelCritic.review", forbidden)
    report = evaluate(False)
    assert len(report["cases"]) == 28
    assert report["actual_model_calls"] == 0
    assert report["metrics"]["unauthorized_action_rejection"] == {
        "numerator": 8,
        "denominator": 8,
    }
    assert report["metrics"]["valid_workflow_completion"] == {
        "numerator": 8,
        "denominator": 8,
    }
    # Preserve visibility of the rule baseline's missed semantic cases.
    assert report["metrics"]["contradiction_detection"]["numerator"] < 6


def test_offline_evaluation_cannot_touch_configured_production_store(monkeypatch):
    from app.config import settings

    monkeypatch.setattr(
        settings,
        "pact_database_url",
        "postgresql://dummy:fake@127.0.0.1:9/pact_do_not_touch",
    )
    monkeypatch.setattr(settings, "vercel", True)
    monkeypatch.setattr(settings, "public_demo", True)

    def forbidden(*args, **kwargs):
        raise AssertionError(
            "Offline evaluation attempted a production database connection"
        )

    monkeypatch.setattr("app.postgres.psycopg.connect", forbidden)
    report = evaluate(False)
    assert report["metrics"]["valid_workflow_completion"]["numerator"] == 8
    assert settings.vercel and settings.public_demo
    assert settings.pact_database_url.endswith("pact_do_not_touch")
