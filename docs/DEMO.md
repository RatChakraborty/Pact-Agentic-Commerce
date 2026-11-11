# Pact demonstration and submission notes

## 165-second walkthrough

- **0–20 seconds:** “Pact turns a service request into a clear agreement. Agents negotiate, but the buyer approves the final terms and payment.” Show the single workspace, $300 budget and landing-page scope.
- **20–55:** Start negotiation. Show the seller's opening price, buyer counteroffer and agreement. Say “deterministic demo” when that mode is selected. Do not imply live inference worked while credits are exhausted.
- **55–80:** Review price, recipient, deadline and scope. Explicitly accept; create a real sandbox invoice. Show the provider identifier and current unpaid status. “An invoice requests payment; it does not hold funds.”
- **80–110:** Upload the example HTML. Show each observed structural criterion and the parser's limitation. No seller code executes.
- **110–140:** Authorize the PayPal handoff. Open the sandbox invoice link. Buyer completes sandbox checkout manually. Return and refresh provider state. If checkout has not completed, say “payment pending”; never splice mocked paid UI into a claimed real payment.
- **140–165:** Show the recipient-substitution failure on a separate deterministic agreement. The forbidden offer is blocked and logged. Open the audit disclosure, then close it to restore the calm workspace.

## Current real integration evidence

On November 11, 2026, the configured sandbox app authenticated, read invoice access, created invoice `INV2-N6CJ-RJXM-96WT-XDVG`, retrieved and validated its amount/currency/merchant/buyer, and sent it. Subsequent readback returned `UNPAID` and a sandbox recipient payment URL. The application remained `PAYMENT_PENDING`. No completed sandbox payment has been observed.

Live model inference returned HTTP 429, error type `insufficient_quota`, code `credit_balance_exhausted`. Add credits or configure another compatible funded model/key in secure environment settings before recording a live negotiation. Do not repeat paid requests until configuration changes.

## Devpost draft

**Pact — Agreements, with intent**

Pact helps a buyer and seller negotiate a bounded landing-page engagement without giving an AI agent control of payment. Two roles exchange structured offers, deterministic policy checks protect budget and recipient identity, and the buyer explicitly locks the final terms. A real PayPal sandbox invoice ties the contract to a provider identifier. A safe HTML parser checks milestone evidence before the buyer authorizes a PayPal handoff. Provider readback and an append-only audit history keep the result verifiable.

Built with React, TypeScript, FastAPI, Pydantic and SQLite, Pact uses one focused workspace with a clear next action. Advanced traces stay secondary. Live structured AI negotiation is implemented but awaiting restored API credits; deterministic mode is labeled. The real sandbox invoice lifecycle is verified, while buyer payment completion remains pending.

## Submission checklist requiring operator action

- Restore model API credits and run one bounded live negotiation; update evidence with actual results.
- Complete buyer-authorized sandbox payment in PayPal, refresh Pact status, and record the observed result.
- Record and review a walkthrough under three minutes; verify no secrets, credentials or buyer details appear unintentionally.
- Upload the video to YouTube and add its real URL to the submission.
- Review the Devpost description against final verified behavior and submit before November 12, 2026 at 3 PM Eastern / noon Pacific.
- Verify public repository visibility and license from an unauthenticated browser. Feature branch is pushed; main is unchanged.

Production deployment, main merge, video publication and hackathon submission have not been performed by this development session.
