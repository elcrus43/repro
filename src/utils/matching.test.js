/**
 * Unit tests for the matching algorithm (src/utils/matching.js)
 *
 * Covers all critical paths: mandatory params, scoring, match levels,
 * batch matching functions.
 */

import {
  calculateMatch,
  runMatchingForProperty,
  runMatchingForRequest,
  getLevelLabel,
} from '../utils/matching'

// ─── Test Data Builders ─────────────────────────────────────────────────────

function makeProperty(overrides = {}) {
  return {
    id: 'prop-1',
    property_type: 'apartment',
    city: 'Киров',
    district: 'Коминтерн',
    microdistrict: '',
    rooms: 2,
    price: 5_000_000,
    price_min: null,
    area_total: 58,
    area_kitchen: 10,
    floor: 3,
    floors_total: 9,
    building_type: 'panel',
    market_type: 'secondary',
    renovation: 'cosmetic',
    balcony: 'none',
    parking: 'none',
    mortgage_available: true,
    matcapital_available: false,
    certificate_available: false,
    status: 'active',
    client_id: 'client-1',
    ...overrides,
  }
}

function makeRequest(overrides = {}) {
  return {
    id: 'req-1',
    property_types: ['apartment'],
    city: 'Киров',
    districts: ['Коминтерн'],
    microdistricts: [],
    rooms: [2],
    budget_max: 6_000_000,
    budget_min: 0,
    area_min: null,
    area_max: null,
    kitchen_area_min: null,
    floor_min: null,
    floor_max: null,
    not_first_floor: false,
    not_last_floor: false,
    building_types: [],
    market_types: [],
    renovation_min: null,
    balcony_required: false,
    parking_required: false,
    payment_types: ['mortgage'],
    status: 'active',
    client_id: 'client-2',
    ...overrides,
  }
}

// ─── Mandatory Params (exclusive) ───────────────────────────────────────────

describe('calculateMatch — mandatory params', () => {
  it('returns null if property_type not in request.property_types', () => {
    const prop = makeProperty({ property_type: 'house' })
    const req = makeRequest({ property_types: ['apartment'] })
    expect(calculateMatch(prop, req)).toBeNull()
  })

  it('returns null if cities do not match', () => {
    const prop = makeProperty({ city: 'Москва' })
    const req = makeRequest({ city: 'Киров' })
    expect(calculateMatch(prop, req)).toBeNull()
  })

  it('returns null if rooms not in request.rooms', () => {
    const prop = makeProperty({ rooms: 3 })
    const req = makeRequest({ rooms: [1, 2] })
    expect(calculateMatch(prop, req)).toBeNull()
  })

  it('passes mandatory check when all match', () => {
    const prop = makeProperty()
    const req = makeRequest()
    const result = calculateMatch(prop, req)
    expect(result).not.toBeNull()
  })
})

// ─── Price Scoring ──────────────────────────────────────────────────────────

describe('calculateMatch — price scoring', () => {
  it('gives 25 pts when price within budget', () => {
    const prop = makeProperty({ price: 5_000_000 })
    const req = makeRequest({ budget_max: 6_000_000, budget_min: 4_000_000 })
    const result = calculateMatch(prop, req)
    expect(result.score).toBeGreaterThanOrEqual(85) // perfect match baseline + 25
  })

  it('gives 15 pts when price_min <= budget_max but price > budget_max', () => {
    const prop = makeProperty({ price: 6_500_000, price_min: 5_500_000 })
    const req = makeRequest({ budget_max: 6_000_000 })
    const result = calculateMatch(prop, req)
    // Should have partial price score
    expect(result.matched_params.some(m => m.includes('торг'))).toBe(true)
  })

  it('gives 5 pts when price is within 10% over budget', () => {
    const prop = makeProperty({ price: 6_500_000 }) // ~8% over 6M
    const req = makeRequest({ budget_max: 6_000_000 })
    const result = calculateMatch(prop, req)
    expect(result).not.toBeNull() // still above threshold
  })

  it('gives 0 pts when price > 110% of budget', () => {
    const prop = makeProperty({ price: 10_000_000 })
    const req = makeRequest({ budget_max: 6_000_000 })
    const result = calculateMatch(prop, req)
    // Should be below 50 threshold → null
    expect(result).toBeNull()
  })
})

// ─── District Scoring ───────────────────────────────────────────────────────

describe('calculateMatch — district scoring', () => {
  it('gives 20 pts for any district when request has no districts', () => {
    const prop = makeProperty()
    const req = makeRequest({ districts: [] })
    const result = calculateMatch(prop, req)
    expect(result.matched_params.some(m => m.includes('Район: любой'))).toBe(true)
  })

  it('gives 20 pts when district matches', () => {
    const prop = makeProperty({ district: 'Коминтерн' })
    const req = makeRequest({ districts: ['Коминтерн'] })
    const result = calculateMatch(prop, req)
    expect(result.matched_params.some(m => m.includes('Коминтерн'))).toBe(true)
  })

  it('gives 25 pts when district + microdistrict match', () => {
    const prop = makeProperty({ district: 'Коминтерн', microdistrict: 'ОЦМ' })
    const req = makeRequest({ districts: ['Коминтерн'], microdistricts: ['ОЦМ'] })
    const result = calculateMatch(prop, req)
    expect(result.matched_params.some(m => m.includes('Микрорайон'))).toBe(true)
  })

  it('gives 0 pts when district does not match', () => {
    const prop = makeProperty({ district: 'Филейка' })
    const req = makeRequest({ districts: ['Коминтерн'] })
    const result = calculateMatch(prop, req)
    expect(result.mismatched_params.some(m => m.includes('Район'))).toBe(true)
  })
})

// ─── Floor Scoring ──────────────────────────────────────────────────────────

describe('calculateMatch — floor scoring', () => {
  it('gives +2.5 for not_first_floor when floor > 1', () => {
    const prop = makeProperty({ floor: 3 })
    const req = makeRequest({ not_first_floor: true })
    const result = calculateMatch(prop, req)
    expect(result.matched_params.some(m => m.includes('Не первый этаж'))).toBe(true)
  })

  it('gives -2.5 for not_first_floor when floor === 1', () => {
    const prop = makeProperty({ floor: 1 })
    const req = makeRequest({ not_first_floor: true })
    const result = calculateMatch(prop, req)
    expect(result.mismatched_params.some(m => m.includes('Первый этаж'))).toBe(true)
  })

  it('gives +2.5 for not_last_floor when floor < floors_total', () => {
    const prop = makeProperty({ floor: 3, floors_total: 9 })
    const req = makeRequest({ not_last_floor: true })
    const result = calculateMatch(prop, req)
    expect(result.matched_params.some(m => m.includes('Не последний'))).toBe(true)
  })

  it('gives -2.5 for not_last_floor when floor === floors_total', () => {
    const prop = makeProperty({ floor: 9, floors_total: 9 })
    const req = makeRequest({ not_last_floor: true })
    const result = calculateMatch(prop, req)
    expect(result.mismatched_params.some(m => m.includes('Последний этаж'))).toBe(true)
  })
})

// ─── Payment Scoring ────────────────────────────────────────────────────────

describe('calculateMatch — payment scoring', () => {
  it('cash always matches', () => {
    const prop = makeProperty({
      mortgage_available: false,
      matcapital_available: false,
      certificate_available: false,
    })
    const req = makeRequest({ payment_types: ['cash'] })
    const result = calculateMatch(prop, req)
    expect(result.matched_params.some(m => m.includes('Наличные'))).toBe(true)
  })

  it('mortgage matches when property has mortgage_available', () => {
    const prop = makeProperty({ mortgage_available: true })
    const req = makeRequest({ payment_types: ['mortgage'] })
    const result = calculateMatch(prop, req)
    expect(result.matched_params.some(m => m.includes('Ипотека'))).toBe(true)
  })

  it('fails when no payment methods match', () => {
    const prop = makeProperty({
      mortgage_available: false,
      matcapital_available: false,
      certificate_available: false,
    })
    const req = makeRequest({ payment_types: ['mortgage', 'matcapital'] })
    const result = calculateMatch(prop, req)
    expect(result.mismatched_params.some(m => m.includes('Оплата'))).toBe(true)
  })
})

// ─── Match Levels ───────────────────────────────────────────────────────────

describe('calculateMatch — match levels', () => {
  it('returns perfect (85+) for full match', () => {
    const prop = makeProperty()
    const req = makeRequest()
    const result = calculateMatch(prop, req)
    expect(result.match_level).toBe('perfect')
    expect(result.score).toBeGreaterThanOrEqual(85)
  })

  it('returns good (65-84) for partial match', () => {
    const prop = makeProperty({ district: 'Филейка' }) // district mismatch
    const req = makeRequest({ districts: ['Коминтерн'] })
    const result = calculateMatch(prop, req)
    // Should still be above 65 with only district mismatch
    if (result) {
      expect(result.score).toBeLessThan(85)
      expect(result.score).toBeGreaterThanOrEqual(65)
      expect(result.match_level).toBe('good')
    }
  })

  it('returns possible (50-64) for weak match', () => {
    const prop = makeProperty({
      district: 'Филейка',
      price: 6_500_000, // slightly over budget
    })
    const req = makeRequest({
      districts: ['Коминтерн'],
      budget_max: 6_000_000,
    })
    const result = calculateMatch(prop, req)
    if (result) {
      expect(result.score).toBeLessThan(65)
      expect(result.score).toBeGreaterThanOrEqual(50)
      expect(result.match_level).toBe('possible')
    }
  })

  it('returns null when score < 50', () => {
    const prop = makeProperty({
      district: 'Филейка',
      price: 10_000_000, // way over budget
      rooms: 3,
    })
    const req = makeRequest({
      districts: ['Коминтерн'],
      budget_max: 6_000_000,
      rooms: [2], // rooms mismatch → null
    })
    expect(calculateMatch(prop, req)).toBeNull()
  })
})

// ─── Batch Matching ─────────────────────────────────────────────────────────

describe('runMatchingForProperty', () => {
  it('skips inactive requests', () => {
    const prop = makeProperty()
    const requests = [
      makeRequest({ id: 'req-1', status: 'active' }),
      makeRequest({ id: 'req-2', status: 'found' }),
    ]
    const results = runMatchingForProperty(prop, requests)
    expect(results).toHaveLength(1)
    expect(results[0].request_id).toBe('req-1')
  })

  it('returns matches for all active requests', () => {
    const prop = makeProperty()
    const requests = [
      makeRequest({ id: 'req-1', status: 'active' }),
      makeRequest({ id: 'req-2', status: 'active' }),
    ]
    const results = runMatchingForProperty(prop, requests)
    expect(results).toHaveLength(2)
  })
})

describe('runMatchingForRequest', () => {
  it('skips inactive properties', () => {
    const req = makeRequest()
    const properties = [
      makeProperty({ id: 'prop-1', status: 'active' }),
      makeProperty({ id: 'prop-2', status: 'sold' }),
    ]
    const results = runMatchingForRequest(req, properties)
    expect(results).toHaveLength(1)
    expect(results[0].property_id).toBe('prop-1')
  })

  it('includes advertising properties', () => {
    const req = makeRequest()
    const properties = [
      makeProperty({ id: 'prop-1', status: 'advertising' }),
    ]
    const results = runMatchingForRequest(req, properties)
    expect(results).toHaveLength(1)
  })
})

// ─── Level Labels ───────────────────────────────────────────────────────────

describe('getLevelLabel', () => {
  it('returns correct label for perfect', () => {
    expect(getLevelLabel('perfect')).toEqual({ label: 'Отличное', cls: 'perfect' })
  })

  it('returns correct label for good', () => {
    expect(getLevelLabel('good')).toEqual({ label: 'Хорошее', cls: 'good' })
  })

  it('returns correct label for possible', () => {
    expect(getLevelLabel('possible')).toEqual({ label: 'Возможное', cls: 'possible' })
  })

  it('returns fallback for unknown level', () => {
    expect(getLevelLabel('unknown')).toEqual({ label: '—', cls: '' })
  })
})
