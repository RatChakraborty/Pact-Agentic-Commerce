import { test, expect } from "@playwright/test";
for (const width of [1440, 390])
  test(`one-session Explore Pact completes all evidence chapters at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 1000 });
    let calls = 0;
    await page.route("**/api/**", (route) => {
      calls++;
      return route.fulfill({ status: 503, body: "Unavailable" });
    });
    await page.goto("/");
    const explore = page
      .getByRole("link", { name: "Explore Pact", exact: false })
      .first();
    await explore.focus();
    await page.keyboard.press("Enter");
    await expect(
      page.getByText("Recorded real AI negotiation", { exact: true }),
    ).toBeVisible();
    await expect(page.getByText("Offer 1 of 3", { exact: true })).toBeVisible();
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
    await page
      .getByRole("link", { name: "2 · Agreement & verification fixture" })
      .click();
    await expect(
      page.getByText("Interactive deterministic demonstration", {
        exact: true,
      }),
    ).toBeVisible();
    const contract = page.getByRole("region", {
      name: "Captured fixture contract",
    });
    await expect(contract).toContainText("0/2 · none");
    const next = page.getByRole("button", {
      name: "Next agreement step",
      exact: true,
    });
    for (let i = 0; i < 2; i++) await next.click();
    const digest = await contract.locator(".digest").textContent();
    await next.focus();
    await page.keyboard.press("Enter");
    await expect(contract).toContainText("1/2 · buyer");
    await next.click();
    await expect(contract).toContainText("2/2 · buyer and seller");
    await expect(contract.locator(".digest")).toHaveText(digest!);
    await page.screenshot({
      path: `test-results/guided-confirmations-${width}.png`,
    });
    await next.click();
    await expect(
      page.getByRole("heading", { name: "Recorded structural checks · PASS" }),
    ).toBeVisible();
    await page.screenshot({
      path: `test-results/guided-verification-${width}.png`,
    });
    await next.click();
    await expect(
      page.getByText(/Captured customer review: accepted/),
    ).toBeVisible();
    await expect(contract).toContainText("Not created · NOT_CREATED");
    await page
      .getByText("Captured agreement audit and provenance", { exact: true })
      .click();
    await expect(
      page.getByText(/buyer · buyer reviewed deliverable/),
    ).toBeVisible();
    await page.screenshot({ path: `test-results/guided-audit-${width}.png` });
    await page.reload();
    await expect(page.getByText(/Captured step 7 of 7/)).toBeVisible();
    await page
      .getByRole("link", { name: "3 · Verified PayPal transaction" })
      .click();
    await expect(
      page.getByText("Provider-confirmed PAID", { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText("INV2-N6CJ-RJXM-96WT-XDVG", { exact: true }),
    ).toBeVisible();
    await expect(page.getByText(/not a new provider query/)).toBeVisible();
    await page
      .getByRole("button", { name: "Restart agreement example" })
      .click();
    await expect(contract).toContainText("0/2 · none");
    expect(calls).toBe(0);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  });
