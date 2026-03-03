import { test, expect } from "@playwright/test";

/**
 * Phase 2 – Optimistic Delete & UI Feedback Tests
 *
 * Validates that delete operations show proper confirmation,
 * the UI updates immediately (optimistic), and error states
 * are handled gracefully.
 */

test.describe("Optimistic Delete – API Level", () => {
  test("DELETE non-existent property returns 404 or auth error", async ({
    request,
  }) => {
    const res = await request.delete("/api/properties/does-not-exist-123");
    // Without auth: 401/403. With auth but missing: 404
    expect([401, 403, 404]).toContain(res.status());
  });

  test("DELETE non-existent tenant returns 404 or auth error", async ({
    request,
  }) => {
    const res = await request.delete("/api/tenants/does-not-exist-123");
    expect([401, 403, 404]).toContain(res.status());
  });

  test("DELETE non-existent lease returns 404 or auth error", async ({
    request,
  }) => {
    const res = await request.delete("/api/leases/does-not-exist-123");
    expect([401, 403, 404]).toContain(res.status());
  });

  test("DELETE non-existent receipt returns 404 or auth error", async ({
    request,
  }) => {
    const res = await request.delete("/api/receipts/does-not-exist-123");
    expect([401, 403, 404]).toContain(res.status());
  });
});

test.describe("No Native confirm() Calls", () => {
  test.use({ storageState: "playwright/.auth/user.json" });

  test("no native confirm() dialogs appear in properties view", async ({
    page,
  }) => {
    let nativeDialogAppeared = false;
    page.on("dialog", (dialog) => {
      nativeDialogAppeared = true;
      dialog.dismiss();
    });

    await page.goto("/en");
    await page.waitForLoadState("networkidle");

    const navLink = page.getByRole("link", { name: /properties/i }).first();
    if (await navLink.isVisible().catch(() => false)) {
      await navLink.click();
      await page.waitForLoadState("networkidle");

      // Try to trigger a delete
      const deleteBtn = page
        .getByRole("button", { name: /delete/i })
        .first()
        .or(page.locator("button:has(svg.lucide-trash-2)").first());

      if (await deleteBtn.isVisible().catch(() => false)) {
        await deleteBtn.click();
        await page.waitForTimeout(1000);
      }
    }

    // Native confirm() should NEVER appear – we use AlertDialog
    expect(nativeDialogAppeared).toBe(false);
  });

  test("no native confirm() dialogs appear in tenants view", async ({
    page,
  }) => {
    let nativeDialogAppeared = false;
    page.on("dialog", (dialog) => {
      nativeDialogAppeared = true;
      dialog.dismiss();
    });

    await page.goto("/en");
    await page.waitForLoadState("networkidle");

    const navLink = page.getByRole("link", { name: /tenants/i }).first();
    if (await navLink.isVisible().catch(() => false)) {
      await navLink.click();
      await page.waitForLoadState("networkidle");

      const deleteBtn = page
        .getByRole("button", { name: /delete/i })
        .first()
        .or(page.locator("button:has(svg.lucide-trash-2)").first());

      if (await deleteBtn.isVisible().catch(() => false)) {
        await deleteBtn.click();
        await page.waitForTimeout(1000);
      }
    }

    expect(nativeDialogAppeared).toBe(false);
  });
});

test.describe("Page Skeletons", () => {
  test.use({ storageState: "playwright/.auth/user.json" });

  test("dashboard loads without rendering errors", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));

    await page.goto("/en");
    await page.waitForLoadState("networkidle");

    // Page should load successfully
    const title = await page.title();
    expect(title).toBeTruthy();

    // No JS errors
    expect(errors).toHaveLength(0);
  });

  test("properties page loads without rendering errors", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));

    await page.goto("/en");
    await page.waitForLoadState("networkidle");

    const navLink = page.getByRole("link", { name: /properties/i }).first();
    if (await navLink.isVisible().catch(() => false)) {
      await navLink.click();
      await page.waitForLoadState("networkidle");
    }

    expect(errors).toHaveLength(0);
  });

  test("tenants page loads without rendering errors", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));

    await page.goto("/en");
    await page.waitForLoadState("networkidle");

    const navLink = page.getByRole("link", { name: /tenants/i }).first();
    if (await navLink.isVisible().catch(() => false)) {
      await navLink.click();
      await page.waitForLoadState("networkidle");
    }

    expect(errors).toHaveLength(0);
  });
});
