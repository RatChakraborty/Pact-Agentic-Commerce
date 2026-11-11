# PACT — Deadline-first delivery plan

## Frozen product and target
One buyer agent, one seller agent, one contract, one deliverable, one PayPal sandbox invoice. Demonstrate the end-to-end chain from instructions to negotiated terms to approved payment. Optimize for verified results and demo clarity, not feature count.

## P0 acceptance gates (must all pass)
A. App boots locally with documented commands, and public/demo instance is accessible or reproducible.
B. User configures buyer's max budget, required deliverable, date and approval policy.
C. Buyer and seller agents generate at least one coherent counteroffer and converge to a structured agreement, or explicitly fail/abstain.
D. Both agents are constrained: max rounds, max tokens, budget, currency, recipient, timeout; seller text is untrusted input.
E. User reviews and accepts the final terms before invoice creation.
F. Server creates actual PayPal sandbox invoice, persists PayPal invoice ID, and reads back provider status. If credential setup fails, show a truthful failure; do not relabel mocks as real PayPal calls.
G. Verifier evaluates one objective milestone (e.g., uploaded JSON deliverable with required fields and a deterministic rubric). Clearly distinguish objective test results and language-model opinion.
H. Payment is buyer-authorized. If implementing checkout, use supported PayPal approval mechanism and confirm result server-side. Invoice PAID state is not fabricated. If payment approval is too slow, demo functional invoice lifecycle and transparently mark payment capture as unimplemented.
I. Transaction ledger/audit trail, repeat-click idempotency, forbidden transitions tests, and safe error handling.
J. A convincing 150–175-second walkthrough, public open-source repo, visible license, installation instructions, English Devpost text and YouTube demo uploaded before deadline.

## P1, only after all P0 gates
- Specialized small LM contract critique; optional pre-trained 0.5B–3B model or API-based model with structured critique output. Never give probabilistic critique sole spending authority.
- AG Grid agreement, payment and audit exploration; aim for meaningful interaction not logo placement.
- One malicious/ambiguous counteroffer in a scenario selector.

## P2 stretch
- Bryntum timeline with one or two dependencies
- Multiple milestones/contracts
- Multi-seller procurements, product search
- Analytics/observability beyond essential traces

## Deadline order
Nov 10 late: initialize repo, environment, UI scaffold, API contracts, persistence, deterministic scenario.
Nov 11 morning: PayPal OAuth and invoice lifecycle FIRST; backend integration tests.
Nov 11 afternoon: bounded two-agent negotiation, verifier, auditable approvals, end-to-end happy path.
Nov 11 evening: polish UI, additional failure case, deploy and verify.
Nov 12 morning: freeze features, smoke tests, record video, license/README, submit early. Stop feature work to protect demo if behind.

## Timeboxing
If PayPal invoice integration is not working by Wednesday midday: stop all sponsor feature work and unblock invoices. If end-to-end demo isn't stable Wednesday night: don't add Bryntum or custom SLM fine tuning. If payment capture can't be proven via provider response: show invoice plus approval request, explicitly label paid outcome unimplemented.

## Demonstration storyboard
0–20 sec: promise, buyer objective, $300 cap.
20–60 sec: agents negotiate, structured offers become contract.
60–95 sec: contract accepted, real sandbox invoice ID shown.
95–125 sec: evidence uploaded; deterministic milestone check and explanation.
125–150 sec: buyer-approval/pay-state workflow, provider status shown.
150–175 sec: malicious/overspend offer blocked, audit trail and impact.

## Work boundaries
Single repo and branch; do not rewrite unrelated repositories. No invented test results, PayPal transaction statuses or model evaluations. Preserve verifiability. Commit incrementally.
