import { describe, it, expect, vi } from 'vitest';
import {
  config,
  PROFSTROY_PROJECTS,
  PROFSTROY_PROJECT_ALIASES,
  resolveProfstroyProjectSlug,
  normalizeProfstroyLot,
  fetchProfstroyApartments,
  fetchProfstroyProjectLots,
  syncProfstroyProject,
} from '../../api/_profstroy-lots.js';

describe('profstroy-lots config and projects catalog', () => {
  it('exports maxDuration 60', () => {
    expect(config).toEqual({ maxDuration: 60 });
  });

  it('defines PROFSTROY_PROJECTS mapping with all 5 required projects', () => {
    expect(Object.keys(PROFSTROY_PROJECTS)).toEqual([
      'kapital',
      'vdohnovenie',
      'murashinskiy-7',
      'garmoniya',
      'metropolis',
    ]);

    expect(PROFSTROY_PROJECTS.kapital).toEqual({
      id: 1,
      projectName: 'Клубный дом «Капитал»',
      address: 'г. Киров, ул. Владимирская, 99 / ул. Орловская, 62Б',
    });

    expect(PROFSTROY_PROJECTS.vdohnovenie).toEqual({
      id: 2,
      projectName: 'ЖК «Вдохновение»',
      address: 'г. Киров, ул. Энтузиастов, д. 17, корп. 1',
    });

    expect(PROFSTROY_PROJECTS['murashinskiy-7']).toEqual({
      id: 3,
      projectName: 'Дом на Мурашинском 7',
      address: 'г. Киров, Мурашинский проезд, д. 7',
    });

    expect(PROFSTROY_PROJECTS.garmoniya).toEqual({
      id: 4,
      projectName: 'ЖК «Гармония»',
      address: 'г. Киров, ул. Ленина, д. 106',
    });

    expect(PROFSTROY_PROJECTS.metropolis).toEqual({
      id: 6,
      projectName: 'ЖК «Метрополис»',
      address: 'г. Киров, ул. Воровского, 173, корп. 1',
    });
  });

  it('resolves project aliases correctly', () => {
    expect(resolveProfstroyProjectSlug('kapital')).toBe('kapital');
    expect(resolveProfstroyProjectSlug('capital')).toBe('kapital');
    expect(resolveProfstroyProjectSlug('vdokhnovenie')).toBe('vdohnovenie');
    expect(resolveProfstroyProjectSlug('vdokhnoveniye')).toBe('vdohnovenie');
    expect(resolveProfstroyProjectSlug('murashinskiy')).toBe('murashinskiy-7');
    expect(resolveProfstroyProjectSlug('murashinskiy7')).toBe('murashinskiy-7');
    expect(resolveProfstroyProjectSlug('harmony')).toBe('garmoniya');
    expect(resolveProfstroyProjectSlug('nonexistent')).toBe('nonexistent');
    expect(resolveProfstroyProjectSlug(null)).toBeNull();
  });
});

describe('normalizeProfstroyLot', () => {
  const garmoniyaConfig = PROFSTROY_PROJECTS.garmoniya;

  it('normalizes studio when rooms is null, 0, or total_area <= 28', () => {
    const itemNullRooms = {
      id: 101,
      object_id: 4,
      number: '12',
      floor: 3,
      rooms: null,
      total_area: 29.5,
      total_price: 4500000,
      price_per_sqm: 152542,
      status: 'free',
      floor_plan_url: null,
    };
    const lotNull = normalizeProfstroyLot(itemNullRooms, garmoniyaConfig, 'garmoniya');
    expect(lotNull.rooms).toBe('studio');
    expect(lotNull.rooms_type).toBe('studio');
    expect(lotNull.rooms_label).toBe('Студия');

    const itemZeroRooms = {
      id: 102,
      object_id: 4,
      rooms: 0,
      total_area: 32,
      total_price: 5000000,
      status: 'free',
    };
    const lotZero = normalizeProfstroyLot(itemZeroRooms, garmoniyaConfig, 'garmoniya');
    expect(lotZero.rooms).toBe('studio');
    expect(lotZero.rooms_type).toBe('studio');

    const itemSmallArea = {
      id: 103,
      object_id: 4,
      rooms: 1,
      total_area: 27.5,
      total_price: 4200000,
      status: 'free',
    };
    const lotSmall = normalizeProfstroyLot(itemSmallArea, garmoniyaConfig, 'garmoniya');
    expect(lotSmall.rooms).toBe('studio');
    expect(lotSmall.rooms_type).toBe('studio');
    expect(lotSmall.rooms_label).toBe('Студия');
  });

  it('normalizes multi-room apartments (>28 sqm)', () => {
    const item2k = {
      id: 201,
      object_id: 4,
      number: '55',
      floor: 7,
      rooms: 2,
      total_area: 58.4,
      total_price: 9000000,
      price_per_sqm: 154110,
      status: 'free',
      section: 1,
      section_label: 'Секция',
    };
    const lot2k = normalizeProfstroyLot(item2k, garmoniyaConfig, 'garmoniya');
    expect(lot2k.rooms).toBe('2');
    expect(lot2k.rooms_type).toBe('2k');
    expect(lot2k.rooms_label).toBe('2-комнатная');
    expect(lot2k.area).toBe(58.4);
    expect(lot2k.floor).toBe(7);
    expect(lot2k.flat_number).toBe('55');
    expect(lot2k.title).toBe('2-комнатная, 58.4 м², 7 эт.');
    expect(lot2k.address).toBe('г. Киров, ул. Ленина, д. 106 (Секция 1)');
  });

  it('prefixes relative plan_url with base domain and preserves absolute urls', () => {
    const itemRelative = {
      id: 301,
      object_id: 6,
      floor_plan_url: '/static/floorplans/metropolis_3_37.10_2d.jpg',
      status: 'free',
    };
    const lotRelative = normalizeProfstroyLot(itemRelative, PROFSTROY_PROJECTS.metropolis, 'metropolis');
    expect(lotRelative.plan_url).toBe(
      'https://unitflow.profstroy-services.ru/static/floorplans/metropolis_3_37.10_2d.jpg'
    );
    expect(lotRelative.plan_image).toBe(
      'https://unitflow.profstroy-services.ru/static/floorplans/metropolis_3_37.10_2d.jpg'
    );

    const itemAbsolute = {
      id: 302,
      object_id: 4,
      floor_plan_url: 'https://static.tildacdn.com/tild3137/96.jpg',
      status: 'free',
    };
    const lotAbsolute = normalizeProfstroyLot(itemAbsolute, garmoniyaConfig, 'garmoniya');
    expect(lotAbsolute.plan_url).toBe('https://static.tildacdn.com/tild3137/96.jpg');

    const itemNoPlan = { id: 303, object_id: 4, floor_plan_url: null, status: 'free' };
    const lotNoPlan = normalizeProfstroyLot(itemNoPlan, garmoniyaConfig, 'garmoniya');
    expect(lotNoPlan.plan_url).toBeNull();
    expect(lotNoPlan.plan_image).toBeNull();
  });

  it('calculates discounted price when discount is active', () => {
    const itemWithActiveDiscount = {
      id: 343,
      object_id: 4,
      total_area: 50,
      total_price: 10000000,
      price_per_sqm: 200000,
      discount_percent: 5,
      discount_until: '2026-11-30T00:00:00Z',
      status: 'free',
    };

    const lot = normalizeProfstroyLot(itemWithActiveDiscount, garmoniyaConfig, 'garmoniya', {
      now: '2026-11-13T12:00:00Z',
    });

    // 10 000 000 * 0.95 = 9 500 000
    expect(lot.price).toBe(9500000);
    expect(lot.price_total).toBe(9500000);
    expect(lot.price_sqm).toBe(190000);
    expect(lot.price_per_m2).toBe(190000);
    expect(lot.discount_percent).toBe(5);
  });

  it('ignores expired discount and keeps base price', () => {
    const itemWithExpiredDiscount = {
      id: 344,
      object_id: 4,
      total_area: 50,
      total_price: 10000000,
      price_per_sqm: 200000,
      discount_percent: 5,
      discount_until: '2026-10-31T00:00:00Z',
      status: 'free',
    };

    const lot = normalizeProfstroyLot(itemWithExpiredDiscount, garmoniyaConfig, 'garmoniya', {
      now: '2026-11-13T12:00:00Z',
    });

    expect(lot.price).toBe(10000000);
    expect(lot.price_total).toBe(10000000);
    expect(lot.price_sqm).toBe(200000);
  });

  it('maps statuses: free -> available, reserved -> reserved, sold -> sold', () => {
    const freeLot = normalizeProfstroyLot({ id: 1, status: 'free' }, garmoniyaConfig, 'garmoniya');
    expect(freeLot.status).toBe('available');
    expect(freeLot.is_available).toBe(true);

    const reservedLot = normalizeProfstroyLot({ id: 2, status: 'reserved' }, garmoniyaConfig, 'garmoniya');
    expect(reservedLot.status).toBe('reserved');
    expect(reservedLot.is_available).toBe(true);

    const soldLot = normalizeProfstroyLot({ id: 3, status: 'sold' }, garmoniyaConfig, 'garmoniya');
    expect(soldLot.status).toBe('sold');
    expect(soldLot.is_available).toBe(false);

    const otherLot = normalizeProfstroyLot({ id: 4, status: 'unknown' }, garmoniyaConfig, 'garmoniya');
    expect(otherLot.status).toBe('sold');
    expect(otherLot.is_available).toBe(false);
  });
});

describe('fetchProfstroyApartments and fetchProfstroyProjectLots', () => {
  it('fetches raw apartments list and throws on upstream failure', async () => {
    const mockList = [
      { id: 1, object_id: 1, unit_type: 'apartment', status: 'free' },
      { id: 2, object_id: 1, unit_type: 'parking', status: 'free' },
      { id: 3, object_id: 4, unit_type: 'apartment', status: 'reserved' },
    ];

    const fetchFn = vi.fn(async () => ({
      ok: true,
      json: async () => mockList,
    }));

    const result = await fetchProfstroyApartments({ fetchFn });
    expect(result).toHaveLength(3);

    const failedFetch = vi.fn(async () => ({
      ok: false,
      status: 503,
    }));
    await expect(fetchProfstroyApartments({ fetchFn: failedFetch })).rejects.toThrow(
      'API Профстрой Недвижимость вернул статус 503'
    );
  });

  it('filters lots by project object_id and apartment unit_type', async () => {
    const mockList = [
      { id: 10, object_id: 1, unit_type: 'apartment', status: 'free' },
      { id: 11, object_id: 1, unit_type: 'parking', status: 'free' },
      { id: 12, object_id: 1, unit_type: 'apartment', status: 'sold' },
      { id: 13, object_id: 4, unit_type: 'apartment', status: 'free' },
    ];

    const fetchFn = vi.fn(async () => ({
      ok: true,
      json: async () => mockList,
    }));

    const lots = await fetchProfstroyProjectLots(PROFSTROY_PROJECTS.kapital, { fetchFn });
    expect(lots).toHaveLength(2);
    expect(lots.map((l) => l.id)).toEqual([10, 12]);

    const onlyAvailable = await fetchProfstroyProjectLots(PROFSTROY_PROJECTS.kapital, {
      fetchFn,
      onlyAvailable: true,
    });
    expect(onlyAvailable).toHaveLength(1);
    expect(onlyAvailable[0].id).toBe(10);
  });
});

describe('syncProfstroyProject', () => {
  it('rejects unknown project slugs with 400 error', async () => {
    const fakeSql = { query: vi.fn() };
    await expect(syncProfstroyProject('unknown-slug', fakeSql)).rejects.toMatchObject({
      message: 'Неизвестный проект Профстрой Недвижимость',
      statusCode: 400,
    });
  });

  it('fetches project flats, normalizes them, and saves to repository', async () => {
    const fakeSql = { query: vi.fn(async () => []) };
    const mockUnits = [
      {
        id: 501,
        object_id: 4,
        unit_type: 'apartment',
        number: '10',
        floor: 2,
        rooms: 1,
        total_area: 36.5,
        total_price: 6000000,
        price_per_sqm: 164384,
        status: 'free',
        floor_plan_url: '/static/plans/10.jpg',
      },
      {
        id: 502,
        object_id: 4,
        unit_type: 'apartment',
        number: '11',
        floor: 2,
        rooms: 2,
        total_area: 55.0,
        total_price: 9000000,
        price_per_sqm: 163636,
        status: 'reserved',
        floor_plan_url: 'https://unitflow.profstroy-services.ru/static/plans/11.jpg',
      },
      {
        id: 503,
        object_id: 6, // different project
        unit_type: 'apartment',
        number: '20',
        status: 'free',
      },
    ];

    const fetchFn = vi.fn(async () => ({
      ok: true,
      json: async () => mockUnits,
    }));

    const result = await syncProfstroyProject('garmoniya', fakeSql, { fetchFn });
    expect(result.projectSlug).toBe('garmoniya');
    expect(result.projectName).toBe('ЖК «Гармония»');
    expect(result.syncedCount).toBe(2);
    expect(fakeSql.query).toHaveBeenCalled();
  });
});
