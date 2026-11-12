# Python selection and hosted startup: evidence and limits

The supplied build log stops at `Installing dependencies... / Using CPython 3.14.8` (Vercel CLI 65.14.0, core a9c7494). No target path, subsequent install command, function interpreter or runtime exception is available. This line alone does **not** identify the phase or explain the hosted HTTP 503.

## Official implementation review

The official [Python runtime documentation](https://vercel.com/docs/functions/runtimes/python) supports a root `.python-version`. The documentation website was inaccessible through this environment's proxy, so the behavior was checked against official implementation source and the cached CLI 65.14.0 builders:

- [Python version selection](https://github.com/vercel/vercel/blob/84878e532142f0ac584953695658b324eb9e5b80/packages/python/src/version.ts) and [function build](https://github.com/vercel/vercel/blob/84878e532142f0ac584953695658b324eb9e5b80/packages/python/src/index.ts): discovery walks from `api` to the project root, reads `.python-version` and root requirements, and selects the function interpreter. The independent function environment uses `.vercel/python/.venv`.
- [Static/Vite builder](https://github.com/vercel/vercel/blob/84878e532142f0ac584953695658b324eb9e5b80/packages/static-build/src/index.ts): absent an explicit install command, root requirements can trigger a separate Python install during frontend installation.
- [runPipInstall](https://github.com/vercel/vercel/blob/84878e532142f0ac584953695658b324eb9e5b80/packages/build-utils/src/fs/run-user-scripts.ts): `uv pip install --target .vercel_python_packages -r requirements.txt` supplies no explicit Python selector. This is distinct from the Python function environment.

Thus a frontend auto-install is a plausible explanation for the log, **not a verified attribution**. The missing subsequent log lines would distinguish these phases.

## Minimal configuration correction

Keep `.python-version` at `3.12`, root `requirements.txt`, `api/index.py`, the React build, API rewrites and FastAPI function. Set `installCommand` to `npm --prefix frontend ci`; the build command now only builds the frontend. This prevents the redundant frontend auto-pip install. The Python function builder still installs its own root requirements; the project framework is Vite, not a Python framework with a custom Python install command.

Exclude `.vercel_python_packages` from upload, source control and function bundling, so an unrelated frontend dependency target cannot become backend packages. Required runtime files, pin, manifest and evidence remain included. Ignoring backend tests/tools, local environments, SQLite files and secrets is intentional. Root Directory must remain **repository root**, not `frontend`; the account-side setting cannot be inspected here. No new pyproject or empty dependency manifest was introduced.

## Reproducible checks

`cd frontend && npm ci && npm run check:deployment` runs six checks using pinned official `@vercel/python-analysis` 0.15.3: discoverable top-level ASGI export; original broken export reproduction; API/SPA coexistence; root requirements retained and `.python-version` selecting 3.12 even with a 3.14 default; explicit frontend install; required files surviving ignore rules.

Isolated Linux environments installed the same root requirements under **3.12.14 and exactly 3.14.8**. Both imported FastAPI 0.162.4, Pydantic 2.14.3 / core 2.50.4, psycopg/binary 3.3.8 and Pact's actual entrypoint. Both returned HTTP 200 from `/api/version`, with database connection attempts patched to fail and **zero database calls**. This checks dependency installation/import compatibility only. It does not verify Vercel packaging, native ABI across mismatched environments, Neon connectivity or `/api/health`.

Fresh-process regression fixtures distinguish configuration/import/unexpected startup failures from a successful startup followed by storage failure. Server diagnostics and normal release metadata now expose the actual Python version/implementation without credentials. The client displays only whitelisted failure codes and interpreter version; it never displays arbitrary diagnostic values.

## Hosted verification remains blocked

The development proxy rejects CONNECT to the supplied Preview before any application response. Actual deployed SHA, interpreter, startup category and Neon health remain **NOT VERIFIED**. No hosted root cause is asserted.

On the existing project's next Preview, rebuild without the old build cache, confirm repository-root setting and inspect the Python **function** build selection separately from frontend installation. Read `/api/health`: retain `code`, `release.commit`, `release.python_version` and sanitized `diagnostics`, or the first `PACT_STARTUP_FAILED` log. A healthy `/api/version` alone is insufficient; require real `/api/health` PostgreSQL success before both-persona acceptance and before resuming UI/sponsor work. See [startup diagnostics](STARTUP_DIAGNOSTICS.md). No account settings, infrastructure or public deployment were changed by these source edits.

To repeat the interpreter smoke after installing root requirements in each isolated environment, run that environment's `python backend/tools/python_runtime_smoke.py`. The script substitutes fixture configuration, disables inference/provider keys, patches database connection attempts and reports only dependency versions and response classification. It does not print environment values or contact the hosted application.
