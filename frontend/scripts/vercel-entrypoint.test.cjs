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

test("official Python selector honors 3.12 even when 3.14 is available/default", async () => {
  const {
    discoverPythonPackage,
    selectPythonVersion,
  } = require("@vercel/python-analysis");
  const pkg = await discoverPythonPackage({
    entrypointDir: resolve(root, "api"),
    rootDir: root,
  });
  const available = [14, 13, 12].map((minor) => ({
    version: { major: 3, minor },
    implementation: "cpython",
    variant: "default",
    os: "linux",
    architecture: "x86_64",
    libc: "gnu",
  }));
  const result = selectPythonVersion({
    constraints: pkg.requiresPython,
    availableBuilds: available,
    allBuilds: available,
    defaultBuild: available[0],
    majorMinorOnly: true,
  });
  assert.equal(result.build.version.minor, 12);
  assert.equal(result.source, ".python-version");
  for (const name of [
    "fastapi",
    "starlette",
    "pydantic",
    "psycopg",
    "itsdangerous",
    "certifi",
  ]) {
    assert.ok(
      pkg.manifest.data.project.dependencies.some((dep) =>
        dep.startsWith(name + "=="),
      ),
      name + " runtime dependency must remain declared",
    );
  }
  assert.equal(
    pkg.manifest.origin.path,
    "requirements.txt",
    "Keep the locked Python dependency manifest",
  );
});

test("Vite installs Node dependencies explicitly and cannot auto-pip root requirements", () => {
  const config = JSON.parse(readFileSync(resolve(root, "vercel.json"), "utf8"));
  assert.equal(config.installCommand, "npm --prefix frontend ci");
  assert.equal(config.buildCommand, "npm --prefix frontend run build");
  assert.equal(
    config.functions["api/index.py"].excludeFiles,
    ".vercel_python_packages/**",
  );
});

test("ignore rules retain required Python runtime files and exclude the frontend pip target", () => {
  const { createRequire } = require("node:module");
  const dependencyRequire = createRequire(
    require.resolve("@vercel/python-analysis"),
  );
  const { minimatch } = dependencyRequire("minimatch");
  const rules = readFileSync(resolve(root, ".vercelignore"), "utf8")
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter((s) => s && !s.startsWith("#"));
  function ignored(file) {
    let value = false;
    for (const line of rules) {
      const negative = line.startsWith("!");
      const pattern = negative ? line.slice(1) : line;
      if (
        minimatch(file, pattern, { dot: true }) ||
        minimatch(file, pattern.replace(/\/$/, "") + "/**", { dot: true })
      )
        value = !negative;
    }
    return value;
  }
  for (const file of [
    ".python-version",
    "requirements.txt",
    "api/index.py",
    "backend/app/main.py",
    "backend/app/config.py",
    "backend/app/startup.py",
    "backend/app/postgres.py",
    "docs/evidence/paypal-readback.json",
  ]) {
    assert.ok(
      existsSync(resolve(root, file)),
      file + " must exist at repository root",
    );
    assert.equal(ignored(file), false, file + " must survive upload rules");
  }
  assert.equal(ignored(".vercel_python_packages/pydantic_core/core.so"), true);
  for (const file of [
    "frontend/test-results/error-context.md",
    "frontend/test-results-integrated-private/example/error-context.md",
    "frontend/test-results-corrections/results.json",
    "backend/.pytest_cache/README.md",
    "backend/app/__pycache__/main.pyc",
  ])
    assert.equal(ignored(file), true, file + " must not be uploaded");
});
