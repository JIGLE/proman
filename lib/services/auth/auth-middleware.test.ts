import { describe, it, expect, vi } from 'vitest'
import type { Session } from 'next-auth'
import { requireAuth, requireOwnership } from '../lib/auth-middleware'
import { NextRequest } from 'next/server'

vi.mock('next-auth/next', () => ({
  getServerSession: vi.fn()
}))

vi.mock('next-auth', () => ({
  getServerSession: vi.fn()
}))

import { mockGetServerSession, resetGetServerSession } from './helpers/next-auth'

describe('auth-middleware', () => {
  afterEach(async () => {
    await resetGetServerSession()
  })

  it('returns NextResponse when no session', async () => {
    await mockGetServerSession(null)

    const res = await requireAuth({} as NextRequest)
    expect(res).toHaveProperty('status', 401)
  })

  it('returns session and userId when session present', async () => {
    await mockGetServerSession({ user: { id: 'user-1' } } as Session)

    const res = await requireAuth({} as NextRequest)
    expect((res as { userId?: string }).userId).toBe('user-1')
  })

  it('requireOwnership denies access when userId mismatch', async () => {
    await mockGetServerSession({ user: { id: 'user-1' } } as Session)

    const res = await requireOwnership({} as NextRequest, 'other')
    expect(res).toHaveProperty('status', 403)
  })

  it('requireOwnership allows when userId matches', async () => {
    await mockGetServerSession({ user: { id: 'user-1' } } as Session)

    const res = await requireOwnership({} as NextRequest, 'user-1')
    expect(res).toBeUndefined()
  })
})