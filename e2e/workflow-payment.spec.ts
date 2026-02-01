import { test, expect } from '@playwright/test'

test.use({ storageState: 'playwright/.auth/user.json' })

test('Critical Path: Record new payment', async ({ page }) => {
  // 1. Navigate to financials/receipts page
  await page.goto('/en/financials/receipts')
  
  // Verify we are on the receipts page
  await expect(page).toHaveURL(/.*\/financials\/receipts/)
  
  // 2. Open Record Payment Dialog
  // Button might be "Record Payment" or "Add Receipt"
  const recordButton = page.getByRole('button', { name: /record payment|add receipt|new payment/i })
  
  // If button doesn't exist on receipts page, try main financials page
  if (!(await recordButton.isVisible().catch(() => false))) {
    await page.goto('/en/financials')
    await expect(page).toHaveURL(/.*\/financials/)
  }
  
  await page.getByRole('button', { name: /record payment|add receipt|new payment/i }).first().click()
  
  // Verify dialog is open
  await expect(page.getByRole('dialog')).toBeVisible()
  
  // 3. Fill Form
  const dialog = page.getByRole('dialog')
  
  // Select Tenant/Lease (if dropdown exists)
  const tenantSelect = dialog.locator('div.space-y-2').filter({ hasText: /tenant|lease/i }).getByRole('combobox').first()
  if (await tenantSelect.isVisible().catch(() => false)) {
    await tenantSelect.click()
    // Select first available option
    const firstOption = page.getByRole('option').first()
    if (await firstOption.isVisible().catch(() => false)) {
      await firstOption.click()
    }
  }
  
  // Set payment amount
  await dialog.getByLabel(/amount|payment amount/i).fill('1200')
  
  // Set payment date (today)
  const today = new Date().toISOString().split('T')[0]
  const dateField = dialog.getByLabel(/date|payment date/i)
  if (await dateField.isVisible().catch(() => false)) {
    await dateField.fill(today)
  }
  
  // Payment method (if exists)
  const methodSelect = dialog.locator('div.space-y-2').filter({ hasText: /payment method|method/i }).getByRole('combobox')
  if (await methodSelect.isVisible().catch(() => false)) {
    await methodSelect.click()
    // Select first method (e.g., Bank Transfer, Cash, etc.)
    const firstMethod = page.getByRole('option').first()
    if (await firstMethod.isVisible().catch(() => false)) {
      await firstMethod.click()
    }
  }
  
  // Reference/Notes (optional)
  const referenceField = dialog.getByLabel(/reference|notes|description/i)
  if (await referenceField.isVisible().catch(() => false)) {
    await referenceField.fill(`Test payment ${Date.now()}`)
  }
  
  // 4. Submit
  // Listen for console errors
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log('Browser console error:', msg.text())
    }
  })
  
  // Listen for API responses
  page.on('response', response => {
    if (response.url().includes('/api/payments') || response.url().includes('/api/receipts')) {
      console.log('API Response:', response.status(), response.statusText())
    }
  })
  
  await dialog.getByRole('button', { name: /record|save|add/i }).click()
  
  // 5. Verify creation
  await page.waitForTimeout(2000)
  
  // Check for validation errors
  const errorElements = page.locator('.text-red-400')
  const errorCount = await errorElements.count()
  if (errorCount > 0) {
    const errors = await errorElements.allTextContents()
    console.log('Validation errors found:', errors)
    await page.screenshot({ path: 'test-results/payment-validation-error.png' })
    throw new Error(`Validation failed: ${errors.join(', ')}`)
  }

  // Check for error toast
  const errorToast = page.locator('text=/error|failed/i').first()
  if (await errorToast.isVisible()) {
    const errorText = await errorToast.textContent()
    console.log('Toast error:', errorText)
    throw new Error(`Server error: ${errorText}`)
  }

  // Dialog should close if successful
  const isDialogHidden = await dialog.isHidden().catch(() => false)
  if (!isDialogHidden) {
    await page.screenshot({ path: 'test-results/payment-dialog-still-open.png' })
    const dialogContent = await dialog.textContent()
    console.log('Dialog still open with content:', dialogContent)
    throw new Error('Dialog did not close - payment recording may have failed')
  }

  // Verify payment appears in list (look for amount or success message)
  const successIndicator = page.locator('text=/1200|payment recorded|success/i').first()
  await expect(successIndicator).toBeVisible({ timeout: 5000 })
  
  console.log('✓ Payment recorded successfully')
})
