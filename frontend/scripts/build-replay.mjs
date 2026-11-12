/** Deterministic allowlist projection of committed, authentic provider receipts. */
import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
const root = new URL("../../", import.meta.url);
const sourceCommit = "248004b6e9f5c3d9556f994343a3a1f531ec43a8";
export function buildEvidence() {
  const manifest = [];
  function source(name, commit = sourceCommit) {
    const bytes = readFileSync(new URL("docs/evidence/" + name, root));
    manifest.push({
      path: "docs/evidence/" + name,
      sha256: createHash("sha256").update(bytes).digest("hex"),
      commit,
    });
    return JSON.parse(bytes);
  }
  const matrix = source("negotiation-matrix-20261111.json");
  const payment = source("paypal-readback.json");
  const semantic = source("evaluation-live.json");
  if (
    payment.status !== "PAID" ||
    Number(payment.due_amount.value) !== 0 ||
    payment.payments.paid_amount.value !== payment.amount.value ||
    payment.payments.paid_amount.currency_code !==
      payment.amount.currency_code ||
    payment.payments.transactions[0].type !== "PAYPAL"
  )
    throw Error(
      "Saved receipt does not establish the recorded paid invoice evidence",
    );
  const linkage = source(
    "paypal-contract-link.json",
    "bce6d5acceb413fbe179091e3c6b286a692df868",
  );
  if (
    linkage.provider_receipt_sha256 !==
      manifest.find((p) => p.path.endsWith("/paypal-readback.json")).sha256 ||
    linkage.currency !== payment.amount.currency_code ||
    linkage.invoice_id !== payment.invoice_id ||
    linkage.accepted_amount_minor !== Number(payment.amount.value) * 100
  )
    throw Error("Original accepted contract and provider receipt do not match");
  const runs = matrix.runs
    .filter((r) => r.execution === "live")
    .map((r) => ({
      id: r.id,
      objective: r.input.objective,
      budget_minor: r.input.budget_minor,
      asking_minor: r.input.asking_minor,
      criteria: r.input.criteria,
      deadline: r.input.deadline,
      execution: "recorded_genuine_ai",
      outcome: r.outcome,
      amount_minor: r.amount_minor,
      reason: r.reason,
      model: r.provider_observations[0].model,
      prompt_tokens: r.prompt_tokens,
      completion_tokens: r.completion_tokens,
      estimated_usd: r.estimated_usd,
      offers: r.offers.map((o) => ({
        role: o.role,
        action: o.action,
        amount_minor: o.amount_minor,
        currency: o.currency,
        criteria: o.criteria,
        explanation:
          /budget|floor|reservation|minimum|maximum|at (most|least)/i.test(
            o.explanation,
          )
            ? ""
            : o.explanation,
        explanation_redacted:
          /budget|floor|reservation|minimum|maximum|at (most|least)/i.test(
            o.explanation,
          ),
        blocked: o.blocked,
      })),
    }));
  if (runs.length !== 2 || !runs.some((r) => r.offers.some((o) => o.blocked)))
    throw Error("Missing actual live/block evidence");
  return {
    schema_version: 3,
    evidence_version: "pact-recorded-20261111-v3",
    recorded_at: matrix.at,
    provenance: manifest,
    runs,
    approval_boundary:
      "Agent acceptance is a proposal, not human approval. This replay does not create, approve, lock or pay a new contract.",
    payment: {
      invoice_id: payment.invoice_id,
      contract: linkage,
      status: payment.status,
      amount: payment.amount.value,
      currency: payment.amount.currency_code,
      due: payment.due_amount.value,
      payment_id: payment.payments.transactions[0].payment_id,
      payment_date: payment.payments.transactions[0].payment_date,
      received: payment.payments.paid_amount.value,
      checked_at: payment.checked_at,
      attribution:
        "Separate original sandbox invoice. It was not created by either replayed negotiation or by your interactive demo.",
    },
    critique: {
      scope:
        "Separate recorded semantic evaluation; not a critique of these replayed contracts.",
      execution: semantic.execution,
      metrics: semantic.metrics,
      successful_model_calls: semantic.actual_model_calls,
      attempted_model_calls: semantic.actual_model_attempts,
      limitation:
        "Small fixed evaluation; one of eight legitimate proposals was falsely escalated. No trained dedicated SLM.",
    },
    limitations: [
      "Private strategy is explicitly redacted from this public projection. Structured offers, unredacted explanations and host decisions remain authentic; archived synthetic source receipts are hash-verifiable.",
      "The infeasible model output contradicts its own explanation; the host rejected it. No contract or payment was authorized.",
      "Token costs are configured estimates, not billing receipts.",
    ],
  };
}
const target = new URL("../public/assets/pact-replay-v3.json", import.meta.url);
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const expected = JSON.stringify(buildEvidence(), null, 2) + "\n";
  if (process.argv.includes("--check")) {
    if (readFileSync(target, "utf8") !== expected)
      throw Error(
        "Replay provenance changed; review sources and explicitly regenerate/version the asset.",
      );
    console.log(
      "Replay provenance and exact provider-offer projection verified.",
    );
  } else writeFileSync(target, expected);
}
