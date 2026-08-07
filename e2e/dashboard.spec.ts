import { test, expect } from "@playwright/test";

/**
 * NOTE — these tests are currently vacuous and should be rewritten.
 *
 * Every navigation below is wrapped in `if (await link.isVisible())`, so when the element is
 * absent the assertion never runs and the test passes. That makes them pass for the wrong
 * reason twice over:
 *   - on mobile-chrome, the sidebar is `hidden md:flex`, so the links are never visible and
 *     all three navigation tests do nothing at all;
 *   - on desktop, a nav that stopped rendering would also pass, which is the opposite of what
 *     a navigation test is for.
 *
 * The fix is to assert the link exists (no guard) and to reach it through the bottom nav
 * (`components/ui/mobile-nav.tsx`) below `md`. Left as-is in this commit because the Playwright
 * runner could not be executed in the environment where this was found — a test whose entire
 * body was `throw new Error(...)` reported "passed" — so any rewrite here would be unverified.
 */

test.describe("Dashboard", () => {
  test("should display the main dashboard", async ({ page }) => {
    await page.goto("/en");

    // Wait for page to load
    await page.waitForLoadState("networkidle");

    // Check for any page content - could be dashboard or redirect to signin
    const hasContent = await page.locator("body").textContent();
    expect(hasContent).toBeTruthy();

    // Page should have loaded successfully (no 500 errors)
    const pageUrl = page.url();
    expect(pageUrl).toContain("localhost");
  });

  test("should navigate to Portfolio section", async ({ page }) => {
    await page.goto("/en");

    // Click on Portfolio in sidebar
    const propertiesLink = page
      .getByRole("link", { name: /portfolio/i })
      .or(page.getByText(/portfolio/i).first());

    if (await propertiesLink.isVisible()) {
      await propertiesLink.click();
      await page.waitForLoadState("networkidle");

      // Verify we're in the portfolio section
      await expect(page.getByText(/portfolio/i).first()).toBeVisible();
    }
  });

  test("should navigate to People section", async ({ page }) => {
    await page.goto("/en");

    // Click on People in sidebar
    const tenantsLink = page
      .getByRole("link", { name: /people/i })
      .or(page.getByText(/people/i).first());

    if (await tenantsLink.isVisible()) {
      await tenantsLink.click();
      await page.waitForLoadState("networkidle");

      await expect(page.getByText(/people/i).first()).toBeVisible();
    }
  });

  test("should switch between languages", async ({ page }) => {
    await page.goto("/en");

    // Look for language switcher
    const languageSwitcher = page
      .getByRole("button", { name: /language|idioma|en|pt/i })
      .or(page.locator('[data-testid="language-switcher"]'));

    if (await languageSwitcher.isVisible()) {
      await languageSwitcher.click();

      // Look for Portuguese option
      const ptOption = page
        .getByRole("menuitem", { name: /português|portuguese|pt/i })
        .or(page.getByText(/português/i));

      if (await ptOption.isVisible()) {
        await ptOption.click();
        await page.waitForLoadState("networkidle");

        // URL should change to /pt
        await expect(page).toHaveURL(/\/pt/);
      }
    }
  });
});
