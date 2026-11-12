/** Runs Vercel's official Python discovery without importing Pact or credentials. */
const test = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync, existsSync } = require("node:fs");
const { resolve } = require("node:path");
const { findAppOrHandler } = require("@vercel/python-analysis");
const root = resolve(__dirname, "../..");

test("configured Python function is discoverable by Vercel, not merely importable", async () => {
  const config = JSON.parse(readFileSync(resolve(root, "vercel.json"), "utf8"));
  const path = "api/index.py";
  assert.ok(config.functions[path], "Keep the FastAPI serverless function");
  assert.equal(
    await findAppOrHandler(readFileSync(resolve(root, path), "utf8")),
    "app",
  );
  assert.ok(
    existsSync(resolve(root, "requirements.txt")),
    "Python dependencies must be at project root",
  );
});

test("the original conditional-only export reproduces the discovery failure", async () => {
  const broken =
    "try:\n    from app.main import app\nexcept Exception:\n    app = create_failure_app()\n";
  assert.equal(await findAppOrHandler(broken), null);
  const fixed =
    broken
      .replace(
        "from app.main import app",
        "from app.main import app as _application",
      )
      .replace(
        "app = create_failure_app()",
        "_application = create_failure_app()",
      ) + "\napp = _application\n";
  assert.equal(await findAppOrHandler(fixed), "app");
});

test("React output and API rewrite coexist with the discovered Python function", () => {
  const config = JSON.parse(readFileSync(resolve(root, "vercel.json"), "utf8"));
  assert.equal(config.framework, "vite");
  assert.equal(config.outputDirectory, "frontend/dist");
  const apiIndex = config.rewrites.findIndex((r) => r.source === "/api/:path*");
  const spaIndex = config.rewrites.findIndex(
    (r) => r.destination === "/index.html",
  );
  assert.ok(
    apiIndex >= 0 && spaIndex > apiIndex,
    "API must precede SPA fallback",
  );
  assert.equal(config.rewrites[apiIndex].destination, "/api/index.py");
});
