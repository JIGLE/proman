import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

vi.resetModules()

describe('auth options', () => {
  beforeEach(() => {
    vi.resetModules()
    delete process.env.DATABASE_URL
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns base options when no DATABASE_URL is set', async () => {
    const mod = await import('../lib/auth')
    const { getAuthOptions } = mod as typeof import('../lib/auth')

    const opts = getAuthOptions()
    expect(opts.pages).toBeDefined()
    expect((opts.pages as any).signIn).toBe('/auth/signin')
  })

  it('falls back to base options when PrismaAdapter throws', async () => {
    // Mock PrismaAdapter to throw
    vi.doMock('@next-auth/prisma-adapter', () => ({
      PrismaAdapter: () => { throw new Error('adapter fail') }
    }))

    process.env.DATABASE_URL = 'file:./dev.db'
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {})

    const mod = await import('../lib/auth')
    const { getAuthOptions } = mod as typeof import('../lib/auth')

    const opts = getAuthOptions()
    expect(opts.pages).toBeDefined()
    expect(spy).toHaveBeenCalled()

    spy.mockRestore()
  })
})
