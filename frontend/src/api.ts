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
  if (!r.ok)
    throw Error(
      typeof d?.detail === "string"
        ? d.detail
        : `The interactive request failed (HTTP ${r.status}). Check the required fields and try again.`,
    );
  return d;
}
