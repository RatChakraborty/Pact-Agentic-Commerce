import { test, expect } from "@playwright/test";
for (const width of [1440, 390])
  test(`one-session seven-stage Explore Pact at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 1000 });
    let apiCalls = 0;
    const errors: string[] = [];
    const failed: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("requestfailed", (r) => failed.push(r.url()));
    await page.route("**/api/**", (r) => {
      apiCalls++;
      return r.fulfill({ status: 503, body: "Unavailable" });
    });
    await page.goto("/");
    const explore = page
      .getByRole("link", { name: "Explore Pact", exact: false })
      .first();
    await explore.focus();
    await page.keyboard.press("Enter");
    const progress = page.getByRole("navigation", {
      name: "Guided demo progress",
    });
    await expect(progress.locator("li")).toHaveCount(7);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "A customer needs a landing page. A business can build it.",
    );
    await expect(
      page.getByText("Customer (buyer)", { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText("Business (seller)", { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText(/That is why the business’s price appears first/),
    ).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: `test-results/clarity-stage-1-${width}.png`,
      fullPage: true,
    });
    await page
      .getByRole("button", {
        name: "Watch the agents negotiate →",
        exact: true,
      })
      .click();
    await expect(
      page.getByText("Recorded real AI", { exact: true }),
    ).toBeVisible();
    await expect(page.getByText("Offer 1 of 3", { exact: true })).toBeVisible();
    await expect(
      page
        .getByRole("list", { name: "Recorded negotiation offers" })
        .locator("li"),
    ).toHaveCount(1);
    const nextOffer = page.getByRole("button", {
      name: "Next offer →",
      exact: true,
    });
    await nextOffer.focus();
    await page.keyboard.press("Enter");
    await expect(page.getByText("Offer 2 of 3", { exact: true })).toBeVisible();
    await page
      .getByRole("button", { name: "Previous offer", exact: true })
      .click();
    await expect(page.getByText("Offer 1 of 3", { exact: true })).toBeVisible();
    await page
      .getByRole("button", { name: "Show full exchange", exact: true })
      .click();
    await expect(page.getByText("Offer 3 of 3", { exact: true })).toBeVisible();
    await expect(
      page.getByText(
        "Agents reached a $300.00 proposal. Human approval is still required.",
        { exact: true },
      ),
    ).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: `test-results/clarity-stage-2-${width}.png`,
      fullPage: true,
    });
    await page
      .getByRole("button", {
        name: "See what happens when an agent breaks the rules →",
      })
      .click();
    await expect(
      page.getByRole("region", { name: "Actual host decision" }),
    ).toContainText("Seller minimum price violated.");
    await expect(
      page.getByText("Recorded real AI · separate limits test", {
        exact: true,
      }),
    ).toBeVisible();
    await page
      .getByText("Inspect the complete infeasible exchange", { exact: true })
      .click();
    await expect(
      page.getByText("Customer cap $200.00 · business asking $380.00."),
    ).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: `test-results/clarity-stage-3-${width}.png`,
      fullPage: true,
    });
    await page
      .getByRole("button", { name: "See how the agreement is approved →" })
      .click();
    await expect(
      page.getByText("Captured backend demonstration", { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("region", { name: "Captured agreement terms" }),
    ).toContainText("Version 1");
    await expect(
      page.getByText("✓ Customer confirmation captured", { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText("✓ Business confirmation captured", { exact: true }),
    ).toBeVisible();
    await page
      .getByText("Inspect fingerprint and captured authorization rejections", {
        exact: true,
      })
      .click();
    await expect(
      page.getByText("stale version · captured HTTP 409", { exact: true }),
    ).toBeVisible();
    await page
      .getByText("Optional: semantic critique evidence", { exact: true })
      .click();
    await expect(
      page.getByText(/one of eight legitimate proposals was falsely escalated/),
    ).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: `test-results/clarity-stage-4-${width}.png`,
      fullPage: true,
    });
    await page
      .getByRole("button", { name: "See how Pact checks the deliverable →" })
      .click();
    await expect(
      page.getByRole("region", { name: "Captured structural verification" }),
    ).toContainText("PASS · hero");
    await expect(
      page.getByRole("region", { name: "Captured customer review" }),
    ).toContainText("Customer review: accepted");
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: `test-results/clarity-stage-5-${width}.png`,
      fullPage: true,
    });
    await page
      .getByRole("button", { name: "See how payment is authorized →" })
      .click();
    await expect(
      page.getByText("Historical verified PayPal sandbox evidence", {
        exact: true,
      }),
    ).toBeVisible();
    await expect(
      page.getByText("Provider-confirmed PAID", { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText("INV2-N6CJ-RJXM-96WT-XDVG", { exact: true }),
    ).toBeVisible();
    await expect(page.getByText(/different completed agreement/)).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: `test-results/clarity-stage-6-${width}.png`,
      fullPage: true,
    });
    const paymentDetail = page.getByText(
      "Inspect original invoice, checkout flow and provider readback",
      { exact: true },
    );
    await paymentDetail.click();
    await expect(
      page.getByRole("region", { name: "Separate historical PayPal evidence" }),
    ).toContainText("INV2-N6CJ-RJXM-96WT-XDVG");
    await paymentDetail.click();
    await page
      .getByRole("button", { name: "See what Pact remembers →" })
      .click();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "Every important decision leaves evidence.",
    );
    await expect(
      page.getByText("Stage 7 of 7 · Audit", { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", {
        name: "Try the interactive marketplace",
        exact: true,
      }),
    ).toHaveAttribute("href", "/try");
    await page.getByText("Captured agreement audit", { exact: true }).click();
    await expect(
      page.getByText(/Customer · buyer reviewed deliverable/),
    ).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: `test-results/clarity-stage-7-${width}.png`,
      fullPage: true,
    });
    await page.getByRole("button", { name: "Back", exact: true }).click();
    await expect(
      page.getByText("Stage 6 of 7 · Payment", { exact: true }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "Restart guided demo", exact: true })
      .click();
    await expect(
      page.getByText("Stage 1 of 7 · People", { exact: true }),
    ).toBeVisible();
    expect(apiCalls).toBe(0);
    expect(errors).toEqual([]);
    expect(failed).toEqual([]);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  });

test("recorded artifact failure offers a working retry instead of an empty stage", async ({
  page,
}) => {
  let fail = true;
  await page.route("**/assets/pact-guided-v1.json", (r) =>
    fail ? r.fulfill({ status: 503, body: "Unavailable" }) : r.continue(),
  );
  await page.goto("/demo");
  await expect(page.getByRole("alert")).toContainText("could not be loaded");
  fail = false;
  await page.getByRole("button", { name: "Retry evidence loading" }).click();
  await expect(
    page.getByText("Stage 1 of 7 · People", { exact: true }),
  ).toBeVisible();
});
