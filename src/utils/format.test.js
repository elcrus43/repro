/**
 * Unit tests for format utilities
 *
 * Note: formatDate, formatDateTime, cleanPrice are exported from matching.js
 * formatPhone, stripPhone, formatNumber are in format.js
 */

import { describe, it, expect } from 'vitest'
import { formatPhone, stripPhone, formatNumber, getEventStatusLabel, toLocalISOString, parseLocalDateTime } from '../utils/format'
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

describe('getEventStatusLabel', () => {
  it('formats deposit status labels correctly', () => {
    expect(getEventStatusLabel('deposit', 'planned')).toBe('Задаток запланирован')
    expect(getEventStatusLabel('deposit', 'completed')).toBe('Задаток передан')
    expect(getEventStatusLabel('deposit', 'failed')).toBe('Задаток расторгнут')
  })

  it('formats deal status labels correctly', () => {
    expect(getEventStatusLabel('deal', 'planned')).toBe('Сделка запланирована')
    expect(getEventStatusLabel('deal', 'completed')).toBe('Сделка прошла успешно')
    expect(getEventStatusLabel('deal', 'failed')).toBe('Сделка не состоялась')
  })

  it('formats showing status labels correctly', () => {
    expect(getEventStatusLabel('showing', 'planned')).toBe('Показ запланирован')
    expect(getEventStatusLabel('showing', 'completed')).toBe('Показ проведен')
    expect(getEventStatusLabel('showing', 'failed')).toBe('Показ не состоялся')
  })

  it('fallbacks to showing labels or raw status for unknown event types', () => {
    expect(getEventStatusLabel('unknown', 'planned')).toBe('Показ запланирован')
    expect(getEventStatusLabel('unknown', 'completed')).toBe('Показ проведен')
    expect(getEventStatusLabel('unknown', 'custom')).toBe('custom')
  })
})

describe('toLocalISOString', () => {
  it('formats dates to local YYYY-MM-DDTHH:mm format', () => {
    const d = new Date(2026, 4, 26, 20, 0, 0); // May 26, 2026 at 20:00 local time
    expect(toLocalISOString(d)).toBe('2026-05-26T20:00');
  })

  it('formats ISO string correctly to local components', () => {
    const d = new Date(2026, 4, 26, 9, 30, 0);
    const iso = d.toISOString(); // e.g. UTC representation
    expect(toLocalISOString(iso)).toBe('2026-05-26T09:30');
  })

  it('returns empty string for null or undefined', () => {
    expect(toLocalISOString(null)).toBe('');
    expect(toLocalISOString(undefined)).toBe('');
  })
})

describe('parseLocalDateTime', () => {
  it('correctly parses local datetime-local string to local Date object', () => {
    const parsed = parseLocalDateTime('2026-05-27T12:30');
    expect(parsed).toBeInstanceOf(Date);
    expect(parsed.getFullYear()).toBe(2026);
    expect(parsed.getMonth()).toBe(4); // 0-indexed May
    expect(parsed.getDate()).toBe(27);
    expect(parsed.getHours()).toBe(12);
    expect(parsed.getMinutes()).toBe(30);
  })

  it('returns null for null, undefined, or empty string', () => {
    expect(parseLocalDateTime(null)).toBeNull();
    expect(parseLocalDateTime(undefined)).toBeNull();
    expect(parseLocalDateTime('')).toBeNull();
  })

  it('falls back to default parser for partial or invalid formats', () => {
    const parsed = parseLocalDateTime('2026-05-27');
    expect(parsed).toBeInstanceOf(Date);
    expect(parsed.getFullYear()).toBe(2026);
    expect(parsed.getMonth()).toBe(4);
    expect(parsed.getDate()).toBe(27);
  })
})
