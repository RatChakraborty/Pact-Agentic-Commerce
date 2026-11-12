"""Value-free diagnostics available even when Settings/app.main cannot import."""

import os
import re
from pathlib import Path
from urllib.parse import urlparse


def boolean(name, default=False):
    raw = os.environ.get(name)
    if raw is None:
        return default
    if raw.lower().strip() in {"1", "true", "yes", "on"}:
        return True
    if raw.lower().strip() in {"0", "false", "no", "off"}:
        return False
    return None


def configuration_report():
    """Report constraints/readiness, never values, lengths, URLs or hostnames.

    Hosted configuration is environment-only: deployment excludes local .env.
    This is diagnostic advice; Settings remains the authoritative validator.
    """
    vercel = boolean("VERCEL")
    public = boolean("PUBLIC_DEMO")
    live = boolean("ENABLE_LIVE_OPERATIONS")
    source = (
        "PACT_DATABASE_URL" if os.environ.get("PACT_DATABASE_URL") else "DATABASE_URL"
    )
    database = os.environ.get(source, "")
    explicit_origin = os.environ.get("PUBLIC_ORIGIN", "")
    host_key = (
        "VERCEL_PROJECT_PRODUCTION_URL"
        if os.environ.get("VERCEL_ENV") == "production"
        else "VERCEL_URL"
    )
    origin = explicit_origin or (
        "https://" + os.environ[host_key] if os.environ.get(host_key) else ""
    )
    try:
        parsed = urlparse(origin)
        valid_origin = (
            parsed.scheme == "https"
            and bool(parsed.hostname)
            and not any([parsed.path, parsed.query, parsed.fragment, parsed.username])
        )
    except ValueError:
        valid_origin = False
    session_ready = len(os.environ.get("APP_SESSION_SECRET", "")) >= 32
    password_ready = len(os.environ.get("APP_ACCESS_PASSWORD", "")) >= 20
    problems = []
    for name in ["VERCEL", "PUBLIC_DEMO", "ENABLE_LIVE_OPERATIONS", "SECURE_COOKIES"]:
        if boolean(name) is None:
            problems.append(name + "_INVALID_BOOLEAN")
    if vercel:
        if public is not True:
            problems.append("PUBLIC_DEMO_REQUIRED")
        if not database:
            problems.append("DATABASE_URL_REQUIRED")
        elif not database.startswith(("postgres://", "postgresql://")):
            problems.append(source + "_INVALID_SCHEME")
    if vercel or boolean("SECURE_COOKIES"):
        if not session_ready:
            problems.append("APP_SESSION_SECRET_MISSING_OR_SHORT")
        if not valid_origin:
            problems.append(
                "PUBLIC_ORIGIN_INVALID"
                if explicit_origin
                else "HOSTED_ORIGIN_UNAVAILABLE"
            )
        if not public and not password_ready:
            problems.append("PRIVATE_OPERATOR_PASSWORD_REQUIRED")
    if public and live and not password_ready:
        problems.append("LIVE_OPERATOR_PASSWORD_REQUIRED")
    return {
        "problems": problems,
        "database_source": source if database else "missing",
        "database_scheme_valid": database.startswith(("postgres://", "postgresql://")),
        "session_secret_ready": session_ready,
        "hosted_origin_ready": bool(valid_origin),
        "public_demo": public,
        "live_operations_enabled": live,
        "backend_main_packaged": Path(__file__).with_name("main.py").is_file(),
        "database_connection_attempted_by_diagnostic": False,
    }


def describe_failure(exc):
    report = configuration_report()
    report["exception_type"] = type(exc).__name__
    module = getattr(exc, "name", None)
    if (
        isinstance(exc, ImportError)
        and module
        and re.fullmatch(r"[A-Za-z_][A-Za-z0-9_.]{0,99}", module)
    ):
        report["missing_module"] = module
    trace = exc.__traceback__
    while trace:
        file = Path(trace.tb_frame.f_code.co_filename)
        if file.parent == Path(__file__).parent:
            report["location"] = file.name + ":" + str(trace.tb_lineno)
        trace = trace.tb_next
    if type(exc).__name__ == "ValidationError":
        try:
            report["invalid_fields"] = sorted(
                {
                    str(part)
                    for error in exc.errors(
                        include_input=False, include_context=False, include_url=False
                    )
                    for part in error.get("loc", [])
                    if isinstance(part, str) and re.fullmatch("[a-z_]{1,50}", part)
                }
            )
        except (TypeError, AttributeError):
            report["invalid_fields"] = []
    return report
