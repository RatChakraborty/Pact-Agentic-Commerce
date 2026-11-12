# Isolated UI redesign and release evidence

Branch: **feature/pact-ui-redesign**, isolated worktree `/workspace/pact-ui-redesign`. Initially based on the pushed recovery checkpoint `ab4592d`; the follow-up core canonical-history/test-isolation corrections are also included, and the latest core is integrated before release. `feature/pact-core` remains independently recoverable. Neither branch is merged into main. No Production deployment or Preview promotion was invoked.

## What changed

- Landing: **Agents negotiate. People decide.** One dominant **Explore the demo** button, with secondary **Try it yourself** role selection. The three-column marketing layout is replaced by an actual recorded-offer ledger and a vertical lifecycle.
- Ledger: original buyer cap, seller asking price, counteroffer and accepted agent proposal, sourced from the same hashed static receipts as replay. Human confirmation is explicitly **required / not recorded**; the replay did not capture a version or establish a lock. No invented approval, version, transaction or customer activity is displayed.
- Presentation: neutral primary actions, amber proposals/pending decisions, green only for actual human confirmations/verified states, and red blocked/invalid actions. Dynamic human confirmation chips change only when the backend's approvals array changes. The model's agreement alone stays amber.
- Typography: self-hosted variable **Fraunces** for display; local readable system sans for body; monospace for prices, IDs, versions and artifacts. Source package `@fontsource-variable/fraunces` 5.3.0, SIL OFL 1.1 license and source attribution are included beside the 36 KB font asset. No remote font request/runtime dependency. Logo descender/line-height and missing hero arrow glyph were corrected.
- Briefs: balanced two-column form with a live **provisional / not agreed / not locked** preview. Objective, private budget, deadline and fixed supported scope update from the actual form. Default deadline is eight days ahead at **5 PM browser-local time**, serialized to UTC for the API. Existing supported negotiation controls are visible. Sandbox placeholders are illustrative account emails. Scope is a labeled fieldset, not floating text.
- Customer/business: distinct workspaces still use the same authorized records and transcript. Native filters show pending decisions, active negotiation, deliverable follow-through and history; no invented metrics. Separate browser contexts, role restrictions and private constraints remain intact.
- Progress: state-aware Brief → Negotiate → Review → Authorize / Confirm together, plus real applicable evidence/review/provider states. Shared demo completion explicitly says no payment. Cancellation never points to an authorized next step.
- Accessibility: native links/buttons/forms, explicit field labels/fieldsets, visible keyboard focus, semantic regions, progress navigation with `aria-current=step`, polite provisional updates and text accompanying state colors. This is targeted accessibility verification, not a full WCAG audit/certification.

## Verification

- **115 backend tests passed**, including six actual disposable PostgreSQL tests. An initial worktree run exposed a test assumption about local pricing; the test now declares its rates. No application price/cap or durable inference reservation was changed.
- **14 frontend unit tests passed**: workflow, sanitized API errors, exact replay provenance, default local deadline, state semantics and role-specific filters.
- **16 distinct browser scenarios passed** across configurations: 12 private-mode cases, 12 public/PostgreSQL cases sharing nine scenarios with private mode, and one separate explicitly mocked-payment workflow. Configuration-specific skips are expected, not unexecuted acceptance claims. Recorded replay is tested at 1440px/390px with **zero API requests** while all API endpoints are blocked. Customer/business HTML-error tests assert no legacy email form or raw error body appears.
- Two-party desktop/mobile tests verify identical transcript, separate private limits, seller consent, zero/one/two genuine human confirmation chips, correct evidence-stage progress, seller submission, customer review, reopening and logout. New design tests type into the brief and verify the provisional preview, role selection, and no horizontal overflow.
- Production TypeScript/Vite build, replay source projection/hash check, Ruff, Prettier and configured-secret scanning pass. Font is local and licensed. Backend tests use local `pact_*_test` databases only; no destructive hosted DB tests.
- Actual desktop/mobile landing, brief, customer brief, shared agreement and recorded replay screenshots were reviewed. Evidence is under `docs/screenshots/redesign-*` and `replay-*`.

## Hosted and sponsor limits

Hosted P0 is **not complete**. This machine still cannot reach the supplied Vercel URL due proxy CONNECT 403; actual deployed SHA, Root Directory/environment scope and first function error remain unavailable. Earlier Neon DNS failure here is not proof of the hosted application's root cause. There is **no verified working public URL** to report. The full, precise account-side request is in [RECOVERY.md](RECOVERY.md).

The existing dedicated Vercel project and Neon database must be reused. Create/inspect a **Preview** of the desired tested branch, verify `/assets/pact-build.json`, `/api/version`, `/api/health`, then run the two-context hosted acceptance. Check the actual returned URL: the previously supplied immutable URL may remain attached to older code. Do not promote Production or change unrelated projects.

Sponsor expansion is deferred by the interactive-hosting gate. AG Grid Community MIT is feasible without extra credentials; AG Studio remains Commercial and uninvoked. Native filters are not called an AG integration. No new sponsor/eligibility claim, additional paid inference, new PayPal invoice/payment, or cloud resource was introduced.

## Judge demonstration

1. Open landing → **Explore the demo**. Call it genuine **recorded** AI; step through the actual replies.
2. Show the final proposal and explain the missing human authorization/lock. Switch to the infeasible case and reveal the real host block.
3. Open the separate dated PAID sandbox receipt and semantic-evaluation limitations. They are not outcomes of a new visitor contract.
4. If hosted interactive health passes, **Try it yourself** → separate customer/business browsers. Show the private-limit separation and both human confirmations, then evidence review. Otherwise state that interactive hosting remains unverified and use the prepared local demonstration without describing localhost as public deployment.
5. Record/upload/submit before November 12, 2026, **3 PM Eastern / 20:00 UTC**. No new paid API call/payment is needed for filming.
