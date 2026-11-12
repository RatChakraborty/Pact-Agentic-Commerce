# Pact — Agreements, with intent

The primary **Explore the demo** action opens genuine recorded AI evidence from a static, versioned asset with no API/database dependency. **Try it yourself** opens customer/business role selection; the original single-player sandbox and session-based agreement history remain secondary. The latter supports real shared records and separate human confirmations, but uses unverified demo identities, deterministic agents and **no payments**. See [two-sided scope and acceptance](docs/TWO_SIDED.md).

The existing dedicated Vercel project and Neon database were created by the user. Hosted recovery remains **unverified** here because the Preview hostname is denied by the proxy and Neon DNS fails. [Recovery instructions](docs/VERCEL.md) reuse those resources; no new cloud infrastructure is needed. Local PostgreSQL tests are not hosted acceptance.


Pact is an agent-commerce application with a private sandbox workflow and an anonymous judge-demo mode: buyer and seller agents negotiate a fixed-scope landing page, the buyer locks the terms, a real PayPal sandbox invoice is created, static HTML evidence is checked, and the buyer authorizes a handoff to PayPal. The single workspace shows the next valid action. Audit history and diagnostics stay in disclosures.

**Verified:** real sandbox OAuth, invoice creation/read/send, and a provider-confirmed **$300 USD payment** on invoice `INV2-N6CJ-RJXM-96WT-XDVG`. Pact reconciles it to `PAID`. Genuine four-call live AI negotiation and bounded semantic evaluation are also verified. Deterministic mode is explicitly labeled. No escrow, reserved funds, automatic spending or real-money support. See [acceptance evidence](docs/ACCEPTANCE.md).

## Public judge demo and Vercel

The Vercel function entrypoint, Vite routing, anonymous sample workflow and PostgreSQL persistence are implemented. **The user-created Preview is not verified here:** Preview proxy access and Neon DNS/TCP access are blocked; Vercel CLI is unauthenticated. Reuse the existing dedicated project and database. See [exact Vercel setup and verification steps](docs/VERCEL.md).

The public mode needs no visitor accounts or provider credentials. It lets judges negotiate a deterministic sample, accept fingerprint-bound terms, load example evidence, see verification, investigate a blocked recipient change and inspect their audit history. It creates no invoice/payment and uses no paid model calls. Recorded real AI and paid sandbox evidence is clearly separated under Workspace. Sponsor expansion waits for actual public-deployment verification.

`PUBLIC_DEMO=true` selects that mode. `PACT_DATABASE_URL` selects the dedicated Pact PostgreSQL database. On Vercel only, the integration-provided `DATABASE_URL` is the fallback; local runs ignore that generic binding. Existing Redis bindings are not consumed. On Vercel, persistent PostgreSQL and a strong session secret are mandatory; ephemeral SQLite fallback is forbidden. Local SQLite support remains intact.

## Run locally

Requirements: Python 3.12+, uv, Node 22+ and npm. Use this existing checkout; no additional worktree is needed.

```bash
cd backend
uv sync --frozen --extra test
cd ../frontend
npm ci
npm run build
cd ../backend
uv run --frozen uvicorn app.main:app --host 127.0.0.1 --port 8000
```

Open the locally running application in your browser. FastAPI serves the built React application and API from one origin. Keep the browser session cookie: agreements belong to that session, not to a shared unauthenticated listing. Live processes must restart after an environment restore.

For frontend development, run the backend above and `npm run dev` from `frontend/`; Vite proxies `/api` to port 8000. Rebuild the frontend to update FastAPI's static assets. SQLite lives at `backend/pact.db` when started from `backend/`; use an absolute `DATABASE_PATH` to choose another location. The database, local configuration and virtual environments are ignored by Git.

Copy `.env.example` to `.env` **only if that file does not already exist**. Fill values securely or inject them through environment settings. The backend reads the root `.env` from any working directory. Never commit it. No credentials are needed for deterministic negotiation or unit tests; actual invoice actions fail clearly without merchant credentials.

In this managed cloud image, the home cache directories are read-only. Before installing/running tools here, use `export UV_CACHE_DIR=/workspace/.cache/uv` and `export npm_config_cache=/workspace/.cache/npm`. These nonsecret cache locations do not change repository dependencies or TLS verification.

## Configuration

| Variable | Purpose |
| --- | --- |
| `PAYPAL_ENV` | Must be `sandbox`; other values are rejected before provider authentication |
| `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET` | Sandbox merchant application's OAuth credentials; server only |
| `APP_SESSION_SECRET` | Strong persistent random signing secret; required to preserve browser sessions across restarts |
| `DATABASE_PATH` | SQLite file; defaults to `pact.db` in the server working directory |
| `LLM_API_KEY`, `LLM_MODEL` | Optional live OpenAI structured negotiation; model must support Chat Completions JSON schema and `max_completion_tokens` |
| `LLM_MAX_CALLS` | Durable server-wide call allowance; default 12, reserved six calls per attempt |
| `LLM_MAX_TOKENS` | Maximum output tokens per turn; default 600 |
| `LLM_BUDGET_USD` | Estimated server-wide spending allowance; default $2 |
| `LLM_INPUT_USD_PER_MILLION`, `LLM_OUTPUT_USD_PER_MILLION` | Budget price estimates; defaults 20 and 120. Set to at least the actual selected model's prices |
| `LLM_MAX_INPUT_BYTES` | Conservative input bound including messages/schema; default 12,000 |
| `PAYPAL_SANDBOX_BUYER_EMAIL`, `PAYPAL_SANDBOX_SELLER_EMAIL` | Optional operator reference values; enter the actual sandbox emails in the agreement form; these variables do not override accepted terms |

Live negotiation has six total alternating turns, no automatic retries, a 30-second timeout per request and structured offer validation. Each attempt durably reserves its full maximum call/token/cost allowance, including failed attempts; no automatic refund. The default estimated reservation is $1.872 per negotiation, so the $2 default permits one attempt. Cost estimates are **not a provider billing guarantee**; configure a provider-side spending limit as well. The role provider is replaceable in `backend/app/agents.py`.

Outbound HTTPS destinations: `api-m.sandbox.paypal.com`, `api.openai.com` for live inference, package registries for installation. Buyer payment opens `www.sandbox.paypal.com` in the buyer's browser. Keep inherited proxy and TLS trust settings; never disable verification.

## Walk through the product

1. Enter sandbox buyer and merchant emails, a future deadline and the budget. Expand preferences to choose live AI or deterministic rules.
2. Start negotiation. Review counteroffers and accepted scope; explicitly accept the final terms. No API exists to mutate an accepted contract. Changed terms require a new agreement and approval.
3. Create a sandbox invoice. The amount, USD currency, merchant and buyer are verified against PayPal's readback before the invoice is attached to the contract.
4. Upload [the example landing page](docs/examples/landing-page.html), or your own static HTML. Required sections use `id="hero"`, `id="features"`, and `id="contact"`; meaningful text is required. Scripts, embedded documents and inline event handlers fail the structural rubric. Artifacts are parsed, never executed or rendered.
5. Review the evidence. A failed artifact blocks the normal payment path. A human may explicitly override with a recorded reason; the failed checks remain visible.
6. Authorize PayPal payment in Pact. This sends the invoice if still a draft and reveals its provider-generated sandbox payment link. Complete buyer approval inside PayPal, then use **Check PayPal status**.
7. Only an actual retrieved PayPal `PAID` status displays Payment confirmed. `MARKED_AS_PAID`, refunds and cancellation require review. An unpaid invoice never displays success.

The failure demonstration is under Agreement history & details before negotiation, in deterministic mode. Overspending and recipient substitution are rejected and audited.

## Tests

```bash
cd backend
uv run --frozen --extra test pytest -q
cd ../frontend
npm test
npm run build
```

Browser checks use Playwright with a system Chromium if available:

```bash
# Terminal 1, repository root: isolated server with credentials deliberately absent
PAYPAL_CLIENT_ID= PAYPAL_CLIENT_SECRET= DATABASE_PATH=/tmp/pact-browser.db \
  backend/.venv/bin/uvicorn app.main:app --app-dir backend --host 127.0.0.1 --port 8001
# Terminal 2, frontend/
PACT_CHROMIUM_PATH=/usr/bin/chromium PACT_TEST_URL=http://127.0.0.1:8001 \
  npm run test:e2e -- e2e/workflow.spec.ts --grep 'brief,|mobile|session bootstrap'
```

If no system Chromium exists, install the supported Playwright Chromium with `npx playwright install chromium`; omit `PACT_CHROMIUM_PATH`. In restricted cloud images use a writable `PLAYWRIGHT_BROWSERS_PATH` and cache directory. Do not disable download verification.

For the full browser happy path, use the **explicitly mocked provider test harness**, never the product entry point:

```bash
# Terminal 1, repository root
PYTHONPATH=backend DATABASE_PATH=/tmp/pact-browser-mock.db \
  backend/.venv/bin/uvicorn browser_server:app --app-dir backend/tests --host 127.0.0.1 --port 8003
# Terminal 2, frontend/
PACT_MOCK_PROVIDER=1 PACT_CHROMIUM_PATH=/usr/bin/chromium PACT_TEST_URL=http://127.0.0.1:8003 \
  npm run test:e2e -- e2e/workflow.spec.ts --grep 'full browser'
```

The harness has a test-only provider status control; it is absent from `app.main:app`. Mocked paid status proves UI/backend integration, not a real payment. Tests use separate SQLite files and never create external invoices.

## Contract integrity and evaluation

Accepted economic terms have a canonical SHA-256 fingerprint over buyer/seller identity, recipient, amount/currency, budget, scope, deliverable type, criteria, deadline, version and approval policy. New approvals confirm both version and fingerprint; accepted terms are checked before provider actions. Dynamic provider status is intentionally outside that immutable fingerprint. Legacy invoices retain their original snapshots; they are checked without rewriting audit history. A hash detects changes but authenticates no person and establishes no legal enforceability.

Optional **Check proposal wording** under agreement details reviews the actual proposal history. Deterministic rules are clearly labeled. Live agreements can request a bounded structured model critique; unavailable or concerning reviews block acceptance and require revised terms. The critique never authorizes payment. The small live evaluation had one false escalation, so this advisory capability is optional and its limitations remain visible.

[Reproducible evaluation and measured results](docs/EVALUATION.md) · [Sponsor integration report](docs/SPONSORS.md) · [Render preparation](docs/RENDER.md)

The current local ignored `.env` contains **nonsecret development limits only**: cumulative 54-call allowance, $0.90 ceiling and $1/$4 per-million token estimates for the configured mini model. Previous reservations were retained; the final paid-test ledger used 45 calls including historical reservations and $0.54. Credentials remain inherited. Review the current allowance before recording; do not remove the database or reset audit history to obtain more calls. General defaults above remain deliberately conservative for other configurations.

## Limits and submission

The private workflow uses browser possession for both demo roles; it is not a multi-user financial service. The new public mode isolates anonymous visitor records in PostgreSQL and blocks provider actions. There is no account login, seller identity enrollment, webhook receiver, deployment, dedicated small model, marketplace, escrow or Orders capture integration. Cookies are intended for loopback HTTP; the prepared Render mode adds a tested single-operator password gate, HTTPS-only cookies and exact public-origin checks. It still needs an authorized deployment and platform validation. A new isolated Vercel deployment is authorized but blocked by missing account/database/network capabilities. No deployment has been performed; other projects remain untouched.

[Demo script](docs/DEMO.md) · [Acceptance matrix](docs/ACCEPTANCE.md) · [Product plan](docs/PLAN.md) · [MIT license](LICENSE)

## PostgreSQL / anonymous demo tests

The full validation run passed **109 backend tests**, **5 frontend tests**, the production build and **10 distinct browser scenarios** (3 public, 3 existing private, 1 explicitly mocked payment, landing/history and 2 two-persona desktop/mobile flows). Six backend tests used actual PostgreSQL, including concurrency and a fresh-process budget read. These are local results, not Vercel-hosted results.

For PostgreSQL tests, provide a newly created local test database as `PACT_TEST_DATABASE_URL`; its name must begin `pact_` and end `_test`. Test fixtures deliberately reset only that dedicated database. Do not point this variable at production or Nautilus. Without it, the six PostgreSQL tests are explicitly skipped rather than falsely claimed as verified.

To run public browser checks against a running public-mode test server or a subsequently verified deployment:

```bash
cd frontend
PACT_PUBLIC_DEMO=1 PACT_TEST_URL=ACTUAL_TARGET_ORIGIN PACT_CHROMIUM_PATH=/usr/bin/chromium \
  npm run test:e2e -- e2e/public.spec.ts
```

The deployment guide includes the no-provider HTTP acceptance probe. Hosted behavior, managed-database TLS and actual Vercel cold starts remain unverified until account access is supplied.


## Final recovery / replay

[Recovery evidence and exact Vercel log/configuration request](docs/RECOVERY.md). The old visitor message indicates failed API JSON parsing, not proof of a Neon error. Backend startup/storage diagnostics, static/frontend/backend release IDs, separate role routes and the database-independent replay are implemented. Hosted P0 remains open until the actual Preview commit, function log and genuine Neon health are verified. No Production deployment is authorized by this change.

`npm --prefix frontend run evidence:check` verifies the replay against hashed committed provider receipts. Browser tests run it at desktop/mobile sizes with all API endpoints unavailable and assert zero API calls. It preserves a genuine host block, the human approval boundary, separate semantic-evaluation limits and the separately PAID sandbox receipt. No additional paid inference or payment was made.
