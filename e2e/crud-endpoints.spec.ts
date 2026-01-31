import { test, expect } from '@playwright/test'

test.describe('Invoice Management', () => {
  test('invoices list should require authentication', async ({ request }) => {
    const response = await request.get('/api/invoices')
    
    // Should require authentication
    expect([401, 403, 302].includes(response.status())).toBeTruthy()
  })

  test('invoice creation should require authentication', async ({ request }) => {
    const response = await request.post('/api/invoices', {
      data: {
        leaseId: 'lease_123',
        amount: 1000,
        dueDate: '2024-12-31',
        description: 'Monthly rent',
      },
    })
    
    // Should require authentication
    expect([401, 403, 302].includes(response.status())).toBeTruthy()
  })

  test('invoice payment initiation should require authentication', async ({ request }) => {
    const response = await request.post('/api/invoices/inv_123/initiate-payment', {
      data: {
        paymentMethod: 'card',
      },
    })
    
    // Should require authentication
    expect([401, 403, 302].includes(response.status())).toBeTruthy()
  })
})

test.describe('Lease Management', () => {
  test('leases list should require authentication', async ({ request }) => {
    const response = await request.get('/api/leases')
    
    // Should require authentication
    expect([401, 403, 302].includes(response.status())).toBeTruthy()
  })
})

test.describe('Property Management', () => {
  test('properties list should require authentication', async ({ request }) => {
    const response = await request.get('/api/properties')
    
    // Should require authentication
    expect([401, 403, 302].includes(response.status())).toBeTruthy()
  })
})

test.describe('Tenant Management', () => {
  test('tenants list should require authentication', async ({ request }) => {
    const response = await request.get('/api/tenants')
    
    // Should require authentication
    expect([401, 403, 302].includes(response.status())).toBeTruthy()
  })

  test('portal link generation should require authentication', async ({ request }) => {
    const response = await request.post('/api/tenants/tenant_123/portal-link', {
      data: {
        sendEmail: false,
      },
    })
    
    // Should require authentication
    expect([401, 403, 302].includes(response.status())).toBeTruthy()
  })
})
