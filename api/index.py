"""Vercel ASGI entrypoint with sanitized, fail-closed startup diagnostics."""

import json
import logging
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "backend"))

try:
    from app.main import app as _application
except Exception as exc:  # noqa: BLE001 - fail-closed ASGI startup boundary
    # Import/configuration failures used to leave a platform HTML response. Return
    # JSON 503 instead; never pretend storage or startup succeeded, never log DSNs.
    from app.deployment import release
    from app.startup import describe_failure
    from fastapi import FastAPI
    from fastapi.responses import JSONResponse

    category = (
        "CONFIGURATION_INVALID"
        if type(exc).__name__ == "ValidationError"
        else "DEPENDENCY_IMPORT_FAILED"
        if isinstance(exc, ImportError)
        else "APPLICATION_STARTUP_FAILED"
    )
    diagnostics = describe_failure(exc)
    logging.getLogger("pact.startup").error(
        "PACT_STARTUP_FAILED code=%s type=%s commit=%s diagnostics=%s",
        category,
        type(exc).__name__,
        release()["commit"],
        json.dumps(diagnostics, sort_keys=True),
    )
    _application = FastAPI(title="Pact startup failure")

    @_application.api_route(
        "/{path:path}", methods=["GET", "POST", "PUT", "PATCH", "DELETE"]
    )
    def startup_failed(path: str):
        return JSONResponse(
            {
                "detail": "The interactive service could not start. Use the recorded demo while configuration is reviewed.",
                "code": category,
                "diagnostics": diagnostics,
                "release": release(),
                "status": "error",
            },
            status_code=503,
            headers={"Cache-Control": "no-store", "X-Content-Type-Options": "nosniff"},
        )


# Vercel statically discovers only module-level app/application exports.
app = _application
