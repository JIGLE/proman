import { test, expect } from "@playwright/test";
import { settle } from "./helpers/wait";

test.describe("Tenant Self-Service Portal — invalid token handling", () => {
  test("should render an error state for an invalid token, not a 500 crash", async ({ page }) => {
    await page.goto("/tenant-portal/invalid-token-here");
    await settle(page);

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
    await settle(page);

    await expect(page.locator("body")).not.toContainText("Application error");

    // Some heading must exist — either an error heading or a portal heading. This used to be
    // `page.locator("h1, h2, [role='heading']")`, which could never match: the page does render
    // a heading, but it is `CardTitle`, an `<h3>` (components/ui/card.tsx:32), and
    // `[role='heading']` is a CSS attribute selector — it matches a literal `role=` attribute,
    // never an implicit role. `getByRole` reads the accessibility tree instead.
    await expect(page.getByRole("heading").first()).toBeVisible({ timeout: 5000 });
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

    // Both POSTs below are CSRF-guarded: the proxy wants the `csrf-token` cookie echoed back in
    // an `x-csrf-token` header. Without it they return 403, the `if (!res.ok()) return` guards
    // bailed out, `portalUrl` stayed undefined and the test skipped itself — which is why this
    // was the suite's last remaining skip, and why it looked like a data problem rather than a
    // missing header. scripts/mobile-audit.mjs mints portal links the same way.
    await request.get("/api/csrf-token");
    const cookies = await request.storageState().then((s) => s.cookies);
    const csrf = cookies.find((c) => c.name === "csrf-token")?.value;
    const csrfHeaders: Record<string, string> = csrf ? { "x-csrf-token": csrf } : {};

    const tenantRes = await request.post("/api/tenants", {
      headers: csrfHeaders,
      data: {
        name: `Portal Test Tenant ${Date.now()}`,
        email: `portal${Date.now()}@test.local`,
        phone: "+351 900 000 002",
        rent: 800,
        leaseStart: today.toISOString(),
        leaseEnd: nextYear.toISOString(),
      },
    });

    if (!tenantRes.ok()) {
      throw new Error(`Could not create the portal test tenant (${tenantRes.status()}).`);
    }

    const tenant = await tenantRes.json();
    const tenantId = tenant.id ?? tenant.data?.id;
    if (!tenantId) throw new Error("Tenant created but no id came back.");

    // 2. Generate the portal link
    const linkRes = await request.post(`/api/tenants/${tenantId}/portal-link`, {
      headers: csrfHeaders,
      data: { sendEmail: false },
    });

    if (!linkRes.ok()) {
      throw new Error(
        `Could not mint a portal link (${linkRes.status()}): ${await linkRes.text()}. ` +
          `The authenticated portal test cannot run without one.`,
      );
    }

    const linkBody = await linkRes.json();
    portalUrl = linkBody.portalLink ?? linkBody.data?.portalLink;
  });

  test("portal with valid token should render tenant details", async ({ page }) => {
    expect(portalUrl, "beforeAll should have minted a portal link").toBeTruthy();

    // Navigate to the portal using the real token
    await page.goto(portalUrl);
    await settle(page);

    // The page must not show an error state
    await expect(page.locator("body")).not.toContainText("Invalid");
    await expect(page.locator("body")).not.toContainText("expired");

    // Tenant portal renders tabs / key sections — verify at least one is present
    const portalContent = page.locator("[role='tablist'], [data-testid='portal-content'], main");
    await expect(portalContent.first()).toBeVisible({ timeout: 5000 });
  });
});

// SearchFilter dropdown smoke test. This was labelled "(unauthenticated)" and had no
// storageState, so it loaded /en/people signed out, got redirected to sign-in, and waited out
// the timeout on a filter that was never rendered. The People page requires a session.
test.describe("Tenants page — status filter", () => {
  test.use({ storageState: "playwright/.auth/user.json" });

  test("status filter should open and select Active", async ({ page }) => {
    await page.goto("/people");
    await settle(page);

    const statusTrigger = page.locator('[data-testid="select-trigger-status"]');
    await statusTrigger.waitFor({ state: "visible" });
    await statusTrigger.click();

    const activeOption = page.locator('[data-testid="select-item-active"]');
    await activeOption.waitFor({ state: "visible" });
    await activeOption.click();

    await expect(statusTrigger).toContainText("Active");
  });
});
