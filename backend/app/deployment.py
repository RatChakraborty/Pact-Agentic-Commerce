"""Public release metadata only; never environment dumps or credential values."""

import json
import os
from pathlib import Path


def release():
    try:
        built = json.loads(Path(__file__).with_name("build_info.json").read_text())
    except (OSError, ValueError):
        built = {}
    return {
        "commit": os.environ.get("VERCEL_GIT_COMMIT_SHA")
        or built.get("commit", "unknown"),
        "branch": os.environ.get("VERCEL_GIT_COMMIT_REF")
        or built.get("branch", "unknown"),
        "environment": os.environ.get("VERCEL_ENV", "local"),
        "api_contract": "pact-v2-personas",
    }
