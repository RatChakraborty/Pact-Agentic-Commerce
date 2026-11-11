# Vercel public demo deployment

**Status: implemented and tested locally against actual PostgreSQL; NOT deployed. No public URL has been created.** Vercel CLI 65.14.0 reports logged out, no Vercel/database credential bindings are present, and `api.vercel.com` is blocked by the current cloud proxy (CONNECT 403). The configuration-draft service also failed to read the draft (`INVALID_ARGUMENT`), so no new credential/network requirements were saved through it.

## Architecture and scope

One new isolated Vercel project serves the existing Vite build and `api/index.py` ASGI function. `vercel.json` routes `/api/*` to FastAPI, keeps `/assets/*` on static hosting, and serves the existing SPA for other paths. Root `requirements.txt` is exported from `backend/uv.lock`; `.python-version` pins Python 3.12. The Python function explicitly includes `backend/app/**` and the public frozen receipts in `docs/evidence/**`.

The directive permits managed PostgreSQL if a Redis migration risks correctness. Pact uses that fallback: a dedicated PostgreSQL database preserves the existing relational transactions, locked snapshots, audit records, durable budgets and idempotency metadata. Local SQLite remains supported. On Vercel, missing PostgreSQL configuration is a startup error; connection failures return 503 with no filesystem fallback. Remote PostgreSQL uses verified TLS (`sslmode=verify-full`, system roots).

Every critical PostgreSQL transaction acquires a transaction-scoped advisory lock in the **new dedicated Pact database**. Acceptance, invoice idempotency, session/throttle counters and budget reservations are therefore serialized across function instances; conditional operations are not unprotected pipelines/read-modify-write. Connections close at transaction completion. The schema uses only `pact.*`, and its audit trigger rejects update/delete. Initialization inserts budget singletons with `ON CONFLICT DO NOTHING`; cold starts never reset them. This coarse lock prioritizes correctness for a bounded demo over high throughput. No claim of high-scale throughput is made.

Signed, HttpOnly, SameSite=Strict session cookies are Secure on Vercel and require a persistent signing secret. Server-side session IDs/expiry and request counters live in PostgreSQL. Snapshots retain approval state and provider IDs/idempotency keys. Session reads and mutation limits fail closed when storage is unavailable.

## Public judge flow

Default `PUBLIC_DEMO=true` allows an anonymous visitor to start a deterministic sample without entering account emails, review offers, accept a fingerprint-bound agreement, continue to a demo milestone, load static example evidence, inspect verification, and investigate a blocked recipient change. It creates **no invoice or payment** and makes **no paid inference calls**. The public state is `AWAITING_EVIDENCE`/`VERIFIED`, not a simulated financial status. The optional Workspace disclosure shows recorded real AI and paid sandbox receipts from their separate verified runs.

Live creation, live critique and provider operations are denied to anonymous visitors. `ENABLE_LIVE_OPERATIONS` defaults false. Even an operator cannot send a demo agreement to PayPal. Do not enable live operations on the initial public project; the local/private workflow remains available for controlled real-provider demonstrations. A later operator capability would additionally need a strong separate password, project credentials, spending allowance, and validation against the function time limit. Public judges do not need any of these credentials.

Limits: 30 mutations/minute/session, 120/minute/hashed client address, 600/minute/global, 10 agreements/session, 500 new agreements/day, 5,000 agreements total, 2,000 new sessions/day; stored session expiry is seven days. Raw client IPs are not stored. Rate limits are application-level safeguards, not a replacement for Vercel's edge abuse protection. Provider/AI caps are shared database records. No generic `DATABASE_URL` or existing Redis binding is consumed.

## Exact account/configuration prerequisites

1. **Authenticate Vercel for this session**, or provide a Pact-scoped Vercel token through secure environment settings, never chat. The CLI's default home directory is read-only here; use the new isolated config directory:
   ```bash
   NODE_USE_ENV_PROXY=1 npm exec --yes --package=vercel@65.14.0 -- vercel login \
     --global-config /workspace/.cache/pact-vercel
   ```
   This does not read/change Nautilus project settings. The login requires the account holder's browser interaction. If a token is preferred, enter `PACT_VERCEL_TOKEN` securely so a subsequent agent can use it without printing it; no token value has been generated or assumed here.
2. **Create a NEW dedicated PostgreSQL database**, for example a new Neon project via Vercel Marketplace. Do not select/link Nautilus's database, Redis, environment group, or project. Provide its TLS connection string as `PACT_DATABASE_URL` in secure settings. A managed database URL is still missing; the local Docker test database is not a production service and must not be exposed.
3. **Permit deployment/verification egress** in cloud environment settings: `api.vercel.com`, `vercel.com`, and the actual isolated project's preview/production `*.vercel.app` hosts. The known current custom grants only cover PayPal sandbox API and OpenAI API. Registry presets already permit package downloads. If the cloud machine must directly reach the managed PostgreSQL instance, add only that new database hostname to TCP access; do not alter another project's network configuration.
4. Create/link a **new** Vercel project (suggested name `pact-commerce-demo`, adding a unique suffix if occupied), using this checkout and `feature/pact-core`. Set the project root to the **repository root**, not `frontend/`: the API function, locked Python requirements and `vercel.json` are at the root. Do not reuse a project ID from another checkout. Use `/workspace/.cache/pact-vercel` for CLI account config and keep `.vercel/` metadata untracked. Configure the new project's production branch to `feature/pact-core`; do not merge main merely to deploy it.

Only these missing account/database/network capabilities block actual deployment. No additional OpenAI, PayPal, Upstash or sponsor credential is needed for the anonymous demo.

## New project environment

Set these in the **new Pact project only**, for both Preview and Production:

| Variable | Value / requirement |
| --- | --- |
| `PUBLIC_DEMO` | `true` |
| `PACT_DATABASE_URL` | Secret TLS connection string for the new dedicated PostgreSQL database |
| `APP_SESSION_SECRET` | New random secret at least 32 characters; keep it stable across deploys |
| `ENABLE_LIVE_OPERATIONS` | `false` |
| `LLM_MAX_CALLS` | `0` recommended for the initial public project |
| `LLM_BUDGET_USD` | `0` recommended for the initial public project |
| `PAYPAL_ENV` | `sandbox` |

Do not copy the local `.env` or any Nautilus environment variables. Vercel sets `VERCEL=1`; the app forces secure cookies and requires PostgreSQL. For Preview, the allowed origin defaults to `https://VERCEL_URL`. For Production, it uses `VERCEL_PROJECT_PRODUCTION_URL` when available. A custom domain requires its exact HTTPS origin in `PUBLIC_ORIGIN`. Test the exact returned deployment URL; a different branch alias may require explicit origin configuration.

PayPal/OpenAI credentials should be **omitted** from the anonymous target. Recorded receipts are public sanitized files, not a live API proxy. Existing private credentials remain untouched.

## Preview first, then stable public deployment

After authentication and dedicated project/environment setup:

```bash
# From the Pact repository; link ONLY the new Pact project.
NODE_USE_ENV_PROXY=1 npm exec --yes --package=vercel@65.14.0 -- vercel link --yes \
  --project NEW_PACT_PROJECT --global-config /workspace/.cache/pact-vercel
# Inspect .vercel/project.json's IDs against the newly created project before continuing.
NODE_USE_ENV_PROXY=1 npm exec --yes --package=vercel@65.14.0 -- vercel deploy --yes \
  --global-config /workspace/.cache/pact-vercel
```

Record the actual returned Preview URL, then run the acceptance probe and browser checks below. Check unauthenticated browser access: Vercel Deployment Protection may block a Preview URL even when the application is anonymous. Adjust only the new project's deployment protection as authorized for this public demo; never account-wide/Nautilus settings.

Only after Preview verification:

```bash
NODE_USE_ENV_PROXY=1 npm exec --yes --package=vercel@65.14.0 -- vercel deploy --prod --yes \
  --global-config /workspace/.cache/pact-vercel
```

Use Vercel's **actual returned stable alias**, not an invented URL. Re-run all hosted checks there. Stop if project identity, permissions, TLS, origin, storage or isolation checks fail. No deployment command has yet been run in this session because authentication and a managed database are absent.

## Hosted acceptance commands

```bash
cd backend
uv run --frozen python tools/check_hosted.py https://ACTUAL_RETURNED_HOST \
  --output /tmp/pact-hosted-check.json
cd ../frontend
PACT_PUBLIC_DEMO=1 PACT_TEST_URL=https://ACTUAL_RETURNED_HOST \
  PACT_CHROMIUM_PATH=/usr/bin/chromium npm run test:e2e -- --grep 'public judge experience'
```

The HTTP probe verifies the target identifies as Pact/public/PostgreSQL before performing any writes. It exercises only demonstration agreements, checks fingerprint rejection, evidence, persistent history/session restoration, independent visitor isolation, disabled paid capabilities, CSRF and absent developer controls. It never creates a real invoice/payment. Browser checks cover assets, the real UI, mobile overflow and recorded evidence. Check the deployed bundle for secrets and repeat against the final stable alias.

A real redeployment/cold-start check must additionally restore the same browser session after deployment and confirm agreement/audit/budget rows remain. Local tests already exercise a fresh Python process reading the shared PostgreSQL budget. Do not label this an actual Vercel restart test until performed on Vercel.

## Local reproduction with actual PostgreSQL

Use a newly created, isolated PostgreSQL test database, with a name beginning `pact_` and ending `_test`; tests refuse reset access otherwise. Export its URL as `PACT_TEST_DATABASE_URL` securely, then run the backend suite. The suite tests concurrent acceptance, concurrent invoice idempotency with a fake provider, eight competing budget reservations, a new-process budget read, public flow/session restoration and append-only audit behavior. No test invokes the actual PayPal/OpenAI APIs.

To run the judge UI locally, set `PUBLIC_DEMO=true` and `PACT_DATABASE_URL` to a separate local Pact test database before starting the existing FastAPI server. Loopback PostgreSQL is permitted without TLS only outside Vercel; remote/hosted databases always require verified TLS. Keep this service on loopback. `check_hosted.py --allow-local` explicitly records its results as local rather than deployed.

## Deployment gates — current state

| Gate | Current evidence |
| --- | --- |
| Public URL, deployed assets/API, TLS, deployment protection | BLOCKED — account authentication, egress and dedicated managed DB unavailable |
| Anonymous sample workflow, evidence, audit and visitor isolation | PASS locally against actual PostgreSQL; hosted NOT RUN |
| Concurrent transitions, invoice idempotency, shared budget across a new process | PASS against isolated PostgreSQL; Vercel restart NOT RUN |
| Secure-session and exact-origin logic | Local tests pass; hosted cookie/alias checks NOT RUN |
| No anonymous provider spending or fabricated payment state | Local API/browser tests pass; hosted NOT RUN |
| Persistent-store outage is fail-closed | Local 503/no-SQLite-fallback test passes; hosted outage NOT RUN |

Sponsor expansion remains deferred until these public deployment gates are verified.
