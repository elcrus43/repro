import { describe, it, expect, vi } from 'vitest';
import {
  config,
  KINO_PROJECTS,
  normalizeKinoLot,
  fetchKinoProjectFlats,
  syncKinoProject,
} from '../../api/_kino-lots.js';

describe('kino-lots config and projects catalog', () => {
  it('exports maxDuration 60', () => {
    expect(config).toEqual({ maxDuration: 60 });
  });

  it('defines KINO_PROJECTS mapping with fusion, iuterra and gorkogo-2a', () => {
    expect(Object.keys(KINO_PROJECTS)).toEqual(['fusion', 'iuterra', 'gorkogo-2a']);

    expect(KINO_PROJECTS.fusion).toEqual({
      id: 3,
      projectName: 'ЖК ФЬЮЖН',
      address: 'д. Шутовщина, ул. Ботаническая, 7',
    });

    expect(KINO_PROJECTS.iuterra).toEqual({
      id: 5747,
      projectName: 'ЖК ЮТЕРРА',
      address: 'Кировская обл., ул. Творчества, 1',
    });

    expect(KINO_PROJECTS['gorkogo-2a']).toEqual({
      id: 1,
      projectName: 'Дом на Горького, 2А',
      address: 'г. Киров, ул. Горького, 2А',
    });
  });
});

describe('normalizeKinoLot', () => {
  const fusionConfig = KINO_PROJECTS.fusion;

  it('normalizes a 1-room flat with square <= 28 as studio', () => {
    const rawItem = {
      id: 1004,
      external_id: 17713901,
      slug: 'kvartira-odnokomnatnaya-25-kv-m-17713901',
      project_title: 'ФЬЮЖН',
      house_title: '4 очередь',
      price_base: '3392396',
      price_promotional: null,
      square: '25.05',
      status: 'AVAILABLE',
      rooms: 1,
      floor: 11,
      max_floor: 16,
      release_date: 'II кв. 2028 года',
      plan: {
        base_src: 'https://pb19240.profitbase.ru/uploads/preset/19240/plan-studio.jpg',
      },
    };

    const lot = normalizeKinoLot(rawItem, fusionConfig, 'fusion');

    expect(lot.external_id).toBe(17713901);
    expect(lot.id).toBe('17713901');
    expect(lot.room_type).toBe('studio');
    expect(lot.rooms_type).toBe('studio');
    expect(lot.rooms_label).toBe('Студия');
    expect(lot.rooms).toBe(1);
    expect(lot.area_m2).toBe(25.05);
    expect(lot.area).toBe(25.05);
    expect(lot.floor).toBe(11);
    expect(lot.total_floors).toBe(16);
    expect(lot.price_total).toBe(3392396);
    expect(lot.price).toBe(3392396);
    expect(lot.price_per_m2).toBe(Math.round(3392396 / 25.05));
    expect(lot.price_sqm).toBe(Math.round(3392396 / 25.05));
    expect(lot.section).toBe('4 очередь');
    expect(lot.completion_date).toBe('II кв. 2028 года');
    expect(lot.plan_url).toBe('https://pb19240.profitbase.ru/uploads/preset/19240/plan-studio.jpg');
    expect(lot.plan_image).toBe('https://pb19240.profitbase.ru/uploads/preset/19240/plan-studio.jpg');
    expect(lot.status).toBe('available');
    expect(lot.is_available).toBe(true);
    expect(lot.title).toBe('Студия, 25.05 м², 11 эт.');
    expect(lot.lot_url).toBe('https://kino-dev.ru/flats/kvartira-odnokomnatnaya-25-kv-m-17713901');
    expect(lot.project_slug).toBe('fusion');
    expect(lot.project_name).toBe('ЖК ФЬЮЖН');
    expect(lot.address).toBe('д. Шутовщина, ул. Ботаническая, 7 (4 очередь)');
  });

  it('normalizes a 1-room flat with square > 28 as 1k', () => {
    const rawItem = {
      id: 1005,
      external_id: 17713902,
      slug: 'kvartira-odnokomnatnaya-35-kv-m-17713902',
      house_title: '1 очередь',
      price_base: '4500000',
      price_promotional: '4300000',
      square: '35.5',
      rooms: 1,
      floor: 5,
      max_floor: 10,
      release_date: 'I кв. 2027 года',
      plan: { base_src: 'https://pb19240.profitbase.ru/plan1k.jpg' },
    };

    const lot = normalizeKinoLot(rawItem, KINO_PROJECTS.iuterra, 'iuterra');

    expect(lot.room_type).toBe('1');
    expect(lot.rooms_type).toBe('1k');
    expect(lot.rooms_label).toBe('1-комнатная');
    expect(lot.area_m2).toBe(35.5);
    expect(lot.price_total).toBe(4300000);
    expect(lot.price_per_m2).toBe(Math.round(4300000 / 35.5));
    expect(lot.title).toBe('1-комнатная, 35.5 м², 5 эт.');
  });

  it('normalizes multi-room flat and falls back to id if external_id is missing', () => {
    const rawItem = {
      id: 60,
      slug: 'flat-60',
      price_base: '12083000',
      square: '56.2',
      rooms: 2,
      floor: 8,
      max_floor: 10,
    };

    const lot = normalizeKinoLot(rawItem, KINO_PROJECTS['gorkogo-2a'], 'gorkogo-2a');

    expect(lot.external_id).toBe(60);
    expect(lot.id).toBe('60');
    expect(lot.room_type).toBe('2');
    expect(lot.rooms_type).toBe('2k');
    expect(lot.rooms_label).toBe('2-комнатная');
    expect(lot.price_total).toBe(12083000);
    expect(lot.price_per_m2).toBe(Math.round(12083000 / 56.2));
    expect(lot.section).toBe('');
    expect(lot.completion_date).toBe('');
    expect(lot.plan_url).toBe('');
    expect(lot.plan_image).toBeNull();
  });
});

describe('fetchKinoProjectFlats', () => {
  it('requests the public API with project ID and per_page=500', async () => {
    const mockJson = {
      data: [{ id: 1, rooms: 1, square: '24', price_base: '3000000' }],
      meta: { total: 1, last_page: 1 },
    };

    const fetchFn = vi.fn(async (url) => {
      expect(url).toContain('project=3');
      expect(url).toContain('per_page=500');
      return {
        ok: true,
        json: async () => mockJson,
      };
    });

    const result = await fetchKinoProjectFlats(3, { fetchFn });
    expect(fetchFn).toHaveBeenCalledTimes(1);
    expect(result.data).toHaveLength(1);
    expect(result.meta.total).toBe(1);
  });

  it('traverses subsequent pages if last_page > 1', async () => {
    const fetchFn = vi.fn(async (url) => {
      if (url.includes('page=1')) {
        return {
          ok: true,
          json: async () => ({
            data: [{ id: 1 }],
            meta: { total: 2, last_page: 2 },
          }),
        };
      }
      return {
        ok: true,
        json: async () => ({
          data: [{ id: 2 }],
          meta: { total: 2, last_page: 2 },
        }),
      };
    });

    const result = await fetchKinoProjectFlats(3, { fetchFn });
    expect(fetchFn).toHaveBeenCalledTimes(2);
    expect(result.data).toHaveLength(2);
  });

  it('throws an error when upstream returns non-ok status', async () => {
    const fetchFn = vi.fn(async () => ({
      ok: false,
      status: 503,
    }));

    await expect(fetchKinoProjectFlats(3, { fetchFn })).rejects.toThrow(
      'API КИНО девелопмент вернул статус 503'
    );
  });
});

describe('syncKinoProject', () => {
  it('rejects unknown project slugs with 400 error', async () => {
    const fakeSql = { query: vi.fn() };
    await expect(syncKinoProject('unknown-slug', fakeSql)).rejects.toMatchObject({
      message: 'Неизвестный проект КИНО девелопмент',
      statusCode: 400,
    });
  });

  it('fetches flats, normalizes them, and saves to repository', async () => {
    const fakeSql = { query: vi.fn(async () => []) };
    const fetchFn = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        data: [
          {
            id: 101,
            external_id: 201,
            rooms: 1,
            square: '25.0',
            price_base: '3000000',
            slug: 'flat-201',
          },
          {
            id: 102,
            external_id: 202,
            rooms: 2,
            square: '50.0',
            price_base: '5000000',
            slug: 'flat-202',
          },
        ],
        meta: { total: 2, last_page: 1 },
      }),
    }));

    const result = await syncKinoProject('fusion', fakeSql, { fetchFn });
    expect(result.projectSlug).toBe('fusion');
    expect(result.projectName).toBe('ЖК ФЬЮЖН');
    expect(result.syncedCount).toBe(2);
    expect(fakeSql.query).toHaveBeenCalled();
  });
});
