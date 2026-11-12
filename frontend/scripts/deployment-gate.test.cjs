const test = require("node:test");
const assert = require("node:assert/strict");
const { spawnSync } = require("node:child_process");
const { readFileSync } = require("node:fs");
const { resolve } = require("node:path");
const { shouldBuild } = require("./deployment-gate.cjs");
const accepted = {
  VERCEL_ENV: "production",
  VERCEL_GIT_COMMIT_SHA: "a".repeat(40),
  PACT_PRODUCTION_RELEASE_SHA: "a".repeat(40),
  PUBLIC_DEMO: "true",
  ENABLE_LIVE_OPERATIONS: "false",
  LLM_MAX_CALLS: "0",
  LLM_BUDGET_USD: "0",
};
test("Preview is independent of the Production acceptance gate", () =>
  assert.equal(shouldBuild({ VERCEL_ENV: "preview" }), true));
test("Production requires an exact accepted commit and public zero-spend mode", () => {
  assert.equal(shouldBuild(accepted), true);
  for (const key of Object.keys(accepted))
    assert.equal(shouldBuild({ ...accepted, [key]: "" }), false, key);
  assert.equal(
    shouldBuild({ ...accepted, PACT_PRODUCTION_RELEASE_SHA: "b".repeat(40) }),
    false,
  );
  assert.equal(
    shouldBuild({ ...accepted, ENABLE_LIVE_OPERATIONS: "true" }),
    false,
  );
});
test("Vercel ignored-build exit codes hold unverified Production and allow Preview", () => {
  const script = resolve(__dirname, "deployment-gate.cjs");
  assert.equal(
    spawnSync(process.execPath, [script], { env: { VERCEL_ENV: "production" } })
      .status,
    0,
  );
  assert.equal(
    spawnSync(process.execPath, [script], { env: { VERCEL_ENV: "preview" } })
      .status,
    1,
  );
  const config = JSON.parse(
    readFileSync(resolve(__dirname, "../../vercel.json"), "utf8"),
  );
  assert.equal(
    config.ignoreCommand,
    "node frontend/scripts/deployment-gate.cjs",
  );
});
