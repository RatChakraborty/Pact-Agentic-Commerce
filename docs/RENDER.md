# Render deployment preparation — not deployed

`render.yaml` is a prepared blueprint for a **private, single-operator sandbox demo**. It has not been applied to Render or validated by Render's control plane. Do not deploy without explicit authorization. No Render Workflows integration is claimed; it solves no necessary problem here.

## Requirements

- A Render account and authorization to create a paid disk-capable Python web service. The starter plan and a 1 GB persistent disk are specified; verify current pricing/capabilities in Render before accepting charges.
- GitHub access to the feature branch and a build image supporting the pinned Python/Node versions. The build runs the same frozen uv and npm lockfiles validated locally.
- HTTPS on the actual service hostname. Set `PUBLIC_ORIGIN` to its exact `https://...` origin, with no path/trailing slash. The application compares browser mutation origins against it rather than trusting arbitrary forwarded headers.
- Persistent `APP_SESSION_SECRET` and `APP_ACCESS_PASSWORD`; the blueprint requests generated values. The access username is `pact`. Store the password in the operator's secure password manager, not this repository or video. With `SECURE_COOKIES=true`, startup refuses an absent/short secret or non-HTTPS origin. Basic authentication is an operator-only demo gate, not multi-user identity management.
- Existing sandbox `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET` and optional `LLM_API_KEY` entered securely in Render. Never put them into Vite variables or frontend bundles. Only `PAYPAL_ENV=sandbox` is supported.

No Render API key is required to prepare files or use the dashboard. API-based deployment would need a Render API key, but is not authorized or attempted.

## Durability

SQLite is at **`/var/data/pact.db`**, inside the mounted disk, not the ephemeral checkout. Retain that disk and session secret across deploys. Use one service instance; do not horizontally scale or run multiple replicas against separate SQLite files. In-flight negotiation does not survive process replacement. Stop activity before redeploying, and reconcile provider invoice state after startup.

Disk attachment is not a backup. Before changing/removing a service or disk, use SQLite's online backup API (or stop writes and take a consistent backup), transfer it to approved durable storage, and test restoration. Never copy a live SQLite database incompletely. Verify the disk path after a restart by creating and retrieving an agreement with the same browser session; an open port alone does not establish persistence.

## Authorized deployment checklist for later

1. Review the current Render blueprint schema and plan pricing; create the service only after deployment approval.
2. Enter the secure bindings and exact `PUBLIC_ORIGIN`; confirm the persistent disk is attached.
3. Build the locked backend and frontend. `startCommand` serves both from one origin on Render's `PORT`.
4. Check `/api/health` (deliberately public, no secrets). All workspace/API routes require the operator password when configured.
5. Verify unauthenticated workspace access returns 401, the session cookie is Secure, cross-origin mutations return 403, and the UI makes same-origin API requests over HTTPS.
6. Verify SQLite survives a restart and the operator's browser can reload its agreement. Then repeat sandbox-only invoice readback and browser tests.
7. Keep automatic deployment disabled during recording/submission. Do not expose a public unauthenticated financial demo or imply production readiness.

The local production build, backend tests and hosted-mode validation tests pass. Actual Render build/deploy, control-plane schema validation, TLS issuance, disk persistence and restoration remain **unverified**.
