import { describe, it, expect, vi } from 'vitest'

vi.resetModules()

describe('EmailService', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('isReady returns false when SENDGRID_API_KEY not set', async () => {
    delete process.env.SENDGRID_API_KEY
    const mod = await import('../lib/email-service')
    const { EmailService } = mod as { EmailService: typeof import('../lib/email-service').EmailService }
    // create a new instance directly to avoid singleton reuse
    const inst = EmailService.getInstance()
    expect(inst.isReady()).toBe(false)
  })

  it('sendTemplatedEmail succeeds when sendgrid send is mocked and logs are attempted', async () => {
    // Mock sendgrid
    const mockSend = vi.fn().mockResolvedValue([{ headers: { 'x-message-id': 'message-123' } }])
    vi.doMock('@sendgrid/mail', () => ({
      setApiKey: vi.fn(),
      send: mockSend,
    }))

    // Ensure we import module after mocking
    vi.resetModules()
    process.env.SENDGRID_API_KEY = 'fake-key'
    const mod = await import('../lib/email-service')
    const { emailService } = mod as { emailService: import('../lib/email-service').EmailService }

    const res = await emailService.sendTemplatedEmail('rent_reminder', 'test@example.com', { tenantName: 'John', propertyAddress: '1 Main St', rentAmount: '100' }, 'user-1')
    expect(res.success).toBe(true)
    expect(res.messageId).toBe('message-123')
    expect(mockSend).toHaveBeenCalled()
  })
})