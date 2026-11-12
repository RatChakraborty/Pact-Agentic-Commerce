export function filterAgreements<
  T extends { status: string; approvals?: string[] },
>(records: T[], filter: string, role: string): T[] {
  if (filter === "all") return records;
  return records.filter((a) => {
    if (filter === "decision")
      return (
        (a.status === "AWAITING_SELLER" && role === "seller") ||
        (a.status === "PROPOSED" && !a.approvals?.includes(role)) ||
        (["AWAITING_BUYER_REVIEW", "NEEDS_REVIEW"].includes(a.status) &&
          role === "buyer")
      );
    if (filter === "active")
      return ["DRAFT", "NEGOTIATING", "PROPOSED", "AWAITING_SELLER"].includes(
        a.status,
      );
    if (filter === "evidence")
      return [
        "AWAITING_EVIDENCE",
        "AWAITING_BUYER_REVIEW",
        "NEEDS_REVIEW",
      ].includes(a.status);
    return (
      filter === "history" &&
      ["DEMO_COMPLETE", "CANCELLED", "NEGOTIATION_FAILED"].includes(a.status)
    );
  });
}
