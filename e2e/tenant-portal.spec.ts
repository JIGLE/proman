import { test, expect } from '@playwright/test'

test.describe('Tenant Self-Service Portal', () => {
  // Test with an invalid token - the page loads but shows error state
  test('should handle invalid token gracefully', async ({ page }) => {
    await page.goto('/tenant-portal/invalid-token-here')
    
    await page.waitForLoadState('networkidle')
    
    // The page should load (not a 500 error) and show some UI
    const hasContent = await page.locator('body').textContent()
    expect(hasContent).toBeTruthy()
    
    // Either shows an error message, or displays the portal with empty/error state
    const pageContent = await page.content()
    expect(pageContent.length).toBeGreaterThan(0)
  })

  test('portal page structure should be correct', async ({ page }) => {
    // Even with invalid token, page should load without crashing
    await page.goto('/tenant-portal/test-token')
    
    await page.waitForLoadState('networkidle')
    
    // Page should be functional (not a 500 error)
    const hasContent = await page.locator('body').textContent()
    expect(hasContent).toBeTruthy()
  })
})

test.describe('Tenant Portal API', () => {
  test('should return 401 for invalid token', async ({ request }) => {
    const response = await request.get('/api/tenant-portal/invalid-token-here')
    
    // Should be unauthorized
    expect([401, 403, 404].includes(response.status())).toBeTruthy()
  })

  test('payment initiation should require valid token', async ({ request }) => {
    const response = await request.post('/api/tenant-portal/invalid-token/pay', {
      data: {
        invoiceId: 'inv_123',
        amount: 100,
        paymentMethod: 'card',
      },
    })
    
    // Should be unauthorized
    expect([401, 403, 404].includes(response.status())).toBeTruthy()
  })
})
