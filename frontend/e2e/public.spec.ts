import { test, expect } from "@playwright/test";
test.describe("public judge experience", () => {
  test.skip(
    !process.env.PACT_PUBLIC_DEMO,
    "Requires public demo mode and persistent test database",
  );
  test("complete sample, locked terms, example verification, refresh and audit", async ({
    page,
  }) => {
    await page.goto("/?view=workspace");
    await expect(
      page.getByRole("button", { name: "Start sample negotiation" }),
    ).toBeEnabled();
    await expect(page.getByLabel("Sandbox buyer email")).toHaveCount(0);
    await page
      .getByRole("button", { name: "Start sample negotiation" })
      .click();
    await expect(
      page.getByRole("button", { name: "Accept these terms" }),
    ).toBeVisible();
    await expect(
      page.getByText("Deterministic demo", { exact: true }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Accept these terms" }).click();
    await page.getByRole("button", { name: "Continue to milestone" }).click();
    await page.getByRole("button", { name: "Load example evidence" }).click();
    await expect(
      page.getByText("Evidence verified — demo complete", { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Authorize PayPal payment" }),
    ).toHaveCount(0);
    await page.reload();
    await expect(
      page.getByText("Evidence verified — demo complete", { exact: true }),
    ).toBeVisible();
    await page.goto("/?view=agreements");
    await expect(
      page.getByRole("heading", { name: "Your agreements" }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: /Build a focused landing page/ })
      .click();
    await expect(
      page.getByText("Evidence verified — demo complete", { exact: true }),
    ).toBeVisible();
    await page.getByText("Agreement history & details").click();
    await page.getByRole("button", { name: "Load audit history" }).click();
    await expect(
      page.getByText("demo milestone opened", { exact: true }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Workspace" }).click();
    await page.getByText("Recorded real API evidence", { exact: true }).click();
    await page.getByRole("button", { name: "Load verified evidence" }).click();
    await expect(
      page.getByText(/Separate PayPal sandbox invoice:/),
    ).toContainText("PAID");
    await page.getByRole("button", { name: "Workspace" }).click();
    await page.screenshot({
      path: "test-results/public-verified-desktop.png",
      fullPage: true,
    });
  });
  test("mobile blocked recipient investigation and separate visitor isolation", async ({
    page,
    browser,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/?view=workspace");
    await page
      .getByRole("button", { name: "Start sample negotiation" })
      .click();
    const first = await page.request.get("/api/agreements");
    const id = (await first.json())[0].id;
    const other = await browser.newContext();
    const stranger = await other.newPage();
    await stranger.goto("/?view=workspace");
    const response = await stranger.request.get("/api/agreements/" + id);
    expect(response.status()).toBe(404);
    await other.close();
    await page.getByText("Agreement history & details").click();
    await page
      .getByRole("button", { name: "Investigate a blocked recipient change" })
      .click();
    await expect(
      page.getByText("Blocked · Recipient substitution blocked."),
    ).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: "test-results/public-blocked-mobile.png",
      fullPage: true,
    });
  });
  test("shows a safe error when persistent API access fails", async ({
    page,
  }) => {
    await page.route("**/api/agreements", (route) =>
      route.fulfill({
        status: 503,
        contentType: "text/plain",
        body: "Internal failure details are not a user-facing response",
      }),
    );
    await page.goto("/?view=workspace");
    await expect(page.getByRole("alert")).toContainText(
      "The service is temporarily unavailable. Please try again.",
    );
    await expect(
      page.getByText("Payment confirmed", { exact: true }),
    ).toHaveCount(0);
  });
});
