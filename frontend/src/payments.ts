export type PaymentAgreement = {
  status: string;
  currency?: string;
  seller_email?: string;
  amount_minor?: number | null;
  approvals?: string[];
  accepted_at?: string | null;
  approved_at?: string | null;
  verification?: { overall: string } | null;
  human_review?: { accepted: boolean } | null;
  invoice?: {
    id: string;
    status: string;
    checked_at: string;
    approval_url?: string | null;
  } | null;
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

export function safeSandboxCheckout(a: PaymentAgreement) {
  if (
    Array.isArray(a.approvals) ||
    !a.approved_at ||
    !a.invoice?.approval_url ||
    !["PAYMENT_PENDING", "PAID"].includes(a.status)
  )
    return null;
  try {
    const u = new URL(a.invoice.approval_url);
    return u.protocol === "https:" &&
      ["sandbox.paypal.com", "www.sandbox.paypal.com"].includes(u.hostname) &&
      !u.username &&
      !u.password &&
      (!u.port || u.port === "443")
      ? a.invoice.approval_url
      : null;
  } catch {
    return null;
  }
}
export function paymentLifecycle(a: PaymentAgreement) {
  const agreed = Array.isArray(a.approvals)
    ? ["buyer", "seller"].every((role) => a.approvals!.includes(role))
    : Boolean(a.accepted_at);
  const paid = a.status === "PAID" && a.invoice?.status === "PAID";
  return [
    { label: "Agreed", confirmed: agreed },
    { label: "Invoice created", confirmed: Boolean(a.invoice?.id) },
    {
      label: "Deliverable verified",
      confirmed: a.verification?.overall === "PASS",
    },
    { label: "Buyer authorized", confirmed: Boolean(a.approved_at) },
    { label: "PayPal payment", confirmed: paid },
    { label: "Confirmed paid", confirmed: paid },
  ];
}

export function historicalPaymentLifecycle(payment: {
  status: string;
  invoice_id: string;
  contract: {
    accepted_at: string;
    payment_handoff_authorized_at: string;
    events: { action: string; next_status: string }[];
  };
}) {
  const has = (action: string) =>
    payment.contract.events.some((e) => e.action === action);
  const reconciled =
    payment.status === "PAID" &&
    payment.contract.events.some(
      (e) => e.action === "provider_status_checked" && e.next_status === "PAID",
    );
  return paymentLifecycle({
    status: reconciled ? "PAID" : "PAYMENT_PENDING",
    accepted_at: has("buyer_accepted_terms")
      ? payment.contract.accepted_at
      : null,
    approved_at: has("buyer_authorized_paypal_handoff")
      ? payment.contract.payment_handoff_authorized_at
      : null,
    verification: has("artifact_verified") ? { overall: "PASS" } : null,
    invoice: has("sandbox_invoice_created")
      ? { id: payment.invoice_id, status: payment.status, checked_at: "" }
      : null,
  });
}
