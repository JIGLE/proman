import { describe, it, expect, vi, afterEach } from 'vitest'

vi.resetModules()

describe('EmailService', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('isReady returns false when SENDGRID_API_KEY not set', async () => {
    delete process.env.SENDGRID_API_KEY
    const mod = await import('@/lib/services/email/email-service')
    const { EmailService } = mod as { EmailService: typeof import('@/lib/services/email/email-service').EmailService }
    // create a new instance directly to avoid singleton reuse
    const inst = EmailService.getInstance()
    expect(inst.isReady()).toBe(false)
  })

  it('sendTemplatedEmail succeeds when sendgrid send is mocked and logs are attempted', async () => {
    // Ensure fresh modules and then mock sendgrid
    vi.resetModules()
    const mockSend = vi.fn().mockResolvedValue([{ headers: { 'x-message-id': 'message-123' } }])
    vi.mock('@sendgrid/mail', () => ({
      setApiKey: vi.fn(),
      send: mockSend,
    }))
    process.env.SENDGRID_API_KEY = 'fake-key'
    const mod = await import('@/lib/services/email/email-service')
    const { emailService } = mod as { emailService: import('@/lib/services/email/email-service').EmailService }

    // Inject mock client directly to avoid external module resolution issues in the test runner
    ;(emailService as any).sendGridClient = { setApiKey: vi.fn(), send: mockSend }
    ;(emailService as any).isInitialized = true

    const res = await emailService.sendTemplatedEmail('rent_reminder', 'test@example.com', { tenantName: 'John', propertyAddress: '1 Main St', rentAmount: '100' }, 'user-1')
    expect(res.success).toBe(true)
    expect(res.messageId).toBe('message-123')
    expect(mockSend).toHaveBeenCalled()
  })

  it('handles single response object from send and extracts message id', async () => {
    vi.resetModules()
    const mockSend = vi.fn().mockResolvedValue({ headers: { 'x-message-id': 'single-456' } })
    vi.mock('@sendgrid/mail', () => ({
      setApiKey: vi.fn(),
      send: mockSend,
    }))
    process.env.SENDGRID_API_KEY = 'fake-key'
    const mod = await import('@/lib/services/email/email-service')
    const { emailService } = mod as { emailService: import('@/lib/services/email/email-service').EmailService }

    ;(emailService as any).sendGridClient = { setApiKey: vi.fn(), send: mockSend }
    ;(emailService as any).isInitialized = true

    const res = await emailService.sendTemplatedEmail('maintenance_complete', 'test2@example.com', { tenantName: 'Sam', propertyAddress: '2 Elm St', workDescription: 'Fix sink', completionDate: '2025-12-01' }, 'user-2')
    expect(res.success).toBe(true)
    expect(res.messageId).toBe('single-456')
    expect(mockSend).toHaveBeenCalled()
  })
})