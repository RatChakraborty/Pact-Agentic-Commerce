"""Bounded structured critique transport, sharing the durable application budget."""

import json

import httpx

from .config import settings
from .domain import now
from .store import transaction


class ModelError(ValueError):
    pass


def reservation(count=1, max_tokens=None):
    tokens = max_tokens or settings.llm_max_tokens
    return (
        count
        * (
            settings.llm_max_input_bytes * settings.llm_input_usd_per_million
            + tokens * settings.llm_output_usd_per_million
        )
        / 1_000_000
    )


def reserve(count=1, max_tokens=None, purpose="critique"):
    with transaction() as db:
        calls = db.execute("SELECT calls FROM usage WHERE id=1").fetchone()[0]
        spent = db.execute("SELECT reserved_usd FROM budget WHERE id=1").fetchone()[0]
        cost = reservation(count, max_tokens)
        if (
            calls + count > settings.llm_max_calls
            or spent + cost > settings.llm_budget_usd
        ):
            raise ModelError(
                "AI call or estimated spending allowance exhausted. No model request made."
            )
        db.execute("UPDATE usage SET calls=calls+? WHERE id=1", (count,))
        db.execute("UPDATE budget SET reserved_usd=reserved_usd+? WHERE id=1", (cost,))
        db.execute(
            "INSERT INTO ai_reservations(timestamp,purpose,calls,reserved_usd) VALUES(?,?,?,?)",
            (now(), purpose, count, cost),
        )
    return cost


class StructuredModel:
    def complete(self, schema, messages, purpose, max_tokens=600):
        if not settings.llm_api_key or not settings.llm_model:
            raise ModelError("Live critique is not configured.")
        payload = {
            "model": settings.llm_model,
            "messages": messages,
            "max_completion_tokens": max_tokens,
            "response_format": {
                "type": "json_schema",
                "json_schema": {
                    "name": "critique",
                    "strict": True,
                    "schema": schema.model_json_schema(),
                },
            },
        }
        if len(json.dumps(payload).encode()) > settings.llm_max_input_bytes:
            raise ModelError("Critique input exceeds the configured bound.")
        reserve(max_tokens=max_tokens, purpose=purpose)
        try:
            with httpx.Client(timeout=30) as c:
                response = c.post(
                    "https://api.openai.com/v1/chat/completions",
                    headers={"Authorization": f"Bearer {settings.llm_api_key}"},
                    json=payload,
                )
            body = response.json()
            if response.status_code != 200:
                code = body.get("error", {}).get("code")
                raise ModelError(
                    f"Critique provider failed ({response.status_code}, {code if code in {'credit_balance_exhausted', 'insufficient_quota', 'rate_limit_exceeded'} else 'provider_error'})."
                )
            result = schema.model_validate_json(
                body["choices"][0]["message"]["content"]
            )
            usage = body.get("usage", {})
            estimate = (
                usage.get("prompt_tokens", 0) * settings.llm_input_usd_per_million
                + usage.get("completion_tokens", 0)
                * settings.llm_output_usd_per_million
            ) / 1_000_000
            metadata = {
                "model": body.get("model", settings.llm_model),
                "prompt_tokens": usage.get("prompt_tokens", 0),
                "completion_tokens": usage.get("completion_tokens", 0),
                "estimated_usd": estimate,
            }
            with transaction() as db:
                db.execute(
                    "INSERT INTO ai_observations(timestamp,purpose,data) VALUES(?,?,?)",
                    (now(), purpose, json.dumps(metadata)),
                )
            return result, metadata
        except (httpx.HTTPError, KeyError, ValueError, IndexError) as exc:
            with transaction() as db:
                db.execute(
                    "INSERT INTO ai_observations(timestamp,purpose,data) VALUES(?,?,?)",
                    (
                        now(),
                        purpose,
                        json.dumps(
                            {
                                "success": False,
                                "error": str(exc)
                                if isinstance(exc, ModelError)
                                else "Provider or validation failure",
                            }
                        ),
                    ),
                )
            if isinstance(exc, ModelError):
                raise
            raise ModelError(
                "Critique unavailable or malformed; human review is required."
            ) from None
