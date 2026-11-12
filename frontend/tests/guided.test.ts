import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { expect, it } from "vitest";
import { guidedStep, type GuidedEvidence } from "../src/guided";
const data: GuidedEvidence = JSON.parse(
  readFileSync(
    new URL("../public/assets/pact-guided-v1.json", import.meta.url),
    "utf8",
  ),
);
it("captured fixture proves ordered mutual confirmation and verification without a payment", () => {
  expect(data.model_calls).toBe(0);
  expect(data.provider_calls).toBe(0);
  expect(data.payment_status).toBe("NOT_CREATED");
  const a = data.snapshots.map((s) => s.agreement);
  expect(a.map((s) => s.approvals.length)).toEqual([0, 0, 0, 1, 2, 2, 2]);
  expect(
    a
      .slice(2)
      .every((s) => s.terms_digest === a[2].terms_digest && s.version === 1),
  ).toBe(true);
  expect(a[2].terms_digest).toMatch(/^[a-f0-9]{64}$/);
  expect(a[5].verification?.overall).toBe("PASS");
  expect(a[6].human_review?.accepted).toBe(true);
  expect(a[6].status).toBe("DEMO_COMPLETE");
  expect(data.rejected_requests).toEqual({
    stale_version: 409,
    unauthorized_term_change: 422,
    unrelated_session_access: 404,
  });
});
it("public fixture is an allowlist projection with a reproducible generator", () => {
  expect(JSON.stringify(data)).not.toMatch(
    /"(?:buyer_email|seller_email|budget_minor|seller_floor_minor|owner|policy_seal|cookie)":/,
  );
  expect(
    createHash("sha256")
      .update(
        readFileSync(
          new URL(
            "../../backend/tools/build_guided_fixture.py",
            import.meta.url,
          ),
        ),
      )
      .digest("hex"),
  ).toBe(data.generator_sha256);
  expect(data.limitations.join(" ")).toContain(
    "not the genuine AI negotiation",
  );
});
it("guided display controls clamp corrupted saved progress without altering captured facts", () => {
  expect(guidedStep(NaN, 7)).toBe(0);
  expect(guidedStep(-2, 7)).toBe(0);
  expect(guidedStep(99, 7)).toBe(6);
});
