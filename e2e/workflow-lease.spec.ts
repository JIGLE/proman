import { test, expect } from '@playwright/test'

test.use({ storageState: 'playwright/.auth/user.json' })

test('Critical Path: Create new lease', async ({ page }) => {
  // 1. Navigate to leases page
  await page.goto('/en/leases')
  
  // Verify we are on the leases page
  await expect(page).toHaveURL(/.*\/leases/)
  
  // 2. Open Create Lease Dialog
  await page.getByRole('button', { name: /create lease|add lease/i }).first().click()
  
  // Verify dialog is open
  await expect(page.getByRole('dialog')).toBeVisible()
  
  // 3. Fill Form
  // Note: This requires existing property and tenant
  // In a real scenario, we might seed data or create them first
  // For now, we'll try to select the first available options
  
  const dialog = page.getByRole('dialog')
  
  // Select Property (dropdown/combobox)
  const propertySelect = dialog.locator('div.space-y-2').filter({ hasText: 'Property' }).getByRole('combobox')
  if (await propertySelect.isVisible().catch(() => false)) {
    await propertySelect.click()
    // Select first available property
    const firstProperty = page.getByRole('option').first()
    if (await firstProperty.isVisible().catch(() => false)) {
      await firstProperty.click()
    }
  }
  
  // Select Tenant (dropdown/combobox)
  const tenantSelect = dialog.locator('div.space-y-2').filter({ hasText: 'Tenant' }).getByRole('combobox')
  if (await tenantSelect.isVisible().catch(() => false)) {
    await tenantSelect.click()
    // Select first available tenant
    const firstTenant = page.getByRole('option').first()
    if (await firstTenant.isVisible().catch(() => false)) {
      await firstTenant.click()
    }
  }
  
  // Set lease dates
  const today = new Date()
  const startDate = today.toISOString().split('T')[0]
  const endDate = new Date(today.getFullYear() + 1, today.getMonth(), today.getDate())
    .toISOString().split('T')[0]
  
  await dialog.getByLabel('Start Date').fill(startDate)
  await dialog.getByLabel('End Date').fill(endDate)
  
  // Set monthly rent
  await dialog.getByLabel(/monthly rent|rent amount/i).fill('1200')
  
  // Security deposit (if field exists)
  const depositField = dialog.getByLabel(/security deposit|deposit/i)
  if (await depositField.isVisible().catch(() => false)) {
    await depositField.fill('2400')
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
    if (response.url().includes('/api/leases')) {
      console.log('API Response:', response.status(), response.statusText())
    }
  })
  
  await dialog.getByRole('button', { name: /create lease|add lease/i }).click()
  
  // 5. Verify creation
  await page.waitForTimeout(2000)
  
  // Check for validation errors
  const errorElements = page.locator('.text-red-400')
  const errorCount = await errorElements.count()
  if (errorCount > 0) {
    const errors = await errorElements.allTextContents()
    console.log('Validation errors found:', errors)
    await page.screenshot({ path: 'test-results/lease-validation-error.png' })
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
    await page.screenshot({ path: 'test-results/lease-dialog-still-open.png' })
    const dialogContent = await dialog.textContent()
    console.log('Dialog still open with content:', dialogContent)
    throw new Error('Dialog did not close - lease creation may have failed')
  }

  // Verify lease appears in list
  await expect(page.locator('text=/active|pending/i').first()).toBeVisible({ timeout: 5000 })
  
  console.log('✓ Lease created successfully')
})
