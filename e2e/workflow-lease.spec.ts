import { test, expect } from "@playwright/test";

test.use({ storageState: "playwright/.auth/user.json" });

test.describe("Critical Path: Lease management", () => {
  let propertyId: string;
  let tenantId: string;

  // Seed both a property and a tenant via API so the lease form has real options to select
  test.beforeAll(async ({ request }) => {
    const today = new Date();
    const nextYear = new Date(today.getFullYear() + 1, today.getMonth(), today.getDate());

    const propRes = await request.post("/api/properties", {
      data: {
        name: `Lease Seed Property ${Date.now()}`,
        address: "42 Lease Ave, Lisbon",
        type: "apartment",
        bedrooms: 2,
        bathrooms: 1,
        rent: 1200,
      },
    });
    if (propRes.ok()) {
      const body = await propRes.json();
      propertyId = body.id ?? body.data?.id;
    }

    const tenantRes = await request.post("/api/tenants", {
      data: {
        name: `Lease Seed Tenant ${Date.now()}`,
        email: `lease_seed_${Date.now()}@test.local`,
        phone: "+351 900 000 001",
        rent: 1200,
        leaseStart: today.toISOString(),
        leaseEnd: nextYear.toISOString(),
      },
    });
    if (tenantRes.ok()) {
      const body = await tenantRes.json();
      tenantId = body.id ?? body.data?.id;
    }
  });

  test("should create a new lease and show it in the list", async ({ page }) => {
    page.on("console", (msg) => {
      if (msg.type() === "error") console.error("Browser error:", msg.text());
    });

    await page.goto("/en/leases?view=leases");
    await expect(page).toHaveURL(/\/leases/);

    // Open create dialog
    await page
      .getByRole("button", { name: /create lease|add lease/i })
      .first()
      .click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();

    // Select the seeded property — must succeed for a valid lease
    const propertySelect = dialog
      .locator("div.space-y-2")
      .filter({ hasText: /property/i })
      .getByRole("combobox");
    await expect(propertySelect).toBeVisible({ timeout: 5000 });
    await propertySelect.click();
    const firstProperty = page.getByRole("option").first();
    await expect(firstProperty).toBeVisible({ timeout: 3000 });
    await firstProperty.click();

    // Select the seeded tenant — must succeed too
    const tenantSelect = dialog
      .locator("div.space-y-2")
      .filter({ hasText: /tenant/i })
      .getByRole("combobox");
    await expect(tenantSelect).toBeVisible({ timeout: 5000 });
    await tenantSelect.click();
    const firstTenant = page.getByRole("option").first();
    await expect(firstTenant).toBeVisible({ timeout: 3000 });
    await firstTenant.click();

    // Fill dates
    const today = new Date();
    const startDate = today.toISOString().split("T")[0];
    const endDate = new Date(today.getFullYear() + 1, today.getMonth(), today.getDate())
      .toISOString()
      .split("T")[0];
    await dialog.getByLabel("Start Date").fill(startDate);
    await dialog.getByLabel("End Date").fill(endDate);

    await dialog.getByLabel(/monthly rent|rent amount/i).fill("1200");

    const depositField = dialog.getByLabel(/security deposit|deposit/i);
    if (await depositField.isVisible()) {
      await depositField.fill("2400");
    }

    // Submit and wait for the API call
    const responsePromise = page.waitForResponse(
      (res) => res.url().includes("/api/leases") && res.request().method() === "POST",
    );
    await dialog.getByRole("button", { name: /create lease|add lease|save/i }).click();
    const response = await responsePromise;

    expect([200, 201]).toContain(response.status());
    await expect(dialog).toBeHidden({ timeout: 5000 });

    // A lease entry (any status badge) should be visible
    await expect(page.locator("text=/active|pending|draft/i").first()).toBeVisible({
      timeout: 5000,
    });
  });

  test("should show validation errors when required fields are missing", async ({ page }) => {
    await page.goto("/en/leases?view=leases");
    await page
      .getByRole("button", { name: /create lease|add lease/i })
      .first()
      .click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();

    // Submit without filling anything
    await dialog.getByRole("button", { name: /create lease|add lease|save/i }).click();

    // Dialog should remain open with error feedback
    await expect(dialog).toBeVisible();
    const errors = dialog.locator("[role='alert'], .text-destructive, .text-red-400");
    await expect(errors.first()).toBeVisible({ timeout: 3000 });
  });

  test("should cancel without creating a lease", async ({ page }) => {
    await page.goto("/en/leases?view=leases");
    await page
      .getByRole("button", { name: /create lease|add lease/i })
      .first()
      .click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();

    await dialog.getByRole("button", { name: /cancel/i }).click();
    await expect(dialog).toBeHidden({ timeout: 3000 });
  });
});
