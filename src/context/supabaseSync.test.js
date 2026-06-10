/**
 * Unit tests for sanitizeObj in supabaseSync.js
 *
 * Tests recursive empty string → null conversion for safe Supabase inserts.
 */

import { describe, it, expect } from 'vitest'
import { sanitizeObj, mapShowingFromDb, mapShowingToDb } from '../context/supabaseSync'

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

describe('mapShowingFromDb', () => {
  it('does nothing for non-viewing event types', () => {
    const showing = { event_type: 'showing', property_id: 'prop-123', google_event_id: 'g-123' }
    expect(mapShowingFromDb(showing)).toEqual(showing)
  })

  it('restores property_id and clears calendar ID if prefixed', () => {
    const showing = { event_type: 'viewing', property_id: null, google_event_id: 'selection_prop_id:prop-123' }
    expect(mapShowingFromDb(showing)).toEqual({
      event_type: 'viewing',
      property_id: 'prop-123',
      google_event_id: null
    })
  })

  it('restores property_id and keeps calendar ID if both present', () => {
    const showing = { event_type: 'viewing', property_id: null, google_event_id: 'selection_prop_id:prop-123::cal_id:cal-999' }
    expect(mapShowingFromDb(showing)).toEqual({
      event_type: 'viewing',
      property_id: 'prop-123',
      google_event_id: 'cal-999'
    })
  })
})

describe('mapShowingToDb', () => {
  it('does nothing for non-viewing event types', () => {
    const showing = { event_type: 'showing', property_id: 'prop-123', google_event_id: 'g-123' }
    expect(mapShowingToDb(showing)).toEqual(showing)
  })

  it('prefixes google_event_id with selection_prop_id and nullifies property_id', () => {
    const showing = { event_type: 'viewing', property_id: 'prop-123', google_event_id: null }
    expect(mapShowingToDb(showing)).toEqual({
      event_type: 'viewing',
      property_id: null,
      google_event_id: 'selection_prop_id:prop-123'
    })
  })

  it('preserves calendar ID in prefixed google_event_id', () => {
    const showing = { event_type: 'viewing', property_id: 'prop-123', google_event_id: 'cal-999' }
    expect(mapShowingToDb(showing)).toEqual({
      event_type: 'viewing',
      property_id: null,
      google_event_id: 'selection_prop_id:prop-123::cal_id:cal-999'
    })
  })
  
  it('converts empty string property_id to null', () => {
    const showing = { event_type: 'showing', property_id: '', google_event_id: 'cal-123' }
    expect(mapShowingToDb(showing)).toEqual({
      event_type: 'showing',
      property_id: null,
      google_event_id: 'cal-123'
    })
  })
})
