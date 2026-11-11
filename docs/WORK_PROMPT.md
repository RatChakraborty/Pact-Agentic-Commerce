# Pact implementation handoff prompt

You are the lead engineer for **Pact**, a PayPal AI Hackathon submission with a hard deadline of Nov 12, 2026 at 3 PM ET. Work in THIS repository only. Read README.md, docs/PLAN.md and docs/CONTRACTS.md first; treat them as authoritative. Do not change product concept, introduce sprawling subsystems, or claim mocked external actions as real. Start building immediately.

## Objectives
Build and validate a working full-stack end-to-end product: buyer and seller agents negotiate a bounded service agreement, user accepts terms, backend creates a real PayPal sandbox invoice, a deterministic verifier evaluates the milestone, buyer expressly approves the payment workflow, and the dashboard displays genuine provider status. Include a blocked bad-offer scenario and auditable event history. A polished React UI is mandatory. Use a Python FastAPI backend and SQLite persistent state. Clearly label deterministic fallback vs live AI.

## Execution order
1. Verify worktree, git status, branch and environment; propose no risky change outside repo.
2. Create backend and frontend projects, config, package files, meaningful automated tests, stable shared API schema and error model. Do not add empty UI buttons.
3. Implement PayPal OAuth and Invoicing v2 create/read/status in SANDBOX, using server-only credentials. Write contract tests with mocked HTTP responses. Expose credential readiness diagnostics without exposing secrets. Use actual sandbox when credentials are supplied.
4. Implement typed agreements, state machine, budget and recipient constraints, user approval, persisted audit trail, invoice idempotency.
5. Implement two agent roles with bounded turn-taking, explicit JSON offer schema, injected LLM client, useful error/abstention behavior; use deterministic showcase fixtures only as a clearly labeled fallback. Model may propose but never authorize spending.
6. Implement objective milestone evidence checks for one showcase artifact. Surface test evidence, not fabricated quality claims.
7. Implement functional React frontend, responsive dark professional UI, overview, negotiation trace, agreement terms, invoice status, evidence, payment approval, audit. Make every action connected to backend.
8. Add an end-to-end happy-path case, rejected/overspend case, duplicate and unauthorized invoice/payment cases, regression tests, document what really ran.
9. Deploy if credentials and deployment access exist; otherwise provide exact instructions. Add AG Grid only after P0 works; Bryntum only after that. Do not waste deadline on training a model from scratch.
10. Finish docs, license visibility, demo seed, <3-minute storyboard, submission checklist; report remaining limitations honestly.

## Safety and truthfulness
PayPal invoices are not escrow; payment isn't received merely because an invoice exists. Only mark paid after actual provider-confirmed status. Never expose tokens to frontend or logs. No arbitrary code execution of seller-uploaded content. Use sandbox only. Do not perform real-money payment or publish secrets.

## Working method
Work autonomously through implementation and tests. Make incremental commits on a dedicated feature branch. Provide exact files, commands, test counts, honest pass/fail status, and URLs. Keep main stable and do not push/merge/deploy unless repository authorization and access are clear. If a dependency is blocked, record the blocker and continue with testable independent pieces instead of stopping the entire task. Finish critical end-to-end workflow before optional improvements.
