import { it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { visibleOffers, type ReplayEvidence } from "../src/replay";
const evidence: ReplayEvidence = JSON.parse(
  readFileSync(
    new URL("../public/assets/pact-replay-v1.json", import.meta.url),
    "utf8",
  ),
);
it("pins each original receipt by SHA-256 and preserves actual live offers", () => {
  for (const p of evidence.provenance)
    expect(
      createHash("sha256")
        .update(readFileSync(new URL("../../" + p.path, import.meta.url)))
        .digest("hex"),
    ).toBe(p.sha256);
  const original = JSON.parse(
    readFileSync(
      new URL(
        "../../docs/evidence/negotiation-matrix-20261111.json",
        import.meta.url,
      ),
      "utf8",
    ),
  );
  for (const run of evidence.runs) {
    const source = original.runs.find(
      (r: any) => r.execution === "live" && r.id === run.id,
    );
    expect(run.offers).toEqual(
      source.offers.map(({ recipient, ...o }: any) => o),
    );
    expect(run.model).toBe(source.provider_observations[0].model);
    expect(run.outcome).toBe(source.outcome);
  }
});
it("replay clamps steps without changing recorded messages", () => {
  const run = evidence.runs[0],
    before = JSON.stringify(run);
  expect(visibleOffers(run, -1)).toEqual([]);
  expect(visibleOffers(run, 1)).toHaveLength(1);
  expect(visibleOffers(run, 99)).toEqual(run.offers);
  expect(JSON.stringify(run)).toBe(before);
});
it("uses a genuine host block and keeps payment separate from proposals", () => {
  expect(
    evidence.runs[1].offers.some(
      (o) => o.blocked === "Seller minimum price violated.",
    ),
  ).toBe(true);
  expect(evidence.payment.attribution).toContain(
    "Separate original sandbox invoice",
  );
  expect(evidence.approval_boundary).toContain("not human approval");
  expect(evidence.payment.status).toBe("PAID");
});
