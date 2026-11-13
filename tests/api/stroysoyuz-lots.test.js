import { describe, it, expect, vi } from 'vitest';
import {
  config,
  STROYSOYUZ_PROJECTS,
  STROYSOYUZ_PRICELIST_DATASET,
  resolveStroysoyuzProjectSlug,
  normalizeStroysoyuzLot,
  syncStroysoyuzProject,
} from '../../api/stroysoyuz-lots.js';

describe('stroysoyuz-lots config and projects catalog', () => {
  it('exports maxDuration 60', () => {
    expect(config).toEqual({ maxDuration: 60 });
  });

  it('defines STROYSOYUZ_PROJECTS mapping with all 10 projects', () => {
    const slugs = Object.keys(STROYSOYUZ_PROJECTS);
    expect(slugs).toEqual([
      'zhk-kholms',
      'uspenskaya-29',
      'solomintsy-michurina-28',
      'solomintsy-michurina-26',
      'blyuhera-46',
      'zapovedny-sandalovskaya-2a-1',
      'zapovedny-sandalovskaya-2a',
      'zapovedny-sandalovskaya-4-1',
      'volodarskogo-229',
      'svobody-115g',
    ]);

    expect(STROYSOYUZ_PROJECTS['zhk-kholms'].address).toContain('Успенская, 33');
    expect(STROYSOYUZ_PROJECTS['solomintsy-michurina-28'].address).toContain('Мичурина, 28');
    expect(STROYSOYUZ_PROJECTS['blyuhera-46'].address).toContain('Блюхера, 46');
    expect(STROYSOYUZ_PROJECTS['zapovedny-sandalovskaya-2a-1'].address).toContain('Сандаловская, 2а к1');
    expect(STROYSOYUZ_PROJECTS['svobody-115g'].address).toContain('Свободы, 115Г');
  });

  it('resolves aliases correctly', () => {
    expect(resolveStroysoyuzProjectSlug('kholms')).toBe('zhk-kholms');
    expect(resolveStroysoyuzProjectSlug('uspenskaya-33')).toBe('zhk-kholms');
    expect(resolveStroysoyuzProjectSlug('uspenskaya')).toBe('uspenskaya-29');
    expect(resolveStroysoyuzProjectSlug('michurina-28')).toBe('solomintsy-michurina-28');
    expect(resolveStroysoyuzProjectSlug('michurina-26')).toBe('solomintsy-michurina-26');
    expect(resolveStroysoyuzProjectSlug('blyuhera')).toBe('blyuhera-46');
    expect(resolveStroysoyuzProjectSlug('sandalovskaya-2a-1')).toBe('zapovedny-sandalovskaya-2a-1');
    expect(resolveStroysoyuzProjectSlug('sandalovskaya-2a')).toBe('zapovedny-sandalovskaya-2a');
    expect(resolveStroysoyuzProjectSlug('sandalovskaya-4-1')).toBe('zapovedny-sandalovskaya-4-1');
    expect(resolveStroysoyuzProjectSlug('volodarskogo')).toBe('volodarskogo-229');
    expect(resolveStroysoyuzProjectSlug('svobody')).toBe('svobody-115g');
  });
});

describe('STROYSOYUZ_PRICELIST_DATASET', () => {
  it('contains datasets for all 10 projects', () => {
    const keys = Object.keys(STROYSOYUZ_PRICELIST_DATASET);
    expect(keys).toHaveLength(10);
    for (const key of Object.keys(STROYSOYUZ_PROJECTS)) {
      expect(Array.isArray(STROYSOYUZ_PRICELIST_DATASET[key])).toBe(true);
      expect(STROYSOYUZ_PRICELIST_DATASET[key].length).toBeGreaterThan(0);
    }
  });

  it('contains over 800 lots in total', () => {
    const totalLots = Object.values(STROYSOYUZ_PRICELIST_DATASET).reduce(
      (sum, list) => sum + list.length,
      0
    );
    expect(totalLots).toBeGreaterThanOrEqual(800);
  });

  it('contains required lots for zhk-kholms including residential, commercial, storage, parking', () => {
    const lots = STROYSOYUZ_PRICELIST_DATASET['zhk-kholms'];
    expect(lots.length).toBeGreaterThanOrEqual(140);
    expect(lots.some((l) => l.lot_type === 'flat')).toBe(true);
    expect(lots.some((l) => l.lot_type === 'commercial')).toBe(true);
    expect(lots.some((l) => l.lot_type === 'storage')).toBe(true);
    expect(lots.some((l) => l.lot_type === 'parking')).toBe(true);
  });

  it('contains sections 1 and 2 and storage for blyuhera-46', () => {
    const lots = STROYSOYUZ_PRICELIST_DATASET['blyuhera-46'];
    expect(lots.length).toBeGreaterThanOrEqual(280);
    expect(lots.some((l) => l.section === '1 секция')).toBe(true);
    expect(lots.some((l) => l.section === '2 секция')).toBe(true);
    expect(lots.some((l) => l.lot_type === 'storage')).toBe(true);
  });

  it('contains both sections for volodarskogo-229', () => {
    const lots = STROYSOYUZ_PRICELIST_DATASET['volodarskogo-229'];
    expect(lots).toHaveLength(2);
    expect(lots.some((l) => l.section === '1 секция' && l.flat_number === '5')).toBe(true);
    expect(lots.some((l) => l.section === '2 секция' && l.flat_number === '137')).toBe(true);
  });
});

describe('normalizeStroysoyuzLot', () => {
  it('correctly maps raw lot to normalized and DB fields', () => {
    const spec = STROYSOYUZ_PROJECTS['solomintsy-michurina-28'];
    const raw = {
      external_id: 'michurina-28-flat-1',
      flat_number: '1',
      floor: 1,
      area_m2: 31.68,
      rooms: 1,
      room_type: '1',
      price_per_m2: 167000,
      price_total: 5290560,
      section: '1 подъезд',
      completion_date: '1 кв. 2029 г.',
      status: 'available',
    };

    const lot = normalizeStroysoyuzLot(raw, spec, 'solomintsy-michurina-28');

    expect(lot.id).toBe('stroysoyuz-solomintsy-michurina-28-michurina-28-flat-1');
    expect(lot.project_slug).toBe('solomintsy-michurina-28');
    expect(lot.rooms).toBe(1);
    expect(lot.room_type).toBe('1');
    expect(lot.area_m2).toBe(31.68);
    expect(lot.area).toBe(31.68);
    expect(lot.floor).toBe(1);
    expect(lot.price_total).toBe(5290560);
    expect(lot.price).toBe(5290560);
    expect(lot.price_per_m2).toBe(167000);
    expect(lot.price_sqm).toBe(167000);
    expect(lot.section).toBe('1 подъезд');
    expect(lot.completion_date).toBe('1 кв. 2029 г.');
    expect(lot.status).toBe('available');
    expect(lot.is_available).toBe(true);
    expect(lot.title).toBe('1-комнатная, 31.68 м², 1 эт.');
    expect(lot.address).toContain('Мичурина, 28 (1 подъезд)');
  });

  it('marks reserved lot correctly', () => {
    const spec = STROYSOYUZ_PROJECTS['volodarskogo-229'];
    const raw = {
      external_id: 'volodarskogo-229-s1-5',
      flat_number: '5',
      floor: 1,
      area_m2: 62,
      rooms: 3,
      room_type: '3',
      price_per_m2: 160786,
      price_total: 9968732,
      section: '1 секция',
      completion_date: 'Дом сдан',
      status: 'reserved',
    };

    const lot = normalizeStroysoyuzLot(raw, spec, 'volodarskogo-229');
    expect(lot.status).toBe('reserved');
    expect(lot.is_available).toBe(false);
  });
});

describe('syncStroysoyuzProject', () => {
  it('throws error on unknown project', async () => {
    const mockSql = { query: vi.fn() };
    await expect(syncStroysoyuzProject('unknown-project', mockSql)).rejects.toThrow(
      'Неизвестный проект Стройсоюз'
    );
  });
});
