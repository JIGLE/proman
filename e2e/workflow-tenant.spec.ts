import { test, expect } from '@playwright/test'

test.use({ storageState: 'playwright/.auth/user.json' })

// TODO: Fix tenant creation workflow - requires property selection implementation
test.skip('Critical Path: Create new tenant', async ({ page }) => {
  const timestamp = Date.now()
  
  // 1. Navigate to tenants page directly
  await page.goto('/en/tenants')
  await expect(page).toHaveURL(/.*\/tenants/)
  
  // 2. Open Add Tenant Dialog
  await page.getByRole('button', { name: 'Add Tenant' }).first().click()
  await expect(page.getByRole('dialog')).toBeVisible()
  
  // Wait for dialog to be ready
  await page.waitForTimeout(500)
  
  // 3. Fill Form (minimum required fields only)
  const tenantName = `Test Tenant ${timestamp}`
  const tenantEmail = `tenant${timestamp}@test.local`
  
  // Fill required fields
  await page.getByLabel('Full Name').fill(tenantName)
  await page.getByLabel('Email').fill(tenantEmail)
  await page.getByLabel('Phone').fill('+351 912 345 678')
  
  // Note: Skip property selection - tenant dialog may allow creation without property
  // The actual requirement can be validated once we see the validation behavior
  
  // 4. Submit
  const dialog = page.getByRole('dialog')
  await dialog.getByRole('button', { name: /add tenant|create/i }).click()
  
  // 5. Verify creation
  //  If dialog closes, tenant was created successfully
  //  If dialog stays open, there may be validation errors to check
  const dialogClosed = await dialog.isHidden().catch(() => false)
  
  if (dialogClosed) {
    // Success - verify tenant appears in list
    await expect(page.locator(`text=${tenantEmail}`)).toBeVisible({ timeout: 5000 })
    console.log('✓ Tenant created successfully:', tenantName)
  } else {
    // Dialog still open - take screenshot for debugging
    await page.screenshot({ path: 'test-results/tenant-creation-blocked.png' })
    const errorText = await page.locator('.text-red-400, [role="alert"]').allTextContents()
    console.log('Tenant creation blocked. Errors:', errorText)
    // Fail test if property is truly required
    throw new Error(`Tenant creation requires additional fields: ${errorText.join(', ')}`)
  }
})
