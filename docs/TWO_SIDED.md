# Two-sided product: implemented demo and limits

This is an **isolated two-persona demo**, not account authentication, an external-agent network, or a production marketplace. Existing anonymous single-player and private PayPal workflows are preserved.

## Working lifecycle

1. Start **I'm a business** on the landing page; choose an unverified demo display name.
2. Publish a static landing-page service: public title, description, asking price; private seller minimum. The listing is explicitly labeled demo/unverified. Copy its customer invitation link.
3. Open the link in a **separate browser context** (another browser/private window), start the customer persona, and select the service. The public directory is also functional; no scraping or outreach occurs.
4. Enter the brief, private maximum, future deadline and required hero/features/contact sections. Explicitly authorize the buyer agent to send the request.
5. Seller refreshes incoming requests, opens the same record, and explicitly authorizes the seller agent. A generated model offer never stands in for seller authorization.
6. Customer refreshes and runs deterministic negotiation. Both inspect the same chronological structured offers. Each browser receives only its own private limit.
7. Each party separately confirms the same agreement version and public terms fingerprint. Until both confirm, the state remains PROPOSED and evidence submission is blocked. Either can decline before mutual commitment; neither can unilaterally cancel after both confirmations.
8. Only the seller submits HTML evidence. The existing parser inspects it without execution. Passing checks produce AWAITING_BUYER_REVIEW, never automatic customer acceptance.
9. Only the customer records an explicit review and reason. Acceptance produces **DEMO_COMPLETE**, payment **NOT_CREATED**. Rejection requests revisions. Failed checks remain visible if the human expressly accepts despite them.
10. Both role workspaces reopen the same saved record, transcript, verification results and shared chronological history. Activity updates through an explicit Refresh action; it is not push/stream synchronization.

The two-persona flow has **no invoice or payment routes, no live model execution, and no provider write capability**. A shared ID cannot be used with the legacy owner-only provider endpoints. The separate already-paid PayPal sandbox receipt is available in the single-player Workspace menu and must not be attributed to these new demo contracts.

## Identity and permissions

One server-persisted immutable role belongs to one signed browser session. Frontend role/name parameters cannot change an existing persona or select an agreement participant. Every shared mutation checks persisted identity, expiry, participant membership, role and lifecycle. An unrelated buyer/seller receives no shared record. Both approvals bind version and fingerprint; internal private policy seals bind participants, objective, constraints, recipient and scope. There is no material-term edit endpoint; a revision requires a new request.

Session cookies retain HttpOnly/SameSite=Strict and hosted Secure settings. Demo personas expire after **24 hours**. Logout revokes the persisted persona before clearing the cookie; replaying its prior cookie cannot access shared records. There are no passwords, signup claims, verified emails or identity recovery. Starting afresh after logout produces a different persona and cannot recover previous shared access. Underlying public-session throttles and cross-origin/action-header/body-size checks remain enforced. Service/request creation has additional per-persona and global daily limits.

Both participants' internal IDs, the HMAC policy seal, buyer email and seller email are excluded from shared API responses. A response allowlist exposes only the current role's private limit. Public fingerprints exclude both private limits; hashing a small numeric budget would permit guessing. Separate host-only HMAC policy seals include them. Shared demo recipient addresses are illustrative, not payable identities. Display names/listings are unverified content rendered as text, never trusted HTML.

Agent prompts are now role-specific across the existing live transport: the buyer receives its own maximum, seller receives its own floor. The deterministic buyer no longer consults the seller's minimum; the trusted host still checks both constraints. The new shared demo uses only fixed deterministic explanations. Live free-text output additionally filters recognizable private-limit language/numbers before exchange. This conservative filter is **not a universal semantic confidentiality guarantee**; unsupported paraphrases can evade patterns. Live inference remains disabled for shared demo agreements.

Shared events reside in the serialized demo record under the same database transaction lock. They are chronological product history, **not** the append-only provider audit table or a tamper-proof distributed ledger. Public terms and private policy integrity checks fail closed on reads/approvals after corruption. No claim of legal enforceability follows from a digest.

## Review and differentiation

The shared flow exposes conservative pattern-based critique and blocks confirmation on non-CLEAR results. Existing replaceable live semantic critique and its recorded evaluation remain in the single-player workspace. No dedicated Dialectic-SLM is trained/deployed; no deterministic check is labeled model reasoning.

Role workspaces contain requests/listings and status-driven actions, not invented revenue/activity metrics. There is one frontend bundle and the original negotiation workspace remains available. Real two-role account authentication, verified business onboarding, shared live AI, shared PayPal handoff, account recovery, notification/push updates, richer service constraints and independently hosted agents are explicitly deferred.
