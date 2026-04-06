/**
 * Unit tests for format utilities
 *
 * Note: formatDate, formatDateTime, cleanPrice are exported from matching.js
 * formatPhone, stripPhone, formatNumber are in format.js
 */

import { describe, it, expect } from 'vitest'
import { formatPhone, stripPhone, formatNumber } from '../utils/format'
import { formatDate, formatDateTime, cleanPrice, formatPrice, getLevelLabel } from '../utils/matching'

// ─── Date Formatting ────────────────────────────────────────────────────────

describe('formatDate', () => {
  it('formats a valid date as DD.MM.YYYY', () => {
    const date = new Date('2026-03-04T10:00:00Z')
    expect(formatDate(date)).toMatch(/\d{2}\.\d{2}\.\d{4}/)
  })

  it('returns "—" for null/undefined', () => {
    expect(formatDate(null)).toBe('—')
    expect(formatDate(undefined)).toBe('—')
  })

  it('formats ISO string correctly', () => {
    expect(formatDate('2026-01-15T00:00:00Z')).toMatch(/15\.01\.2026/)
  })
})

describe('formatDateTime', () => {
  it('formats a valid datetime as DD.MM.YYYY HH:MM', () => {
    const date = new Date('2026-03-04T10:30:00Z')
    expect(formatDateTime(date)).toMatch(/\d{2}\.\d{2}\.\d{4},?\s*\d{2}:\d{2}/)
  })

  it('returns "—" for null/undefined', () => {
    expect(formatDateTime(null)).toBe('—')
    expect(formatDateTime(undefined)).toBe('—')
  })
})

// ─── Price Cleaning ─────────────────────────────────────────────────────────

describe('cleanPrice', () => {
  it('extracts number from string with symbols', () => {
    expect(cleanPrice('5 000 000 ₽')).toBe(5000000)
  })

  it('extracts number from string with spaces', () => {
    expect(cleanPrice('1 234 567')).toBe(1234567)
  })

  it('handles plain number string', () => {
    expect(cleanPrice('5000000')).toBe(5000000)
  })

  it('returns null for empty/falsy input', () => {
    expect(cleanPrice('')).toBeNull()
    expect(cleanPrice(null)).toBeNull()
    expect(cleanPrice(undefined)).toBeNull()
  })

  it('handles string with only non-numeric chars', () => {
    expect(cleanPrice('₽')).toBe(0) // empty string → Number('') = 0
  })
})

// ─── Price Formatting ───────────────────────────────────────────────────────

describe('formatPrice', () => {
  it('formats millions correctly', () => {
    expect(formatPrice(10_000_000)).toContain('млн')
  })

  it('formats regular numbers with spaces', () => {
    expect(formatPrice(5000)).toContain('5 000')
  })

  it('returns "—" for null/undefined', () => {
    expect(formatPrice(null)).toBe('—')
    expect(formatPrice(undefined)).toBe('—')
  })

  it('handles zero', () => {
    expect(formatPrice(0)).toBe('—')
  })
})

// ─── Match Level Labels ─────────────────────────────────────────────────────

describe('getLevelLabel', () => {
  it('returns "Отличное" for perfect', () => {
    const { label, cls } = getLevelLabel('perfect')
    expect(label).toBe('Отличное')
    expect(cls).toBe('perfect')
  })

  it('returns "Хорошее" for good', () => {
    const { label, cls } = getLevelLabel('good')
    expect(label).toBe('Хорошее')
    expect(cls).toBe('good')
  })

  it('returns "Возможное" for possible', () => {
    const { label, cls } = getLevelLabel('possible')
    expect(label).toBe('Возможное')
    expect(cls).toBe('possible')
  })

  it('returns fallback for unknown', () => {
    const { label, cls } = getLevelLabel('unknown')
    expect(label).toBe('—')
    expect(cls).toBe('')
  })
})

// ─── Phone Formatting ───────────────────────────────────────────────────────

describe('formatPhone', () => {
  it('formats 10 digits as +7 (xxx) xxx-xx-xx', () => {
    expect(formatPhone('9991234567')).toBe('+7 (999) 123-45-67')
  })

  it('handles input with 8 prefix', () => {
    expect(formatPhone('89991234567')).toBe('+7 (999) 123-45-67')
  })

  it('handles input with 7 prefix', () => {
    expect(formatPhone('79991234567')).toBe('+7 (999) 123-45-67')
  })

  it('strips non-digit characters', () => {
    expect(formatPhone('+7 (999) 123-45-67')).toBe('+7 (999) 123-45-67')
  })

  it('returns empty for null/undefined', () => {
    expect(formatPhone(null)).toBe('')
    expect(formatPhone(undefined)).toBe('')
  })
})

describe('stripPhone', () => {
  it('strips to digits with 7 prefix', () => {
    expect(stripPhone('+7 (999) 123-45-67')).toBe('79991234567')
  })

  it('converts 8 prefix to 7', () => {
    expect(stripPhone('89991234567')).toBe('79991234567')
  })

  it('returns empty for null/undefined', () => {
    expect(stripPhone(null)).toBe('')
    expect(stripPhone(undefined)).toBe('')
  })
})

describe('formatNumber', () => {
  it('adds space as thousands separator', () => {
    expect(formatNumber(1000000)).toBe('1 000 000')
  })

  it('handles string numbers', () => {
    expect(formatNumber('5000000')).toBe('5 000 000')
  })

  it('returns "0" for null/undefined/empty', () => {
    expect(formatNumber(null)).toBe('0')
    expect(formatNumber(undefined)).toBe('0')
    expect(formatNumber('')).toBe('0')
  })

  it('returns "0" for NaN', () => {
    expect(formatNumber('abc')).toBe('0')
  })
})
