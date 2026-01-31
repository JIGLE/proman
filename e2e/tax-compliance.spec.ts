import { test, expect } from '@playwright/test'

test.describe('SAF-T PT Tax Export API', () => {
  test('should require authentication for SAF-T export', async ({ request }) => {
    const response = await request.post('/api/tax/saft-pt', {
      data: {
        startDate: '2024-01-01',
        endDate: '2024-12-31',
        companyNIF: '123456789',
        companyName: 'Test Company',
      },
    })
    
    // Should require authentication
    expect([401, 403, 302].includes(response.status())).toBeTruthy()
  })

  test('should require authentication for SAF-T download', async ({ request }) => {
    const response = await request.get('/api/tax/saft-pt/download?startDate=2024-01-01&endDate=2024-12-31')
    
    // Should require authentication
    expect([401, 403, 302].includes(response.status())).toBeTruthy()
  })

  test('GET info endpoint should return SAF-T information', async ({ request }) => {
    const response = await request.get('/api/tax/saft-pt')
    
    // Info endpoint might be public or require auth
    if (response.ok()) {
      const data = await response.json()
      expect(data).toHaveProperty('version')
      expect(data.version).toBe('1.04_01')
      expect(data).toHaveProperty('format')
      expect(data.format).toBe('XML')
    } else {
      // Auth required is also acceptable
      expect([401, 403].includes(response.status())).toBeTruthy()
    }
  })
})

test.describe('Tax Compliance', () => {
  test('should have tax-related endpoints configured', async ({ request }) => {
    // Test that the tax API routes are configured and don't return 404
    const response = await request.get('/api/tax/saft-pt')
    
    // Should not be 404 - the route exists
    expect(response.status() !== 404).toBeTruthy()
  })
})
