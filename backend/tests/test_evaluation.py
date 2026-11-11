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
