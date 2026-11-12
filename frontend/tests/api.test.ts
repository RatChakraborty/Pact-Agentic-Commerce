import { it, expect, vi, afterEach } from "vitest";
import { api } from "../src/api";
afterEach(() => vi.unstubAllGlobals());
it("distinguishes rewritten HTML from a database JSON error", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockImplementation(() =>
      Promise.resolve(
        new Response("<html>PRIVATE platform error</html>", {
          status: 200,
          headers: { "content-type": "text/html" },
        }),
      ),
    ),
  );
  await expect(api("/demo-market/persona")).rejects.toThrow(
    "HTTP 200; API_NON_JSON",
  );
  await expect(api("/demo-market/persona")).rejects.not.toThrow("PRIVATE");
});
it("preserves sanitized JSON errors without turning them into success", async () => {
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockResolvedValue(
        new Response(
          JSON.stringify({ detail: "Persistent storage is unavailable." }),
          { status: 503 },
        ),
      ),
  );
  await expect(api("/health")).rejects.toThrow(
    "Persistent storage is unavailable.",
  );
});
it("network failures offer recorded demo without provider requests", async () => {
  const fetch = vi
    .fn()
    .mockRejectedValue(new TypeError("PRIVATE network diagnostic"));
  vi.stubGlobal("fetch", fetch);
  await expect(api("/health")).rejects.toThrow("API_NETWORK_ERROR");
  expect(fetch).toHaveBeenCalledTimes(1);
});

it("startup failures show safe actionable references without rendering raw diagnostics", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          detail: "The interactive service could not start.",
          code: "CONFIGURATION_INVALID",
          diagnostics: {
            python_version: "3.14.8",
            problems: [
              "APP_SESSION_SECRET_MISSING_OR_SHORT",
              "PRIVATE_SECRET_VALUE",
            ],
            context: "PRIVATE_URL",
          },
        }),
        { status: 503 },
      ),
    ),
  );
  await expect(api("/demo-market/persona")).rejects.toThrow(
    "Diagnostic: CONFIGURATION_INVALID / Python 3.14.8 / APP_SESSION_SECRET_MISSING_OR_SHORT",
  );
});
