import { test, expect } from '@playwright/test'

test.describe('Email Endpoints', () => {
  test('email sending should require authentication', async ({ request }) => {
    const response = await request.post('/api/email/send', {
      data: {
        to: 'test@example.com',
        subject: 'Test Email',
        html: '<p>Test content</p>',
      },
    })
    
    // Should require authentication
    expect([401, 403, 302].includes(response.status())).toBeTruthy()
  })

  test('email test endpoint should require authentication', async ({ request }) => {
    const response = await request.post('/api/email/test')
    
    // Should require authentication
    expect([401, 403, 302].includes(response.status())).toBeTruthy()
  })
})

test.describe('Email Configuration', () => {
  test('webhook endpoints should be accessible', async ({ request }) => {
    // SendGrid webhook - should accept POST even without signature (returns error)
    const response = await request.post('/api/webhooks/sendgrid', {
      data: [
        {
          event: 'delivered',
          email: 'test@example.com',
          timestamp: Date.now(),
        },
      ],
    })
    
    // Should not be 404 - route exists
    expect(response.status() !== 404).toBeTruthy()
  })
})
