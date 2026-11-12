# Final recovery: evidence, actions and limits

## Source/deployment inventory

At the start of this directive, the local working tree was clean, `feature/pact-core` and the remote feature head were both `248004b6e9f5c3d9556f994343a3a1f531ec43a8`; remote `main` was `37ec26ac59c4ce3d000ee0264ef329da80d7ec36`. There were no other remote development branches or local worktrees. The UI redesign is to continue in an isolated `feature/pact-ui-redesign` worktree based on the verified recovery commit; main remains untouched.

The user-supplied immutable Preview URL is:
https://pact-agentic-commerce-8b9e5vy1j-pact-83c7281c.vercel.app/

It was supplied before the `248004b` implementation existed. It may therefore be a stale immutable deployment URL rather than a current branch alias. **Its actual deployed commit is unknown**, not inferred from the latest GitHub commit. GitHub's public deployments page returned 404; no accessible deployment metadata or Vercel credential/connector is present here.

Fresh GET probes of `/`, `/api/health` and `/api/demo-market/persona` all failed with an outbound proxy CONNECT 403. No application HTTP status, content type or function log was obtainable. Runtime policy revision 12 still permits only package hosts, OpenAI and PayPal sandbox, with no Vercel host or Neon TCP grant. These restrictions describe this development environment, not the user's browser or Vercel-to-Neon connection. Earlier read-only Neon probes failed DNS; that does not establish the cause of Vercel's failure. No destructive hosted tests or new cloud resources were used.

## Confirmed source findings and changes

The exact original visitor message is thrown when `response.json()` fails. That identifies a non-JSON/empty/invalid-JSON API response in that code version, not specifically a PostgreSQL exception. A normal Pact storage failure already returns JSON 503 with a different detail. Possible upstream sources still include routing, startup/dependency errors, platform protection, or an outdated frontend/backend deployment.

The old landing page's dominant interactive button led to the legacy sandbox workspace; if PUBLIC_DEMO is false or the bundle is old, buyer/merchant fields appear there. It is now explicitly an advanced route. `/customer` and `/business` select the actual role component, including under API failure; no error fallback renders the old email form. Legacy query links remain compatible.

Implemented diagnostics:

- `/assets/pact-build.json`: generated static frontend commit/branch/API-contract metadata; no database dependency.
- `/api/version`: backend commit/branch/API-contract metadata; no database query. A healthy response here is **not** storage health.
- `/api/health`: still checks real storage and requires `status=ok`, `application=pact`, `public_demo=true`, `storage=postgresql`; no fake success.
- API import/configuration failure now yields JSON **503** where the ASGI/FastAPI runtime is available. Logs use `PACT_STARTUP_FAILED` with `CONFIGURATION_INVALID`, `DEPENDENCY_IMPORT_FAILED` or `APPLICATION_STARTUP_FAILED`; no environment dump, DSN or exception values.
- PostgreSQL failures log `PACT_STORAGE_FAILURE` with DNS/TLS/timeout/permission/object categories and SQLSTATE, without raw driver messages or credentials.
- Frontend HTML/invalid JSON errors expose `API_NON_JSON` plus HTTP status; raw error bodies never enter the DOM. Network failures are distinguished. Visitors can explicitly open the static recorded demo or retry the interactive service.
- Canonical SPA routes are handled locally and by the existing Vercel rewrites. API rewrites remain before SPA fallback; static replay/build metadata live under `/assets/` and avoid the SPA rewrite.

## Exact account-side evidence needed

For **this existing Pact Preview only**, provide:

1. Deployment detail: **Git branch and full commit SHA**, deployment environment Preview, immutable URL and current branch alias. If the SHA is older than the recovery/redesign commit, create a **Preview** from the chosen tested feature branch and use its returned URL. Do not promote Production.
2. Project settings: **Root Directory** (must be repository root), Framework (Vite), Build Command (`npm --prefix frontend ci && npm --prefix frontend run build`), Output Directory (`frontend/dist`), and Functions entry for `api/index.py`. Build logs must show Python dependencies from root `requirements.txt` and the frontend output. Report setting names/values, not secrets.
3. In DevTools Network, open `/api/health` and `/api/demo-market/persona`. Supply **HTTP status, Content-Type, final response URL and `x-vercel-id`**, plus a platform error code if present. For HTML, identify Vercel protection/404/function-error versus the React index page. Do not paste cookies/authorization headers or raw bodies containing secrets.
4. Vercel Logs filtered to this deployment and one failing request: supply the **first exception type and sanitized message**, module/file/line, and any `PACT_STARTUP_FAILED` / `PACT_STORAGE_FAILURE` code or SQLSTATE. For old deployments lacking these markers, report the first import/configuration/driver error, redacting URL/password/key values. This is the missing evidence needed to choose a root-cause fix rather than assume Neon.
5. Confirm **Preview-scoped presence**, without values, of PUBLIC_DEMO=true, existing PACT_DATABASE_URL or DATABASE_URL, stable APP_SESSION_SECRET, ENABLE_LIVE_OPERATIONS=false, LLM_MAX_CALLS=0, LLM_BUDGET_USD=0, PAYPAL_ENV=sandbox. Changes must be present in a new Preview, not only dashboard entries after the old build.

If this environment is to perform the checks directly, permit HTTPS to the actual Preview host and `api.vercel.com`, DNS/TCP to the configured dedicated Neon hosts on 5432, and provide only scoped Vercel account access through secure settings. Existing database/provider credentials need not be replaced. No credential values belong in chat.

GET-only diagnostics (no business/provider mutations):

```bash
cd backend
.venv/bin/python tools/diagnose_preview.py https://ACTUAL_PREVIEW_HOST
```

Compare static/frontend and API commit IDs. Only after genuine hosted health succeeds, run the existing guarded public acceptance probe and separate customer/business browser contexts. The prior PostgreSQL tests use only disposable local test databases. P0 hosted acceptance remains **OPEN** until this is done.

## Database-independent recorded experience

`/demo` reads `/assets/pact-replay-v1.json`, not `/api/evidence`. It works with all API routes returning HTML 503 and performs zero API requests. Previous/Next/Restart/Show complete transcript reveal actual saved offers. Both the $300 success and the genuine seller-minimum block are retained. An agent's acceptance is labeled a proposal, with human approval/locking still required. No fake recorded approval is added.

`frontend/scripts/build-replay.mjs --check` verifies an exact allowlist projection and SHA-256 provenance against the committed receipts. The separately PAID sandbox invoice is dated, attributed to its original agreement and never attached to either replay. Critique metrics are labeled a separate recorded evaluation, including false escalations; no invented critique of the replay is shown. No paid inference or provider writes are needed. Public assets contain synthetic fixture data and sanitized provider evidence only.

The primary landing action is Explore the demo. Try it yourself leads to role selection; the original sandbox remains advanced. The redesign branch improves presentation without pretending interactive hosting has been repaired. Sponsor implementation remains gated on repaired interactive hosting; no optional package should be installed merely to claim eligibility.

Follow-up validation fixed the canonical `/agreements` view initializer (the query alias already worked). The same regression now uses the canonical route. The isolated worktree also exposed a test-only dependency on local model pricing; the PostgreSQL concurrency test now declares its pricing assumptions and redacts its disposable connection URL representation. Actual application pricing/caps/reservations were not changed. Six PostgreSQL tests and the canonical-route browser regression pass.
