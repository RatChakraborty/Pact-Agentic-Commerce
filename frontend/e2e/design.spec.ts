import { test, expect } from "@playwright/test";
for (const width of [1440, 390])
  test(`redesigned landing, role selection and provisional brief at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 1000 });
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto("/");
    await expect(
      page.getByRole("heading", { name: "Agents negotiate. People decide." }),
    ).toBeVisible();
    await expect(
      page.getByRole("region", {
        name: "Authentic recorded negotiation preview",
      }),
    ).toBeVisible();
    await expect(
      page.getByText("Required · not recorded", { exact: true }),
    ).toBeVisible();
    await page.evaluate(() => document.fonts.ready);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: `test-results/redesign-landing-${width}.png`,
      fullPage: true,
    });
    await page
      .getByRole("link", { name: "Try it yourself", exact: true })
      .first()
      .click();
    await expect(
      page.getByRole("link", { name: /I'm a customer/ }),
    ).toBeVisible();
    await expect(page.getByLabel("Sandbox buyer email")).toHaveCount(0);
    await page.goto("/sandbox");
    if (process.env.PACT_PUBLIC_DEMO)
      await expect(
        page.getByRole("button", { name: "Start sample negotiation" }),
      ).toBeEnabled();
    else
      await expect(
        page.getByRole("button", { name: "Create agreement" }),
      ).toBeEnabled();
    await page
      .getByRole("textbox", { name: "Objective", exact: true })
      .fill("Design a precise landing page for our local studio.");
    await page.getByLabel("Maximum budget (USD)").fill("275");
    const preview = page.getByRole("complementary", {
      name: "Provisional agreement preview",
    });
    await expect(preview).toContainText("Design a precise landing page");
    await expect(preview).toContainText("$275.00");
    await expect(preview).toContainText("Not agreed · not locked");
    await expect(
      page
        .getByRole("navigation", { name: "Agreement progress" })
        .locator('[aria-current="step"]'),
    ).toContainText("Brief");
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: `test-results/redesign-brief-${width}.png`,
      fullPage: true,
    });
    expect(errors).toEqual([]);
  });
