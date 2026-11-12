# Pact

**Pact turns buyer/seller agent proposals into inspectable service agreements with human authorization, contract verification, and PayPal sandbox payment reconciliation.**

Agents propose economic commitments. Pact enforces limits, recipients, scope and version-bound consent. People approve the terms and any financial handoff.

## Explore Pact

The dominant **Explore Pact** action opens a complete one-session demonstration at `/demo`. No account, second browser, API key, database or payment is needed:

1. Inspect genuine recorded buyer/seller model offers and an actual host-enforced rejection.
2. Step through a **separate deterministic backend fixture**: request, business agent authorization, version/fingerprint, both human confirmations, seller evidence, customer review and audit.
3. Inspect the **separate historical PayPal sandbox transaction**: $300 USD, provider-confirmed PAID, $300 received, zero due, dated receipt and original audit.

These evidence chapters are explicitly distinguished. The genuine AI proposal, the deterministic two-party fixture and the historical paid invoice are not presented as one transaction. Display controls reveal existing evidence; they do not authorize a contract or payment.

**Try it yourself** retains the advanced interactive marketplace: service directory/invitations, customer requests, seller authorization, private limits, shared negotiation, mutual confirmation, evidence review and saved history. Truly independent participants use two browser/private contexts. That isolation is preserved; it is not required for Explore Pact.

## Release status

The user verified actual Vercel core health on `c894ebe78330d3e4ebda96dbd4ac1657a86b33d2`: `status=ok`, `storage=postgresql`, Python 3.12.16, public demo enabled, live AI/PayPal credentials unconfigured. The supplied [core Preview](https://pact-agentic-commerce-git-feature-pact-core-pact-83c7281c.vercel.app/) is a branch alias, not a permanent final-release SHA.

**Final integrated hosted workflow and Production acceptance remain unverified.** The agent's direct probes are blocked by proxy CONNECT policy; this does not imply the application failed. No final Production URL is invented. See [final release report and account steps](docs/FINAL_RELEASE.md).

Demo video: **pending operator recording/upload**. Submission deadline: November 12, 2026, 3:00 PM Eastern.

## Architecture and execution modes

React/TypeScript/Vite provides one workspace, a genuine replay, provisional contract preview, role-specific saved agreements and a state-aware progress display. FastAPI owns session isolation, authorization, negotiation policy, evidence parsing and provider adapters. PostgreSQL persists agreements, sessions, budgets, reservations and append-only audit events; local development also supports SQLite.

| Mode | Execution | Financial capability |
| --- | --- | --- |
| Recorded real AI negotiation | Frozen actual model responses, hash-pinned receipts; no new inference | None |
| Interactive deterministic demonstration | Captured fixture states or live deterministic public backend | None |
| Verified PayPal sandbox transaction | Read-only dated provider evidence from an original separate agreement | None in public evidence viewer |
| Private operator workflow | Configured model/provider adapters behind server authorization | Sandbox only; explicit buyer consent required |

The bounded agent protocol exchanges structured action, amount in integer minor units, currency, recipient, scope and explanation. The host validates every offer; agent acceptance is only a proposal. Turn limits, conservative reservation accounting and malformed-output handling bound the model path. No dedicated SLM has been trained or deployed.

## Authorization and agreement integrity

- Server-bound demo roles are immutable for a session; unrelated sessions cannot read a shared contract. Counterparties' private economic constraints are filtered from responses and explanations.
- Version/fingerprint checks bind each required confirmation to the same material terms. Agent authorization, term approval and payment handoff are distinct decisions.
- PostgreSQL transactions use a transaction-scoped advisory lock; audit changes are append-only. Budget reservations and duplicate operations are checked server-side.
- Remote database connections require `verify-full` with an explicit packaged Certifi trust bundle. No remote SQLite fallback or certificate-verification downgrade exists.
- Hosted sessions use Secure/HttpOnly/SameSite cookies, origin checks and a stable signing secret. No model, frontend control or verifier can authorize a payment.
- A fingerprint detects changes; it is not identity authentication or a claim of legal enforceability.

## Semantic critique and deliverable verification

A replaceable structured critic can flag contradictory or ambiguous contractual language. The public two-party workflow uses labeled deterministic rules. The genuine recorded semantic evaluation is separately accessible with numerator/denominator, failed-attempt and false-positive disclosures. The critic advises; deterministic financial rules remain authoritative.

The HTML verifier parses required section IDs, text presence and active-content indicators without executing seller code. A structural PASS does not establish visual quality, accessibility, legal compliance or automatic release of funds. Human review remains distinct.

## PayPal integration

The private sandbox adapter implements:

| Provider operation | Purpose |
| --- | --- |
| `POST /v1/oauth2/token` | Server-side OAuth authentication |
| `POST /v2/invoicing/invoices` | Idempotent invoice creation from accepted terms |
| `POST /v2/invoicing/search-invoices` | Recover a lost create response using the durable invoice number |
| `POST /v2/invoicing/invoices/{id}/send` | Send a draft during buyer-authorized handoff where needed |
| `GET /v2/invoicing/invoices/{id}` | Validate invoice identity, amount, currency, merchant and buyer; reconcile provider state |

Checkout uses the provider-returned HTTPS sandbox URL, never a constructed fake link. Invoice creation is not payment authorization. The original flow creates an invoice after buyer term approval, verifies evidence, obtains explicit buyer handoff authorization, then reads PayPal's actual state. It records buyer consent; a second seller human confirmation was not captured in that historical single-player flow.

The verified historical invoice is `INV2-N6CJ-RJXM-96WT-XDVG`: $300 USD, PAID, $300 received and $0 due, PayPal-reported payment date November 11, 2026. Its original deterministic agreement is separate from the recorded AI negotiation and every new visitor contract. [Provider evidence](docs/evidence/paypal-readback.json) and [original agreement/audit linkage](docs/evidence/paypal-contract-link.json) are preserved. Visiting `/payments` makes no provider request.

No real-money operations, escrow, fund reservation or automatic release is claimed. Anonymous public visitors cannot create invoices, authorize checkout or invoke paid models. The hosted private operator path and webhooks remain deferred/unverified; direct provider polling is retained. [PayPal release review](docs/FINAL_RELEASE.md#paypal-and-branding-review).

## Run locally

Requires Python 3.12, Node and uv. Never commit `.env` or database files.

```bash
uv sync --project backend --frozen --extra test
npm --prefix frontend ci
npm --prefix frontend run build
cd backend
uv run --frozen uvicorn app.main:app --host 127.0.0.1 --port 8000
```

Open `http://127.0.0.1:8000`. Explore Pact is database independent. For local two-person testing, open another private browser context. Use `.env.example` only as a local template; Vercel environment values must be configured in the existing project, not inferred from this workspace.

Public Preview configuration: `PUBLIC_DEMO=true`, `ENABLE_LIVE_OPERATIONS=false`, `LLM_MAX_CALLS=0`, `LLM_BUDGET_USD=0`, `PAYPAL_ENV=sandbox`, a stable strong `APP_SESSION_SECRET`, and the existing dedicated Pact PostgreSQL binding. No AI or PayPal keys are needed for the public demonstration. Root Directory is repository root. Keep the Python pin and root locked requirements.

## Test and reproduce evidence

```bash
cd backend
uv run --frozen pytest -q
uv run --frozen python -m app.evaluate_negotiation --output /tmp/pact-negotiation-new.json
uv run --frozen python evaluate.py --output /tmp/pact-evaluation-new.json
cd ../frontend
npm test
npm run build
PACT_TEST_URL=http://127.0.0.1:8000 PACT_CHROMIUM_PATH=/usr/bin/chromium npm run test:e2e
```

Default evaluation is offline; no `--live` flag is required. The full optional PostgreSQL suite requires a **disposable local** `PACT_TEST_DATABASE_URL` named `pact_*_test`. Those tests reset fixtures; never use Neon or production there. Public-mode and mocked-provider browser scenarios require their respective isolated test servers; see [release verification](docs/RELEASE_VERIFICATION.md).

Frozen evidence: [real negotiation matrix](docs/evidence/negotiation-matrix-20261111.json), [recorded semantic evaluation](docs/evidence/evaluation-live.json), [final offline negotiation](docs/evidence/final-negotiation-offline-20261112.json), [final offline evaluation](docs/evidence/final-semantic-offline-20261112.json). Actual model calls and configured cost estimates are reported separately from mocks and billing receipts.

## Production release gate

Main publication is authorized by the latest directive. Production promotion requires actual final hosted acceptance. `vercel.json` uses an ignored-build command to hold automatic Production builds until the existing project's Production setting `PACT_PRODUCTION_RELEASE_SHA` equals the exact verified commit, with public mode and zero paid budget configured. Preview builds are unaffected. This non-secret SHA gate prevents a main push from silently bypassing hosted verification. See [the exact deployment handoff](docs/FINAL_RELEASE.md#hosted-and-production-handoff).

## Final local regression results

169 backend tests; 26 frontend tests; nine deployment checks; 21 distinct browser scenarios; TypeScript, build, lint and formatting passed. Runtime npm audit: zero advisories. Full dev/build audit: zero critical, three high advisories confined to the official analyzer's trusted-input dependency chain. See [full results and limits](docs/FINAL_RELEASE.md#final-local-checks-and-dependency-risk). Local checks do not establish final hosted acceptance.

## Submission and limitations

[Three-minute demo](docs/DEMO.md) · [Devpost draft](docs/DEVPOST.md) · [Evaluation details](docs/EVALUATION.md) · [Sponsor report](docs/SPONSORS.md) · [Final release inventory](docs/FINAL_RELEASE.md).

Current constraints: small fixed evaluation samples; recorded evidence is historical; public identities are demo personas, not registered accounts; shared real-payment adapter deferred; webhook verification/account setup deferred; final hosted and Production acceptance pending. Optional sponsor work is not allowed to delay release verification. No uninvoked plugin or dependency-only prize eligibility is claimed.

MIT licensed; see [LICENSE](LICENSE).
