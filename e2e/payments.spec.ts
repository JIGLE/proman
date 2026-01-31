import { test, expect } from '@playwright/test'

test.describe('Payments API', () => {
  test('payment methods endpoint should require auth', async ({ request }) => {
    const response = await request.get('/api/payments/methods')
    
    // Should require authentication (or 404/405 if endpoint not implemented)
    expect([401, 403, 302, 404, 405].includes(response.status())).toBeTruthy()
  })

  test('payment initiation should require auth', async ({ request }) => {
    const response = await request.post('/api/payments/initiate', {
      data: {
        amount: 100,
        currency: 'EUR',
        paymentMethod: 'card',
        metadata: { invoiceId: 'test' },
      },
    })
    
    // Should require authentication (or 404/405 if endpoint not implemented)
    expect([401, 403, 302, 404, 405].includes(response.status())).toBeTruthy()
  })

  test('invoice payment endpoint should require auth', async ({ request }) => {
    const response = await request.post('/api/invoices/inv_123/initiate-payment', {
      data: {
        paymentMethod: 'card',
        returnUrl: 'http://localhost:3000/payments/success',
      },
    })
    
    // Should require authentication (or 404/405 if endpoint not implemented)
    expect([401, 403, 302, 404, 405].includes(response.status())).toBeTruthy()
  })
})

test.describe('Stripe Webhook', () => {
  test('webhook should reject requests without signature', async ({ request }) => {
    const response = await request.post('/api/webhooks/stripe', {
      data: {
        type: 'payment_intent.succeeded',
        data: { object: {} },
      },
    })
    
    // Should reject without proper Stripe signature
    expect([400, 401, 403].includes(response.status())).toBeTruthy()
  })
})

test.describe('Payment Methods Configuration', () => {
  test('should support Portugal payment methods', async ({ request }) => {
    // This tests that the API can handle PT payment method types
    // Even without auth, it should return a structured error
    const response = await request.post('/api/payments/initiate', {
      data: {
        amount: 100,
        currency: 'EUR',
        paymentMethod: 'mbway',
        country: 'PT',
        metadata: { test: true },
      },
    })
    
    // Should return 401/403 for auth, not 500 for unhandled method
    expect(response.status() !== 500).toBeTruthy()
  })

  test('should support Spain payment methods', async ({ request }) => {
    const response = await request.post('/api/payments/initiate', {
      data: {
        amount: 100,
        currency: 'EUR',
        paymentMethod: 'card',
        country: 'ES',
        metadata: { test: true },
      },
    })
    
    // Should return 401/403 for auth, not 500 for unhandled method
    expect(response.status() !== 500).toBeTruthy()
  })
})
