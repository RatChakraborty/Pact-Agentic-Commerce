export type GuidedAgreement = {
  objective: string;
  status: string;
  version: number;
  amount_minor: number | null;
  currency: string;
  criteria: string[];
  deadline: string;
  approvals: string[];
  terms_digest: string | null;
  verification: null | {
    overall: string;
    checks: { criterion: string; passed: boolean; evidence: string }[];
    limitation: string;
  };
  human_review: null | { accepted: boolean; reason: string; at: string };
  critique: null | { verdict: string; execution: string; explanation: string };
  history: { at: string; action: string; role: string; status: string }[];
};
export type GuidedEvidence = {
  schema_version: number;
  execution: string;
  recorded_at: string;
  model_calls: number;
  provider_calls: number;
  payment_status: string;
  backend_source_commit: string;
  generator_sha256: string;
  service: { title: string; asking_minor: number };
  limitations: string[];
  rejected_requests: Record<string, number>;
  snapshots: { id: string; label: string; agreement: GuidedAgreement }[];
};
export function guidedStep(value: number, count: number) {
  return Number.isFinite(value)
    ? Math.max(0, Math.min(Math.floor(value), count - 1))
    : 0;
}
export async function loadGuided(
  signal?: AbortSignal,
): Promise<GuidedEvidence> {
  const r = await fetch("/assets/pact-guided-v1.json", { signal });
  if (!r.ok)
    throw Error(
      "The guided agreement evidence could not be loaded. Try reloading.",
    );
  const data = await r.json();
  if (
    data.schema_version !== 1 ||
    data.execution !== "recorded_deterministic_backend_fixture" ||
    data.model_calls !== 0 ||
    data.provider_calls !== 0 ||
    data.payment_status !== "NOT_CREATED" ||
    data.snapshots?.length !== 7
  )
    throw Error("Guided evidence version is unavailable.");
  return data;
}
