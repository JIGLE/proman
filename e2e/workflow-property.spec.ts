import { test, expect } from '@playwright/test'

test.use({ storageState: 'playwright/.auth/user.json' })

test('Critical Path: Create new property', async ({ page }) => {
  // 1. Navigate to properties page
  // We use /en to ensure consistent locale, otherwise it might redirect
  await page.goto('/en/properties')
  
  // Verify we are on the properties page
  await expect(page).toHaveURL(/.*\/properties/)
  
  // 2. Open Add Property Dialog
  // The button has "Add Property" text and a Plus icon
  await page.getByRole('button', { name: 'Add Property' }).click()
  
  // Verify dialog is open
  await expect(page.getByRole('dialog')).toBeVisible()
  
  // 3. Fill Form
  const timestamp = Date.now()
  const propertyName = `Test Property ${timestamp}`
  
  // Fill text inputs
  await page.getByLabel('Property Name').fill(propertyName)
  
  // Property Type (Select)
  // Radix UI Select often separates Label and Trigger, so we use a text filter
  await page.locator('div.space-y-2').filter({ hasText: 'Property Type' }).getByRole('combobox').click()
  await page.getByRole('option', { name: 'Apartment' }).click()
  
  // Address Section
  await page.getByLabel('Full Address Search').fill('123 Test St')
  await page.getByLabel('City').fill('Lisbon')
  
  // Postal Code (id="zipCode")
  await page.getByLabel('Postal Code').fill('1000-001')
  
  // Country defaults to Portugal
  
  // Rent
  await page.getByLabel('Monthly Rent').fill('1500')
  
  // Bedrooms/Bathrooms have defaults, but let's set them
  await page.getByLabel('Bedrooms').fill('2')
  await page.getByLabel('Bathrooms').fill('1')
  
  // 4. Submit
  // The submit button is inside the dialog
  const dialog = page.getByRole('dialog')
  
  // Listen for console messages to capture any errors
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log('Browser console error:', msg.text())
    }
  })
  
  // Listen for API responses
  page.on('response', response => {
    if (response.url().includes('/api/properties')) {
      console.log('API Response:', response.status(), response.statusText())
    }
  })
  
  await dialog.getByRole('button', { name: 'Add Property' }).click()
  
  // 5. Verify creation
  // Wait for the submission to complete (check for network idle or specific state)
  await page.waitForTimeout(2000) // Give time for async operations
  
  // Check for validation errors first
  const errorElements = page.locator('.text-red-400')
  const errorCount = await errorElements.count()
  if (errorCount > 0) {
    const errors = await errorElements.allTextContents()
    console.log('Validation errors found:', errors)
    
    // Take a screenshot for debugging
    await page.screenshot({ path: 'test-results/validation-error.png' })
    throw new Error(`Validation failed: ${errors.join(', ')}`)
  }

  // Check for server errors via toast or console
  const errorToast = page.locator('text=/error|failed/i').first()
  if (await errorToast.isVisible()) {
    const errorText = await errorToast.textContent()
    console.log('Toast error:', errorText)
    throw new Error(`Server error: ${errorText}`)
  }

  // Dialog should close if successful
  const isDialogHidden = await dialog.isHidden().catch(() => false)
  if (!isDialogHidden) {
    // Take screenshot of still-open dialog
    await page.screenshot({ path: 'test-results/dialog-still-open.png' })
    
    // Check what's in the dialog
    const dialogContent = await dialog.textContent()
    console.log('Dialog still open with content:', dialogContent)
  }
  
  await expect(dialog).toBeHidden({ timeout: 5000 })
  
  // Toast should appear (optional check)
  // await expect(page.getByText('Property added successfully')).toBeVisible()
  
  // New property should appear in the list
  // Using a less strict locator in case of layout changes, checking for text presence
  await expect(page.getByText(propertyName, { exact: false })).toBeVisible()
})
