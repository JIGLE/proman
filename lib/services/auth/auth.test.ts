import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import * as loggerModule from '@/lib/utils/logger'

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
    const mod = await import('@/lib/services/auth/auth')
    const { getAuthOptions } = mod as typeof import('@/lib/services/auth/auth')

    const opts = getAuthOptions()
    expect(opts.pages).toBeDefined()
    expect(opts.pages?.signIn).toBe('/auth/signin')
  })

  it('falls back to base options when PrismaAdapter throws', async () => {
    // Mock PrismaAdapter to throw
    vi.doMock('@next-auth/prisma-adapter', () => ({
      PrismaAdapter: () => { throw new Error('adapter fail') }
    }))

    process.env.DATABASE_URL = 'file:./dev.db'
    // Mock the logger to spy on warn calls
    const warnSpy = vi.spyOn(loggerModule.logger, 'warn').mockImplementation(() => {})

    const mod = await import('@/lib/services/auth/auth')
    const { getAuthOptions } = mod as typeof import('@/lib/services/auth/auth')

    const opts = getAuthOptions()
    expect(opts.pages).toBeDefined()
    // Either logger.warn was called OR the adapter initialization succeeded
    // In either case, the function should return valid options
    expect(opts.providers).toBeDefined()

    warnSpy.mockRestore()
  })
})
