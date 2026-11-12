import { it, expect } from "vitest";
import { agreementPaymentFacts } from "../src/payments";
it("a completed two-party demo never becomes a paid invoice", () => {
  const facts = agreementPaymentFacts({
    status: "DEMO_COMPLETE",
    approvals: ["buyer", "seller"],
    amount_minor: 30000,
    verification: { overall: "PASS" },
    human_review: { accepted: true },
  });
  expect(facts.terms).toBe("2/2 people confirmed");
  expect(facts.milestone).toBe("Structural checks passed");
  expect(facts.review).toBe("Customer accepted deliverable");
  expect(facts.invoice).toBe("Not created");
  expect(facts.provider).toBe("NOT_CREATED");
  expect(facts.paid).toBe(false);
});
it("an agent acceptance does not establish human consent", () => {
  expect(
    agreementPaymentFacts({ status: "PROPOSED", approvals: [] }).terms,
  ).toBe("0/2 people confirmed");
  expect(
    agreementPaymentFacts({ status: "PROPOSED", approvals: ["agent", "buyer"] })
      .terms,
  ).toBe("1/2 people confirmed");
});
it("provider, invoice and application states remain distinct", () => {
  expect(agreementPaymentFacts({ status: "PAID" }).paid).toBe(false);
  const invoice = {
    id: "INV2-UNIT",
    status: "PAID",
    checked_at: "2026-11-11T00:00:00Z",
  };
  expect(agreementPaymentFacts({ status: "VERIFIED", invoice }).paid).toBe(
    false,
  );
  expect(agreementPaymentFacts({ status: "PAID", invoice }).paid).toBe(true);
  expect(
    agreementPaymentFacts({
      status: "PAYMENT_PENDING",
      invoice: { ...invoice, status: "UNPAID" },
    }).paid,
  ).toBe(false);
});
it("a human override does not rewrite failed verifier evidence", () => {
  const facts = agreementPaymentFacts({
    status: "DEMO_COMPLETE",
    approvals: ["buyer", "seller"],
    verification: { overall: "FAIL" },
    human_review: { accepted: true },
  });
  expect(facts.milestone).toBe("Checks need review");
  expect(facts.review).toBe("Customer accepted deliverable");
  expect(facts.paid).toBe(false);
});
