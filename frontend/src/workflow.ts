export function nextAction(s: string, demo = false) {
  if (demo && s === "ACCEPTED")
    return { label: "Continue to milestone", action: "demo-milestone" };
  if (demo && s === "VERIFIED") return null;
  const map: Record<string, [string, string]> = {
    DRAFT: ["Start negotiation", "negotiate"],
    NEGOTIATION_FAILED: ["Try again", "negotiate"],
    PROPOSED: ["Accept these terms", "accept"],
    ACCEPTED: ["Create sandbox invoice", "invoice"],
    VERIFIED: ["Authorize PayPal payment", "payment-approval"],
  };
  return map[s] ? { label: map[s][0], action: map[s][1] } : null;
}
export const money = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
    n / 100,
  );
