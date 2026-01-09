import { vi } from 'vitest'
import type { Session } from 'next-auth'

export async function mockGetServerSession(value: Session | null): Promise<void> {
  const mod = (await import('next-auth')) as unknown as { getServerSession: (...args: unknown[]) => Promise<Session | null> }
  const modNext = (await import('next-auth/next')) as unknown as { getServerSession: (...args: unknown[]) => Promise<Session | null> }
  const getServerSession = vi.mocked(mod.getServerSession)
  const getServerSessionNext = vi.mocked(modNext.getServerSession)
  getServerSession.mockReset()
  getServerSessionNext.mockReset()
  getServerSession.mockResolvedValue(value)
  getServerSessionNext.mockResolvedValue(value)
}

export async function resetGetServerSession(): Promise<void> {
  const mod = (await import('next-auth')) as unknown as { getServerSession: (...args: unknown[]) => Promise<Session | null> }
  const modNext = (await import('next-auth/next')) as unknown as { getServerSession: (...args: unknown[]) => Promise<Session | null> }
  vi.mocked(mod.getServerSession).mockReset()
  vi.mocked(modNext.getServerSession).mockReset()
}
