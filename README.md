# Pact

**AI agents negotiate a contract. Pact makes sure they can’t overspend, expose private limits, change approved terms, or pay without human consent.**

Pact brings customer and business agents together around a service request. The agents propose terms; a trusted host checks them; people retain control of approval, evidence review and payment.

[Explore Pact — Ready Preview](https://pact-agentic-commerce-chdx18y8i-pact-83c7281c.vercel.app/demo) | [Source repository](https://github.com/RatChakraborty/Pact-Agentic-Commerce)

This is the release-candidate Preview reported Ready by Vercel. Anonymous access and hosted workflow acceptance remain unverified here; Vercel Deployment Protection may require owner configuration. A public Production URL has not been verified.

![Actual local guided negotiation, using genuine recorded model offers](docs/screenshots/clarity/stage-2-desktop.png)

## Try Pact in 60 seconds

1. Open **Explore Pact** and watch actual recorded AI agents negotiate.
2. Inspect Pact blocking an invalid proposal and the separate agreement/verification workflow.
3. Inspect authentic historical PayPal sandbox payment evidence.

The walkthrough requires no Pact account, API credentials, second session or payment. Hosted access also requires the deployment owner to permit anonymous viewing in Vercel.

## Follow the seven-stage guide

Open [the guided demo](https://pact-agentic-commerce-chdx18y8i-pact-83c7281c.vercel.app/demo), or click **Explore Pact** on the landing page. Use one browser; navigation reveals saved evidence and never initiates model inference, approval or payment.

| Stage                            | What to inspect                                                                                                | Action to continue                                              |
| -------------------------------- | -------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| 1 · Meet the participants        | Customer requirements and business listing; why the business’s asking price appears first.                     | **Watch the agents negotiate →**                                |
| 2 · Genuine recorded AI          | Original offers in order. Use **Next offer →** until all three appear, or **Show full exchange**.              | **See what happens when an agent breaks the rules →**           |
| 3 · Trusted host rejection       | An authentic invalid proposal from a separate limits test and the host’s refusal.                              | **See how the agreement is approved →**                         |
| 4 · Captured human confirmations | A separate deterministic backend fixture: both people approved the same agreement version.                     | **See how Pact checks the deliverable →**                       |
| 5 · Verification and review      | Structural checks and the customer’s separate review of the deliverable.                                       | **See how payment is authorized →**                             |
| 6 · Historical PayPal payment    | **PAID / $300 received / $0 due**. Open **How Pact integrates PayPal** for the API and authorization sequence. | **See what Pact remembers →**                                   |
| 7 · Audit and summary            | The three evidence sources remain separately attributed.                                                       | **Try the interactive marketplace**, or **Restart guided demo** |

**Back** revisits the previous stage. **Previous offer** and **Restart offer replay** control the negotiation; **Restart guided demo** returns to stage one. Technical provenance and full payment details are optional disclosures.

The private backend implements server-side OAuth, [PayPal Invoicing API](https://developer.paypal.com/docs/api/invoicing/v2/) operations, explicitly authorized checkout handoff and provider reconciliation. Stage six shows a previously completed sandbox transaction, not a new payment. The real AI recording, captured agreement fixture and historical payment are **three separate executions**.

## Interactive marketplace — try both sides

This separate working-backend demonstration uses deterministic public agents and creates actual demo service/agreement records. Use **two isolated browser sessions**—a regular window and an incognito window are sufficient—and keep both on the **same deployment hostname**. It creates no PayPal invoice or payment and makes no live AI calls. Hosted backend availability is required; the recorded guide works independently of it.

1. In the regular window, open [Business](https://pact-agentic-commerce-chdx18y8i-pact-83c7281c.vercel.app/business). Enter a **Demo display name**, then click **Start business demo**.
2. Open **Publish a demo service**. Keep **Studio landing page**, the default description, **Public asking price (USD)** `360` and **Private seller minimum (USD)** `240`. Click **Publish demo service**. Remember the business display name to distinguish your listing.
3. In incognito, open [Customer](https://pact-agentic-commerce-chdx18y8i-pact-83c7281c.vercel.app/customer) on that same hostname. Enter a different **Demo display name** and click **Start customer demo**.
4. Click **Refresh shared activity**, then select your **Studio landing page** listing, identified by its business name. The business’s **Customer invitation link** can also open that exact listing in the isolated customer window.
5. Keep the default **Project objective** for a static landing page, set **Your private maximum (USD)** to `300`, and choose a **Delivery date** in the future. The required scope is hero, features and contact sections.
6. Check **I authorize my buyer agent to negotiate this request.**, then click **Send negotiation request**.
7. In the business window, click **Refresh shared activity** and select the incoming agreement by its project objective.
8. Click **Authorize seller agent**.
9. In the customer window, click **Refresh shared activity**, then **Run deterministic negotiation**. Inspect the offers and resulting proposed terms; use the amount shown rather than assuming a particular negotiated price.
10. Review the scope, amount and version, then click **Confirm terms as customer**.
11. In the business window, click **Refresh shared activity**, review the same terms and version, then **Confirm terms as seller**. Both confirmations are required before evidence submission.
12. In the business window, click **Submit example evidence**. The structural checks produce **awaiting buyer review**.
13. In the customer window, click **Refresh shared activity** and inspect the checks. Under **Decision**, choose **Accept deliverable (no payment)**. Enter a **Review reason** of 10–500 characters, such as “I inspected the three required sections and structural checks.” Click **Record customer review**.
14. Inspect **Two-sided demo complete** (`DEMO_COMPLETE`) and the payment state **Not created**. Open **Shared contractual history**; refresh the business window to see the same final agreement and history.

Activity updates through **Refresh shared activity**, not automatically. Keep each role in its original session; logging out or changing the hostname does not recover that persona’s agreements.

| Mode                    | What is executed                                                                                                                                             |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Guided demo             | Saved authentic model outputs, a captured agreement fixture and a separate historical PayPal payment; viewing makes no new approval, model or provider call. |
| Interactive marketplace | Real customer/business actions in independent sessions, deterministic negotiation and persisted demo agreements; no new PayPal payment.                      |

## The problem

A persuasive conversation is not permission to spend. An agent may exceed a budget, reveal a private limit, change the scope or recipient, introduce contradictory terms, or mistake a proposal for an approved contract. Pact makes those boundaries visible and enforces them outside the model.

## How Pact works

Discover → Negotiate → Validate → Approve → Verify → Pay → Audit

The **business publishes a service**; the **customer initiates a project request**. A public $360 asking price starts the example, so the business agent speaks first. The customer agent counters at $300. The agents reach a proposal—not human contractual approval.

The seven-stage guide then shows the host refusing an invalid offer, a separate captured agreement with both confirmations, deliverable checks and review, separate PayPal evidence, and a closing audit. Each screen has one clear next action, Back and Restart.

## Core features

### Agent-mediated negotiation

Buyer and seller agents have different incentives, structured offers, private economic limits and bounded turns. Inspect genuine saved model replies in their original order, or use the advanced customer/business marketplace with deterministic public agents.

### Trusted host authorization

Model output cannot authorize a payment. Pact validates economic limits, recipients, scope and structured offers, rejects unauthorized proposals, and binds human confirmations to the same contract version and fingerprint.

Supporting workflows keep the commitment inspectable:

- **Human agreement:** separate confirmations, role/session isolation and shared saved history.
- **Advisory critique:** contradictory or ambiguous wording checks, with model/rule execution labels and measured false positives.
- **Deliverable review:** HTML structural checks followed by distinct customer review; seller code is not executed.
- **Audit and evidence:** PostgreSQL transactions, append-only history and source-linked receipts.

## Real evidence and PayPal integration

These are separate demonstrations, not one newly executed transaction.

| Evidence               | Execution mode                       | Outcome                                                                                      |
| ---------------------- | ------------------------------------ | -------------------------------------------------------------------------------------------- |
| Feasible negotiation   | Recorded real AI                     | Three offers reach a $300 proposal; people must still approve.                               |
| Invalid proposal       | Recorded real AI + trusted host      | Actual unauthorized offer rejected.                                                          |
| Agreement and delivery | Captured backend demonstration       | Matching confirmations, structural checks, customer review; no invoice.                      |
| Contract critique      | Separate recorded evaluation         | Contradictions flagged 6/6; legitimate proposals passed 7/8, including one false escalation. |
| PayPal transaction     | Historical verified sandbox evidence | PAID; $300 USD received; $0 due.                                                             |

Agent negotiation → Human approval → PayPal invoice → Provider verification.

The private PayPal adapter implements OAuth, invoice creation, idempotency and recovery, draft sending, provider-hosted checkout handoff, invoice readback and reconciliation. Buyer handoff authorization remains explicit.

Historical invoice **INV2-N6CJ-RJXM-96WT-XDVG** belongs to its original agreement. It did not pay for the AI replay or a visitor’s guided contract. [Provider receipt](docs/evidence/paypal-readback.json) · [Original agreement/audit](docs/evidence/paypal-contract-link.json) · [Model evidence](docs/evidence/negotiation-matrix-20261111.json).

<details>
<summary>See the actual host rejection and historical payment screens</summary>

![Actual local host rejection using genuine saved evidence](docs/screenshots/clarity/stage-3-desktop.png)

![Actual local historical PayPal evidence, not a visitor payment](docs/screenshots/clarity/stage-6-desktop.png)

</details>

## Architecture

```text
React / TypeScript
  ├─ Seven-stage guide ← static, provenance-labeled evidence
  └─ Independent customer/business sessions
       ↓
FastAPI → buyer/seller agents → trusted host policy
       ↓                       ↑ advisory semantic critic
Version-bound agreement → evidence checks → human review
       ↓
PostgreSQL transactions and append-only audit
       ↓ explicit buyer authorization, private sandbox workflow
PayPal-hosted checkout → validated provider reconciliation
```

## Local installation

Python 3.12, uv and compatible Node are required. The recorded walkthrough needs no private credentials.

```bash
uv sync --project backend --frozen --extra test
npm --prefix frontend ci
npm --prefix frontend run build
cd backend
uv run --frozen uvicorn app.main:app --host 127.0.0.1 --port 8000
```

Open `http://127.0.0.1:8000`. **Try it yourself** retains service listings, invitations, project requests, shared contracts and history. Independent participants use separate browser contexts; the main guide does not require them.

## Testing

```bash
cd backend
uv run --frozen pytest -q
cd ../frontend
npm test
npm run build
```

[Reproduce the critic evaluation](docs/EVALUATION.md) · [Customer/business lifecycle](docs/TWO_SIDED.md).

PostgreSQL reset fixtures require a disposable **local** test database. Never run them against hosted Neon.

## Limitations and evidence provenance

- The guide’s AI responses are genuinely recorded, not new inference; public marketplace agents are deterministic.
- The captured agreement fixture and historical PayPal transaction are separate demonstrations. Guide controls reveal evidence, not new consent.
- Public PayPal operations and paid inference are disabled. Hosted private operator checkout remains unverified; no escrow or automatic funds release is claimed.
- The advisory critic uses small fixed evaluations with false positives/failed attempts; structural checks do not prove design quality.
- Demo personas are not verified real-world identities. New-branch hosted acceptance and Production review remain pending.

## Security and license

Host policy, private-data filtering, version-bound consent, secure sessions, verified PostgreSQL TLS and provider reconciliation remain authoritative. [Security contracts](docs/CONTRACTS.md) · [Deployment instructions](docs/VERCEL.md) · [.env.example](.env.example).

MIT licensed; see [LICENSE](LICENSE).
