import { test, expect } from "@playwright/test";

test.use({ storageState: "playwright/.auth/user.json" });

/**
 * The admin status page has one job the rest of the app cannot do: work when the app does not.
 *
 * It is exempt from `AppDataGate` for that reason, and this spec pins the exemption. Verified
 * against a genuinely broken instance during development — with the local database missing a
 * column, every other screen showed "Couldn't load your data" while this page rendered and named
 * the missing column with the command that fixes it.
 *
 * The assertions below hold in BOTH states, which is what makes them safe in CI. CI runs
 * `prisma db push` before booting, so the schema check there reports in-sync rather than
 * drifted — asserting on the drift text would pass locally and fail in CI for the wrong reason.
 * What is always true: the page loads, it is not swallowed by the gate, every check group is
 * present, and the simulation disclosure is shown unconditionally.
 */
test("renders independently of the account data fetch", async ({ page }) => {
  await page.goto("/admin", { waitUntil: "domcontentloaded" });

  // Reachability is not incidental. `canAccessPortalPath` derives access from the nav list, so
  // before /admin was added there it silently redirected to /dashboard.
  await expect(page).toHaveURL(/\/admin/);
  await expect(page.getByRole("heading", { name: /system status/i })).toBeVisible({
    timeout: 20000,
  });

  // The load/error gate must not have replaced the page — this is the whole point.
  await expect(page.getByText(/couldn't load your data/i)).toHaveCount(0);
});

test("states plainly that no filing is real, whatever the checks say", async ({ page }) => {
  await page.goto("/admin", { waitUntil: "domcontentloaded" });

  // Unconditional, not derived from any check. An operator should not have to infer from a
  // row's colour that nothing reaches a tax authority.
  await expect(page.getByText(/no filing reaches a real tax authority/i)).toBeVisible({
    timeout: 20000,
  });
  await expect(page.getByText(/csv import only/i)).toBeVisible();
});

test("reports every check group", async ({ page }) => {
  await page.goto("/admin", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: /system status/i })).toBeVisible({
    timeout: 20000,
  });

  // Platform checks.
  await expect(page.getByText(/database schema/i).first()).toBeVisible();
  await expect(page.getByText(/pii encryption/i).first()).toBeVisible();

  // Both registered countries appear whether or not a connector record exists for this user —
  // "no connector yet" is itself information, and omitting the row would read as "fine".
  await expect(page.getByText(/tax authority — PT/i)).toBeVisible();
  await expect(page.getByText(/tax authority — ES/i)).toBeVisible();
  await expect(page.getByText(/bank movements/i).first()).toBeVisible();
});
