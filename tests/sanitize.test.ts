import { describe, it, expect } from 'vitest'
import { sanitizeHtml, sanitizeForDatabase, sanitizeFilename, sanitizeEmail, sanitizeNumber } from '../lib/sanitize'

describe('sanitize utilities', () => {
  it('sanitizeHtml returns empty string for non-string or empty inputs', () => {
    expect(sanitizeHtml(null as unknown)).toBe('')
    expect(sanitizeHtml(undefined as unknown)).toBe('')
    expect(sanitizeHtml('')).toBe('')
  })

  it('sanitizeHtml strips tags', () => {
    const input = '<script>alert(1)</script><b>Hello</b>'
    expect(sanitizeHtml(input)).toBe('Hello')
  })

  it('sanitizeForDatabase trims and removes dangerous chars', () => {
    const input = "  <b>Test</b> & 'danger'\n"
    const out = sanitizeForDatabase(input)
    expect(out).toBe('Test danger')
  })

  it('sanitizeFilename normalizes filenames', () => {
    expect(sanitizeFilename('my@file/../name!.txt')).toBe('my_file__name_.txt'.replace(/__+/g, '_').replace(/^_+|_+$/g, ''))
    expect(sanitizeFilename(null as unknown)).toBe('file')
  })

  it('sanitizeEmail returns null for invalid emails and lowercases valid ones', () => {
    expect(sanitizeEmail('BAD_EMAIL')).toBeNull()
    expect(sanitizeEmail(' Test@Example.COM ')).toBe('test@example.com')
  })

  it('sanitizeNumber handles non-numeric and respects min/max', () => {
    expect(sanitizeNumber('abc' as unknown, 5)).toBe(5)
    expect(sanitizeNumber('10' as unknown, 0, 0, 5)).toBe(5)
    expect(sanitizeNumber('2' as unknown, 0, 3)).toBe(3)
  })
})