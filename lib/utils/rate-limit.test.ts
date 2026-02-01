import { describe, it, expect, beforeEach } from 'vitest'

import { getClientIP, isRateLimited, withRateLimit, _resetRateLimitMap, _setRateLimitForIP } from '../lib/rate-limit'

describe('rate-limit utilities', () => {
  beforeEach(() => {
    _resetRateLimitMap()
  })

  it('getClientIP prefers x-forwarded-for', () => {
    const req = new Request('https://example.com', { headers: { 'x-forwarded-for': '1.2.3.4, 5.6.7.8' } })
    expect(getClientIP(req)).toBe('1.2.3.4')
  })

  it('isRateLimited returns true when threshold reached', () => {
    const ip = '10.0.0.1'
    // Set count equal to threshold (100) to simulate limit reached
    _setRateLimitForIP(ip, 100)
    expect(isRateLimited(ip)).toBe(true)
  })

  it('withRateLimit returns 429 when IP is limited', async () => {
    const ip = '10.0.0.2'
    _setRateLimitForIP(ip, 100)

    const handler = async (_req: Request) => new Response(null, { status: 200 })
    const wrapped = withRateLimit(handler)

    const req = new Request('https://example.com', { headers: { 'x-forwarded-for': ip } })
    const res = await wrapped(req)
    expect(res.status).toBe(429)
  })
})