import { it, expect } from "vitest";
import { intentionalDeadline } from "../src/AgreementPreview";
import { progressStage, stateTone } from "../src/Progress";
import { filterAgreements } from "../src/agreementFilters";
it("proposes eight days ahead at 5 PM local time, not a UTC date truncation", () => {
  const now = new Date(2026, 10, 11, 9, 25),
    value = intentionalDeadline(now),
    deadline = new Date(value);
  expect(deadline.getDate()).toBe(19);
  expect(deadline.getHours()).toBe(17);
  expect(deadline.getMinutes()).toBe(0);
});
it("does not mark model proposals as human approvals or cancellation as authorization", () => {
  expect(progressStage("PROPOSED")).toBe(2);
  expect(stateTone("PROPOSED")).toBe("pending");
  expect(progressStage("CANCELLED")).toBe(-1);
  expect(stateTone("PAID")).toBe("approved");
  expect(stateTone("PAYMENT_PENDING")).toBe("pending");
});
it("filters the actual role-specific pending work without adding records", () => {
  const records = [
    { status: "AWAITING_SELLER" },
    { status: "PROPOSED", approvals: ["buyer"] },
    { status: "AWAITING_BUYER_REVIEW" },
    { status: "DEMO_COMPLETE" },
  ];
  expect(filterAgreements(records, "decision", "seller")).toEqual(
    records.slice(0, 2),
  );
  expect(filterAgreements(records, "decision", "buyer")).toEqual([records[2]]);
  expect(filterAgreements(records, "history", "seller")).toEqual([records[3]]);
  expect(filterAgreements(records, "all", "buyer")).toBe(records);
});
