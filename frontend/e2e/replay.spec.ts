import { test, expect } from "@playwright/test";
for (const width of [1440, 390])
  test(`recorded AI replay works with every API unavailable at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    let apiCalls = 0;
    await page.route("**/api/**", (route) => {
      apiCalls++;
      return route.fulfill({
        status: 503,
        contentType: "text/html",
        body: "<html>unavailable</html>",
      });
    });
    await page.goto("/");
    await page
      .getByRole("link", { name: "Explore the demo", exact: false })
      .first()
      .click();
    await expect(page.getByText("Offer 1 of 3", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Next", exact: true }).click();
    await expect(page.locator(".timeline li")).toHaveCount(2);
    await page.getByRole("button", { name: "Previous", exact: true }).click();
    await expect(page.locator(".timeline li")).toHaveCount(1);
    await page.getByRole("button", { name: "Restart", exact: true }).click();
    await expect(page.locator(".timeline li")).toHaveCount(0);
    await page
      .getByRole("button", { name: "Show complete transcript" })
      .click();
    await expect(
      page.getByRole("heading", {
        name: "$300.00 proposed — human approval still required",
      }),
    ).toBeVisible();
    await page.getByLabel("Recorded scenario").selectOption("1");
    await page
      .getByRole("button", { name: "Show complete transcript" })
      .click();
    await expect(
      page.getByText("Host blocked · Seller minimum price violated.", {
        exact: true,
      }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "No agreement authorized" }),
    ).toBeVisible();
    await page
      .getByText("Separate verified PayPal sandbox evidence · PAID", {
        exact: true,
      })
      .click();
    await expect(
      page.getByText(/Separate original sandbox invoice/),
    ).toBeVisible();
    expect(apiCalls).toBe(0);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: `test-results/replay-${width}.png`,
      fullPage: true,
    });
  });
for (const role of ["customer", "business"])
  test(`${role} route never falls back to legacy emails on API HTML`, async ({
    page,
  }) => {
    await page.route("**/api/**", (route) =>
      route.fulfill({
        status: 500,
        contentType: "text/html",
        body: "<html>do not render</html>",
      }),
    );
    await page.goto("/" + role);
    await expect(page.getByRole("alert")).toContainText(
      "HTTP 500; API_NON_JSON",
    );
    await expect(page.getByLabel("Sandbox buyer email")).toHaveCount(0);
    await expect(page.getByLabel("Sandbox merchant email")).toHaveCount(0);
    await expect(page.getByText("do not render")).toHaveCount(0);
  });
