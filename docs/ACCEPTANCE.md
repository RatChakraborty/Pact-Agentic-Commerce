# P0 acceptance evidence

Validation performed November 11, 2026. Test mocks are distinct from actual provider calls. This is a local demo, not a production-readiness claim.

| Gate | Outcome | Evidence / remaining work |
| --- | --- | --- |
| A — Reproducible local app | PASS | Frozen uv sync, npm install/build, running FastAPI static frontend and API; browser creates and reloads a persisted agreement. README includes startup commands. No production deployment. |
| B — Buyer brief and authorization policy | PASS | Objective, budget, required hero/features/contact scope and future deadline are configurable. Terms and payment each require explicit approval; no automatic authorization mode exists. |
| C — Distinct agents negotiate | PASS | Funded retry received six actual model replies and terminated at the turn cap. Clarified seller strategy then produced a genuine four-call $360 → $300 → $300 → acceptance negotiation with `gpt-4.1-mini-2025-04-14`. Transcript, usage and estimates: `docs/evidence/live-negotiation.json`. |
| D — Hard agent constraints | PASS | Tests block overspend, recipient/scope changes, invalid/unsupported model output, bad acceptance, exhausted call/cost allowance and turn exhaustion. Input/output caps and timeouts bound live calls; spending uses configurable conservative price estimates, not guaranteed provider billing. |
| E — Buyer accepts locked terms | PASS | Version-bound explicit confirmation; accepted snapshot persisted. Repeated acceptance emits one event. No accepted-term mutation API exists; changes require a new agreement. Browser acceptance/reload verified. |
| F — Real sandbox invoice | PASS | Real OAuth and invoice read access, invoice `INV2-N6CJ-RJXM-96WT-XDVG` created/read/sent. Server validates amount, USD currency, merchant and buyer against accepted terms. Real readback `UNPAID`; ID persisted in SQLite. Lost response reconciliation and repeated requests tested with mocks. |
| G — Objective milestone verification | PASS | Example HTML parsed without execution; section IDs, content and active content checks produce observed pass/fail evidence and agreement version. Failed checks block normal advancement; explicit human override retains failed evidence and logs reason. |
| H — Buyer-authorized payment | PARTIAL | Explicit Pact approval sends sandbox invoice and exposes validated provider-generated payment URL. Real handoff verified; actual provider still reports `UNPAID`. Actual browser attempt failed with `ERR_TUNNEL_CONNECTION_FAILED`: checkout host is outside current egress policy. Buyer must finish checkout in their own browser; no password is requested in chat. Actual completed payment remains unverified; no Orders capture or fabricated paid status. |
| I — Audit, idempotency and failure paths | PASS | Append-only SQLite audit triggers, session isolation and cross-origin rejection tested. Repeated acceptance/invoice/payment approval do not duplicate operations. Provider-term mismatch and manually marked paid state are guarded. Full browser paid path uses an explicitly mocked provider. |
| J — Public submission and walkthrough | PARTIAL | MIT license retained, feature branch pushed, setup/demo script and Devpost draft written. Unauthenticated repository HTTP 200/public marker verified. Video recording/upload and hackathon submission remain operator tasks. Main untouched. |

## Automated and browser checks

- Backend: **58 passed**, including provider HTTP contracts, malformed structured output, audit integrity, recovery, policy, payment and verification paths. One upstream Starlette/httpx deprecation warning; no test failures.
- Frontend: **4 passed**; production TypeScript/Vite build passed.
- Browser: **3 passed** on the credentials-absent product server (desktop acceptance/error/history, mobile blocked recipient substitution, and delayed session initialization). **1 passed** against a separate explicitly mocked provider server (create → negotiate → accept → invoice → upload → authorize → provider refresh → paid).
- Real sandbox invoice browser view verified at 1440px and 390px widths; mobile horizontal overflow false. Desktop/mobile screenshots in [screenshots](screenshots/).
- Backend Ruff checks passed. No credentials are committed. SQLite, caches, sessions, test artifacts and dependency environments are ignored.

## Mandatory simplification review

Reviewed actual desktop/mobile screenshots as a first-time user. Kept one workspace, compact header/menu, negotiation and agreement; no sidebar, tabs, analytics or invented metrics. Moved the primary next action directly below the objective so it is reachable before the long transcript on mobile. Removed the repeated generic two-line title on active agreements. Collapsed completed verification evidence into a disclosure while keeping it expanded during verification review. The current amount and recipient are repeated only at explicit authorization points. Audit and failure controls remain secondary. Real unpaid state stays visible; there is no simulated success banner.

## Remaining prerequisites

1. Live AI credits now work and gate C is verified. Preserve the cumulative call/dollar reservations; review the configured allowance before another recording run. No further inference is required merely to repeat this evidence.
2. The buyer completes the sandbox invoice's actual PayPal approval/payment flow. Refresh status and update gate H only after provider-confirmed payment. Do not supply buyer passwords in chat.
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
