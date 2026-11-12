import { test, expect } from "@playwright/test";
for (const width of [1440, 390])
  test(`PayPal proof is accessible without APIs at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 1000 });
    let calls = 0;
    await page.route("**/api/**", (route) => {
      calls++;
      return route.fulfill({
        status: 503,
        contentType: "application/json",
        body: JSON.stringify({ detail: "Startup unavailable" }),
      });
    });
    await page.goto("/");
    await page
      .getByRole("link", { name: "PayPal verification", exact: true })
      .click();
    await expect(
      page.getByRole("heading", { name: "Payment verification", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText("Recorded provider evidence", { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText("PayPal Sandbox Integration", { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText("Provider-confirmed PAID", { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: /USD 300.00 received/ }),
    ).toBeVisible();
    await expect(
      page.getByText("INV2-N6CJ-RJXM-96WT-XDVG", { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText("Original accepted contract amount", { exact: true }),
    ).toBeVisible();
    const timeline = page.getByText(
      "Inspect original contract and payment timeline",
      { exact: true },
    );
    await timeline.focus();
    await page.keyboard.press("Enter");
    await expect(
      page.getByText("sandbox invoice created", { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText(/separate seller human confirmation was not recorded/),
    ).toBeVisible();
    await page
      .getByText("How Pact reconciles PayPal status", { exact: true })
      .click();
    await expect(
      page.getByText("GET /v2/invoicing/invoices/INV2-N6CJ-RJXM-96WT-XDVG", {
        exact: true,
      }),
    ).toBeVisible();
    expect(calls).toBe(0);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: `test-results/paypal-proof-${width}.png`,
      fullPage: true,
    });
  });
