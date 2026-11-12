# Agreement and payment security contracts

## Agreement
id: UUID
buyer_id: string
seller_id: string
service_description: string
acceptance_criteria: list of explicit criteria
max_budget_minor: integer
agreed_amount_minor: integer|null
currency: ISO 4217 (MVP USD)
deadline_iso: ISO datetime
status: DRAFT | NEGOTIATING | PROPOSED | ACCEPTED | INVOICED | EVIDENCE_SUBMITTED | VERIFIED | NEEDS_REVIEW | APPROVED_FOR_PAYMENT | PAID | CANCELLED
version: integer

## Offer
id, agreement_id, round, proposer, amount_minor, scope, delivery_date, explanation, created_at.
No unstructured seller instructions may override authorization policy.

## PaymentRecord
id, agreement_id, paypal_invoice_id, paypal_invoice_status, paypal_order_id|null, paypal_capture_id|null, provider_last_checked_at, amount_minor, currency, recipient_ref, status, idempotency_key.

## EvidenceResult
agreement_id, checks:[{name,passed,evidence}], overall: PASS|FAIL|NEEDS_REVIEW, verifier_version, evaluated_at. Model text is not payment authorization.

## AuditEvent
id, timestamp, agreement_id, actor, action, prior_status, next_status, structured_details, provider_reference|null.

## API reference

FastAPI generates the current endpoint schemas at `/openapi.json` and `/docs` in a local development instance. Public hosted access remains subject to application authorization. The original owner-only agreement API and shared two-persona API are separate; a shared demo ID never enables provider writes. See [the two-persona lifecycle](TWO_SIDED.md).

## Hard gates
- Never trust browser-supplied agreement totals, seller recipient, status or payment success.
- Monetary values as integer minor units, never float.
- Require buyer approval before invoice creation and any payment workflow.
- Verify PayPal payment status via server-side provider retrieval, not client callbacks alone.
- Don't mark PAID from invoice existence, invoice send, a model answer, or return URL alone.
- Reject mutated terms after acceptance unless re-approved as a new version.
- Retry-safe external writes with durable idempotency and status checks.
- Log all rejection reasons, redact secrets/PII.
