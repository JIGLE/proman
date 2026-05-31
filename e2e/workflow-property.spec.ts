import { test, expect } from "@playwright/test";

test.use({ storageState: "playwright/.auth/user.json" });

test.describe("Critical Path: Property management", () => {
  test("should create a new property and show it in the list", async ({ page }) => {
    const timestamp = Date.now();
    const propertyName = `Test Property ${timestamp}`;

    // Attach listeners before any navigation
    page.on("console", (msg) => {
      if (msg.type() === "error") console.error("Browser error:", msg.text());
    });

    await page.goto("/en/portfolio?view=properties");
    await expect(page).toHaveURL(/\/portfolio/);

    // Open dialog
    await page.getByRole("button", { name: "Add Property" }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();

    // Fill form
    await page.getByLabel("Property Name").fill(propertyName);

    await page
      .locator("div.space-y-2")
      .filter({ hasText: "Property Type" })
      .getByRole("combobox")
      .click();
    await page.getByRole("option", { name: "Apartment" }).click();

    await page.getByLabel("Full Address Search").fill("123 Test St");
    await page.getByLabel("City").fill("Lisbon");
    await page.getByLabel("Postal Code").fill("1000-001");
    await page.getByLabel("Monthly Rent").fill("1500");
    await page.getByLabel("Bedrooms").fill("2");
    await page.getByLabel("Bathrooms").fill("1");

    // Submit and wait for the API call to complete
    const responsePromise = page.waitForResponse(
      (res) => res.url().includes("/api/properties") && res.request().method() === "POST",
    );
    await dialog.getByRole("button", { name: "Add Property" }).click();

    const response = await responsePromise;
    expect(response.status()).toBe(201);

    // Dialog closes on success; new property name appears in the list
    await expect(dialog).toBeHidden({ timeout: 5000 });
    await expect(page.getByText(propertyName, { exact: false })).toBeVisible();
  });

  test("should show validation errors when required fields are missing", async ({ page }) => {
    await page.goto("/en/portfolio?view=properties");
    await page.getByRole("button", { name: "Add Property" }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();

    // Submit without filling anything
    await dialog.getByRole("button", { name: "Add Property" }).click();

    // Form should stay open with validation feedback
    await expect(dialog).toBeVisible();
    // At least one validation message should be present
    const errors = dialog.locator("[role='alert'], .text-destructive, .text-red-400");
    await expect(errors.first()).toBeVisible({ timeout: 3000 });
  });

  test("should cancel the dialog without creating a property", async ({ page }) => {
    await page.goto("/en/portfolio?view=properties");
    await page.getByRole("button", { name: "Add Property" }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();

    await page.getByLabel("Property Name").fill("Should not be created");

    const cancelButton = dialog.getByRole("button", { name: /cancel/i });
    await cancelButton.click();

    await expect(dialog).toBeHidden({ timeout: 3000 });
  });
});
