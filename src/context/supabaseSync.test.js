/**
 * Unit tests for sanitizeObj in supabaseSync.js
 *
 * Tests recursive empty string → null conversion for safe Supabase inserts.
 */

import { describe, it, expect } from 'vitest'
import { sanitizeObj } from '../context/supabaseSync'

describe('sanitizeObj', () => {
  it('converts empty string to null', () => {
    expect(sanitizeObj('')).toBeNull()
  })

  it('leaves non-empty strings unchanged', () => {
    expect(sanitizeObj('hello')).toBe('hello')
  })

  it('leaves numbers unchanged', () => {
    expect(sanitizeObj(42)).toBe(42)
    expect(sanitizeObj(0)).toBe(0)
  })

  it('leaves booleans unchanged', () => {
    expect(sanitizeObj(true)).toBe(true)
    expect(sanitizeObj(false)).toBe(false)
  })

  it('leaves null unchanged', () => {
    expect(sanitizeObj(null)).toBeNull()
  })

  it('leaves undefined unchanged', () => {
    expect(sanitizeObj(undefined)).toBeUndefined()
  })

  it('converts empty strings in object values to null', () => {
    const input = { name: 'Test', phone: '', notes: '' }
    const result = sanitizeObj(input)
    expect(result.name).toBe('Test')
    expect(result.phone).toBeNull()
    expect(result.notes).toBeNull()
  })

  it('recursively sanitizes nested objects', () => {
    const input = {
      client: {
        name: 'Alice',
        phone: '',
        address: {
          city: 'Киров',
          street: '',
        },
      },
    }
    const result = sanitizeObj(input)
    expect(result.client.phone).toBeNull()
    expect(result.client.address.city).toBe('Киров')
    expect(result.client.address.street).toBeNull()
  })

  it('sanitizes arrays', () => {
    const input = { contacts: ['', 'phone@example.com', ''] }
    const result = sanitizeObj(input)
    expect(result.contacts).toEqual([null, 'phone@example.com', null])
  })

  it('handles mixed nested structures', () => {
    const input = {
      name: 'Test',
      empty: '',
      nested: {
        a: '',
        b: 123,
        c: {
          d: '',
          e: true,
        },
      },
      arr: [{ x: '' }, { y: 'valid' }],
    }
    const result = sanitizeObj(input)
    expect(result.empty).toBeNull()
    expect(result.nested.a).toBeNull()
    expect(result.nested.b).toBe(123)
    expect(result.nested.c.d).toBeNull()
    expect(result.nested.c.e).toBe(true)
    expect(result.arr[0].x).toBeNull()
    expect(result.arr[1].y).toBe('valid')
  })

  it('does not mutate the original object', () => {
    const input = { name: 'Test', phone: '' }
    const original = { ...input }
    sanitizeObj(input)
    expect(input).toEqual(original)
  })
})
