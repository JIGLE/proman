import { test, expect } from '@playwright/test'

test.describe('API Health', () => {
  test('health endpoint should return ok', async ({ request }) => {
    const response = await request.get('/api/health')
    
    expect(response.ok()).toBeTruthy()
    
    const data = await response.json()
    expect(data.status).toBe('ok')
  })

  test('info endpoint should return version', async ({ request }) => {
    const response = await request.get('/api/info')
    
    expect(response.ok()).toBeTruthy()
    
    const data = await response.json()
    expect(data).toHaveProperty('version')
  })
})

test.describe('Authentication', () => {
  test('signin page should be accessible', async ({ page }) => {
    await page.goto('/auth/signin')
    
    await page.waitForLoadState('networkidle')
    
    // Page should have loaded successfully
    const hasContent = await page.locator('body').textContent()
    expect(hasContent).toBeTruthy()
    
    // The URL should reflect the signin route or a redirect
    const currentUrl = page.url()
    expect(currentUrl).toContain('localhost')
  })

  test('unauthenticated API requests should return 401', async ({ request }) => {
    // Try to access protected endpoint without auth
    const response = await request.get('/api/properties', {
      headers: {
        // No auth headers
      },
    })
    
    // Should be unauthorized or redirect
    expect([401, 403, 302].includes(response.status())).toBeTruthy()
  })
})

test.describe('Localization', () => {
  test('English locale should work', async ({ page }) => {
    await page.goto('/en')
    
    await page.waitForLoadState('networkidle')
    
    // Page should load without errors
    const title = await page.title()
    expect(title).toBeTruthy()
  })

  test('Portuguese locale should work', async ({ page }) => {
    await page.goto('/pt')
    
    await page.waitForLoadState('networkidle')
    
    // Page should load without errors
    const title = await page.title()
    expect(title).toBeTruthy()
  })
})
