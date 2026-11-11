# P0 acceptance evidence

Validation performed November 11, 2026. Test mocks are distinct from actual provider calls. This is a local demo, not a production-readiness claim.

| Gate | Outcome | Evidence / remaining work |
| --- | --- | --- |
| A — Reproducible local app | PASS | Frozen uv sync, npm install/build, running FastAPI static frontend and API; browser creates and reloads a persisted agreement. README includes startup commands. No production deployment. |
| B — Buyer brief and authorization policy | PASS | Objective, budget, required hero/features/contact scope and future deadline are configurable. Terms and payment each require explicit approval; no automatic authorization mode exists. |
| C — Distinct agents negotiate | PARTIAL | Separate buyer/seller prompts, structured provider abstraction and six-turn termination implemented. Deterministic counteroffer convergence and live-provider contract failures tested. Actual model call returned HTTP 429 `credit_balance_exhausted`; live negotiation has not succeeded. |
| D — Hard agent constraints | PASS | Tests block overspend, recipient/scope changes, invalid/unsupported model output, bad acceptance, exhausted call/cost allowance and turn exhaustion. Input/output caps and timeouts bound live calls; spending uses configurable conservative price estimates, not guaranteed provider billing. |
| E — Buyer accepts locked terms | PASS | Version-bound explicit confirmation; accepted snapshot persisted. Repeated acceptance emits one event. No accepted-term mutation API exists; changes require a new agreement. Browser acceptance/reload verified. |
| F — Real sandbox invoice | PASS | Real OAuth and invoice read access, invoice `INV2-N6CJ-RJXM-96WT-XDVG` created/read/sent. Server validates amount, USD currency, merchant and buyer against accepted terms. Real readback `UNPAID`; ID persisted in SQLite. Lost response reconciliation and repeated requests tested with mocks. |
| G — Objective milestone verification | PASS | Example HTML parsed without execution; section IDs, content and active content checks produce observed pass/fail evidence and agreement version. Failed checks block normal advancement; explicit human override retains failed evidence and logs reason. |
| H — Buyer-authorized payment | PARTIAL | Explicit Pact approval sends sandbox invoice and exposes validated provider-generated payment URL. Real handoff verified; actual provider still reports `UNPAID`. A buyer must finish sandbox checkout. Actual completed payment remains unverified; no Orders capture or fabricated paid status. |
| I — Audit, idempotency and failure paths | PASS | Append-only SQLite audit triggers, session isolation and cross-origin rejection tested. Repeated acceptance/invoice/payment approval do not duplicate operations. Provider-term mismatch and manually marked paid state are guarded. Full browser paid path uses an explicitly mocked provider. |
| J — Public submission and walkthrough | PARTIAL | MIT license retained, feature branch pushed, setup/demo script and Devpost draft written. Video recording/upload, public visibility check and hackathon submission remain operator tasks. Main untouched. |

## Automated and browser checks

- Backend: **28 passed**, including provider HTTP contracts, malformed structured output, audit integrity, recovery, policy, payment and verification paths. One upstream Starlette/httpx deprecation warning; no test failures.
- Frontend: **4 passed**; production TypeScript/Vite build passed.
- Browser: **2 passed** on the credentials-absent product server (desktop acceptance/error/history and mobile blocked recipient substitution). **1 passed** against a separate explicitly mocked provider server (create → negotiate → accept → invoice → upload → authorize → provider refresh → paid).
- Real sandbox invoice browser view verified at 1440px and 390px widths; mobile horizontal overflow false. Desktop/mobile screenshots in [screenshots](screenshots/).
- Backend Ruff checks passed. No credentials are committed. SQLite, caches, sessions, test artifacts and dependency environments are ignored.

## Mandatory simplification review

Reviewed actual desktop/mobile screenshots as a first-time user. Kept one workspace, compact header/menu, negotiation and agreement; no sidebar, tabs, analytics or invented metrics. Moved the primary next action directly below the objective so it is reachable before the long transcript on mobile. Removed the repeated generic two-line title on active agreements. Collapsed completed verification evidence into a disclosure while keeping it expanded during verification review. The current amount and recipient are repeated only at explicit authorization points. Audit and failure controls remain secondary. Real unpaid state stays visible; there is no simulated success banner.

## Remaining prerequisites

1. Restore AI account credits or configure a funded compatible model/key securely. Then rerun one bounded live negotiation and update gate C only on actual success. The current account's HTTP 429 has been diagnosed; do not retry unchanged calls.
2. The buyer completes the sandbox invoice's actual PayPal approval/payment flow. Refresh status and update gate H only after provider-confirmed payment. Do not supply buyer passwords in chat.
3. Record, review and upload the demo; complete the submission. See [DEMO.md](DEMO.md).

Optional sponsor integrations, a dedicated small model, public deployment and marketplace features were deferred to protect P0.
