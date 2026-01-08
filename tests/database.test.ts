import { describe, it, expect } from 'vitest'

import { getPrismaClient } from '../lib/database'

describe('getPrismaClient', () => {
  it('returns a proxy with $connect when DATABASE_URL is not set', () => {
    delete process.env.DATABASE_URL
    const client = getPrismaClient() as unknown as { $connect: () => Promise<void> }
    expect(typeof client.$connect).toBe('function')
    // should resolve without throwing
    return expect(client.$connect()).resolves.toBeUndefined()
  })
})