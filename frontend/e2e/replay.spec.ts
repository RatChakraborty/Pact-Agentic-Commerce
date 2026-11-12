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
      .getByRole("link", { name: "Explore Pact", exact: false })
      .first()
      .click();
    await page
      .getByRole("button", {
        name: "Watch the agents negotiate →",
        exact: true,
      })
      .click();
    await expect(page.getByText("Offer 1 of 3", { exact: true })).toBeVisible();
    await page
      .getByRole("button", { name: "Next offer →", exact: true })
      .click();
    await expect(
      page
        .getByRole("list", { name: "Recorded negotiation offers" })
        .locator("li"),
    ).toHaveCount(2);
    await page
      .getByRole("button", { name: "Previous offer", exact: true })
      .click();
    await expect(
      page
        .getByRole("list", { name: "Recorded negotiation offers" })
        .locator("li"),
    ).toHaveCount(1);
    await page
      .getByRole("button", { name: "Show full exchange", exact: true })
      .click();
    await expect(
      page.getByText(
        "Agents reached a $300.00 proposal. Human approval is still required.",
        { exact: true },
      ),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "Restart offer replay", exact: true })
      .click();
    await expect(page.getByText("Offer 1 of 3", { exact: true })).toBeVisible();
    await page
      .getByRole("button", { name: "Show full exchange", exact: true })
      .click();
    await page
      .getByRole("button", {
        name: "See what happens when an agent breaks the rules →",
      })
      .click();
    await expect(
      page.getByRole("region", { name: "Actual host decision" }),
    ).toContainText("Seller minimum price violated.");
    await page
      .getByText("Technical evidence and provenance", { exact: true })
      .click();
    await expect(
      page.getByRole("link", { name: "docs/evidence/evaluation-live.json" }),
    ).toHaveAttribute("href", /248004b6.*evaluation-live.json/);
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

test("startup diagnostic is visible without exposing secrets or falling back to sandbox", async ({
  page,
}) => {
  await page.route("**/api/**", (route) =>
    route.fulfill({
      status: 503,
      contentType: "application/json",
      body: JSON.stringify({
        detail:
          "The interactive service could not start. Use the recorded demo while configuration is reviewed.",
        code: "CONFIGURATION_INVALID",
        diagnostics: {
          problems: ["APP_SESSION_SECRET_MISSING_OR_SHORT", "PRIVATE_SECRET"],
          python_version: "3.14.8",
          private: "DO_NOT_RENDER",
        },
      }),
    }),
  );
  await page.goto("/customer");
  await expect(page.getByRole("alert")).toContainText(
    "Diagnostic: CONFIGURATION_INVALID / Python 3.14.8 / APP_SESSION_SECRET_MISSING_OR_SHORT",
  );
  await expect(page.getByText("DO_NOT_RENDER")).toHaveCount(0);
  await expect(page.getByText("PRIVATE_SECRET")).toHaveCount(0);
  await page.screenshot({ path: "test-results/release-startup-error.png" });
  await expect(page.getByLabel("Sandbox buyer email")).toHaveCount(0);
  await page
    .getByRole("link", { name: "Explore recorded demo" })
    .first()
    .click();
  await expect(
    page.getByText("Stage 1 of 7 · People", { exact: true }),
  ).toBeVisible();
});
