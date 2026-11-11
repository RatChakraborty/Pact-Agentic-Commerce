# Pact demonstration and submission notes

## 165-second walkthrough

- **0–20 seconds:** “Pact turns a service request into a clear agreement. Agents negotiate, but the buyer approves the final terms and payment.” Show the single workspace, $300 budget and landing-page scope.
- **20–55:** Start negotiation. Show the seller's opening price, buyer counteroffer and agreement. Use the verified live run: four actual model responses reach $300. If replaying recorded evidence, label it as a recording of that genuine run. Say “deterministic demo” whenever that mode is selected.
- **55–80:** Review price, recipient, deadline and scope. Explicitly accept; create a real sandbox invoice. Show the provider identifier and current unpaid status. “An invoice requests payment; it does not hold funds.”
- **80–110:** Upload the example HTML. Show each observed structural criterion and the parser's limitation. No seller code executes.
- **110–140:** Authorize the PayPal handoff. Open the sandbox invoice link. Buyer completes sandbox checkout manually. Return and refresh provider state. If checkout has not completed, say “payment pending”; never splice mocked paid UI into a claimed real payment.
- **140–165:** Show the recipient-substitution failure on a separate deterministic agreement. The forbidden offer is blocked and logged. Open the audit disclosure, then close it to restore the calm workspace.

## Current real integration evidence

On November 11, 2026, the configured sandbox app authenticated, read invoice access, created invoice `INV2-N6CJ-RJXM-96WT-XDVG`, retrieved and validated its amount/currency/merchant/buyer, and sent it. Subsequent readback returned `UNPAID` and a sandbox recipient payment URL. The application remained `PAYMENT_PENDING`. This was the initial state; after buyer checkout, the November 11 API read confirmed `PAID`, paid amount $300.00 USD, due $0.00, payment ID `48G26200EN969023U`. Pact persisted `PAID` through its ordinary provider-refresh path.

Credits were restored. Actual `gpt-4.1-mini-2025-04-14` inference first terminated at six turns, then reached a $300 agreement in four calls after a seller strategy clarification. No deterministic responses were presented as live. The session retained previous reservations; details and the full transcripts are in `docs/evidence/live-negotiation.json`.

The initial Chromium checkout attempt preserved TLS verification but was blocked by the cloud proxy. The buyer subsequently completed checkout externally. The latest actual API read is `PAID`, and repeated Pact refreshes reconciled successfully. Do not attempt another payment or paste buyer passwords in chat.

## Devpost draft

**Pact — Agreements, with intent**

Pact helps a buyer and seller negotiate a bounded landing-page engagement without giving an AI agent control of payment. Two roles exchange structured offers, deterministic policy checks protect budget and recipient identity, and the buyer explicitly locks the final terms. A real PayPal sandbox invoice ties the contract to a provider identifier. A safe HTML parser checks milestone evidence before the buyer authorizes a PayPal handoff. Provider readback and an append-only audit history keep the result verifiable.

Built with React, TypeScript, FastAPI, Pydantic and SQLite, Pact uses one focused workspace with a clear next action. Advanced traces stay secondary. Live structured AI negotiation is verified and deterministic mode is labeled. Canonical agreement fingerprints and version-bound approvals guard material terms. A small adversarial evaluation records both successful detections and a false escalation rather than claiming universal reliability. The real sandbox invoice lifecycle is verified, while buyer payment completion remains pending.

## Submission checklist requiring operator action

- Use the verified live transcript or one deliberately budgeted recording run; preserve cumulative reservations.
- Use the confirmed sandbox payment receipt and paid UI; no additional payment is necessary.
- Record and review a walkthrough under three minutes; verify no secrets, credentials or buyer details appear unintentionally.
- Upload the video to YouTube and add its real URL to the submission.
- Review the Devpost description against final verified behavior and submit before November 12, 2026 at 3 PM Eastern / noon Pacific.
- Verify public repository visibility and license from an unauthenticated browser. Feature branch is pushed; main is unchanged.

Production deployment, main merge, video publication and hackathon submission have not been performed by this development session.

## Concise technical architecture

React presents one same-origin workspace. FastAPI owns the browser session, typed agreement and state transitions. SQLite persists accepted snapshots, canonical term fingerprints, append-only audit events and durable inference reservations. Buyer/seller models generate structured offers; deterministic checks bound money, recipient and scope. Optional structured critique can flag wording but cannot authorize a transaction. Static HTML evidence is parsed without execution. PayPal sandbox OAuth and Invoicing remain server-only; actual provider readback determines payment status. No public deployment, dedicated SLM, escrow, or autonomous payment authority is claimed.

## Final demonstration emphasis

Show the live negotiation evidence, then the accepted fingerprint and a blocked changed-recipient attempt. Explain that real invoice lifecycle and live negotiation were independently verified; do not imply the existing deterministic-run invoice was created by the later live run. Keep payment unpaid/pending until an actual buyer checkout is confirmed. Sponsor claims must match SPONSORS.md: prepared/inspected tooling is not a completed integration or guaranteed eligibility.
