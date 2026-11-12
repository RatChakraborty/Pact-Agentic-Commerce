import { test, expect } from "@playwright/test";

test("landing distinguishes the public demo from real provider receipts", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", {
      name: "Agents negotiate. People decide.",
    }),
  ).toBeVisible();

  await page.goto("/sandbox");
  await expect(
    page.getByRole("button", { name: "Agreement tools", exact: true }),
  ).toBeVisible();
  await page.goto("/agreements");
  await expect(
    page.getByRole("heading", { name: "Your agreements" }),
  ).toBeVisible();
  await expect(page.getByText("No agreements yet.")).toBeVisible();
});

for (const mobile of [false, true])
  test(`two-persona shared agreement ${mobile ? "mobile" : "desktop"}`, async ({
    page,
    browser,
  }) => {
    const sellerContext = await browser.newContext({
      viewport: mobile
        ? { width: 390, height: 844 }
        : { width: 1280, height: 900 },
    });
    const strangerContext = await browser.newContext();
    const origin = process.env.PACT_TEST_URL || "http://127.0.0.1:8000";
    const headers = { "X-Pact-Action": "1", Origin: origin };
    const seller = await sellerContext.newPage();
    if (mobile) await page.setViewportSize({ width: 390, height: 844 });
    const title = "Landing service " + Date.now();
    try {
      await seller.goto("/?view=business");
      await seller.getByLabel("Demo display name").fill("Studio browser demo");
      await seller.getByRole("button", { name: "Start business demo" }).click();
      await seller.getByLabel("Service title").fill(title);
      await seller
        .getByRole("button", { name: "Publish demo service" })
        .click();
      await expect(seller.getByRole("heading", { name: title })).toBeVisible();
      await seller.screenshot({
        path: `test-results/release-business-${mobile ? "mobile" : "desktop"}.png`,
        fullPage: true,
      });
      const invite = await seller
        .getByRole("link", { name: "Customer invitation link" })
        .last()
        .getAttribute("href");
      await page.goto(invite!);
      await page.getByLabel("Demo display name").fill("Customer browser demo");
      await page.getByRole("button", { name: "Start customer demo" }).click();
      await page.getByRole("button", { name: new RegExp(title) }).click();
      await expect(
        page.getByRole("complementary", {
          name: "Provisional agreement preview",
        }),
      ).toContainText("$300.00");
      await page.screenshot({
        path: `test-results/redesign-customer-brief-${mobile ? "mobile" : "desktop"}.png`,
        fullPage: true,
      });
      await page.getByRole("checkbox").check();
      const createdRequest = page.waitForResponse(
        (r) => r.request().method() === "POST" && r.url().endsWith("/requests"),
      );
      await page
        .getByRole("button", { name: "Send negotiation request" })
        .click();
      await expect(
        page.locator(".status").filter({ hasText: "awaiting seller" }),
      ).toBeVisible();
      const createdAgreement = await (await createdRequest).json();
      await strangerContext.request.get(origin + "/api/demo-market/persona");
      await strangerContext.request.post(origin + "/api/demo-market/persona", {
        headers,
        data: { role: "buyer", name: "Unrelated browser" },
      });
      expect(
        (
          await strangerContext.request.get(
            origin + "/api/demo-market/agreements/" + createdAgreement.id,
          )
        ).status(),
      ).toBe(404);
      await seller
        .getByRole("button", { name: "Refresh shared activity" })
        .click();
      await seller
        .getByRole("button", {
          name: "Build a static landing page for our design studio.",
        })
        .click();
      await expect(
        seller.getByText("Your private minimum: $240.00"),
      ).toBeVisible();
      await expect(seller.getByText(/Your private maximum:/)).toHaveCount(0);
      await seller
        .getByRole("button", { name: "Authorize seller agent" })
        .click();
      await page
        .getByRole("button", { name: "Refresh shared activity" })
        .click();
      await page
        .getByRole("button", { name: "Run deterministic negotiation" })
        .click();
      await expect(
        page.getByText("Your private maximum: $300.00"),
      ).toBeVisible();
      await expect(page.getByText(/Your private minimum:/)).toHaveCount(0);
      await expect(
        page.getByLabel("Human confirmations").locator(".approved"),
      ).toHaveCount(0);
      const contractUrl =
        origin + "/api/demo-market/agreements/" + createdAgreement.id;
      const currentProposal = await (
        await page.request.get(contractUrl)
      ).json();
      const consent = {
        confirmed: true,
        version: currentProposal.version,
        terms_digest: currentProposal.terms_digest,
      };
      expect(
        (
          await page.request.post(contractUrl + "/approve", {
            headers,
            data: { ...consent, version: consent.version + 1 },
          })
        ).status(),
      ).toBe(409);
      expect(
        (
          await page.request.post(contractUrl + "/approve", {
            headers,
            data: { ...consent, amount_minor: 1 },
          })
        ).status(),
      ).toBe(422);
      await page
        .getByRole("button", { name: "Confirm terms as customer" })
        .click();
      await expect(
        page.getByLabel("Human confirmations").locator(".approved"),
      ).toHaveCount(1);
      await expect(
        page.locator(".status").filter({ hasText: "proposed" }),
      ).toBeVisible();
      await seller
        .getByRole("button", { name: "Refresh shared activity" })
        .click();
      await expect(seller.locator(".timeline li")).toHaveCount(3);
      expect(await page.locator(".timeline").innerText()).toBe(
        await seller.locator(".timeline").innerText(),
      );
      await seller
        .getByRole("button", { name: "Confirm terms as seller" })
        .click();
      await expect(
        seller.getByLabel("Human confirmations").locator(".approved"),
      ).toHaveCount(2);
      await expect(
        seller
          .getByRole("navigation", { name: "Agreement progress" })
          .locator('[aria-current="step"]'),
      ).toContainText("Seller evidence");
      await seller.screenshot({
        path: `test-results/release-mutual-${mobile ? "mobile" : "desktop"}.png`,
        fullPage: true,
      });
      await seller
        .getByRole("button", { name: "Submit example evidence" })
        .click();
      await expect(
        seller.locator(".status").filter({ hasText: "awaiting buyer review" }),
      ).toBeVisible();
      await page
        .getByRole("button", { name: "Refresh shared activity" })
        .click();
      await page
        .getByRole("combobox", { name: "Decision", exact: true })
        .selectOption("accept");
      await page
        .getByLabel("Review reason")
        .fill("I inspected the three required sections and structural checks.");
      await page
        .getByRole("button", { name: "Record customer review" })
        .click();
      await expect(page.getByText(/Two-sided demo complete/)).toBeVisible();
      const currentPayment = page.getByRole("region", {
        name: "This agreement payment state",
      });
      await expect(currentPayment).toContainText("Not created");
      await expect(currentPayment).toContainText(
        "Not checked — no invoice exists",
      );
      await expect(
        page.getByRole("region", {
          name: "Separate historical PayPal evidence",
        }),
      ).toHaveCount(0);
      await page
        .getByText("Separate historical PayPal proof · PAID", { exact: true })
        .click();
      await expect(
        page.getByRole("region", {
          name: "Separate historical PayPal evidence",
        }),
      ).toContainText("Provider-confirmed PAID");
      await page.reload();
      await page
        .getByRole("button", {
          name: "Build a static landing page for our design studio.",
        })
        .click();
      await expect(
        page.locator(".status").filter({ hasText: "demo complete" }),
      ).toBeVisible();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      await expect(
        page.getByRole("button", { name: "End demo session" }),
      ).toBeEnabled();
      await page.screenshot({
        path: `test-results/two-sided-${mobile ? "mobile" : "desktop"}.png`,
        fullPage: true,
      });
      await page
        .getByText("Shared contractual history", { exact: true })
        .click();
      await page.screenshot({
        path: `test-results/release-shared-history-${mobile ? "mobile" : "desktop"}.png`,
        fullPage: true,
      });
      await page.getByRole("button", { name: "End demo session" }).click();
      await expect(
        page.getByRole("link", { name: "Explore Pact" }),
      ).toBeVisible();
    } finally {
      await sellerContext.close();
      await strangerContext.close();
    }
  });
