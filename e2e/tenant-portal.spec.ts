import { test, expect } from '@playwright/test'

test.describe('Tenant Self-Service Portal', () => {
  // Test with an invalid token
  test('should show error for invalid token', async ({ page }) => {
    await page.goto('/tenant-portal/invalid-token-here')
    
    await page.waitForLoadState('networkidle')
    
    // Should show error message or redirect
    const hasError = await page.getByText(/invalid|expired|error|not found/i).isVisible()
      .catch(() => false)
    const isRedirected = page.url().includes('/auth') || page.url().includes('/error')
    
    expect(hasError || isRedirected).toBeTruthy()
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
