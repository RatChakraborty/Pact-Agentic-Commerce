import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";

const root = fileURLToPath(new URL("../../", import.meta.url));
const documentation = [
  "CONTRACTS.md",
  "EVALUATION.md",
  "RENDER.md",
  "TWO_SIDED.md",
  "VERCEL.md",
];
const receipts = [
  "evaluation-live-initial.json",
  "evaluation-live.json",
  "evaluation-offline.json",
  "live-negotiation.json",
  "negotiation-matrix-20261111.json",
  "negotiation-matrix-fixed-offline-20261111.json",
  "paypal-contract-link.json",
  "paypal-readback.json",
];
describe("public documentation policy", () => {
  it("publishes maintained documentation and authentic receipts, without internal delivery records", () => {
    expect(readdirSync(resolve(root, "docs")).sort()).toEqual(
      [...documentation, "evidence", "examples", "screenshots"].sort(),
    );
    expect(readdirSync(resolve(root, "docs/examples"))).toEqual([
      "landing-page.html",
    ]);
    expect(readdirSync(resolve(root, "docs/evidence")).sort()).toEqual(
      receipts.sort(),
    );
  });
  it("keeps relative documentation links resolvable after cleanup", () => {
    const files = ["README.md", ...documentation.map((name) => `docs/${name}`)];
    for (const file of files) {
      const text = readFileSync(resolve(root, file), "utf8");
      for (const match of text.matchAll(/\]\(([^)]+)\)/g)) {
        const target = match[1].split("#")[0];
        if (!target || /^https?:|^mailto:/.test(target)) continue;
        expect(
          () => readFileSync(resolve(root, file, "..", target)),
          `${file}: ${target}`,
        ).not.toThrow();
      }
    }
  });
});
