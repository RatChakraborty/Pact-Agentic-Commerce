export const DEMO_STAGES = [
  {
    short: "People",
    title: "A customer needs a landing page. A business can build it.",
    mode: "Recorded example · meet the participants",
    next: "Watch the agents negotiate →",
  },
  {
    short: "Negotiate",
    title: "Two agents try to find a price both sides can accept.",
    mode: "Recorded real AI",
    next: "See what happens when an agent breaks the rules →",
  },
  {
    short: "Host check",
    title: "The model can propose it. Pact can refuse it.",
    mode: "Recorded real AI · separate limits test",
    next: "See how the agreement is approved →",
  },
  {
    short: "Approve",
    title: "Agents propose. People approve.",
    mode: "Captured backend demonstration",
    next: "See how Pact checks the deliverable →",
  },
  {
    short: "Verify",
    title: "A contract is not complete just because the agents agreed.",
    mode: "Captured backend demonstration",
    next: "See how payment is authorized →",
  },
  {
    short: "Payment",
    title: "Payment requires evidence and explicit authorization.",
    mode: "Historical verified PayPal sandbox evidence",
    next: "See what Pact remembers →",
  },
  {
    short: "Audit",
    title: "Every important decision leaves evidence.",
    mode: "Separate evidence sources · final review",
    next: "Try the interactive marketplace",
  },
] as const;
export function storyStage(value: number) {
  return Math.max(
    0,
    Math.min(6, Number.isFinite(value) ? Math.floor(value) : 0),
  );
}
