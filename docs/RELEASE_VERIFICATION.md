# Final Preview verification and recording handoff

**Current directive supersedes the earlier publication hold:** tested main publication is now authorized; Production remains conditional on actual final hosted acceptance. Follow [final integration and Production gate](FINAL_RELEASE.md). Earlier counts/commit notes below are historical.

## Verified hosted baseline

The user verified actual core `/api/health` response fields on commit **c894ebe78330d3e4ebda96dbd4ac1657a86b33d2**, branch `feature/pact-core`, environment `preview`: `status=ok`, `application=pact`, `storage=postgresql`, Python **3.12.16**, public demo enabled, PayPal environment sandbox, live AI and PayPal credentials unconfigured. [Evidence](evidence/hosted-health-c894ebe.json) is explicitly attributed to the user; it is not an agent HTTP capture.

This verifies the hosted PostgreSQL health query after the trusted TLS repair. It does not prove customer/seller creation, isolation, approval lifecycle, persistence after new requests/redeployment, or the redesigned Preview. Those remain separately tracked in [the hosted acceptance matrix](evidence/hosted-startup-acceptance.json).

The agent's fresh read-only probe of the previously supplied Preview hostname still failed at proxy CONNECT before an application response. That hostname is not assumed to be the latest healthy deployment. No hosted business writes or provider operations were made during that denied probe.

## Redesigned Preview deployment

Keep the existing `pact-agentic-commerce` project and existing dedicated Neon database. Use the latest verified **feature/pact-ui-redesign** commit; preserve `feature/pact-core` as the working backend baseline. Both feature branches carry the same API, PostgreSQL/TLS implementation, security boundaries and API contract. Only the redesign branch contains the existing redesigned presentation.

1. Select `feature/pact-ui-redesign` for a **Preview**, with Root Directory at repository root, Vite framework, repository `vercel.json`, root Python 3.12 pin and requirements. Do not create another Vercel project, merge main or promote Production.
2. Reuse the Preview-scoped settings that made core healthy: `PUBLIC_DEMO=true`; existing dedicated Pact database binding; stable strong `APP_SESSION_SECRET`; `ENABLE_LIVE_OPERATIONS=false`; `LLM_MAX_CALLS=0`; `LLM_BUDGET_USD=0`; `PAYPAL_ENV=sandbox`. Check that branch-specific overrides do not limit the working configuration to core. No provider/AI keys or operator password are required for this anonymous demo. Never copy secrets into source or chat.
3. Build the new Preview. Inspect actual `/api/health`, `/api/version` and `/assets/pact-build.json`; confirm actual commit/branch agree with the chosen redesign SHA. A Ready build alone is insufficient.
4. Require healthy public PostgreSQL identity, then run the guarded probe and browser checks below. They create only ordinary deterministic demo agreements; no invoice/payment or live inference. Never run database-reset tests against Neon.
5. With the same browser session, reopen the agreement in a fresh request, check shared history from each role, and verify it survives a subsequent Preview redeployment. Signed sessions must use the stable secret. Record actual deployment SHAs and observed results; do not substitute local tests.

```bash
# Set these to the actual redesigned Preview origin and its full selected commit.
PACT_PREVIEW_URL=https://ACTUAL_PREVIEW_HOST
PACT_EXPECTED_SHA=FULL_40_CHARACTER_DEPLOYED_COMMIT
cd backend
.venv/bin/python tools/check_hosted.py "$PACT_PREVIEW_URL" \
  --expected-commit "$PACT_EXPECTED_SHA" --output /tmp/pact-hosted-release.json
cd ../frontend
PACT_PUBLIC_DEMO=1 PACT_TEST_URL="$PACT_PREVIEW_URL" \
  PACT_CHROMIUM_PATH=/usr/bin/chromium npm run test:e2e -- \
  --grep 'public judge experience|two-persona|landing distinguishes|recorded AI|PayPal proof|redesigned landing'
```

The guarded HTTP probe refuses writes unless health is `ok`, target identity is Pact/public/PostgreSQL, and the returned commit matches `--expected-commit`. Its report includes observed release metadata. The two-persona browser scenarios additionally exercise separate customer/seller contexts, private limits, shared authorization, evidence review, refresh, logout and truthful no-payment status. A separate automated unit suite checks forged/stale authorization and public capability restrictions.

## Evidence visible to anonymous visitors

- `/demo`: genuine recorded feasible/infeasible model replies, actual host rejection, token counts, cost-estimate limits and hash-pinned source links. A versioned v2 public projection explicitly redacts historical private-strategy explanations without rewriting structured offers. The original v1 synthetic historical asset remains archived; it is not evidence of private live visitor data access.
- The semantic critique disclosure is a **separate recorded evaluation**, not a new critique of the replayed agreement. Its numerator/denominator, attempted/successful calls and false escalation are visible. No dedicated trained SLM or generalized performance claim is made.
- `/payments` and the replay expose the verified historical PayPal receipt prominently: **USD 300.00 received, zero due, PAID**, invoice `INV2-N6CJ-RJXM-96WT-XDVG`, payment identifier, dated provider readback, original accepted amount/version, and the audit timeline. The receipt is not refreshed by visiting the page.
- Active agreement views show their own confirmation/review/invoice state separately. The historical receipt is secondary there. A completed visitor demo remains **no invoice created / no payment made**, even when the separate historical receipt says PAID. Original operator approval recorded the buyer's consent; separate seller human confirmation is not invented.
- All public evidence views use static bundled data and work with API requests unavailable. No public visitor can trigger paid AI, invoice creation, checkout authorization or provider writes.

## Concise demonstration sequence (about three minutes)

1. **0–25s:** Redesigned landing: agents negotiate, people decide. Open the recorded demo and identify it as genuine historical AI evidence.
2. **25–65s:** Step through the three feasible offers to the $300 proposal. Say agent acceptance is not human approval. Switch to the infeasible scenario and show the actual host block.
3. **65–90s:** Open the semantic critique disclosure. Show measured fixed-case results and the legitimate-proposal false escalation; deterministic rules remain authoritative.
4. **90–135s:** Use two isolated browser contexts as customer and business. Show their shared agreement and separate confirmations, evidence review and refresh/history. Use a prepared deterministic demo agreement to fit recording time. Label the flow as public demo identities and deterministic negotiation.
5. **135–175s:** Open PayPal verification. Show original accepted $300, invoice ID, dated PAID/$300/zero-due readback and reconciliation timeline. Explain that this separate completed sandbox payment does not pay the visitor's demo agreement.
6. **175–180s:** End with the buyer authorization boundary and no automatic escrow/release claim. No new payment or inference is needed for recording.

Record/upload/submission and Production promotion remain human actions. Production is not authorized by this handoff. Optional sponsor expansion remains deferred during release verification.

## Core regression evidence in this release session

155 backend tests passed, including actual disposable local PostgreSQL concurrency/persistence, trusted TLS fixtures and anonymous capability boundaries. Core frontend unit tests: 17 passed; deployment regression checks: 6 passed; production build passed. All 17 distinct core browser scenarios passed across private/public/mocked-provider configurations (the two persona checks were rerun after adjusting the test to open the intentionally collapsed historical receipt). Anonymous desktop/mobile replay checks open the recorded semantic critique, expose its limitations and source link, and make zero API calls. The PayPal proof checks likewise make zero API calls. A local-only guarded HTTP probe passed all 11 checks and recorded its observed local release metadata; it is not a hosted capture.

## Redesigned UI verification

The redesigned application source at b6c4cec7365025849d817b3755d552558a2095b0 passed **20 frontend unit tests**, **6 deployment checks**, production build, and **19 distinct browser scenarios**. Runs: 15 private-mode scenarios passed (four configuration-specific cases skipped there), five public PostgreSQL scenarios passed (two overlap the private run), and one explicitly mocked provider scenario passed. Desktop landing and mobile PayPal proof screenshots were visually inspected. Backend/API/TLS source is identical to tested core. See [machine-readable local verification](evidence/release-verification-local.json). No hosted redesign acceptance or Production promotion is claimed.
