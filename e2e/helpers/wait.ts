import type { Page } from "@playwright/test";

/**
 * Best-effort settle after a navigation.
 *
 * The specs used to call `await page.waitForLoadState("networkidle")` unbounded. On an
 * authenticated page this never resolves — something keeps the network busy — so the call sat
 * there until the 30s test timeout killed it. Once the runner actually began executing bodies
 * (see the playwright-core version fix), that single line accounted for 11 of the suite's 29
 * failures across four files.
 *
 * Playwright discourages `networkidle` for exactly this reason. It is kept here only as a short,
 * bounded nicety for pages that do settle, and its timeout is deliberately swallowed: the
 * assertions that follow are the real check, and every Playwright locator auto-waits, so a page
 * that needs longer is handled by the assertion rather than by guessing here.
 */
export async function settle(page: Page, timeout = 5000): Promise<void> {
  await page.waitForLoadState("networkidle", { timeout }).catch(() => {});
}
