export function progressStage(status: string) {
  if (status === "CANCELLED") return -1;
  if (["DRAFT", "AWAITING_SELLER"].includes(status)) return 0;
  if (["NEGOTIATING", "NEGOTIATION_FAILED"].includes(status)) return 1;
  if (status === "PROPOSED") return 2;
  return 3;
}
export function stateTone(status: string) {
  if (["PAID", "VERIFIED", "DEMO_COMPLETE", "ACCEPTED"].includes(status))
    return "approved";
  if (["NEGOTIATION_FAILED", "CANCELLED", "PAYMENT_REVIEW"].includes(status))
    return "blocked";
  return "pending";
}
export default function Progress({
  status,
  demo = false,
  shared = false,
}: {
  status: string;
  demo?: boolean;
  shared?: boolean;
}) {
  const initialStage = progressStage(status);
  const labels = [
    "Brief",
    "Negotiate",
    "Review",
    shared ? "Confirm together" : "Authorize",
  ];
  const later = shared
    ? (
        {
          AWAITING_EVIDENCE: "Seller evidence",
          AWAITING_BUYER_REVIEW: "Customer review",
          NEEDS_REVIEW: "Evidence needs review",
          DEMO_COMPLETE: "Demo complete · no payment",
        } as Record<string, string>
      )[status]
    : (
        {
          INVOICED: "Deliverable evidence",
          AWAITING_EVIDENCE: "Deliverable evidence",
          NEEDS_REVIEW: "Evidence needs review",
          VERIFIED: demo ? "Demo verified · no payment" : "Payment review",
          PAYMENT_PENDING: "PayPal pending",
          PAID: "Provider-confirmed payment",
          PAYMENT_REVIEW: "Provider status review",
        } as Record<string, string>
      )[status];
  const stage = later ? labels.push(later) - 1 : initialStage;
  return (
    <nav
      data-tone={stateTone(status)}
      className="workflow-progress"
      aria-label="Agreement progress"
    >
      <ol>
        {labels.map((label, i) => (
          <li
            key={label}
            aria-current={i === stage ? "step" : undefined}
            className={i === stage ? "current" : i < stage ? "past" : ""}
          >
            <span>{i + 1}</span>
            {label}
          </li>
        ))}
      </ol>
      {status === "CANCELLED" ? (
        <p className="blocked-label">Cancelled · no further steps authorized</p>
      ) : null}
    </nav>
  );
}
