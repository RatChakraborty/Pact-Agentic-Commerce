import { describe, it, expect } from "vitest";
import { nextAction, money } from "../src/workflow";
describe("workflow actions", () => {
  it("requires acceptance before invoice", () => {
    expect(nextAction("PROPOSED")?.action).toBe("accept");
    expect(nextAction("ACCEPTED")?.action).toBe("invoice");
  });
  it("gates payment on review", () => {
    expect(nextAction("INVOICED")).toBeNull();
    expect(nextAction("NEEDS_REVIEW")).toBeNull();
    expect(nextAction("VERIFIED")?.action).toBe("payment-approval");
  });
  it("avoids repeated payment actions", () => {
    expect(nextAction("PAYMENT_PENDING")).toBeNull();
    expect(nextAction("PAID")).toBeNull();
  });
  it("formats cents", () => expect(money(29999)).toBe("$299.99"));
});

it("public demo never offers invoice or payment actions", () => {
  expect(nextAction("ACCEPTED", true)?.action).toBe("demo-milestone");
  expect(nextAction("VERIFIED", true)).toBeNull();
  expect(nextAction("AWAITING_EVIDENCE", true)).toBeNull();
});
