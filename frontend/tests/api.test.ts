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
