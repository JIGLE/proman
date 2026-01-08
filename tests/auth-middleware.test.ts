import { describe, it, expect, vi } from 'vitest'
import { requireAuth, requireOwnership } from '../lib/auth-middleware'
import { NextRequest } from 'next/server'

vi.mock('next-auth/next', () => ({
  getServerSession: vi.fn()
}))

vi.mock('next-auth', () => ({
  getServerSession: vi.fn()
}))

describe('auth-middleware', () => {
  it('returns NextResponse when no session', async () => {
    const mod = (await import('next-auth')) as unknown as { getServerSession: (...args: unknown[]) => Promise<{ user?: { id: string } } | null> }
    const modNext = (await import('next-auth/next')) as unknown as { getServerSession: (...args: unknown[]) => Promise<{ user?: { id: string } } | null> }
    const getServerSession = vi.mocked(mod.getServerSession)
    const getServerSessionNext = vi.mocked(modNext.getServerSession)
    getServerSession.mockResolvedValue(null)
    getServerSessionNext.mockResolvedValue(null)

    const res = await requireAuth({} as NextRequest)
    expect(res).toHaveProperty('status', 401)
  })

  it('returns session and userId when session present', async () => {
    const mod = (await import('next-auth')) as unknown as { getServerSession: (...args: unknown[]) => Promise<{ user?: { id: string } } | null> }
    const modNext = (await import('next-auth/next')) as unknown as { getServerSession: (...args: unknown[]) => Promise<{ user?: { id: string } } | null> }
    const getServerSession = vi.mocked(mod.getServerSession)
    const getServerSessionNext = vi.mocked(modNext.getServerSession)
    getServerSession.mockResolvedValue({ user: { id: 'user-1' } })
    getServerSessionNext.mockResolvedValue({ user: { id: 'user-1' } })

    const res = await requireAuth({} as NextRequest)
    expect((res as { userId?: string }).userId).toBe('user-1')
  })

  it('requireOwnership denies access when userId mismatch', async () => {
    const mod = (await import('next-auth')) as unknown as { getServerSession: (...args: unknown[]) => Promise<{ user?: { id: string } } | null> }
    const modNext = (await import('next-auth/next')) as unknown as { getServerSession: (...args: unknown[]) => Promise<{ user?: { id: string } } | null> }
    const getServerSession = vi.mocked(mod.getServerSession)
    const getServerSessionNext = vi.mocked(modNext.getServerSession)
    getServerSession.mockResolvedValue({ user: { id: 'user-1' } })
    getServerSessionNext.mockResolvedValue({ user: { id: 'user-1' } })

    const res = await requireOwnership({} as NextRequest, 'other')
    expect(res).toHaveProperty('status', 403)
  })

  it('requireOwnership allows when userId matches', async () => {
    const mod = (await import('next-auth')) as unknown as { getServerSession: (...args: unknown[]) => Promise<{ user?: { id: string } } | null> }
    const modNext = (await import('next-auth/next')) as unknown as { getServerSession: (...args: unknown[]) => Promise<{ user?: { id: string } } | null> }
    const getServerSession = vi.mocked(mod.getServerSession)
    const getServerSessionNext = vi.mocked(modNext.getServerSession)
    getServerSession.mockResolvedValue({ user: { id: 'user-1' } })
    getServerSessionNext.mockResolvedValue({ user: { id: 'user-1' } })

    const res = await requireOwnership({} as NextRequest, 'user-1')
    expect(res).toBeUndefined()
  })
})