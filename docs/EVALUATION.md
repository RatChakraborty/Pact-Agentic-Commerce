# Bounded adversarial evaluation

These are small frozen demonstrations, not evidence of universal safety or production reliability. Expected labels were fixed in `backend/evaluation_cases.json` before the model run; its SHA-256 is recorded in each result. No expected labels were changed after inspecting responses.

## Reproduce without paid requests

```bash
cd backend
uv run --frozen --extra test python evaluate.py --output ../docs/evidence/evaluation-offline.json
```

The default path is entirely offline. All financial actions use a local fake, even with live language review enabled. The 28 cases comprise 8 legitimate workflow variants, 8 unauthorized economic actions, 6 contradictory clauses and 6 ambiguous/underspecified clauses. Unit tests forbid model access from the offline runner.

## Actual results

| Measurement | Deterministic rules | Live critique + deterministic boundaries |
| --- | --- | --- |
| Legitimate workflow fixtures completed before optional critique | 8/8 | Same 8/8 offline workflow checks, not eight live negotiations |
| Legitimate language proposals allowed | 8/8 | 7/8 |
| False rejections/escalations on legitimate language | 0/8 | 1/8 |
| Unauthorized economic actions blocked | 8/8 | 8/8, using the same transaction boundaries |
| Contradictions flagged or escalated | 4/6 | 6/6 with actual model responses after documented follow-up |
| Ambiguity/underspecification escalated | 6/6 | 6/6 with actual model responses after documented follow-up |

The semantic vignettes use one standardized responsive landing-page contract, shared by the no-critique ablation and the critique system. The independent workflow variants test budget/scope settings in the API. These two measurements must not be combined into an end-to-end model agreement completion claim. In particular, the optional live gate would escalate one legitimate language example: **A7**. The frozen label remains unchanged and the false rejection is reported.

The no-critique ablation retains all application/payment authorization and integrity controls, but performs no semantic classification: its semantic result defaults to CLEAR. This is a component ablation, **not** a benchmark against an independently tested autonomous model agent or an unsafe payment baseline. Baseline and system use the same vignette terms; no baseline performs real unauthorized transactions.

## Failures and follow-up

The initial language evaluation made 20 attempts but retained only 13 successful structured responses. Seven reviews failed closed to NEEDS_REVIEW; their original cause was not retained. An unavailable model response is **not** counted as successful contradiction detection. Original case outcomes and the corrected interpretation remain in `evaluation-live-initial.json`.

After one successful diagnostic on C6, the six remaining unavailable cases were exercised once more without changing expected labels. The final report retains the initial/follow-up attempts for all seven cases. There were **27 critique attempts for 20 completed case responses**. The runtime has no automatic retry loop. Future failures now create safe observation metadata without logging credentials or raw provider bodies.

No confidence interval or broad reliability claim is justified by 6–8 examples per category. The results show a specific benefit (detecting two contradictions the rule baseline missed) and a cost (one false escalation plus initial review unavailability).

## Live model and budget evidence

Model: `gpt-4.1-mini-2025-04-14`, requested as `gpt-4.1-mini`.

A separate genuine negotiation initially exhausted six turns without agreement. After clarifying the seller's final-turn strategy, a second bounded run received four actual responses: seller $360 → buyer $300 → seller $300 → buyer accepts $300. Both complete transcripts, token usage and pricing estimates are in `live-negotiation.json`. No invoice was created for either evaluation negotiation.

The session preserved six earlier failed-attempt call reservations. Deliberate development settings increased the cumulative allowance rather than deleting history. At completion of paid tests the ledger held **45 reserved calls including the six historical reservations**, and **$0.54 reserved** under the **$0.90 configured ceiling / $1 user authorization**. A nonsecret, Git-ignored root `.env` sets conservative $1/$4 per-million token estimates and a 54-call allowance so one additional six-call negotiation remains possible; no further inference was made for that adjustment. Details are in `session-budget.json`.

Secondary current LiteLLM metadata lists $0.40/$1.60 per million input/output tokens for this model. The official model pricing page was blocked by the proxy, so these are explicitly **secondary estimates**, not independently confirmed billing. Reservations use 2.5× those rates. Usage estimates cover retained successful responses; seven initial failed attempts lack response usage and are covered conservatively by their retained reservations.

## Explicit paid reruns

Do not run these commands during ordinary tests or against unreviewed prices. The counters are cumulative; inspect them before deliberately increasing the allowance. Do not reset SQLite or delete audit history to bypass a limit.

```bash
cd backend
# Enter appropriate nonsecret limits in the ignored root .env or export them.
# Verify selected model prices and provider/project spending limits first.
uv run --frozen --extra test python tools/verify_live.py \
  --buyer BUYER_SANDBOX_EMAIL --seller MERCHANT_SANDBOX_EMAIL \
  --output /tmp/pact-live-smoke.json
# A live evaluation makes up to 20 requests; it needs separately available allowance.
uv run --frozen --extra test python evaluate.py --live-semantics \
  --output /tmp/pact-live-evaluation.json
```

The model-critique provider is replaceable through a small structured interface. No dedicated SLM was trained, loaded or evaluated. Semantic results never authorize payments or override deterministic financial constraints.
