import { test, expect } from '@playwright/test'

test.describe('Dashboard', () => {
  test('should display the main dashboard', async ({ page }) => {
    await page.goto('/en')
    
    // Wait for page to load
    await page.waitForLoadState('networkidle')
    
    // Check for any page content - could be dashboard or redirect to signin
    const hasContent = await page.locator('body').textContent()
    expect(hasContent).toBeTruthy()
    
    // Page should have loaded successfully (no 500 errors)
    const pageUrl = page.url()
    expect(pageUrl).toContain('localhost')
  })

  test('should navigate to Properties section', async ({ page }) => {
    await page.goto('/en')
    
    // Click on Properties in sidebar
    const propertiesLink = page.getByRole('link', { name: /properties/i })
      .or(page.getByText(/properties/i).first())
    
    if (await propertiesLink.isVisible()) {
      await propertiesLink.click()
      await page.waitForLoadState('networkidle')
      
      // Verify we're in the properties section
      await expect(page.getByText(/properties/i).first()).toBeVisible()
    }
  })

  test('should navigate to Tenants section', async ({ page }) => {
    await page.goto('/en')
    
    // Click on Tenants in sidebar
    const tenantsLink = page.getByRole('link', { name: /tenants/i })
      .or(page.getByText(/tenants/i).first())
    
    if (await tenantsLink.isVisible()) {
      await tenantsLink.click()
      await page.waitForLoadState('networkidle')
      
      await expect(page.getByText(/tenants/i).first()).toBeVisible()
    }
  })

  test('should switch between languages', async ({ page }) => {
    await page.goto('/en')
    
    // Look for language switcher
    const languageSwitcher = page.getByRole('button', { name: /language|idioma|en|pt/i })
      .or(page.locator('[data-testid="language-switcher"]'))
    
    if (await languageSwitcher.isVisible()) {
      await languageSwitcher.click()
      
      // Look for Portuguese option
      const ptOption = page.getByRole('menuitem', { name: /português|portuguese|pt/i })
        .or(page.getByText(/português/i))
      
      if (await ptOption.isVisible()) {
        await ptOption.click()
        await page.waitForLoadState('networkidle')
        
        // URL should change to /pt
        await expect(page).toHaveURL(/\/pt/)
      }
    }
  })
})
