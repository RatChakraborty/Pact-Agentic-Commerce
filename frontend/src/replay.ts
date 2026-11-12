export type RecordedOffer = {
  role: string;
  action: string;
  amount_minor: number;
  currency: string;
  criteria: string[];
  explanation: string;
  explanation_redacted?: boolean;
  blocked: string | null;
};
export type RecordedRun = {
  id: string;
  objective: string;
  budget_minor: number;
  asking_minor: number;
  criteria: string[];
  deadline: string;
  execution: string;
  outcome: string;
  amount_minor: number | null;
  reason: string | null;
  model: string;
  prompt_tokens: number;
  completion_tokens: number;
  estimated_usd: number;
  offers: RecordedOffer[];
};
export type ReplayEvidence = {
  schema_version: number;
  evidence_version: string;
  recorded_at: string;
  provenance: { path: string; sha256: string; commit: string }[];
  runs: RecordedRun[];
  approval_boundary: string;
  payment: {
    invoice_id: string;
    status: string;
    amount: string;
    currency: string;
    due: string;
    payment_id: string;
    payment_date: string;
    received: string;
    checked_at: string;
    attribution: string;
    contract: {
      accepted_amount_minor: number;
      currency: string;
      agreement_version: number;
      accepted_at: string;
      payment_handoff_authorized_at: string;
      authorization_scope: string;
      source: string;
      events: {
        action: string;
        timestamp: string;
        prior_status: string | null;
        next_status: string;
      }[];
    };
  };
  critique: {
    scope: string;
    metrics: Record<string, { numerator: number; denominator: number }>;
    limitation: string;
    successful_model_calls: number;
    attempted_model_calls: number;
  };
  limitations: string[];
};
export function visibleOffers(run: RecordedRun, step: number) {
  return run.offers.slice(0, Math.max(0, Math.min(step, run.offers.length)));
}
export async function loadReplay(
  signal?: AbortSignal,
): Promise<ReplayEvidence> {
  const response = await fetch("/assets/pact-replay-v3.json", { signal });
  if (!response.ok)
    throw Error(
      "Recorded evidence could not be loaded. Please reload this page.",
    );
  const evidence = await response.json();
  if (
    evidence.schema_version !== 3 ||
    !Array.isArray(evidence.runs) ||
    !evidence.runs.every(
      (r: RecordedRun) =>
        r.execution === "recorded_genuine_ai" && r.offers.length > 0,
    )
  )
    throw Error("Recorded evidence version is unavailable.");
  return evidence;
}
