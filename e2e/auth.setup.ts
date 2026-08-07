import { test as setup, expect } from "@playwright/test";
import path from "path";

const authFile = path.join(__dirname, "../playwright/.auth/user.json");

const BASE = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000";
const EMAIL = process.env.E2E_USER_EMAIL || "demo@proman.local";
const PASSWORD = process.env.E2E_USER_PASSWORD || "demo123";

/**
 * Authentication setup for E2E tests.
 *
 * This used to short-circuit on `process.env.CI`, writing an EMPTY storage state and returning:
 *
 *     if (process.env.CI) { await page.context().storageState({ path: authFile }); return; }
 *
 * Every spec declaring `test.use({ storageState: ... })` therefore ran signed out in CI. Those
 * tests landed on the sign-in page, found no navigation, and their `if (await x.isVisible())`
 * guards swallowed the result — which is why a suite full of "Critical Path" tests could go green
 * without exercising a single authenticated flow. The guards were the symptom; this was the cause.
 *
 * So: authenticate for real, and fail loudly when that is not possible. A setup project that
 * silently yields no session is worse than one that errors, because everything downstream reports
 * success.
 */
setup("authenticate", async ({ page }) => {
  await page.goto(`${BASE}/auth/signin`, { waitUntil: "domcontentloaded" });

  // Match the form structurally rather than by label. The auth pages are localized and default to
  // Portuguese, so the previous `getByRole("button", { name: "Sign in with Credentials" })` and
  // `{ name: "Sign In" }` stopped matching once the locale fix landed — and because both were
  // wrapped in `.catch(() => false)`, that produced an unauthenticated state instead of an error.
  // `scripts/mobile-audit.mjs` hit exactly this and settled on these selectors.
  const emailInput = page.locator('input[name="email"]');
  try {
    await emailInput.waitFor({ state: "visible", timeout: 30000 });
  } catch {
    throw new Error(
      `No credentials sign-in form at ${BASE}/auth/signin. The E2E suite needs the demo ` +
        `credentials provider: set ENABLE_DEMO_LOGIN=true on the server and build with ` +
        `NEXT_PUBLIC_ENABLE_DEMO_LOGIN=true (a production build compiles the form out otherwise).`,
    );
  }

  await emailInput.fill(EMAIL);
  await page.locator('input[name="password"]').fill(PASSWORD);
  await page.locator('form button[type="submit"]').click();

  // The app serves four locales; the old pattern only matched /en and /pt.
  await page.waitForURL(/\/(en|pt|es|it)(\/|$|\?)/, { timeout: 20000 });

  // Seeding is opt-in. `seedDemoData` deletes and recreates the demo user's records, so it must
  // never fire against a developer's dev.db just because they ran the suite locally. CI sets
  // E2E_SEED on the full E2E job only — the smoke job stays unseeded because its tests assert on
  // unauthenticated API behaviour.
  if (process.env.E2E_SEED === "true") {
    // State-changing calls are CSRF-guarded: fetch the token cookie and echo it back in the header.
    await page.request.get(`${BASE}/api/csrf-token`);
    const cookies = await page.context().cookies();
    const csrf = cookies.find((c) => c.name === "csrf-token")?.value;
    const res = await page.request.post(`${BASE}/api/debug/db/seed`, {
      headers: csrf ? { "x-csrf-token": csrf } : {},
    });
    if (!res.ok()) {
      throw new Error(
        `Seeding failed (${res.status()}): ${await res.text()}. Without records the CRUD and ` +
          `delete-confirmation specs have nothing to act on and skip themselves.`,
      );
    }

    // A 200 from the seed route is not proof it produced anything — verify one collection came
    // back non-empty before letting the suite run against what it believes is seeded data.
    const properties = await page.request.get(`${BASE}/api/properties`);
    expect(properties.ok(), `GET /api/properties after seeding → ${properties.status()}`).toBe(
      true,
    );
    const body = await properties.json();
    const list = Array.isArray(body) ? body : (body.data ?? []);
    expect(list.length, "seed reported success but no properties came back").toBeGreaterThan(0);
  }

  await page.context().storageState({ path: authFile });
});
