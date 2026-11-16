import { describe, it, expect, vi } from 'vitest';
import {
  config,
  SMU5_PROJECTS,
  SMU5_PROJECT_ALIASES,
  resolveSmu5ProjectSlug,
  normalizeSmu5Lot,
  fetchSmu5ProjectLots,
  syncSmu5Project,
} from '../../api/_smu5-lots.js';
import {
  getSmu5SlugForDevelopment,
  SMU5_PROJECT_SLUGS,
  SMU5_PROJECT_NAMES,
} from '../../src/lib/smu5Lots.js';

describe('smu5-lots config and catalog', () => {
  it('exports maxDuration 60', () => {
    expect(config).toEqual({ maxDuration: 60 });
  });

  it('defines SMU5_PROJECTS with all 3 active projects in sales', () => {
    expect(Object.keys(SMU5_PROJECTS)).toEqual([
      'mayak',
      'sovremennik',
      'rudnitskogo',
    ]);

    expect(SMU5_PROJECTS.mayak.code).toBe('585-0lS8wH');
    expect(SMU5_PROJECTS.sovremennik.code).toBe('585-MYYRQ3');
    expect(SMU5_PROJECTS.rudnitskogo.code).toBe('585-njXV2j');
  });

  it('resolves aliases properly', () => {
    expect(resolveSmu5ProjectSlug('mayak')).toBe('mayak');
    expect(resolveSmu5ProjectSlug('zhk-mayak')).toBe('mayak');
    expect(resolveSmu5ProjectSlug('dom-maiak')).toBe('mayak');
    expect(resolveSmu5ProjectSlug('dom-sovremennik')).toBe('sovremennik');
    expect(resolveSmu5ProjectSlug('klubnyi-dom-na-rudnitskogo')).toBe('rudnitskogo');
    expect(resolveSmu5ProjectSlug('zhk-rudnitskogo-32')).toBe('rudnitskogo');
    expect(resolveSmu5ProjectSlug('unknown')).toBe('unknown');
    expect(resolveSmu5ProjectSlug(null)).toBeNull();
  });
});

describe('normalizeSmu5Lot', () => {
  const mayakConfig = SMU5_PROJECTS.mayak;

  it('normalizes a 1-room flat with discount and plan image', () => {
    const raw = {
      id: 717310,
      number: '25',
      main_area: 29.85,
      area: 29.85,
      rooms: 1,
      price: 7611750,
      price_with_discount: 7111750,
      metr_price: 238250,
      floor_number: 6,
      status: 0,
      image: 'https://storage.yandexcloud.net/domoplaner/devmedia/585/sample.jpg',
    };

    const lot = normalizeSmu5Lot(raw, mayakConfig, 'mayak');
    expect(lot.id).toBe('smu5-717310');
    expect(lot.project_slug).toBe('mayak');
    expect(lot.rooms_type).toBe('1k');
    expect(lot.rooms_label).toBe('1-комнатная');
    expect(lot.area).toBe(29.85);
    expect(lot.floor).toBe(6);
    expect(lot.flat_number).toBe('25');
    expect(lot.price).toBe(7111750);
    expect(lot.price_sqm).toBe(238250);
    expect(lot.plan_image).toBe('https://storage.yandexcloud.net/domoplaner/devmedia/585/sample.jpg');
    expect(lot.is_available).toBe(true);
  });

  it('handles studio flag or small area without rooms', () => {
    const raw = {
      id: 99901,
      number: '1',
      area: 24.5,
      is_studio: 1,
      rooms: 0,
      price: 4500000,
      floor_number: 2,
    };

    const lot = normalizeSmu5Lot(raw, mayakConfig, 'mayak');
    expect(lot.rooms_type).toBe('studio');
    expect(lot.rooms_label).toBe('Студия');
    expect(lot.price).toBe(4500000);
    expect(lot.price_sqm).toBe(Math.round(4500000 / 24.5));
  });
});

describe('fetchSmu5ProjectLots', () => {
  it('throws on unknown project', async () => {
    await expect(fetchSmu5ProjectLots('unknown')).rejects.toThrow('Неизвестный проект СМУ-5');
  });

  it('fetches and filters free lots using mock fetch', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        flats: [
          { id: 1, number: '10', rooms: 1, area: 35.0, price: 5000000, status: 0 },
          { id: 2, number: '11', rooms: 2, area: 55.0, price: 8000000, status: 1 }, // not 0 (e.g. sold)
        ],
      }),
    });

    const lots = await fetchSmu5ProjectLots('mayak', mockFetch);
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('domoplaner.ru/widget-api/widget/c/585-0lS8wH/'),
      expect.any(Object)
    );
    expect(lots).toHaveLength(1);
    expect(lots[0].id).toBe('smu5-1');
    expect(lots[0].flat_number).toBe('10');
  });
});

describe('client helper getSmu5SlugForDevelopment', () => {
  it('matches by development id', () => {
    expect(getSmu5SlugForDevelopment({ id: 'zhk-mayak' })).toBe('mayak');
    expect(getSmu5SlugForDevelopment({ id: 'zhk-sovremennik' })).toBe('sovremennik');
    expect(getSmu5SlugForDevelopment({ id: 'zhk-rudnitskogo-32' })).toBe('rudnitskogo');
  });

  it('matches by developer and name/address', () => {
    expect(
      getSmu5SlugForDevelopment({
        developer: 'Специализированный застройщик «СМУ-5»',
        name: 'Жилой дом Маяк',
        address: 'г. Киров, Молодой Гвардии, 84/4',
      })
    ).toBe('mayak');

    expect(
      getSmu5SlugForDevelopment({
        developer: 'СМУ-5',
        name: 'Современник',
        address: 'г. Киров, ул. Хлыновская, 21',
      })
    ).toBe('sovremennik');

    expect(
      getSmu5SlugForDevelopment({
        developer: 'СМУ 5',
        name: 'Клубный дом на Рудницкого, 32',
        address: 'г. Киров, ул. Рудницкого',
      })
    ).toBe('rudnitskogo');
  });

  it('returns null for non-smu5 developments', () => {
    expect(getSmu5SlugForDevelopment({ developer: 'КСМ', name: 'ЖК Life' })).toBeNull();
    expect(getSmu5SlugForDevelopment(null)).toBeNull();
  });
});
