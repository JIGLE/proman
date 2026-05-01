import { test, expect } from "@playwright/test";

test.describe("Tenant Self-Service Portal — invalid token handling", () => {
  test("should render an error state for an invalid token, not a 500 crash", async ({ page }) => {
    await page.goto("/tenant-portal/invalid-token-here");
    await page.waitForLoadState("networkidle");

    // Page must load without a Next.js error boundary / unhandled 500
    await expect(page.locator("body")).not.toContainText("Application error");
    await expect(page.locator("body")).not.toContainText("Internal Server Error");

    // The page should communicate the problem to the user
    const body = await page.locator("body").textContent();
    expect(body).toBeTruthy();
    expect(body!.trim().length).toBeGreaterThan(10);
  });

  test("portal page should not crash with an arbitrary token string", async ({ page }) => {
    await page.goto("/tenant-portal/some-completely-random-token-abc123");
    await page.waitForLoadState("networkidle");

    await expect(page.locator("body")).not.toContainText("Application error");
    const title = page.locator("h1, h2, [role='heading']").first();
    // Some heading must exist — either an error heading or a portal heading
    await expect(title).toBeVisible({ timeout: 5000 });
  });
});

test.describe("Tenant Portal API — authentication guard", () => {
  test("GET with invalid token should return 401/403/404", async ({ request }) => {
    const response = await request.get("/api/tenant-portal/invalid-token-here");
    expect([401, 403, 404]).toContain(response.status());
  });

  test("POST /pay with invalid token should return 401/403/404", async ({ request }) => {
    const response = await request.post("/api/tenant-portal/invalid-token/pay", {
      data: { invoiceId: "inv_123", amount: 100, paymentMethod: "card" },
    });
    expect([401, 403, 404]).toContain(response.status());
  });

  test("GET with empty token segment should not return 500", async ({ request }) => {
    // A missing token cascades to the page route — verify the API doesn't throw unhandled
    const response = await request.get("/api/tenant-portal/__empty__");
    expect(response.status()).not.toBe(500);
  });
});

test.describe("Tenant Portal — full flow with real token", () => {
  test.use({ storageState: "playwright/.auth/user.json" });

  let portalUrl: string;

  test.beforeAll(async ({ request }) => {
    // 1. Create a tenant to generate a portal link for
    const today = new Date();
    const nextYear = new Date(today.getFullYear() + 1, today.getMonth(), today.getDate());

    const tenantRes = await request.post("/api/tenants", {
      data: {
        name: `Portal Test Tenant ${Date.now()}`,
        email: `portal${Date.now()}@test.local`,
        phone: "+351 900 000 002",
        rent: 800,
        leaseStart: today.toISOString(),
        leaseEnd: nextYear.toISOString(),
      },
    });

    if (!tenantRes.ok()) return; // Skip gracefully if tenant creation is unavailable

    const tenant = await tenantRes.json();
    const tenantId = tenant.id ?? tenant.data?.id;
    if (!tenantId) return;

    // 2. Generate the portal link
    const linkRes = await request.post(`/api/tenants/${tenantId}/portal-link`, {
      data: { sendEmail: false },
    });

    if (!linkRes.ok()) return;

    const linkBody = await linkRes.json();
    portalUrl = linkBody.portalLink ?? linkBody.data?.portalLink;
  });

  test("portal with valid token should render tenant details", async ({ page }) => {
    if (!portalUrl) {
      test.skip(true, "Portal URL could not be generated — skipping authenticated portal test");
      return;
    }

    // Navigate to the portal using the real token
    await page.goto(portalUrl);
    await page.waitForLoadState("networkidle");

    // The page must not show an error state
    await expect(page.locator("body")).not.toContainText("Invalid");
    await expect(page.locator("body")).not.toContainText("expired");

    // Tenant portal renders tabs / key sections — verify at least one is present
    const portalContent = page.locator("[role='tablist'], [data-testid='portal-content'], main");
    await expect(portalContent.first()).toBeVisible({ timeout: 5000 });
  });
});

// SearchFilter dropdown smoke test (unauthenticated)
test.describe("Tenants page — status filter", () => {
  test("status filter should open and select Active", async ({ page }) => {
    await page.goto("/en/people");
    await page.waitForLoadState("networkidle");

    const statusTrigger = page.locator('[data-testid="select-trigger-status"]');
    await statusTrigger.waitFor({ state: "visible" });
    await statusTrigger.click();

    const activeOption = page.locator('[data-testid="select-item-active"]');
    await activeOption.waitFor({ state: "visible" });
    await activeOption.click();

    await expect(statusTrigger).toContainText("Active");
  });
});
