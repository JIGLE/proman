import { test, expect } from "@playwright/test";

/**
 * Theme system smoke tests (Wave B.4 / C.1).
 *
 * These guard two things that regressed before:
 *  1. The token system actually drives the palette in LIGHT mode (the 900+
 *     hardcoded colours that used to break light mode are migrated to tokens).
 *  2. DEMO mode forces dark and the ThemeProvider self-heals — entering the
 *     demo from a light-mode session no longer leaves a half-broken UI.
 *
 * ThemeProvider only mounts under app/[locale]/layout, so every page here is
 * locale-scoped. Assertions target the <html> theme class/attribute and the
 * resolved `--color-background` custom property, which are independent of any
 * single page's markup and therefore stable.
 */

const DARK_BG = "#0b0e14";
const LIGHT_BG = "#f8fafc";

function readTheme(page: import("@playwright/test").Page) {
  return page.evaluate(() => ({
    dataTheme: document.documentElement.getAttribute("data-theme"),
    classes: document.documentElement.className,
    stored: localStorage.getItem("proman-theme"),
    bg: getComputedStyle(document.documentElement)
      .getPropertyValue("--color-background")
      .trim()
      .toLowerCase(),
  }));
}

test.describe("Theme system", () => {
  test("applies the stored light theme and light tokens to <html>", async ({ page }) => {
    // Seed the preference before any page script runs.
    await page.addInitScript(() => {
      try {
        localStorage.setItem("proman-theme", "light");
      } catch {
        /* storage may be unavailable */
      }
    });

    await page.goto("/en");

    // ThemeProvider applies the class on mount.
    await expect
      .poll(async () => (await readTheme(page)).dataTheme, { timeout: 10_000 })
      .toBe("light");

    const theme = await readTheme(page);
    expect(theme.classes).toContain("light");
    // Token system is live: the background custom property resolves to the
    // light palette, not the dark default.
    expect(theme.bg).toBe(LIGHT_BG);
  });

  test("demo mode forces dark even when the user started in light", async ({ page }) => {
    await page.addInitScript(() => {
      try {
        localStorage.setItem("proman-theme", "light");
      } catch {
        /* storage may be unavailable */
      }
    });

    // Entering the demo writes proman-theme=dark and dispatches
    // proman:theme-changed; the ThemeProvider re-syncs so <html> ends up dark
    // regardless of the starting preference, then redirects to the dashboard.
    await page.goto("/en/demo");

    await expect
      .poll(async () => (await readTheme(page)).dataTheme, { timeout: 20_000 })
      .toBe("dark");

    const theme = await readTheme(page);
    expect(theme.classes).toContain("dark");
    expect(theme.stored).toBe("dark");
    expect(theme.bg).toBe(DARK_BG);
  });
});
