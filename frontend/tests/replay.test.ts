import { it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { visibleOffers, type ReplayEvidence } from "../src/replay";
const evidence: ReplayEvidence = JSON.parse(
  readFileSync(
    new URL("../public/assets/pact-replay-v2.json", import.meta.url),
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
    for (const [i, offer] of run.offers.entries()) {
      const { recipient, ...originalOffer } = source.offers[i];
      const { explanation_redacted, ...projected } = offer;
      expect({ ...projected, explanation: originalOffer.explanation }).toEqual(
        originalOffer,
      );
      if (explanation_redacted) expect(offer.explanation).toBe("");
      else expect(offer.explanation).toBe(originalOffer.explanation);
    }
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

it("public projection removes private strategy while preserving the linked payment proof", () => {
  expect(evidence.schema_version).toBe(2);
  for (const run of evidence.runs)
    for (const offer of run.offers)
      expect(offer.explanation).not.toMatch(
        /seller floor|my budget|my floor|reservation price/i,
      );
  expect(evidence.payment.contract.accepted_amount_minor).toBe(30000);
  expect(
    evidence.payment.contract.events.some((e) => e.next_status === "PAID"),
  ).toBe(true);
});
