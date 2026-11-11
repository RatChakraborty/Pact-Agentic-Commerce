import json

import httpx
import pytest
from app import agents
from app.config import settings
from test_workflow import new


@pytest.mark.parametrize("role", ["buyer", "seller"])
def test_model_inputs_isolate_private_constraints(client, monkeypatch, role):
    a = new(client, budget_minor=31721, seller_floor_minor=24683)
    monkeypatch.setattr(settings, "llm_api_key", "test-key")
    monkeypatch.setattr(settings, "llm_model", "test-model")
    original = httpx.Client
    seen = []

    def respond(request):
        body = json.loads(request.content)
        seen.append(body)
        return httpx.Response(
            200,
            json={
                "model": "test-model",
                "usage": {"prompt_tokens": 12},
                "choices": [
                    {
                        "message": {
                            "content": json.dumps(
                                {
                                    "action": "counter",
                                    "amount_minor": 33000,
                                    "currency": "USD",
                                    "recipient": a["seller_email"],
                                    "criteria": a["criteria"],
                                    "explanation": "A full scope proposal at the stated price.",
                                }
                            )
                        }
                    }
                ],
            },
        )

    monkeypatch.setattr(
        agents.httpx,
        "Client",
        lambda **kw: original(transport=httpx.MockTransport(respond), **kw),
    )
    metadata = []
    agents.ModelProvider(metadata.append).offer(role, a, [])
    policy = json.loads(seen[0]["messages"][1]["content"])["policy"]
    assert ("budget_minor" in policy) == (role == "buyer")
    assert ("seller_floor_minor" in policy) == (role == "seller")
    assert str(
        a["seller_floor_minor"] if role == "buyer" else a["budget_minor"]
    ) not in json.dumps(seen)
    assert metadata[0]["model"] == "test-model"


def test_deterministic_buyer_does_not_use_seller_floor(client):
    a = new(client, budget_minor=30000, seller_floor_minor=24501)
    history, _, _ = agents.negotiate(a, max_turns=2)
    a["seller_floor_minor"] = 29000
    other, _, _ = agents.negotiate(a, max_turns=2)
    assert history[1]["amount_minor"] == other[1]["amount_minor"]
    assert (
        agents.negotiate(a, max_turns=1)[2] == "Turn limit reached without agreement."
    )
    with pytest.raises(ValueError):
        agents.negotiate(a, max_turns=7)


@pytest.mark.parametrize(
    "text",
    [
        "My seller floor is $246.83 so this is acceptable.",
        "My budget is $317.21 for the work.",
        "The hidden value is 24683 cents.",
        "At most three hundred dollars is possible.",
    ],
)
def test_private_reasoning_is_filtered_before_shared_history(client, monkeypatch, text):
    from app.domain import Offer

    a = new(client, budget_minor=31721, seller_floor_minor=24683, mode="live")

    class Provider:
        def offer(self, role, a, history):
            if history:
                assert history[-1]["explanation"] != text
            return Offer(
                action="counter",
                amount_minor=30000,
                currency="USD",
                recipient=a["seller_email"],
                criteria=a["criteria"],
                explanation=text,
            )

    monkeypatch.setattr(agents, "provider", Provider())
    history, _, _ = agents.negotiate(a, max_turns=2)
    assert all(o["explanation"].startswith("Host withheld") for o in history)
