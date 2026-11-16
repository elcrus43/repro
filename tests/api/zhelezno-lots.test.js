import { describe, it, expect, vi } from 'vitest';
import {
  config,
  ZHELEZNO_PROJECTS,
  ZHELEZNO_PROJECT_ALIASES,
  resolveZheleznoProjectSlug,
  normalizeZheleznoLot,
  fetchZheleznoAllLots,
  syncZheleznoProject,
} from '../../api/_zhelezno-lots.js';
import {
  getZheleznoSlugForDevelopment,
  ZHELEZNO_PROJECT_SLUGS,
  ZHELEZNO_PROJECT_NAMES,
} from '../../src/lib/zheleznoLots.js';

describe('zhelezno-lots config and catalog', () => {
  it('exports maxDuration 60', () => {
    expect(config).toEqual({ maxDuration: 60 });
  });

  it('defines ZHELEZNO_PROJECTS with all 4 active projects in Kirov', () => {
    expect(Object.keys(ZHELEZNO_PROJECTS)).toEqual([
      'bulychev',
      'zaryadnoe',
      'znak_kirov',
      'innograd',
    ]);

    expect(ZHELEZNO_PROJECTS.bulychev.id).toBe(41);
    expect(ZHELEZNO_PROJECTS.zaryadnoe.id).toBe(43);
    expect(ZHELEZNO_PROJECTS.znak_kirov.id).toBe(47);
    expect(ZHELEZNO_PROJECTS.innograd.id).toBe(56);
  });

  it('resolves aliases properly', () => {
    expect(resolveZheleznoProjectSlug('bulychev')).toBe('bulychev');
    expect(resolveZheleznoProjectSlug('zhk-bulychev')).toBe('bulychev');
    expect(resolveZheleznoProjectSlug('dom-bulychev')).toBe('bulychev');
    expect(resolveZheleznoProjectSlug('zhk-zaryadnoe')).toBe('zaryadnoe');
    expect(resolveZheleznoProjectSlug('znak')).toBe('znak_kirov');
    expect(resolveZheleznoProjectSlug('zhk-znak')).toBe('znak_kirov');
    expect(resolveZheleznoProjectSlug('zhk-innograd')).toBe('innograd');
    expect(resolveZheleznoProjectSlug('unknown')).toBe('unknown');
    expect(resolveZheleznoProjectSlug(null)).toBeNull();
  });
});

describe('normalizeZheleznoLot', () => {
  const zaryadnoeConfig = ZHELEZNO_PROJECTS.zaryadnoe;

  it('normalizes a 3-room flat with building and plans', () => {
    const raw = {
      id: 33820,
      name: '2+ комнаты, 81 м2',
      number: '80',
      area: '81.49',
      price: '12505129.00',
      price_per_meter: '166800.00',
      rooms: 3,
      custom_rooms: '3e',
      plan_png: 'https://storage.yandexcloud.net/zhelezno-media/sample.png',
      building: { number: '4/1' },
      floor: { number: 7 },
    };

    const lot = normalizeZheleznoLot(raw, zaryadnoeConfig, 'zaryadnoe');
    expect(lot.id).toBe('zhelezno-33820');
    expect(lot.project_slug).toBe('zaryadnoe');
    expect(lot.rooms_type).toBe('3k');
    expect(lot.rooms_label).toBe('3-комнатная');
    expect(lot.area).toBe(81.49);
    expect(lot.floor).toBe(7);
    expect(lot.flat_number).toBe('80');
    expect(lot.price).toBe(12505129);
    expect(lot.price_sqm).toBe(166800);
    expect(lot.address).toContain('д. 4/1');
    expect(lot.plan_image).toBe('https://storage.yandexcloud.net/zhelezno-media/sample.png');
    expect(lot.is_available).toBe(true);
  });

  it('handles studio when rooms is 0', () => {
    const raw = {
      id: 99999,
      name: 'Студия, 25 м2',
      number: '12',
      area: '25.30',
      price: '4200000.00',
      rooms: 0,
      custom_rooms: '0',
      floor: { number: 3 },
    };

    const lot = normalizeZheleznoLot(raw, zaryadnoeConfig, 'zaryadnoe');
    expect(lot.rooms_type).toBe('studio');
    expect(lot.rooms_label).toBe('Студия');
    expect(lot.price).toBe(4200000);
    expect(lot.price_sqm).toBe(Math.round(4200000 / 25.3));
  });
});

describe('fetchZheleznoAllLots', () => {
  it('fetches and groups lots by project using mock fetch', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        results: [
          { id: 1, number: '10', rooms: 1, area: '38.0', price: '5000000', project: { slug: 'bulychev' } },
          { id: 2, number: '20', rooms: 2, area: '58.0', price: '8000000', project: { slug: 'zaryadnoe' } },
        ],
      }),
    });

    const grouped = await fetchZheleznoAllLots(mockFetch, true);
    expect(grouped.bulychev).toHaveLength(1);
    expect(grouped.bulychev[0].id).toBe('zhelezno-1');
    expect(grouped.zaryadnoe).toHaveLength(1);
    expect(grouped.zaryadnoe[0].id).toBe('zhelezno-2');
    expect(grouped.innograd).toHaveLength(0);
  });
});

describe('client helper getZheleznoSlugForDevelopment', () => {
  it('matches by development id', () => {
    expect(getZheleznoSlugForDevelopment({ id: 'zhk-bulychev' })).toBe('bulychev');
    expect(getZheleznoSlugForDevelopment({ id: 'zhk-zaryadnoe' })).toBe('zaryadnoe');
    expect(getZheleznoSlugForDevelopment({ id: 'zhk-znak' })).toBe('znak_kirov');
    expect(getZheleznoSlugForDevelopment({ id: 'zhk-innograd' })).toBe('innograd');
  });

  it('matches by developer and name/address', () => {
    expect(
      getZheleznoSlugForDevelopment({
        developer: 'Девелопер «Железно»',
        name: 'Дом Булычев',
        address: 'г. Киров, ул. Свободы, 28',
      })
    ).toBe('bulychev');

    expect(
      getZheleznoSlugForDevelopment({
        developer: 'Железно',
        name: 'ЖК Зарядное',
        address: 'г. Киров, ул. 4-й Пятилетки',
      })
    ).toBe('zaryadnoe');

    expect(
      getZheleznoSlugForDevelopment({
        developer: 'Железно',
        name: 'Город ZNAK',
        address: 'г. Киров, ул. Капитана Дорофеева',
      })
    ).toBe('znak_kirov');

    expect(
      getZheleznoSlugForDevelopment({
        developer: 'Железно',
        name: 'Инноград',
        address: 'г. Киров, ул. Песочная',
      })
    ).toBe('innograd');
  });

  it('returns null for non-zhelezno developments', () => {
    expect(getZheleznoSlugForDevelopment({ developer: 'КСМ', name: 'ЖК Life' })).toBeNull();
    expect(getZheleznoSlugForDevelopment(null)).toBeNull();
  });
});
