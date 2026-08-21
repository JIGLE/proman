import { test, expect, type Locator } from "@playwright/test";

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

  /**
   * Lease creation is a four-step wizard (Property → Tenant → Terms → Documents), not the flat
   * form these tests were written against. `MultiStepFormContainer` renders Back / Continue, and
   * only the last step shows the submit button (`submitText` = "Create Lease"). There is no
   * Cancel in the footer at all.
   *
   * The property and tenant pickers are Radix `Select`s: their triggers expose role=combobox and
   * are not associated with their `<Label>` via `htmlFor`, so `getByLabel` cannot reach them.
   */
  const openWizard = async (page: import("@playwright/test").Page) => {
    await page.goto("/leases?view=leases");
    await expect(page).toHaveURL(/\/leases/);
    await page
      .getByRole("button", { name: /add lease/i })
      .first()
      .click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();

    // The wizard persists a draft, so a previous run leaves a recovery banner reading "You have
    // an unsaved draft" — with its own **Continue** button sitting above the footer's. That made
    // the suite flaky by history: the first run had no draft and advanced, later runs clicked the
    // banner's Continue, restored the draft and never left step 0. Always start clean.
    const discardDraft = dialog.getByRole("button", { name: /^discard$/i });
    if (await discardDraft.count()) {
      await discardDraft.click();
      await expect(discardDraft).toHaveCount(0);
    }
    return dialog;
  };

  /**
   * Wait for a step to be the only one mounted.
   *
   * The wizard animates transitions with AnimatePresence, so immediately after Continue the
   * outgoing step is still in the DOM. Acting on `.first()` during that window silently targets
   * the *previous* step — which is how the tenant step ended up re-opening the property picker
   * and the run never reached Lease Terms. Gate on the step's own heading instead.
   */
  const atStep = async (dialog: Locator, title: RegExp) =>
    expect(dialog.getByText(title).first()).toBeVisible();

  const pickFirstOption = async (page: import("@playwright/test").Page, dialog: Locator) => {
    // Exactly one Select means the previous step has finished unmounting.
    await expect(dialog.getByRole("combobox")).toHaveCount(1);
    const combo = dialog.getByRole("combobox").first();
    await expect(combo).toBeVisible();
    await combo.click();
    const option = page.getByRole("option").first();
    await expect(option).toBeVisible();
    await option.click();
  };

  // `.last()`, not `.first()`: during a transition two footers are briefly mounted, and the draft
  // banner (if it ever reappears) puts its own Continue *above* the footer. The footer's is
  // always the last one in DOM order.
  const continueStep = async (dialog: Locator) =>
    dialog
      .getByRole("button", { name: /^continue$/i })
      .last()
      .click();

  test("should create a new lease and show it in the list", async ({ page }) => {
    page.on("console", (msg) => {
      if (msg.type() === "error") console.error("Browser error:", msg.text());
    });

    const dialog = await openWizard(page);

    // Step 0 — Property
    await atStep(dialog, /select property/i);
    await pickFirstOption(page, dialog);
    await continueStep(dialog);

    // Step 1 — Tenant
    await atStep(dialog, /select tenant/i);
    await pickFirstOption(page, dialog);
    await continueStep(dialog);

    // Step 2 — Terms
    await atStep(dialog, /lease terms/i);
    const today = new Date();
    const startDate = today.toISOString().split("T")[0];
    const endDate = new Date(today.getFullYear() + 1, today.getMonth(), today.getDate())
      .toISOString()
      .split("T")[0];
    await dialog.getByLabel(/start date/i).fill(startDate);
    await dialog.getByLabel(/end date/i).fill(endDate);
    await dialog.getByLabel(/monthly rent/i).fill("1200");
    await continueStep(dialog);

    // Step 3 — Documents; nothing is required here, so submit.
    const responsePromise = page.waitForResponse(
      (res) => res.url().includes("/api/leases") && res.request().method() === "POST",
    );
    await dialog.getByRole("button", { name: /create lease/i }).click();
    const response = await responsePromise;

    expect([200, 201]).toContain(response.status());
    await expect(dialog).toBeHidden({ timeout: 10000 });
  });

  test("should not advance past the first step without a property", async ({ page }) => {
    const dialog = await openWizard(page);

    // The old test clicked a submit button that only exists on the last step. Step 0 validates
    // on Continue: with no property chosen the wizard must stay put. Assert on the combobox
    // rather than `getByLabel` — the Radix trigger carries no `htmlFor` association.
    await expect(dialog.getByRole("combobox").first()).toBeVisible();
    await continueStep(dialog);

    // Still on step 0 — the Property picker is still the visible field, and Continue has not
    // become the submit button.
    await expect(dialog.getByRole("button", { name: /^continue$/i })).toBeVisible();
    await expect(dialog.getByRole("button", { name: /create lease/i })).toHaveCount(0);
  });

  test("should close the wizard without creating a lease", async ({ page }) => {
    const dialog = await openWizard(page);

    // The wizard footer has Back/Continue only — no Cancel. Close via the dialog's own control.
    await dialog.getByRole("button", { name: /close/i }).click();
    await expect(dialog).toBeHidden({ timeout: 5000 });
  });
});
