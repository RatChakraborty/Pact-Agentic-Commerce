# Vercel Python function discovery repair

The user supplied confirmed Preview **build-time** failures at core `c701184d59f0f18fd9ef5e24c2241716f469ee82` and redesign `fc13f637bb19f01a64a8889b697645a06318e1bf`:

> The pattern 'api/index.py' defined in `functions` doesn't match any Serverless Functions inside the `api` directory.

## Reproduced cause and minimal fix

`api/index.py` exists at the repository root, but both its successful `app` import and its fallback `app` assignment were inside a `try`/`except`. Vercel statically checks Python source for a **top-level** `app`, `application` or `handler`. It does not descend into those conditional blocks. Its official analyzer `@vercel/python-analysis` **0.15.3** returned **null** for the failing file; adding a module-level export returned **app**. This reproduces the discovery rejection without importing Pact, connecting to Neon or requiring account access.

The fix retains both normal FastAPI startup and sanitized failure handling under `_application`, then explicitly exports `app = _application` at module level. No application behavior, financial permissions, React output or infrastructure was replaced.

`vercel.json` needs **no change** for this cause:

- `functions["api/index.py"]` is supported configuration for the discovered Python API entrypoint; Vercel's detector maps `api/**/*.py` to `@vercel/python`.
- `framework: vite`, the custom frontend build command and `outputDirectory: frontend/dist` coexist with source API discovery. The Vite framework preset does not suppress Python runtimes. Do not remove the Python function merely to silence the validation error.
- API rewrites precede the SPA fallback. The frontend is still built by Vite and `/api/*` still targets FastAPI.
- `.vercelignore` does not exclude `api/index.py`, the `api` directory, `backend/app`, or root `requirements.txt`. Its Python exclusions target test/tool files only.
- The **existing Vercel project's Root Directory must be the repository root** (blank/`.` in settings), **not `frontend`**. The remote setting cannot be inspected from this environment; verify it on the next Preview. Moving/copying the backend under `frontend` or replacing the full deployment architecture is unnecessary.

## Official requirements and evidence

The live Vercel documentation site was denied by this environment's proxy. The current official Vercel repository was inspected instead at commit `84878e532142f0ac584953695658b324eb9e5b80`, together with the published analyzer bundled in Vercel CLI 65.14.0:

- [Official Python entrypoint documentation](https://vercel.com/docs/functions/runtimes/python#python-entrypoints) — canonical documentation link referenced by Vercel's own runtime.
- [Official Python AST entrypoint analyzer](https://github.com/vercel/vercel/blob/84878e532142f0ac584953695658b324eb9e5b80/packages/python-analysis/crates/vercel_python_analysis/src/entrypoint.rs) — iterates top-level statements and recognizes assignments/imports of `app`/`application` and `handler` classes.
- [Official API builder detection](https://github.com/vercel/vercel/blob/84878e532142f0ac584953695658b324eb9e5b80/packages/fs-detectors/src/detect-builders.ts) — checks `findAppOrHandler` before assigning the Python builder and rejects unused `functions` patterns.
- [Official Python runtime entrypoint requirements](https://github.com/vercel/vercel/blob/84878e532142f0ac584953695658b324eb9e5b80/packages/python/src/entrypoint.ts) — documents the top-level export requirement and candidate directories including `api`.
- [Official framework presets](https://github.com/vercel/vercel/blob/84878e532142f0ac584953695658b324eb9e5b80/packages/frameworks/src/frameworks.ts) — Vite frontend settings; Python function discovery remains separate.

## Regression and validation

`npm --prefix frontend run check:deployment` executes three tests using the **actual official analyzer**, pinned as a development-only dependency. It checks the configured entrypoint, reproduces the original broken conditional export, verifies the corrected export, and preserves both React output and API-before-SPA routing. This check now runs in every frontend production build. It does not bundle the analyzer into the browser or call a provider.

Targeted backend tests verify the actual ASGI entrypoint exports Pact and that invalid hosted configuration still returns a sanitized JSON 503. Both branch production builds and frontend suites are verified separately before push. No paid API operation, database reset, deployment promotion or infrastructure creation is part of this repair.

## Next Preview gate

Build a new **Preview** from either patched branch in the existing `pact-agentic-commerce` project, with Root Directory at repository root. Confirm the Python function is present in build output and the discovery error is gone. A successful Preview build still needs separate `/api/health`, Neon and two-context workflow verification. No hosted success or database root cause is claimed by this build repair; prior proxy restrictions remain independent limitations.
