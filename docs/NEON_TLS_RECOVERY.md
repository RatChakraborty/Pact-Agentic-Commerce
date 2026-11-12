# Hosted Neon TLS recovery — November 12, 2026

**Current status:** the user verified hosted core health on `c894ebe78330d3e4ebda96dbd4ac1657a86b33d2`: `status=ok`, `storage=postgresql`, Python 3.12.16, public demo enabled, live AI/PayPal unconfigured. The startup/TLS health blocker is resolved on that deployment. Full hosted workflow and redesigned Preview remain unverified. See [final release verification](RELEASE_VERIFICATION.md) and [the supplied health evidence](evidence/hosted-health-c894ebe.json). Earlier failure investigations below are historical.

## Actual hosted evidence

After correcting Preview environment settings, the user reports these newer Vercel runtime entries for `/api/health`, `/api/agreements`, and `/api/demo-market/persona`:

```
PACT_STORAGE_FAILURE code=TLS_CONNECTION_FAILED sqlstate=None type=OperationalError
```

These replace the earlier configuration-validation blocker for those requests. They establish a classified TLS failure from the running application, not an authenticated PostgreSQL connection. The exact newer deployment SHA, libpq certificate error and runtime CA paths were not supplied. No successful hosted health, persona creation or Neon persistence is claimed.

## Reproducible cause and secure correction

The locked `psycopg[binary]` 3.3.8 installed here uses libpq 18.6 (`180006`) and its own OpenSSL libraries. Inspecting its bundled libcrypto reports compiled defaults `/usr/lib/psycopg-openssl/cert.pem` and `/usr/lib/psycopg-openssl/certs`; neither exists here. Python's `ssl.get_default_verify_paths()` describes Python's OpenSSL, not necessarily the binary PostgreSQL driver's OpenSSL. Vercel's actual bundle/trust paths remain unmeasured.

`sslrootcert=system` is supported by this libpq. It asks its SSL implementation to load default trust, including `SSL_CERT_FILE`/`SSL_CERT_DIR` overrides. Support for the option does not guarantee a populated CA store on a deployment image. A non-secret loopback TLS fixture reproduces certificate verification failure when those default trust paths are empty. Under the same conditions, an explicit trusted PEM file completes certificate verification and reaches the fixture's deliberate authentication refusal. This is an actual libpq TLS handshake, not a mocked `psycopg.connect` result. It is not a Neon connection or persistence test.

Pact now passes `sslmode="verify-full", sslrootcert=certifi.where()` for all remote/hosted connections. Certifi supplies a packaged Mozilla CA bundle containing ISRG Root X1, the root documented by Neon. Certifi is an explicit backend dependency, retained in the frozen lock/export; no build-time certificate download or additional credential/configuration is required. Its package data is part of the independently installed function dependencies, not the excluded frontend `.vercel_python_packages` directory.

Hostname and chain verification remain required. Missing CA files, unknown issuers and hostname mismatches fail closed. There is no retry with `require`, `prefer`, `verify-ca`, disabled TLS or an alternate database. Existing local non-hosted loopback development behavior remains unchanged.

The log category alone cannot prove missing default CAs were the precise Vercel cause. This change removes a reproduced trust-discovery dependency. Redeployment and real hosted checks remain required.

## URL precedence, pooling and diagnostics

Psycopg connection keywords override the same options in the connection URL. The explicit verified TLS mode and PEM path therefore override weaker/stale `sslmode`/`sslrootcert` query parameters. Other URL options, including `channel_binding=require`, remain intact. Hostnames are preserved for SNI and hostname verification; there is no IP substitution or rewriting a pooled hostname to a direct one.

Neon recommends its `-pooler` endpoint for serverless connection-per-request traffic. Direct endpoints can also use verified TLS; changing endpoints is not a certificate-trust fix. Pact keeps `prepare_threshold=None`, per-transaction `SET LOCAL` state, transaction-scoped advisory locking, existing implicit transaction semantics, schema initialization, rollback and connection closure. No schema SQL, authorization, agreement integrity or audit rules were changed.

The existing configuration still gives nonempty `PACT_DATABASE_URL` precedence over integration `DATABASE_URL`. A stale explicit URL can select a different endpoint even if the generic binding is valid. This session cannot inspect Vercel's secret values, so no live binding is declared correct or stale, and no binding was modified. Failure logs now expose only:

- fixed `tls_reason` categories (missing/unreadable CA, certificate verification, hostname mismatch, server TLS unavailable, other);
- numeric libpq version and packaged CA presence;
- selected variable name and `binding_target_fields_match` (`True`, `False`, or `None`), comparing the two bindings' host/address, port, database, user and service fields without printing them. A mismatch can also be an intentional pooled/direct difference; it is a review signal, not proof of staleness. Matching fields do not verify credentials, target correctness or network reachability.

Raw driver messages, URLs, usernames, passwords, certificate paths and hostnames are not added to logs or public error responses. On a remaining failure, compare the selected binding with the **existing dedicated Pact database** in Vercel settings. Remove/correct an explicit override only after confirming it is stale; do not rotate credentials, create infrastructure or touch Nautilus.

## Tests and commands

From `backend`, run `.venv/bin/python -m pytest tests/test_postgres_tls.py tests/test_deployment_diagnostics.py tests/test_public_demo.py -q`. The TLS tests require the standard `openssl` CLI for ephemeral fixture certificate generation and use loopback only:

- actual verified TLS with unavailable default trust paths;
- old system-trust failure reproduced with empty trust paths;
- untrusted CA, wrong hostname and missing bundle rejected;
- URL keyword precedence, channel binding and direct/pooled/hosted-loopback endpoint preservation;
- installed CA bundle includes Neon’s documented root;
- value-free binding comparison and TLS error subcategories.

The full backend suite additionally exercises existing local PostgreSQL concurrency, audit immutability, budget atomicity and two-persona persistence using only the dedicated disposable local test database. Never point database-reset fixtures at Neon.

## Hosted acceptance gate

Redeploy the pushed feature commit on the existing Preview project. No further environment variable or new CA credential should be needed for this correction. Verify the actual deployed release SHA, then require `/api/health` HTTP 200 with `status=ok`, `storage=postgresql` and expected Pact/public-demo identity. Next run customer/seller persona creation and agreement persistence across refresh/new requests using the guarded hosted probe and browser commands in [Vercel setup](VERCEL.md). Cross-redeployment persistence must also be checked before durable storage is claimed.

The development environment still lacks allowed Preview HTTPS/Neon TCP access and Vercel management authentication. This source change is not a verified hosted repair. UI and sponsor work remain paused until the gate passes.

## Official sources consulted

The documentation websites were blocked by the development proxy; the corresponding official source files were retrieved successfully:

- [Neon secure connections](https://neon.com/docs/connect/connect-securely), [official source](https://github.com/neondatabase/website/blob/main/content/docs/connect/connect-securely.md): recommends `verify-full`, explicit CA paths, ISRG Root X1.
- [Neon connection pooling](https://neon.com/docs/connect/connection-pooling), [official source](https://github.com/neondatabase/website/blob/main/content/docs/connect/connection-pooling.md): pooled serverless connections and transaction-mode constraints.
- [Psycopg connection parameters](https://www.psycopg.org/psycopg3/docs/api/connections.html), [official source](https://github.com/psycopg/psycopg/blob/master/docs/api/connections.rst): keyword arguments override conninfo parameters.
- [PostgreSQL libpq SSL](https://www.postgresql.org/docs/18/libpq-ssl.html), [official parameter documentation source](https://github.com/postgres/postgres/blob/REL_18_STABLE/doc/src/sgml/libpq.sgml), [OpenSSL implementation](https://github.com/postgres/postgres/blob/REL_18_STABLE/src/interfaces/libpq/fe-secure-openssl.c): explicit PEM roots, `system` semantics and OpenSSL default trust loading.
- [Certifi official documentation](https://github.com/certifi/python-certifi/blob/master/README.rst): packaged Mozilla trust store and `certifi.where()`.

## Verification in this repair session

Core: **153 backend tests passed**, including 16 targeted TLS/binding cases and the disposable local PostgreSQL tests; **12 frontend unit tests**, **6 deployment checks**, and the production build passed. Five browser scenarios against local PostgreSQL passed: desktop/mobile two-persona lifecycle, public agreement completion/refresh/audit, visitor isolation with blocked recipient investigation, and safe storage-error handling. A fresh local `/api/health` returned HTTP 200, `status=ok`, `application=pact`, `storage=postgresql`. These measurements are local and do not satisfy the hosted Neon acceptance gate.
