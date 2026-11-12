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

import { paymentLifecycle, safeSandboxCheckout } from "../src/payments";
it("structural acceptance does not authorize or confirm a payment", () => {
  const stages = paymentLifecycle({
    status: "DEMO_COMPLETE",
    approvals: ["buyer", "seller"],
    verification: { overall: "PASS" },
    human_review: { accepted: true },
  });
  expect(stages.map((s) => s.confirmed)).toEqual([
    true,
    false,
    true,
    false,
    false,
    false,
  ]);
  expect(paymentLifecycle({ status: "PAID" }).at(-1)?.confirmed).toBe(false);
});
it("only an actual authorized operator invoice can expose a valid provider-returned sandbox link", () => {
  const invoice = {
    id: "INV2-UNIT",
    status: "SENT",
    checked_at: "2026-11-11",
    approval_url: "https://www.sandbox.paypal.com/invoice/p/#provider-fixture",
  };
  const a = { status: "PAYMENT_PENDING", approved_at: "2026-11-11", invoice };
  expect(safeSandboxCheckout(a)).toBe(invoice.approval_url);
  expect(safeSandboxCheckout({ ...a, approved_at: null })).toBe(null);
  expect(safeSandboxCheckout({ ...a, approvals: ["buyer", "seller"] })).toBe(
    null,
  );
  for (const url of [
    "http://sandbox.paypal.com/x",
    "https://user:pass@sandbox.paypal.com/x",
    "https://sandbox.paypal.com:444/x",
    "https://sandbox.paypal.com.attacker.example/x",
  ])
    expect(
      safeSandboxCheckout({ ...a, invoice: { ...invoice, approval_url: url } }),
    ).toBe(null);
});

import { historicalPaymentLifecycle } from "../src/payments";
it("historical payment stages require their actual audit events, not a PAID label alone", () => {
  const p = {
    status: "PAID",
    invoice_id: "INV2-UNIT",
    contract: {
      accepted_at: "2026-11-11",
      payment_handoff_authorized_at: "2026-11-11",
      events: [] as { action: string; next_status: string }[],
    },
  };
  expect(historicalPaymentLifecycle(p).every((s) => !s.confirmed)).toBe(true);
  p.contract.events = [
    { action: "sandbox_invoice_created", next_status: "INVOICED" },
    { action: "provider_status_checked", next_status: "PAID" },
  ];
  const stages = historicalPaymentLifecycle(p);
  expect(stages[1].confirmed).toBe(true);
  expect(stages.at(-1)?.confirmed).toBe(true);
  expect(stages[3].confirmed).toBe(false);
});
