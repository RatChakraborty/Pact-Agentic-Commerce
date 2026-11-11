# Pact — Agreements, with intent

Pact is a local sandbox commerce demo: buyer and seller agents negotiate a fixed-scope landing page, the buyer locks the terms, a real PayPal sandbox invoice is created, static HTML evidence is checked, and the buyer authorizes a handoff to PayPal. The single workspace shows the next valid action. Audit history and diagnostics stay in disclosures.

**Verified:** real sandbox OAuth, invoice creation/read/send and an `UNPAID` payment link. **Not yet verified:** live AI negotiation (configured account has exhausted API credits) and a completed sandbox buyer payment. Deterministic mode is explicitly labeled. No escrow, reserved funds, automatic spending or real-money support. See [acceptance evidence](docs/ACCEPTANCE.md).

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
  npm run test:e2e -- --grep 'brief,|mobile'
```

If no system Chromium exists, install the supported Playwright Chromium with `npx playwright install chromium`; omit `PACT_CHROMIUM_PATH`. In restricted cloud images use a writable `PLAYWRIGHT_BROWSERS_PATH` and cache directory. Do not disable download verification.

For the full browser happy path, use the **explicitly mocked provider test harness**, never the product entry point:

```bash
# Terminal 1, repository root
PYTHONPATH=backend DATABASE_PATH=/tmp/pact-browser-mock.db \
  backend/.venv/bin/uvicorn browser_server:app --app-dir backend/tests --host 127.0.0.1 --port 8003
# Terminal 2, frontend/
PACT_MOCK_PROVIDER=1 PACT_CHROMIUM_PATH=/usr/bin/chromium PACT_TEST_URL=http://127.0.0.1:8003 \
  npm run test:e2e -- --grep 'full browser'
```

The harness has a test-only provider status control; it is absent from `app.main:app`. Mocked paid status proves UI/backend integration, not a real payment. Tests use separate SQLite files and never create external invoices.

## Limits and submission

This is a single-browser, local demo, not a multi-user production service. Browser possession authorizes both demo roles. There is no account login, seller identity enrollment, webhook receiver, deployment, dedicated small model, marketplace, escrow or Orders capture integration. Cookies are intended for loopback HTTP; deployment would need authentication, HTTPS-only cookies and an explicit security review. No production deployment is authorized.

[Demo script](docs/DEMO.md) · [Acceptance matrix](docs/ACCEPTANCE.md) · [Product plan](docs/PLAN.md) · [MIT license](LICENSE)
