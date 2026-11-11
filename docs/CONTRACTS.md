# Data and API contracts (v0)

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

## Minimal API proposals
POST /api/agreements
POST /api/agreements/{id}/negotiate
POST /api/agreements/{id}/accept
POST /api/agreements/{id}/invoice
GET /api/agreements/{id}
POST /api/agreements/{id}/evidence
POST /api/agreements/{id}/payment-approval
GET /api/agreements/{id}/paypal-status
GET /api/agreements/{id}/audit
GET /api/health

## Hard gates
- Never trust browser-supplied agreement totals, seller recipient, status or payment success.
- Monetary values as integer minor units, never float.
- Require buyer approval before invoice creation and any payment workflow.
- Verify PayPal payment status via server-side provider retrieval/webhook verification, not client callbacks alone.
- Don't mark PAID from invoice existence, invoice send, a model answer, or return URL alone.
- Reject mutated terms after acceptance unless re-approved as a new version.
- Retry-safe external writes with durable idempotency and status checks.
- Log all rejection reasons, redact secrets/PII.
