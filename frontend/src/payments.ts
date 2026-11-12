export type PaymentAgreement = {
  status: string;
  amount_minor?: number | null;
  approvals?: string[];
  accepted_at?: string | null;
  approved_at?: string | null;
  verification?: { overall: string } | null;
  human_review?: { accepted: boolean } | null;
  invoice?: { id: string; status: string; checked_at: string } | null;
};
export function agreementPaymentFacts(a: PaymentAgreement) {
  const shared = Array.isArray(a.approvals);
  const confirmations = shared
    ? ["buyer", "seller"].filter((r) => a.approvals!.includes(r)).length
    : 0;
  const provider = a.invoice?.status || "NOT_CREATED";
  return {
    terms: shared
      ? `${confirmations}/2 people confirmed`
      : a.accepted_at
        ? "Buyer confirmation recorded; seller confirmation not tracked in this single-player flow"
        : "Human confirmation pending",
    milestone:
      a.verification?.overall === "PASS"
        ? "Structural checks passed"
        : a.verification
          ? "Checks need review"
          : "Evidence not submitted",
    review: a.human_review
      ? a.human_review.accepted
        ? "Customer accepted deliverable"
        : "Customer requested changes"
      : shared
        ? "Customer review pending"
        : a.approved_at
          ? "Buyer authorized PayPal handoff"
          : "Buyer payment authorization pending",
    invoice: a.invoice?.id || "Not created",
    provider:
      provider === "PAID" && a.status !== "PAID"
        ? "Recorded PAID; reconciliation needs review"
        : provider,
    paid: provider === "PAID" && a.status === "PAID",
    shared,
  };
}
