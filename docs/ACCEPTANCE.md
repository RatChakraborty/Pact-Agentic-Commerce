# P0 acceptance evidence

Validation performed November 11, 2026. Test mocks are distinct from actual provider calls. This is a local demo, not a production-readiness claim. The user-created Vercel Preview exists but remains unverified here; see VERCEL.md for the proxy/DNS blockers.

| Gate | Outcome | Evidence / remaining work |
| --- | --- | --- |
| A — Reproducible local app | PASS | Frozen uv sync, npm install/build, running FastAPI static frontend and API; browser creates and reloads a persisted agreement. README includes startup commands. No production deployment. |
| B — Buyer brief and authorization policy | PASS | Objective, budget, required hero/features/contact scope and future deadline are configurable. Terms and payment each require explicit approval; no automatic authorization mode exists. |
| C — Distinct agents negotiate | PASS | Funded retry received six actual model replies and terminated at the turn cap. Clarified seller strategy then produced a genuine four-call $360 → $300 → $300 → acceptance negotiation with `gpt-4.1-mini-2025-04-14`. Transcript, usage and estimates: `docs/evidence/live-negotiation.json`. |
| D — Hard agent constraints | PASS | Tests block overspend, recipient/scope changes, invalid/unsupported model output, bad acceptance, exhausted call/cost allowance and turn exhaustion. Input/output caps and timeouts bound live calls; spending uses configurable conservative price estimates, not guaranteed provider billing. |
| E — Buyer accepts locked terms | PASS | Version-bound explicit confirmation; accepted snapshot persisted. Repeated acceptance emits one event. No accepted-term mutation API exists; changes require a new agreement. Browser acceptance/reload verified. |
| F — Real sandbox invoice | PASS | Real OAuth and invoice read access, invoice `INV2-N6CJ-RJXM-96WT-XDVG` created/read/sent. Server validates amount, USD currency, merchant and buyer against accepted terms. Latest real readback `PAID`; $300.00 USD received and $0.00 due. ID persisted in SQLite. Lost response reconciliation and repeated requests tested with mocks. |
| G — Objective milestone verification | PASS | Example HTML parsed without execution; section IDs, content and active content checks produce observed pass/fail evidence and agreement version. Failed checks block normal advancement; explicit human override retains failed evidence and logs reason. |
| H — Buyer-authorized payment | PASS | Buyer completed sandbox checkout outside the cloud browser. Direct GET `/v2/invoicing/invoices/INV2-N6CJ-RJXM-96WT-XDVG` returned `PAID`, paid amount $300.00 USD, due $0.00, PayPal payment ID `48G26200EN969023U`. Two normal Pact provider-refresh calls independently retrieved `PAID`, persisted application `PAID`, and appended provider-check audit events. No manual state update or further payment was attempted. |
| I — Audit, idempotency and failure paths | PASS | Append-only SQLite audit triggers, session isolation and cross-origin rejection tested. Repeated acceptance/invoice/payment approval do not duplicate operations. Provider-term mismatch and manually marked paid state are guarded. Full browser paid path uses an explicitly mocked provider. |
| J — Public submission and walkthrough | PARTIAL | MIT license retained, feature branch pushed, setup/demo script and Devpost draft written. Unauthenticated repository HTTP 200/public marker verified. Video recording/upload and hackathon submission remain operator tasks. Main untouched. |

## Automated and browser checks

- Backend: **109 passed**, including provider HTTP contracts, malformed structured output, audit integrity, recovery, policy, payment and verification paths. One upstream Starlette/httpx deprecation warning; no test failures.
- Frontend: **5 passed**; production TypeScript/Vite build passed.
- Browser: **3 passed** on the credentials-absent product server (desktop acceptance/error/history, mobile blocked recipient substitution, and delayed session initialization). **1 passed** against a separate explicitly mocked provider server (create → negotiate → accept → invoice → upload → authorize → provider refresh → paid).
- Real sandbox invoice browser view verified at 1440px and 390px widths; mobile horizontal overflow false. Desktop/mobile screenshots in [screenshots](screenshots/).
- Backend Ruff checks passed. No credentials are committed. SQLite, caches, sessions, test artifacts and dependency environments are ignored.

## Mandatory simplification review

Reviewed actual desktop/mobile screenshots as a first-time user. Kept one workspace, compact header/menu, negotiation and agreement; no sidebar, tabs, analytics or invented metrics. Moved the primary next action directly below the objective so it is reachable before the long transcript on mobile. Removed the repeated generic two-line title on active agreements. Collapsed completed verification evidence into a disclosure while keeping it expanded during verification review. The current amount and recipient are repeated only at explicit authorization points. Audit and failure controls remain secondary. Real unpaid state stays visible; there is no simulated success banner.

## Remaining prerequisites

1. Live AI credits now work and gate C is verified. Preserve the cumulative call/dollar reservations; review the configured allowance before another recording run. No further inference is required merely to repeat this evidence.
2. Sandbox payment is now provider-confirmed and reconciled; no repeat payment is needed. Use the verified receipt and paid UI in the demo.
3. Record, review and upload the demo; complete the submission. See [DEMO.md](DEMO.md).

## P1 acceptance matrix

| Requirement | Outcome | Evidence |
| --- | --- | --- |
| Canonical agreement integrity | PASS | Stable serialization/digest; material-field mutations and stale fingerprints rejected; timestamp/order normalization and legacy snapshots tested. |
| Explicit authorization and provider truth | PASS | Version/fingerprint-bound approvals; invoice validation works under Python `-O`; canceled/unknown/manual-paid states cannot trigger payment handoff. An unpaid readback after a paid record enters review rather than retaining a paid banner. |
| Semantic critique baseline | PARTIAL | Replaceable live structured provider and deterministic rule baseline implemented/tested. Actual evaluation completed; 1/8 legitimate proposals was falsely escalated and seven initial reviews were unavailable. Not a dedicated SLM or general safety guarantee. |
| Adversarial evaluation | PASS | Frozen 28-case runner, offline default, real model results separately recorded. Offline economic controls 8/8; live contradictions 6/6 and ambiguity 6/6 after transparent follow-up. Full denominators, failures and limitations in EVALUATION.md. |
| Minimal desktop/mobile UI | PASS | Existing single workspace retained; critique/fingerprint behind disclosure; next action stays prominent. Desktop/mobile checks and screenshots verify no horizontal overflow. |
| APIMatic context review | BLOCKED | Installer invoked; plugin registration fails on read-only managed directories. The PayPal plugin itself was not invoked and no contribution/eligibility is claimed. |
| AG Studio investigator | NOT IMPLEMENTED | Real 3.1.0 package/agent API and React compatibility inspected. Commercial/trial entitlement absent; no runtime integration claimed. |
| Render deployment preparation | PARTIAL | Blueprint, persistent disk instructions, optional secure cookies/origin/operator gate prepared. Local security tests pass. Render control plane, hosted HTTPS and persistent disk have not been exercised. No deployment authorized/performed. |

See SPONSORS.md for every sponsor classification and exact requirements. Dedicated SLM training, sponsor runtime expansion, public deployment and marketplace features were deferred.

The final browser suite also verifies the initial session finishes before creation is enabled; it reproduces and guards the delayed-response race found during final testing. Hosted-mode tests exercise the actual application in a subprocess and verify Secure/HttpOnly cookies, operator authentication and cross-origin rejection.

## Confirmed sandbox payment — November 11, 2026

Checked at 19:03:52 UTC / 2:03:52 PM Eastern. PayPal directly reports `PAID`, amount and paid amount **$300.00 USD**, balance due **$0.00 USD**. Payment ID: `48G26200EN969023U`; payment date: `2026-11-11`; method/type: `PAYPAL`. The response contains no refund record. The original invoice's buyer, merchant, currency and amount still match its accepted terms. This is a real sandbox invoice payment, distinct from the older mocked browser test and from the later independent live-negotiation run. Receipt: `docs/evidence/paypal-readback.json`.

The actual provider-confirmed paid agreement was also loaded in Chromium: the UI displayed **Payment confirmed**. Screenshot: `docs/screenshots/sandbox-paid-desktop.png`. This check used the real persisted invoice, not the mocked provider harness.

## Initial deployment preparation — historical checkpoint, superseded below

**Historical outcome: BLOCKED before the user created the existing project/database.** At that checkpoint Vercel authentication, a dedicated database binding and egress were missing. The project and database bindings now exist; see final recovery below for the current proxy/DNS blockers. Vercel CLI 65.14.0 reported logged out; a direct Vercel API probe was denied with CONNECT 403. No Nautilus project, Redis instance, environment group or existing deployment was changed.

The directive's managed-PostgreSQL fallback was selected to preserve existing relational transaction semantics rather than risk a rushed Redis rewrite. Vercel ASGI entrypoint, static/API rewrites, locked requirements, cookie/origin controls, anonymous paid-capability denial, server-side sessions and distributed throttles are implemented. PostgreSQL uses a transaction-scoped advisory lock; state/budgets never fall back to Vercel's filesystem. Existing local SQLite support is preserved.

Local evidence: **79 backend tests**, including **5 actual PostgreSQL tests**, **5 frontend tests**, production TypeScript/Vite build, lint and source/static-bundle secret scan passed. **7 distinct browser cases passed:** the existing 3 private cases, 1 explicitly mocked payment workflow, and 3 PostgreSQL-backed public cases (full sample/evidence/audit/recorded-proof flow, mobile rejection/isolation, safe service-error UI). A stale paid state in the browser test fake was corrected; consecutive mocked runs then passed. No mocked state is treated as payment evidence.

| Public deployment acceptance gate | Local outcome | Actual hosted outcome |
| --- | --- | --- |
| Public URL loads; static assets and function API route work | Function export / build / local assets PASS | BLOCKED — no authenticated project |
| Create, negotiate, accept and refresh session | PASS against actual PostgreSQL | NOT RUN |
| Independent visitor isolation | PASS, API and browser | NOT RUN |
| Fingerprint integrity and no arbitrary payment state | PASS | NOT RUN |
| Example/custom milestone verification | PASS | NOT RUN |
| Persistent audit and shared budget after a fresh process | PASS, including actual competing PostgreSQL connections | NOT RUN on Vercel |
| Mobile layout and clear next action | PASS, no overflow; initial sample action within 844px viewport | NOT RUN at a public URL |
| Secrets absent from static bundle; no anonymous paid calls | PASS locally | NOT RUN against deployed bundle |
| Persistence outage fails closed | PASS, 503/no SQLite fallback; safe browser error | NOT RUN on hosted DB |
| Developer-only controls inaccessible | PASS; product routes return 404/405 and fixture files excluded from deployment | NOT RUN on Vercel |

`docs/evidence/public-demo-local.json` is explicitly labeled local. `docs/VERCEL.md` contains account requirements, the new-project-only environment, Preview-first commands and hosted probes. Do not upgrade any hosted gate without exercising the actual returned Preview and stable URLs. Sponsor expansion is deferred until that happens. The existing actual sandbox payment remains provider-confirmed PAID; this phase made only a read-only recheck and no new invoice/payment/model call.


## Final recovery / two-sided acceptance — November 11, 2026

| Priority / gate | Result | Evidence / limit |
| --- | --- | --- |
| P0 existing Vercel project | BLOCKED | Preview `/` and `/api/health`: proxy CONNECT 403, not application HTTP status. Existing project retained; no new cloud infrastructure. |
| P0 existing Neon | BLOCKED remotely; PASS local PostgreSQL | Both configured URLs failed DNS in read-only verified-TLS probes. Six actual local PostgreSQL tests pass; no destructive hosted tests. |
| P0 serverless configuration | PASS locally | Vercel-only DATABASE_URL fallback, explicit Pact precedence, pool-compatible connections, verified TLS, fail-closed storage, secure cookies and exact Preview/branch origins. |
| P0 live negotiation | VERIFIED | Two additional independent three-call scenarios: feasible $300 agreement; infeasible model acceptance blocked by host. Six calls; 2,656 prompt / 447 completion tokens; configured estimate $0.004444. Caps unchanged. |
| P0 actual PayPal status | VERIFIED prior readback preserved | Existing invoice INV2-N6CJ-RJXM-96WT-XDVG PAID, $300 received, zero due, payment 48G26200EN969023U. No new invoice/payment or manual state change in this phase. Separate from live AI runs. |
| P1 transcript / history / critic | PASS | Structured offer details, saved objective/status/amount/date/reopen, existing critic and audit retained. Public sample reopens verified evidence without implying payment. |
| P1 adversarial evaluation | PASS with measured limitations | Original matrix 9/10 offline expectations retained; corrected deterministic rerun 10/10. Live infeasible case's invalid acceptance retained, not counted as model success. No unauthorized final agreements. |
| P1 agent isolation | PASS for input/API boundaries; limited free-text filtering | Role prompts omit opposite limits; shared response allowlists and private-policy seals tested. Live explanation filter is pattern-based, not proof of semantic confidentiality; shared demo is deterministic-only. |
| P2 two-sided product | PASS as demo | Service discovery/invite, immutable separate personas, shared agreement/transcript, seller authorization, both confirmations, seller evidence and customer review. No shared provider capabilities. |
| P3 real accounts | DEFERRED | Honest browser-bound 24-hour demo identities; no fake signup, identity verification or recovery. Logout revokes prior cookies. |
| P4 replay / sponsor expansion / SLM | DEFERRED | No replay streaming claim, AG Grid/Astropods installation or model training. Sponsor report retained and updated honestly. |

Final backend run: **109 passed**, including six actual local PostgreSQL regressions; one upstream Starlette/httpx deprecation warning. Frontend unit tests: **5 passed**. Production TypeScript/Vite build and Ruff check/format pass. Browser acceptance: **10 distinct scenarios passed** across the final private/public/mocked runs: 6 private-mode tests (landing and two shared flows included), 6 public/PostgreSQL tests (the same three entry/shared scenarios repeated), and 1 explicit mocked-payment test. The last visual-only disclosure change was followed by another passing 2-case public desktop/mobile shared walkthrough. Local public/PostgreSQL acceptance probe passed all 11 checks in `docs/evidence/local-postgres-recovery-probe.json`; this is **not** a Vercel probe.

Two-sided implementation/limitations and detailed verification mapping: [TWO_SIDED.md](TWO_SIDED.md). Sponsor classifications remain in [SPONSORS.md](SPONSORS.md). Hosting recovery requirements are in [VERCEL.md](VERCEL.md). Video recording/upload and submission still require the operator; deadline November 12, 2026 at 3 PM Eastern / 20:00 UTC.


Final visual checks: landing captured at 1440px and 390px with no horizontal overflow; shared agreement captured at desktop/mobile widths after reload and before session logout. Images are in `docs/screenshots/`. No screenshot of mocked payment is represented as real provider evidence.

Repository visibility rechecked unauthenticated in this final phase: GitHub HTTP 200 with a public-repository marker; tracked license is MIT. Configured-secret scanning across source and production assets passed. No new sponsor runtime or public cloud resource was created.
