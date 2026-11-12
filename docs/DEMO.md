# Pact demonstration and submission notes

**Current release guidance:** follow [final release verification and the recording sequence](RELEASE_VERIFICATION.md). Core PostgreSQL health is user-verified on c894ebe. Do not create another invoice/payment or run paid inference for the demo; use the labeled recorded evidence. Earlier counts and live-operator sequences below are historical.

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

Built with React, TypeScript, FastAPI, Pydantic and SQLite, Pact uses one focused workspace with a clear next action. Advanced traces stay secondary. Live structured AI negotiation is verified and deterministic mode is labeled. Canonical agreement fingerprints and version-bound approvals guard material terms. A small adversarial evaluation records both successful detections and a false escalation rather than claiming universal reliability. The real sandbox invoice lifecycle is verified, and the separate invoice is provider-confirmed PAID.

## Submission checklist requiring operator action

- Use the verified live transcript or one deliberately budgeted recording run; preserve cumulative reservations.
- Use the confirmed sandbox payment receipt and paid UI; no additional payment is necessary.
- Record and review a walkthrough under three minutes; verify no secrets, credentials or buyer details appear unintentionally.
- Upload the video to YouTube and add its real URL to the submission.
- Review the Devpost description against final verified behavior and submit before November 12, 2026 at 3 PM Eastern / noon Pacific.
- Verify public repository visibility and license from an unauthenticated browser. Feature branch is pushed; main is unchanged.

Production deployment, main merge, video publication and hackathon submission have not been performed by this development session.

## Concise technical architecture

React presents one same-origin workspace. FastAPI owns the browser session, typed agreement and state transitions. SQLite persists accepted snapshots, canonical term fingerprints, append-only audit events and durable inference reservations. Buyer/seller models generate structured offers; deterministic checks bound money, recipient and scope. Optional structured critique can flag wording but cannot authorize a transaction. Static HTML evidence is parsed without execution. PayPal sandbox OAuth and Invoicing remain server-only; actual provider readback determines payment status. The user-created Vercel Preview remains unverified from this environment; no dedicated SLM, escrow, or autonomous payment authority is claimed.

## Final demonstration emphasis

Show the live negotiation evidence, then the accepted fingerprint and a blocked changed-recipient attempt. Explain that real invoice lifecycle and live negotiation were independently verified; do not imply the existing deterministic-run invoice was created by the later live run. Show the existing provider-confirmed PAID receipt only as evidence for its original invoice. New demo contracts remain NOT_CREATED. Sponsor claims must match SPONSORS.md: prepared/inspected tooling is not a completed integration or guaranteed eligibility.

## Public website recording sequence — use after deployment gates pass

The user-supplied Preview URL exists but is not verified from this session. Do not record a localhost page and describe it as a deployed judge experience. First complete the existing-project Preview and stable-URL checks in VERCEL.md.

- **0–20 s:** Open the actual stable URL in a clean browser. Explain agent negotiation needs explicit authorization and verifiable outcomes.
- **20–50 s:** Start the prefilled **deterministic** sample. Show buyer/seller counteroffers and the clear price/budget panel; do not label this live inference.
- **50–80 s:** Inspect the fingerprint/wording disclosure, accept terms, then continue to the demo milestone. Explain that this interactive sample creates no invoice or charge.
- **80–110 s:** Load example evidence and show observed structural checks. Refresh and show persisted state/audit.
- **110–140 s:** Investigate a blocked recipient substitution through the existing disclosure. Show rejection and its audit event.
- **140–165 s:** Open Workspace → Recorded real API evidence. Explain the separate actual four-call AI negotiation and real sandbox PAID receipt; do not imply the old invoice came from the later live run or the visitor's sample.
- **165–175 s:** Close the disclosure and summarize the trustworthy execution boundary. Include the actual tested URL in the submission only after it exists.

The public Devpost narrative should say PostgreSQL-backed anonymous interactive demo only after hosted checks pass. Until then, describe the existing Vercel Preview as unverified and its recovery checks as blocked. Video recording/upload and submission remain human steps; no YouTube URL has been invented.

Until a merge is separately authorized, link judges to the actual implementation source at `https://github.com/RatChakraborty/Pact-Agentic-Commerce/tree/feature/pact-core`, rather than implying default main contains these changes.


## Current judge-facing sequence (under three minutes)

1. **0:00–0:20:** Landing page → Try interactive demo. Explain that the interactive run is deterministic and costs nothing.
2. **0:20–1:00:** Sample negotiation → inspect offers and exchanged terms → confirm terms → milestone → example evidence. Show that demo verification never means payment. Open Your agreements and restore the saved original transcript.
3. **1:00–1:25:** In prepared separate customer/business browser contexts, open the same two-persona record. Show private-limit separation, seller agent consent and both human confirmations. Seller submits evidence; customer reviews. Label identities as demo-only and payment NOT_CREATED. See TWO_SIDED.md for setup.
4. **1:25–1:50:** Original workspace menu → recorded real API evidence. Show the genuine model identifier/negotiation separately from the existing PayPal PAID receipt; they are different agreements. The latest independent live matrix contains a three-call $300 success and an infeasible case blocked by the host despite the model's invalid acceptance.
5. **1:50–2:25:** Show a blocked recipient change, version/fingerprint safeguards, critic evidence and measured limitations. Do not call deterministic scenarios model intelligence, claim a trained SLM, or claim shared demo payment.
6. **2:25–2:50:** Explain provider-confirmed status, no escrow, human financial authority, and optional tooling status. If the public deployment remains unverified, demonstrate locally and state the blocker; do not invent a working hosted URL.

Recorded live matrix: 6 actual calls, 2,656 prompt + 447 completion tokens, $0.004444 conservative configured estimate (not a billing receipt). The frozen original and corrected offline rerun are both retained. No further paid recording run is necessary.

Current architecture also supports dedicated PostgreSQL with verified remote TLS for Vercel, durable sessions/budgets and atomic transitions. The two-sided record is a separate nonpayable demo capability; it cannot inherit the private provider workflow's permissions. Real accounts, shared live AI/payment and optional replay are deferred. Public deployment recovery requires the exact network/account actions in VERCEL.md. Finish recording, uploading and submitting by November 12, 2026, 3 PM Eastern / 20:00 UTC.


## Recorded-first recovery sequence

Use Explore the demo → Next/Previous/Restart → Show complete transcript. Explicitly call it recorded genuine AI, not live streaming. Switch to the infeasible scenario and reveal the actual seller-minimum host block. Explain agent acceptance is not human approval. Open the separate dated PayPal PAID receipt and semantic-evaluation disclosures; neither is claimed to belong to a newly authorized replay contract. Try it yourself then shows role choice and the real interactive customer/business flows, whose hosted health must be verified first. The static replay itself requires no Neon or paid API requests.
