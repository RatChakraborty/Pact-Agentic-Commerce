import { test, expect } from "@playwright/test";
const buyer = "buyer@example.com",
  seller = "seller@example.com";
async function create(page: any) {
  await page.goto("/?view=workspace");
  await page.getByLabel("Sandbox buyer email").fill(buyer);
  await page.getByLabel("Sandbox merchant email").fill(seller);
  await page.getByRole("button", { name: "Create agreement" }).click();
  await expect(
    page.getByRole("button", { name: "Start negotiation" }),
  ).toBeVisible();
}
test("brief, negotiation, explicit acceptance, safe invoice failure, history", async ({
  page,
}) => {
  test.skip(
    !!process.env.PACT_MOCK_PROVIDER,
    "Real-provider failure checked on separate server",
  );
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await create(page);
  await page.screenshot({
    path: "test-results/desktop-brief.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Start negotiation" }).click();
  await expect(
    page.getByRole("button", { name: "Accept these terms" }),
  ).toBeVisible();
  await expect(page.locator("aside .price")).toContainText("$300.00");
  await page.getByText("Agreement history & details").click();
  await page.getByRole("button", { name: "Check proposal wording" }).click();
  await expect(page.getByText(/Proposal wording: CLEAR/)).toBeVisible();
  await page.getByText("Agreement history & details").click();

  await page.getByRole("button", { name: "Accept these terms" }).click();
  await expect(
    page.getByRole("button", { name: "Create sandbox invoice" }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Create sandbox invoice" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Create sandbox invoice" }).click();
  await expect(page.getByRole("alert")).toContainText(
    "Configure sandbox merchant credentials",
  );
  await page.getByText("Agreement history & details").click();
  await page.getByRole("button", { name: "Load audit history" }).click();
  await expect(
    page.getByText("buyer accepted terms", { exact: true }),
  ).toBeVisible();
  await page.screenshot({
    path: "test-results/desktop-accepted.png",
    fullPage: true,
  });
  expect(errors).toEqual([]);
});
test("mobile failure demonstration is blocked without payment", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await create(page);
  await page.getByText("Agreement history & details").click();
  await page.getByLabel("Failure demonstration").selectOption("recipient-swap");
  await page.getByRole("button", { name: "Start negotiation" }).click();
  await expect(
    page.getByText("Blocked · Recipient substitution blocked."),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Create sandbox invoice" }),
  ).toHaveCount(0);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "test-results/mobile-blocked.png",
    fullPage: true,
  });
});
test("full browser workflow against explicitly mocked PayPal", async ({
  page,
}) => {
  test.skip(
    !process.env.PACT_MOCK_PROVIDER,
    "Requires isolated mocked-provider test harness",
  );
  await create(page);
  await page.getByRole("button", { name: "Start negotiation" }).click();
  await page.getByRole("button", { name: "Accept these terms" }).click();
  await page.getByRole("button", { name: "Create sandbox invoice" }).click();
  await expect(
    page.getByText("Awaiting deliverable", { exact: true }).first(),
  ).toBeVisible();
  await page.getByLabel("Landing-page HTML").setInputFiles({
    name: "landing.html",
    mimeType: "text/html",
    buffer: Buffer.from(
      '<main><section id="hero">A clear design studio landing page.</section><section id="features">Useful accessible services for growing teams.</section><section id="contact">Contact our team today.</section></main>',
    ),
  });
  await page.getByRole("button", { name: "Authorize PayPal payment" }).click();
  await expect(
    page.getByRole("link", { name: "Continue in PayPal" }),
  ).toHaveAttribute("href", /^https:\/\/www\.sandbox\.paypal\.com\//);
  await expect(
    page.getByText("Awaiting PayPal payment", { exact: true }).first(),
  ).toBeVisible();
  await page.request.post("/__test/provider-paid");
  await page.getByRole("button", { name: "Check PayPal status" }).click();
  await expect(
    page.getByText("Payment confirmed", { exact: true }).first(),
  ).toBeVisible();
  await page.screenshot({
    path: "test-results/mocked-paid.png",
    fullPage: true,
  });
});

test("session bootstrap completes before agreement creation is enabled", async ({
  page,
}) => {
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  let seen!: () => void;
  const requested = new Promise<void>((resolve) => {
    seen = resolve;
  });
  let first = true;
  await page.route("**/api/agreements", async (route) => {
    if (route.request().method() === "GET" && first) {
      first = false;
      const response = await route.fetch();
      seen();
      await gate;
      await route.fulfill({ response });
    } else await route.continue();
  });
  await page.goto("/?view=workspace");
  await requested;
  await expect(
    page.getByRole("button", { name: "Loading workspace" }),
  ).toBeDisabled();
  await page.getByLabel("Sandbox buyer email").fill(buyer);
  await page.getByLabel("Sandbox merchant email").fill(seller);
  release();
  await page.getByRole("button", { name: "Create agreement" }).click();
  await expect(
    page.getByRole("button", { name: "Start negotiation" }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Start negotiation" }),
  ).toBeVisible();
});
