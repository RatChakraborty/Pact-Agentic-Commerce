# Deploying Pact on Vercel

Use the existing Pact project and its dedicated Neon database. The repository serves both React and FastAPI from one origin; it is not a static-only deployment.

## Build and runtime

Set Root Directory to the repository root, not `frontend`. Keep the committed `vercel.json`, root Python requirements and Python 3.12 pin. Root `api/index.py` exports the FastAPI function. The frontend build generates the static bundle and validates receipt provenance. `.vercelignore` excludes local environments, test outputs and screenshot source files without excluding runtime modules.

Configure these securely for the intended Preview or Production scope, checking branch overrides:

| Variable | Value / purpose |
| --- | --- |
| `PUBLIC_DEMO` | `true` |
| `ENABLE_LIVE_OPERATIONS` | `false` |
| `LLM_MAX_CALLS` | `0` |
| `LLM_BUDGET_USD` | `0` |
| `PAYPAL_ENV` | `sandbox` |
| `APP_SESSION_SECRET` | Stable random secret of at least 32 characters; retain across deployments |
| `PACT_DATABASE_URL` or `DATABASE_URL` | Existing dedicated Neon PostgreSQL URL; nonempty Pact-specific binding takes precedence |
| `PACT_PRODUCTION_RELEASE_SHA` | Exact independently accepted commit for Production; the build gate rejects a mismatch |

Do not place secrets in frontend variables or source. The public guide needs no OpenAI or PayPal keys. Leave private provider operations disabled. Platform deployment/branch hosts are supported; a custom domain needs its exact HTTPS `PUBLIC_ORIGIN` without a path or trailing slash.

## Storage and security

PostgreSQL uses verified TLS with the packaged Certifi trust bundle, transaction-scoped advisory locks and disabled automatic prepared statements for pool compatibility. Invalid configuration fails closed; hosted agreements never fall back to ephemeral SQLite. Keep the database and session signing secret stable for persistence. Never run local database-reset fixtures against Neon.

Application sessions, participant isolation, agreement authorization and financial restrictions are independent of Vercel viewer authentication. Removing a Vercel login barrier must not change these controls.

## Anonymous judge access

In the existing project's **Settings → Deployment Protection**, inspect **Vercel Authentication** and its effective scope. Prefer a scope that permits the intended public Production deployment while retaining protection for unrelated previews. Depending on the plan and domain, Standard Protection may leave Production public while protecting Preview; a Protected Preview is not an anonymous judge URL. A protection exception may be used only if supported by the project's plan and explicitly scoped to the intended deployment/domain. Avoid changing team-wide security settings.

If the chosen `vercel.app` Production URL is still protected, adjust only this project's viewer protection as necessary for that URL. Do not distribute bypass tokens, developer cookies or login links as the public demo. Preview and Production access must be checked separately.

From a fresh unauthenticated browser, verify `/`, `/demo`, `/payments`, static evidence and `/api/health` serve Pact rather than a Vercel sign-in screen. Health must identify the exact deployment commit with `status=ok`, `public_demo=true` and `storage=postgresql`. Complete the seven-stage walkthrough and separately exercise customer/business persistence and isolation. A Ready build or authenticated browser is insufficient.

The project owner must approve Production promotion separately. Set the existing SHA gate only for the exact accepted commit; never bypass it to release an unverified build.

## Troubleshooting

`CONFIGURATION_INVALID` diagnostics identify missing or inconsistent settings without exposing values. Inspect their problem codes before investigating storage. `TLS_CONNECTION_FAILED` is a separate storage error; preserve certificate and hostname verification. Never weaken TLS or silently switch databases.

Use the existing tools for sanitized diagnostics and deterministic hosted acceptance:

```bash
cd backend
uv run --frozen python tools/diagnose_preview.py https://ACTUAL_DEPLOYMENT_HOST --output /tmp/pact-diagnostic.json
uv run --frozen python tools/check_hosted.py https://ACTUAL_DEPLOYMENT_HOST --output /tmp/pact-hosted-check.json
```

Review command help before use. The acceptance tool performs deterministic demo writes only after checking application identity; it does not initiate invoices or payments. Keep diagnostic outputs private. A development proxy CONNECT denial is not an application response and does not establish the deployment's protection or database status.
