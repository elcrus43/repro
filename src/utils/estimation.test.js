/**
 * Unit tests for the offline estimation engine (src/utils/estimation.js)
 *
 * Tests price calculations, district multipliers, deal types,
 * analog generation, and Avito URL building.
 */

import { describe, it, expect } from 'vitest'
import { estimateOffline } from '../utils/estimation'

// ─── Base Price Calculations ────────────────────────────────────────────────

describe('estimateOffline — base prices', () => {
  it('returns correct base price for Киров 1-room', () => {
    const result = estimateOffline({
      city: 'Киров',
      rooms: 1,
      total_area: 40,
      deal_type: 'SALE',
    })
    // Base: 84000 ₽/m² × 40 m² = 3_360_000
    expect(result.price_per_m2).toBe(84_000)
    expect(result.estimated_avg).toBeGreaterThan(3_000_000)
  })

  it('returns correct base price for Москва 2-room', () => {
    const result = estimateOffline({
      city: 'Москва',
      rooms: 2,
      total_area: 58,
      deal_type: 'SALE',
    })
    expect(result.price_per_m2).toBe(245_000)
  })

  it('returns correct base price for Санкт-Петербург studio', () => {
    const result = estimateOffline({
      city: 'Санкт-Петербург',
      rooms: 0, // studio
      total_area: 28,
      deal_type: 'SALE',
    })
    expect(result.price_per_m2).toBe(185_000)
  })
})

// ─── District Multipliers ───────────────────────────────────────────────────

describe('estimateOffline — district multipliers', () => {
  it('applies premium multiplier for Исторический центр', () => {
    const center = estimateOffline({
      city: 'Киров',
      district: 'Исторический центр',
      rooms: 1,
      total_area: 40,
      deal_type: 'SALE',
    })
    const base = estimateOffline({
      city: 'Киров',
      rooms: 1,
      total_area: 40,
      deal_type: 'SALE',
    })
    // 1.25 multiplier
    expect(center.price_per_m2).toBeGreaterThan(base.price_per_m2)
    expect(center.confidence).toBe('HIGH')
  })

  it('applies discount multiplier for Нововятск', () => {
    const novo = estimateOffline({
      city: 'Киров',
      district: 'Нововятск',
      rooms: 1,
      total_area: 40,
      deal_type: 'SALE',
    })
    const base = estimateOffline({
      city: 'Киров',
      rooms: 1,
      total_area: 40,
      deal_type: 'SALE',
    })
    // 0.80 multiplier
    expect(novo.price_per_m2).toBeLessThan(base.price_per_m2)
  })

  it('uses 1.0 multiplier for unknown district', () => {
    const result = estimateOffline({
      city: 'Киров',
      district: 'Неизвестный район',
      rooms: 1,
      total_area: 40,
      deal_type: 'SALE',
    })
    const base = estimateOffline({
      city: 'Киров',
      rooms: 1,
      total_area: 40,
      deal_type: 'SALE',
    })
    expect(result.price_per_m2).toBe(base.price_per_m2)
    expect(result.confidence).toBe('MEDIUM')
  })
})

// ─── Deal Types ─────────────────────────────────────────────────────────────

describe('estimateOffline — deal types', () => {
  it('RENT returns monthly price (not sale price)', () => {
    const saleResult = estimateOffline({
      city: 'Киров',
      rooms: 1,
      total_area: 40,
      deal_type: 'SALE',
    })
    const rentResult = estimateOffline({
      city: 'Киров',
      rooms: 1,
      total_area: 40,
      deal_type: 'RENT',
    })
    // Rent should be much lower (monthly, not total)
    expect(rentResult.estimated_avg).toBeLessThan(saleResult.estimated_avg)
    expect(rentResult.estimated_avg).toBeGreaterThan(0)
  })
})

// ─── Room Mapping ───────────────────────────────────────────────────────────

describe('estimateOffline — room mapping', () => {
  it('maps rooms: 0 to studio', () => {
    const result = estimateOffline({
      city: 'Киров',
      rooms: 0,
      total_area: 28,
      deal_type: 'SALE',
    })
    // Studio base: 86000
    expect(result.price_per_m2).toBe(86_000)
  })

  it('caps rooms >= 4 at 4', () => {
    const result5 = estimateOffline({
      city: 'Киров',
      rooms: 5,
      total_area: 90,
      deal_type: 'SALE',
    })
    const result4 = estimateOffline({
      city: 'Киров',
      rooms: 4,
      total_area: 90,
      deal_type: 'SALE',
    })
    expect(result5.price_per_m2).toBe(result4.price_per_m2)
  })
})

// ─── Area Fallback ──────────────────────────────────────────────────────────

describe('estimateOffline — area fallback', () => {
  it('uses typical area when total_area not provided', () => {
    const result = estimateOffline({
      city: 'Киров',
      rooms: 2,
      deal_type: 'SALE',
    })
    // Typical 2-room: 58 m²
    expect(result.estimated_avg).toBeGreaterThan(0)
  })

  it('uses provided total_area when available', () => {
    const result = estimateOffline({
      city: 'Киров',
      rooms: 2,
      total_area: 70,
      deal_type: 'SALE',
    })
    const defaultResult = estimateOffline({
      city: 'Киров',
      rooms: 2,
      deal_type: 'SALE',
    })
    // Larger area = higher price
    expect(result.estimated_avg).toBeGreaterThan(defaultResult.estimated_avg)
  })
})

// ─── Analogs Generation ─────────────────────────────────────────────────────

describe('estimateOffline — analogs', () => {
  it('returns 3 analog variants', () => {
    const result = estimateOffline({
      city: 'Киров',
      rooms: 1,
      total_area: 40,
      deal_type: 'SALE',
    })
    expect(result.analogs).toHaveLength(3)
    expect(result.analogs_count).toBe(3)
  })

  it('analogs have correct labels', () => {
    const result = estimateOffline({
      city: 'Киров',
      rooms: 1,
      total_area: 40,
      deal_type: 'SALE',
    })
    const labels = result.analogs.map(a => a.label)
    expect(labels).toContain('Эконом')
    expect(labels).toContain('Средний')
    expect(labels).toContain('Премиум')
  })

  it('Эконом analog has lower price than Средний', () => {
    const result = estimateOffline({
      city: 'Киров',
      rooms: 1,
      total_area: 40,
      deal_type: 'SALE',
    })
    const econom = result.analogs.find(a => a.label === 'Эконом')
    const medium = result.analogs.find(a => a.label === 'Средний')
    expect(econom.price).toBeLessThan(medium.price)
  })

  it('Премиум analog has higher price than Средний', () => {
    const result = estimateOffline({
      city: 'Киров',
      rooms: 1,
      total_area: 40,
      deal_type: 'SALE',
    })
    const premium = result.analogs.find(a => a.label === 'Премиум')
    const medium = result.analogs.find(a => a.label === 'Средний')
    expect(premium.price).toBeGreaterThan(medium.price)
  })

  it('analogs have Avito URLs', () => {
    const result = estimateOffline({
      city: 'Киров',
      rooms: 1,
      total_area: 40,
      deal_type: 'SALE',
    })
    result.analogs.forEach(analog => {
      expect(analog.source_url).toContain('avito.ru')
    })
  })
})

// ─── Avito URL ──────────────────────────────────────────────────────────────

describe('estimateOffline — Avito URL', () => {
  it('generates valid Avito URL', () => {
    const result = estimateOffline({
      city: 'Киров',
      rooms: 1,
      total_area: 40,
      deal_type: 'SALE',
    })
    expect(result.avito_url).toContain('avito.ru')
    expect(result.avito_url).toContain('kirov')
  })

  it('generates rent URL for RENT deal type', () => {
    const result = estimateOffline({
      city: 'Киров',
      rooms: 1,
      total_area: 40,
      deal_type: 'RENT',
    })
    expect(result.avito_url).toContain('sdam')
  })

  it('generates sale URL for SALE deal type', () => {
    const result = estimateOffline({
      city: 'Киров',
      rooms: 1,
      total_area: 40,
      deal_type: 'SALE',
    })
    expect(result.avito_url).toContain('prodam')
  })

  it('includes rooms parameter in URL', () => {
    const result = estimateOffline({
      city: 'Киров',
      rooms: 2,
      total_area: 58,
      deal_type: 'SALE',
    })
    expect(result.avito_url).toContain('roomsCount=2')
  })

  it('includes studio parameter for rooms: 0', () => {
    const result = estimateOffline({
      city: 'Киров',
      rooms: 0,
      total_area: 28,
      deal_type: 'SALE',
    })
    expect(result.avito_url).toContain('roomsCount=studio')
  })
})

// ─── Confidence Level ───────────────────────────────────────────────────────

describe('estimateOffline — confidence', () => {
  it('returns HIGH for known district', () => {
    const result = estimateOffline({
      city: 'Киров',
      district: 'Коминтерн',
      rooms: 1,
      total_area: 40,
      deal_type: 'SALE',
    })
    expect(result.confidence).toBe('HIGH')
  })

  it('returns MEDIUM for unknown district', () => {
    const result = estimateOffline({
      city: 'Киров',
      district: '',
      rooms: 1,
      total_area: 40,
      deal_type: 'SALE',
    })
    expect(result.confidence).toBe('MEDIUM')
  })
})

// ─── Price Range ────────────────────────────────────────────────────────────

describe('estimateOffline — price range', () => {
  it('min < avg < max', () => {
    const result = estimateOffline({
      city: 'Киров',
      rooms: 1,
      total_area: 40,
      deal_type: 'SALE',
    })
    expect(result.estimated_min).toBeLessThan(result.estimated_avg)
    expect(result.estimated_avg).toBeLessThan(result.estimated_max)
  })

  it('all prices are rounded to thousands', () => {
    const result = estimateOffline({
      city: 'Киров',
      rooms: 1,
      total_area: 40,
      deal_type: 'SALE',
    })
    expect(result.estimated_min % 1000).toBe(0)
    expect(result.estimated_avg % 1000).toBe(0)
    expect(result.estimated_max % 1000).toBe(0)
  })
})

// ─── Fallback City ──────────────────────────────────────────────────────────

describe('estimateOffline — fallback city', () => {
  it('uses Киров data for unknown city', () => {
    const result = estimateOffline({
      city: 'Неизвестный город',
      rooms: 1,
      total_area: 40,
      deal_type: 'SALE',
    })
    expect(result.price_per_m2).toBe(84_000) // Киров 1-room base
  })
})
