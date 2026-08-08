import { test, expect } from "@playwright/test";

test.use({ storageState: "playwright/.auth/user.json" });

test("Critical Path: Record new payment", async ({ page }) => {
  // 1. Navigate to financials page with receipts tab active
  // (there is no /financials/receipts sub-route; the receipts view is a tab
  // within FinancialsContainer, default tab is "overview")
  await page.goto("/en/financials?view=receipts");

  // Verify we are on the financials page
  await expect(page).toHaveURL(/.*\/financials/);

  // 2. Open Record Payment Dialog
  await page
    .getByRole("button", { name: /record payment|add receipt|new payment/i })
    .first()
    .click();

  // Verify dialog is open
  await expect(page.getByRole("dialog")).toBeVisible();

  // 3. Fill Form
  const dialog = page.getByRole("dialog");

  // Tenant and Property are both REQUIRED — the form rejects with "Property is required"
  // otherwise. They used to sit behind `if (await x.isVisible().catch(() => false))`, so when a
  // selector drifted the test skipped the field and failed later with a confusing server error
  // instead of here. Select them outright.
  const selectFirstOption = async (fieldLabel: RegExp) => {
    const combo = dialog
      .locator("div.space-y-2")
      .filter({ hasText: fieldLabel })
      .getByRole("combobox")
      .first();
    await expect(combo).toBeVisible();
    await combo.click();
    const firstOption = page.getByRole("option").first();
    await expect(firstOption).toBeVisible();
    await firstOption.click();
  };

  await selectFirstOption(/tenant/i);
  await selectFirstOption(/property/i);

  // Set payment amount
  await dialog.getByLabel(/amount|payment amount/i).fill("1200");

  // Set payment date (today)
  const today = new Date().toISOString().split("T")[0];
  const dateField = dialog.getByLabel(/date|payment date/i);
  if (await dateField.isVisible().catch(() => false)) {
    await dateField.fill(today);
  }

  // Payment method (if exists)
  const methodSelect = dialog
    .locator("div.space-y-2")
    .filter({ hasText: /payment method|method/i })
    .getByRole("combobox");
  if (await methodSelect.isVisible().catch(() => false)) {
    await methodSelect.click();
    // Select first method (e.g., Bank Transfer, Cash, etc.)
    const firstMethod = page.getByRole("option").first();
    if (await firstMethod.isVisible().catch(() => false)) {
      await firstMethod.click();
    }
  }

  // Reference/Notes (optional)
  const referenceField = dialog.getByLabel(/reference|notes|description/i);
  if (await referenceField.isVisible().catch(() => false)) {
    await referenceField.fill(`Test payment ${Date.now()}`);
  }

  // 4. Submit
  // Listen for console errors
  page.on("console", (msg) => {
    if (msg.type() === "error") {
      console.log("Browser console error:", msg.text());
    }
  });

  // Listen for API responses
  page.on("response", (response) => {
    if (response.url().includes("/api/payments") || response.url().includes("/api/receipts")) {
      console.log("API Response:", response.status(), response.statusText());
    }
  });

  // The submit button is `financial.receipts.submitCreate` = "Create Receipt"
  // (components/features/financial/receipts-view.tsx:410), which /record|save|add/i never
  // matched — so this click waited out the timeout on a dialog that was open and fine.
  await dialog.getByRole("button", { name: /create receipt|record|save/i }).click();

  // 5. Verify creation
  await page.waitForTimeout(2000);

  // Check for validation errors
  const errorElements = page.locator(".text-red-400");
  const errorCount = await errorElements.count();
  if (errorCount > 0) {
    const errors = await errorElements.allTextContents();
    console.log("Validation errors found:", errors);
    await page.screenshot({
      path: "test-results/payment-validation-error.png",
    });
    throw new Error(`Validation failed: ${errors.join(", ")}`);
  }

  // Check for error toast
  const errorToast = page.locator("text=/error|failed/i").first();
  if (await errorToast.isVisible()) {
    const errorText = await errorToast.textContent();
    console.log("Toast error:", errorText);
    throw new Error(`Server error: ${errorText}`);
  }

  // Dialog should close if successful
  const isDialogHidden = await dialog.isHidden().catch(() => false);
  if (!isDialogHidden) {
    await page.screenshot({
      path: "test-results/payment-dialog-still-open.png",
    });
    const dialogContent = await dialog.textContent();
    console.log("Dialog still open with content:", dialogContent);
    throw new Error("Dialog did not close - payment recording may have failed");
  }

  // Verify payment appears in list (look for amount or success message)
  const successIndicator = page.locator("text=/1200|payment recorded|success/i").first();
  await expect(successIndicator).toBeVisible({ timeout: 5000 });

  console.log("✓ Payment recorded successfully");
});
