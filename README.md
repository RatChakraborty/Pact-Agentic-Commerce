# Pact — Agent-to-Agent Commerce

**Status:** implementation starter; not yet a functioning application.

Pact lets buyer and seller AI agents negotiate a bounded service agreement, create a PayPal sandbox invoice, verify a demonstrable milestone, and obtain explicit buyer authorization before payment.

## Hackathon
PayPal AI Hackathon, deadline **November 12, 2026 at 12:00 PM PST / 3:00 PM EST**.

## Must-have demo
1. Buyer requests a fixed-scope landing page contract, max $300.
2. Buyer and seller agents exchange counteroffers and agree on a price and testable acceptance criterion.
3. Buyer explicitly accepts the finalized agreement.
4. Backend creates a real PayPal sandbox invoice and displays its provider ID and status.
5. Seller submits a verifiable artifact; verifier returns evidence and pass/fail/needs review.
6. Buyer explicitly authorizes payment using a genuine PayPal sandbox approval flow; app retrieves and displays verified provider status.
7. Run a failure scenario: a counteroffer exceeds spending limits or changes recipient without authorization; Pact blocks and logs it.

**Payment claim rule:** an invoice is a payment request, not funds being held, guaranteed, or captured. Don't claim escrow. Don't mark a payment 'paid' without verifying PayPal's state.

## Implementation directions
See [docs/PLAN.md](docs/PLAN.md), [docs/CONTRACTS.md](docs/CONTRACTS.md), and [docs/WORK_PROMPT.md](docs/WORK_PROMPT.md).

## Proposed stack
- Frontend: React + TypeScript + Vite; Tailwind or plain CSS; optional AG Grid
- Backend: Python FastAPI, Pydantic, SQLModel/SQLite or SQLAlchemy/SQLite
- AI: provider-configurable LLM clients; two bounded agents; deterministic fallback clearly labeled; optional small LM critique
- PayPal: server-side REST API OAuth; Invoicing v2 first; order/payment approval flow only when actually implemented
- Testing: pytest, Vitest/Playwright if time allows

## Security
Never commit API secrets; no sandbox credentials in client bundles. Use `.env.example` and server-only environment variables. Transaction actions require server-side authorization, idempotency, amount/currency/recipient validation, and audited status transitions.

## License
MIT (see LICENSE).
