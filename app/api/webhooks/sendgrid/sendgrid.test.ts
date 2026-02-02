import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// Mock dependencies
vi.mock('@/lib/services/database/database', () => ({
  getPrismaClient: vi.fn(() => ({
    emailLog: {
      upsert: vi.fn().mockResolvedValue({ id: 'log-123' }),
    },
  })),
}))

// Import after mocks
import { POST } from '@/app/api/webhooks/sendgrid/route'

describe('SendGrid Webhook Handler', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Clear SENDGRID_WEBHOOK_PUBLIC_KEY to skip signature validation
    delete process.env.SENDGRID_WEBHOOK_PUBLIC_KEY
  })

  it('should process valid delivery events', async () => {
    const events = [
      {
        email: 'test@example.com',
        event: 'delivered',
        timestamp: 1704067200,
        sg_message_id: 'msg-123',
      },
    ]

    const request = new NextRequest('http://localhost/api/webhooks/sendgrid', {
      method: 'POST',
      body: JSON.stringify(events),
      headers: {
        'Content-Type': 'application/json',
      },
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.ok).toBe(true)
    expect(data.processed).toBe(1)
  })

  it('should process bounce events', async () => {
    const events = [
      {
        email: 'bounced@example.com',
        event: 'bounce',
        timestamp: 1704067200,
        sg_message_id: 'msg-456',
        reason: 'Invalid email address',
      },
    ]

    const request = new NextRequest('http://localhost/api/webhooks/sendgrid', {
      method: 'POST',
      body: JSON.stringify(events),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.ok).toBe(true)
  })

  it('should process multiple events in batch', async () => {
    const events = [
      { email: 'a@test.com', event: 'delivered', timestamp: 1704067200, sg_message_id: 'msg-1' },
      { email: 'b@test.com', event: 'open', timestamp: 1704067201, sg_message_id: 'msg-2' },
      { email: 'c@test.com', event: 'click', timestamp: 1704067202, sg_message_id: 'msg-3' },
    ]

    const request = new NextRequest('http://localhost/api/webhooks/sendgrid', {
      method: 'POST',
      body: JSON.stringify(events),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.processed).toBe(3)
  })

  it('should skip events without required fields', async () => {
    const events = [
      { email: 'test@example.com' }, // Missing event and timestamp
    ]

    const request = new NextRequest('http://localhost/api/webhooks/sendgrid', {
      method: 'POST',
      body: JSON.stringify(events),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    // Event is skipped because it's missing required fields
    expect(data.processed).toBe(0)
  })

  it('should reject invalid JSON', async () => {
    const request = new NextRequest('http://localhost/api/webhooks/sendgrid', {
      method: 'POST',
      body: 'invalid json {',
    })

    const response = await POST(request)
    
    expect(response.status).toBe(400)
    const data = await response.json()
    expect(data.error).toBe('invalid json')
  })

  it('should handle single event (not array)', async () => {
    const event = {
      email: 'single@example.com',
      event: 'processed',
      timestamp: 1704067200,
      sg_message_id: 'msg-single',
    }

    const request = new NextRequest('http://localhost/api/webhooks/sendgrid', {
      method: 'POST',
      body: JSON.stringify(event),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.processed).toBe(1)
  })

  describe('with signature verification', () => {
    it('should reject missing signature headers', async () => {
      process.env.SENDGRID_WEBHOOK_PUBLIC_KEY = 'test-public-key'

      const request = new NextRequest('http://localhost/api/webhooks/sendgrid', {
        method: 'POST',
        body: JSON.stringify([]),
      })

      const response = await POST(request)
      
      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toBe('invalid headers')
    })
  })
})
