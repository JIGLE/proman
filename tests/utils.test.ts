import { describe, it, expect } from 'vitest'
import { cn } from '@/lib/utils'

describe('cn utility', () => {
  it('merges and returns class names', () => {
    const res = cn('a', 'b', { c: false }, 'a')
    expect(typeof res).toBe('string')
    expect(res).toContain('a')
    expect(res).toContain('b')
  })
})
