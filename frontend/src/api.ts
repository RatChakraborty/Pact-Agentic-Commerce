/** Keep error bodies out of the DOM. HTTP diagnostics distinguish HTML routing failures. */
export async function api(path: string, body?: unknown, signal?: AbortSignal) {
  let r: Response;
  try {
    r = await fetch("/api" + path, {
      signal,
      method: body === undefined ? "GET" : "POST",
      headers: { "Content-Type": "application/json", "X-Pact-Action": "1" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch (e) {
    if ((e as Error).name === "AbortError") throw e;
    throw Error(
      "The interactive service could not be reached. Explore the recorded demo while it recovers. (API_NETWORK_ERROR)",
    );
  }
  let d;
  try {
    d = await r.json();
  } catch {
    throw Error(
      `The service is temporarily unavailable. Please try again. Non-JSON API response (HTTP ${r.status}; API_NON_JSON). The recorded demo is available.`,
    );
  }
  if (!r.ok) {
    const message =
      typeof d?.detail === "string"
        ? d.detail
        : `The interactive request failed (HTTP ${r.status}). Check the required fields and try again.`;
    const startupCodes = [
      "CONFIGURATION_INVALID",
      "DEPENDENCY_IMPORT_FAILED",
      "APPLICATION_STARTUP_FAILED",
    ];
    const allowedProblems = new Set([
      "PUBLIC_DEMO_REQUIRED",
      "DATABASE_URL_REQUIRED",
      "PACT_DATABASE_URL_INVALID_SCHEME",
      "DATABASE_URL_INVALID_SCHEME",
      "APP_SESSION_SECRET_MISSING_OR_SHORT",
      "PUBLIC_ORIGIN_INVALID",
      "HOSTED_ORIGIN_UNAVAILABLE",
      "PRIVATE_OPERATOR_PASSWORD_REQUIRED",
      "LIVE_OPERATOR_PASSWORD_REQUIRED",
      "VERCEL_INVALID_BOOLEAN",
      "PUBLIC_DEMO_INVALID_BOOLEAN",
      "ENABLE_LIVE_OPERATIONS_INVALID_BOOLEAN",
      "SECURE_COOKIES_INVALID_BOOLEAN",
    ]);
    if (startupCodes.includes(d?.code)) {
      const problems = Array.isArray(d?.diagnostics?.problems)
        ? d.diagnostics.problems.filter(
            (p: unknown) => typeof p === "string" && allowedProblems.has(p),
          )
        : [];
      const version =
        typeof d?.diagnostics?.python_version === "string" &&
        /^\d+\.\d+\.\d+$/.test(d.diagnostics.python_version)
          ? " / Python " + d.diagnostics.python_version
          : "";
      throw Error(
        `${message} Diagnostic: ${d.code}${version}${problems.length ? " / " + problems.join(", ") : ""}.`,
      );
    }
    throw Error(message);
  }
  return d;
}
