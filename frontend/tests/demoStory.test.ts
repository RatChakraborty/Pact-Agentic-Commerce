import { expect, it } from "vitest";
import { DEMO_STAGES, storyStage } from "../src/demoStory";
it("defines exactly seven primary stages in the promised narrative order", () => {
  expect(DEMO_STAGES.map((s) => s.short)).toEqual([
    "People",
    "Negotiate",
    "Host check",
    "Approve",
    "Verify",
    "Payment",
    "Audit",
  ]);
  expect(DEMO_STAGES.every((s) => s.title && s.mode && s.next)).toBe(true);
});
it("keeps the three distinct evidence modes explicit at their transitions", () => {
  expect(DEMO_STAGES[1].mode).toBe("Recorded real AI");
  expect(DEMO_STAGES[2].mode).toContain("separate limits test");
  expect(DEMO_STAGES[3].mode).toBe("Captured backend demonstration");
  expect(DEMO_STAGES[4].mode).toBe("Captured backend demonstration");
  expect(DEMO_STAGES[5].mode).toBe(
    "Historical verified PayPal sandbox evidence",
  );
});
it("clamps navigation to real stages without inventing a completion stage", () => {
  expect(storyStage(-1)).toBe(0);
  expect(storyStage(7)).toBe(6);
  expect(storyStage(NaN)).toBe(0);
  expect(storyStage(3.9)).toBe(3);
});
