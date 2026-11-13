import { describe, it, expect, vi } from 'vitest';
import {
  config,
  AVITEK_PROJECTS,
  resolveAvitekProjectSlug,
  normalizeAvitekLot,
  fetchAvitekProjectLots,
  syncAvitekProject,
} from '../../api/avitek-lots.js';

describe('avitek-lots config and projects catalog', () => {
  it('exports maxDuration 60', () => {
    expect(config).toEqual({ maxDuration: 60 });
  });

  it('defines AVITEK_PROJECTS mapping with three official projects', () => {
    expect(Object.keys(AVITEK_PROJECTS)).toEqual([
      'zhk-na-popova',
      'dom-na-ul-sovestkaya-75',
      'dom-na-ul-romana-erdyakova-19a',
    ]);

    expect(AVITEK_PROJECTS['zhk-na-popova']).toEqual({
      id: 86,
      entrances: [60, 64],
      projectName: 'ЖК Крылья на Попова, 5-7',
      address: 'г. Киров, ул. Ивана Попова, 5-7',
    });

    expect(AVITEK_PROJECTS['dom-na-ul-sovestkaya-75']).toEqual({
      id: 88,
      entrances: [63],
      projectName: 'Дом на ул. Советская, 75',
      address: 'г. Киров, ул. Советская, 75',
    });

    expect(AVITEK_PROJECTS['dom-na-ul-romana-erdyakova-19a']).toEqual({
      id: 89,
      entrances: [65],
      projectName: 'Дом на ул. Романа Ердякова, 19а',
      address: 'г. Киров, ул. Романа Ердякова, 19а',
    });
  });

  it('resolves aliases correctly', () => {
    expect(resolveAvitekProjectSlug('krylya')).toBe('zhk-na-popova');
    expect(resolveAvitekProjectSlug('sovetskaya-75')).toBe('dom-na-ul-sovestkaya-75');
    expect(resolveAvitekProjectSlug('erdyakova-19a')).toBe('dom-na-ul-romana-erdyakova-19a');
    expect(resolveAvitekProjectSlug('zhk-na-popova')).toBe('zhk-na-popova');
  });
});

describe('normalizeAvitekLot', () => {
  const popovaConfig = AVITEK_PROJECTS['zhk-na-popova'];

  it('normalizes studio when rooms === 100 or area <= 28', () => {
    const rawStudio100 = {
      apartament_id: 5601,
      number: 1,
      rooms: 100,
      area: 26.5,
      floor: '3',
      price: 3100000,
      status: 1,
    };
    const lot1 = normalizeAvitekLot(rawStudio100, popovaConfig, 'zhk-na-popova');
    expect(lot1.rooms_type).toBe('studio');
    expect(lot1.rooms_label).toBe('Студия');
    expect(lot1.status).toBe('available');
    expect(lot1.is_available).toBe(true);

    const rawStudioSmallArea = {
      apartament_id: 5602,
      number: 2,
      rooms: 1,
      area: 25.0,
      floor: '4',
      price: 3000000,
      status: 2,
    };
    const lot2 = normalizeAvitekLot(rawStudioSmallArea, popovaConfig, 'zhk-na-popova');
    expect(lot2.rooms_type).toBe('studio');
    expect(lot2.status).toBe('reserved');
  });

  it('normalizes multi-room apartments and attaches room details', () => {
    const rawApt = {
      apartament_id: 5610,
      number: 45,
      rooms: 2,
      area: '54.8',
      floor: '7',
      price: 6500000,
      status: 1,
    };
    const details = {
      img: '/media/Estate/ApartmentImage/2024-03-14/test.jpg',
      info: 'Получистовая',
    };

    const lot = normalizeAvitekLot(rawApt, popovaConfig, 'zhk-na-popova', details);
    expect(lot.id).toBe('5610');
    expect(lot.flat_number).toBe('45');
    expect(lot.rooms_type).toBe('2k');
    expect(lot.rooms_label).toBe('2-комнатная');
    expect(lot.area).toBe(54.8);
    expect(lot.floor).toBe(7);
    expect(lot.price).toBe(6500000);
    expect(lot.price_sqm).toBe(Math.round(6500000 / 54.8));
    expect(lot.finishing).toBe('Получистовая');
    expect(lot.plan_image).toBe('https://uksavitek.ru/media/Estate/ApartmentImage/2024-03-14/test.jpg');
    expect(lot.title).toBe('2-комнатная, 54.8 м², 7 эт.');
  });
});

describe('fetchAvitekProjectLots', () => {
  it('fetches across entrances and filters out sold apartments (status 3)', async () => {
    const mockFetch = vi.fn().mockImplementation((url) => {
      const isEntrance60 = url.includes('entrance=60');
      return Promise.resolve({
        ok: true,
        json: async () => ({
          apartments: {
            1: [
              { apartament_id: 101, status: 1, rooms: 1, area: 35, floor: 1, number: 1, price: 4000000 },
              { apartament_id: 102, status: 3, rooms: 2, area: 55, floor: 1, number: 2, price: 5500000 }, // sold
            ],
            2: [
              { apartament_id: 103, status: 2, rooms: 3, area: 75, floor: 2, number: 3, price: 7500000 },
            ],
          },
        }),
      });
    });

    const lots = await fetchAvitekProjectLots(AVITEK_PROJECTS['dom-na-ul-sovestkaya-75'], {
      fetchFn: mockFetch,
    });

    expect(lots.length).toBe(2);
    expect(lots.map((l) => l.apartament_id)).toEqual([101, 103]);
  });
});

describe('syncAvitekProject', () => {
  it('deduplicates apartments by id and saves lots via repository', async () => {
    const mockFetch = vi.fn().mockImplementation(() =>
      Promise.resolve({
        ok: true,
        json: async () => ({
          apartments: {
            1: [
              { apartament_id: 201, status: 1, rooms: 1, area: 38, floor: 2, number: 5, price: 4500000 },
              { apartament_id: 201, status: 1, rooms: 1, area: 38, floor: 2, number: 5, price: 4500000 }, // duplicate
            ],
          },
        }),
      })
    );

    const mockSql = {
      query: vi.fn().mockImplementation(async (queryText) => {
        if (queryText.includes('CREATE TABLE') || queryText.includes('CREATE INDEX')) {
          return [];
        }
        if (queryText.includes('INSERT INTO avitek_sync_meta')) {
          return [{ last_synced_at: '2026-11-13T12:00:00Z' }];
        }
        if (queryText.includes('SELECT * FROM avitek_lots')) {
          return [
            {
              id: '201',
              project_slug: 'dom-na-ul-sovestkaya-75',
              project_name: 'Дом на ул. Советская, 75',
              title: '1-комнатная, 38 м², 2 эт.',
              rooms_label: '1-комнатная',
              rooms_type: '1k',
              area: 38,
              floor: 2,
              flat_number: '5',
              price: 4500000,
              price_sqm: Math.round(4500000 / 38),
              is_available: true,
            },
          ];
        }
        return [];
      }),
    };

    const res = await syncAvitekProject('dom-na-ul-sovestkaya-75', mockSql, {
      fetchFn: mockFetch,
      skipDetails: true,
    });

    expect(res.projectSlug).toBe('dom-na-ul-sovestkaya-75');
    expect(res.syncedCount).toBe(1);
    expect(res.lots[0].id).toBe('201');
  });
});
