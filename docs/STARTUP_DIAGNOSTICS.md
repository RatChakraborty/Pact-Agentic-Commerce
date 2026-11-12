# Hosted startup diagnostics and acceptance status

The user reports Ready builds at core `a9c7494369fb7a78f6eabc47bc2efa0838589d2f` and redesign `17b47a25679cbe017c6fe44e29708441b08d6554`, followed by the startup fallback message in customer/business views. The actual deployed response SHA and exception category are **unknown**; those source heads are not substituted for a measured deployment SHA.

Fresh GET probes of the last-known supplied Preview (`pact-agentic-commerce-8b9e5vy1j-pact-83c7281c.vercel.app`) remain denied by the development proxy. This is not a Vercel-to-Neon error. Every requested hosted acceptance check is recorded **NOT VERIFIED** in [the 20-item matrix](evidence/hosted-startup-acceptance.json); the user-observed interactive failure is separately marked FAILED. No hosted agreement writes, database-reset fixtures, paid model calls or provider operations were attempted.

## Reproduction and diagnostics

Fresh-process sanitized fixtures reproduce missing PUBLIC_DEMO, missing/short APP_SESSION_SECRET, missing URL, invalid explicit URL overriding a valid Neon binding, invalid/trailing-slash PUBLIC_ORIGIN, invalid booleans and missing runtime dependencies. A fully configured Vercel fixture starts the actual API and serves `/api/version` with **zero database connections**. This proves those configuration failures can precede PostgreSQL; it does not identify the current hosted exception or prove hosted health.

The existing fail-closed fallback still returns JSON HTTP 503. Its original top-level `app` export remains discoverable by Vercel. Added value-free diagnostics in both response and `PACT_STARTUP_FAILED` logs report:

- `problems`: explicit setting-readiness codes, e.g. PUBLIC_DEMO_REQUIRED, APP_SESSION_SECRET_MISSING_OR_SHORT, PUBLIC_ORIGIN_INVALID, PACT_DATABASE_URL_INVALID_SCHEME.
- `database_source`: which variable takes precedence, never its value, hostname, username or connection string.
- `session_secret_ready`, `hosted_origin_ready`, typed public/live flags and whether `backend/app/main.py` was packaged.
- Missing Python module, validation field names and a Pact source file/line when available; never raw validation inputs, error messages or traceback locals.

Diagnostics are environment-only observations for hosted setup; Settings remains authoritative. A valid diagnostic fixture or `/api/version` is not `/api/health`. No validator, authentication boundary, HTTPS requirement or database fail-closed rule was relaxed.

## Exact account-side evidence still needed

On the **actual new Preview deployment** of the patched feature branch, open `/api/health` and provide only:

1. `code`, `release.commit`, and `diagnostics` from the JSON response, or the corresponding first `PACT_STARTUP_FAILED` log entry.
2. If no JSON is accessible, HTTP status, Content-Type, `x-vercel-id` and the first sanitized exception type/file/line. Do not send cookies, passwords, credential values or database URLs.
3. Confirm the deployment's exact branch/SHA and Preview-scoped presence of PUBLIC_DEMO=true; a stable APP_SESSION_SECRET with at least 32 characters; valid PACT_DATABASE_URL or Neon DATABASE_URL; ENABLE_LIVE_OPERATIONS=false; LLM_MAX_CALLS=0; LLM_BUDGET_USD=0. PUBLIC_ORIGIN must be an exact HTTPS origin without path/trailing slash, or blank so VERCEL_URL provides it.

A nonempty PACT_DATABASE_URL intentionally wins over DATABASE_URL. An invalid literal, quotation or placeholder in the explicit binding must be corrected/removed in that existing project's Preview settings, not silently redirected to another database. Root Directory remains repository root. Updated environment settings must be included in a fresh Preview.

The diagnostic helper `backend/tools/diagnose_preview.py` now includes the sanitized diagnostics. Once hosted `/api/health` genuinely returns `status=ok`, `application=pact`, `public_demo=true`, `storage=postgresql`, run guarded hosted acceptance and both browser roles. Do not call startup or deployment repaired before that result.

## Operator-only provider boundary reviewed

The existing private workflow supports a server-enforced Basic operator gate, HTTPS/session checks and owner-bound agreement access. Public capabilities require both an explicit enable switch and valid operator authentication; even then, public demo records remain nonpayable. Regression tests reject missing/wrong credentials, disabled capability, anonymous writes and attempted conversion of a public demo into a real invoice. The public ENABLE_LIVE_OPERATIONS setting remains disabled; no account setting was changed.

The original provider flow records explicit **buyer** approval, not two independent human confirmations. It creates the invoice before evidence verification, sends a draft during buyer-authorized handoff when needed, opens a real sandbox provider URL and reconciles provider state through validated GETs. New shared agreements require both human confirmations but intentionally have no provider-write adapter. These are distinct capabilities; neither is misrepresented as a fully deployed mutually approved paid workflow.

A safe hosted operator pathway still needs verified hosted startup, actual operator authentication/session testing, provider configuration and agreement ownership mapping. No additional invoice/payment should be created for filming. Until that is verified, use the read-only original contract/provider proof and keep live actions private. No escrow or automatic release is claimed.
