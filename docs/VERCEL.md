# Existing Vercel / Neon deployment recovery

The user has created the dedicated **pact-agentic-commerce** Vercel project and connected its dedicated Neon database. Reuse these resources. Do not create another project/database or touch Nautilus.

Target Preview supplied by the user:
https://pact-agentic-commerce-8b9e5vy1j-pact-83c7281c.vercel.app/

## Latest hosted evidence — November 12, 2026

User-supplied health JSON confirms core ad31b00 runs Python 3.12.16 and fails configuration validation before storage access: PUBLIC_DEMO is false and APP_SESSION_SECRET is missing/short. Apply the Preview-scoped configuration repair in [startup diagnostics](STARTUP_DIAGNOSTICS.md). No Neon failure is established; persistence and both-persona hosted acceptance remain unverified.

## Historical direct-probe status — November 11, 2026

This execution environment cannot verify that deployment. Requests to `/` and `/api/health` failed at the outbound proxy with `Tunnel connection failed: 403 Forbidden`. That is a proxy CONNECT denial, **not** a Vercel application HTTP status. Read-only verified-TLS connection attempts using both configured Neon URLs failed DNS resolution. No hosted schema writes, destructive tests, or hosted acceptance mutations were attempted. See [deployment probe evidence](evidence/deployment-recovery-20261111.json).

The environment currently permits package registries, OpenAI and PayPal sandbox. It has no Neon TCP grant and no grant for this Preview hostname. Vercel CLI remains unauthenticated and no scoped Vercel token/connector is available. Database bindings are present; do not request replacement credentials merely because networking is blocked.

## Implemented recovery changes

- On Vercel in required public demo mode, explicit `PACT_DATABASE_URL` takes precedence. If absent, the existing integration-provided `DATABASE_URL` is used. Generic `DATABASE_URL` is ignored outside Vercel, avoiding accidental use of the hosted database in local tests.
- Missing/invalid PostgreSQL configuration fails startup. Connection errors return sanitized 503; there is no ephemeral SQLite fallback.
- Remote PostgreSQL requires `sslmode=verify-full` and system CA trust. Connections close after every transaction; automatic prepared statements are disabled for transaction-pool compatibility.
- Initialization uses the `pact` schema, transaction-scoped advisory locks and idempotent inserts. Accepted terms, sessions, audit, usage and reservations persist in PostgreSQL. Coarse locking and repeated idempotent schema initialization trade throughput/cold-start latency for a small demo's correctness; actual Neon latency is unverified.
- Vercel forces Secure, HttpOnly, SameSite=Strict cookies with a stable signing secret. Mutation origin checks accept the exact configured origin and exact platform-provided `VERCEL_URL` / `VERCEL_BRANCH_URL` hosts, not request-controlled host headers or arbitrary origins.
- Root Python requirements remain locked/exported; root `api/index.py`, `vercel.json`, static assets and frozen public receipts are preserved.

## Existing project configuration

Set these only on the dedicated existing Pact project, with **Preview** scope for `feature/pact-core`:

| Variable | Requirement |
| --- | --- |
| `PUBLIC_DEMO` | `true` |
| `PACT_DATABASE_URL` or `DATABASE_URL` | Existing dedicated Neon TLS URL; explicit Pact URL wins |
| `APP_SESSION_SECRET` | Stable random secret, at least 32 characters |
| `ENABLE_LIVE_OPERATIONS` | `false` |
| `LLM_MAX_CALLS`, `LLM_BUDGET_USD` | `0` recommended for public visitors |
| `PAYPAL_ENV` | `sandbox` |

Vercel provides `VERCEL=1`. Root Directory must be the repository root, not `frontend/`. Do not copy private provider keys to the anonymous demo. No additional OpenAI/PayPal/sponsor credentials are needed. Avoid stale `PUBLIC_ORIGIN`; the immutable deployment and branch aliases are supported automatically, while a custom domain requires its exact HTTPS origin.

## Minimum remaining account/environment actions

1. In this cloud environment's network settings, permit HTTPS to the exact Preview host above. Permit DNS/TCP to the host(s) in the already configured Neon pooled/unpooled URLs on port 5432. If CLI recovery is desired, permit `api.vercel.com` and authenticate only to the existing Pact project using a scoped token in secure settings or account login. Do not paste secrets in chat.
2. Inspect the **existing project's** latest Preview build/function logs, confirm the environment variables above have Preview scope, and redeploy `feature/pact-core` after the verified commit is pushed. Git-connected pushes may already trigger this Preview automatically; use the resulting real URL rather than inventing an alias.
3. If Vercel Deployment Protection requires login, adjust only this project's Preview access as appropriate for judges. A proxy denial here does not prove Deployment Protection is enabled.
4. Run the hosted acceptance probe below only after the target identifies as Pact/public/PostgreSQL. A healthy build alone is not acceptance. Keep the same session across a redeploy to verify durable agreement and audit history. Actual Neon schema initialization, cold starts and cross-function persistence remain unverified until these checks run.

```bash
cd backend
uv run --frozen python tools/check_hosted.py https://ACTUAL_PREVIEW_HOST \
  --output /tmp/pact-hosted-check.json
cd ../frontend
PACT_PUBLIC_DEMO=1 PACT_TEST_URL=https://ACTUAL_PREVIEW_HOST \
  PACT_CHROMIUM_PATH=/usr/bin/chromium npm run test:e2e -- \
  --grep 'public judge experience|two-persona|landing distinguishes'
```

The probe performs only deterministic demo writes after verifying application identity; it never creates invoices or payments. Do not run database-reset fixtures against Neon. `PACT_TEST_DATABASE_URL` must point only to a disposable local `pact_*_test` database. Actual local PostgreSQL tests cover concurrency, persistence, budget atomicity, audit immutability and the two-party lifecycle; they do not establish hosted success.
