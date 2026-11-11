import { describe, it, expect } from 'vitest';
import {
  KSM_PROJECT_SLUGS,
  KSM_DEVELOPMENT_TO_SLUG,
  getKsmSlugForDevelopment,
  buildKsmSummaryByProject,
  filterAndSortKsmLots,
} from './ksmLots';

describe('ksmLots helpers', () => {
  describe('getKsmSlugForDevelopment', () => {
    it('maps all configured development IDs to KSM project slugs', () => {
      expect(KSM_PROJECT_SLUGS).toEqual([
        'siti-park',
        'vidnyy',
        'life',
        'zhk-river-park',
        'mkr-ozerki',
        'zhr-chistye-prudy',
      ]);

      expect(getKsmSlugForDevelopment({ id: 'zhk-city-park' })).toBe('siti-park');
      expect(getKsmSlugForDevelopment({ id: 'zhk-vidny' })).toBe('vidnyy');
      expect(getKsmSlugForDevelopment({ id: 'zhk-life-ksm' })).toBe('life');
      expect(getKsmSlugForDevelopment({ id: 'zhk-river-park' })).toBe('zhk-river-park');
      expect(getKsmSlugForDevelopment({ id: 'zhk-ozerki-ksm' })).toBe('mkr-ozerki');
      expect(getKsmSlugForDevelopment({ id: 'zhk-chistye-prudy' })).toBe('zhr-chistye-prudy');
      expect(getKsmSlugForDevelopment({ id: 'zhk-chistoprudnenskaya-11a' })).toBe('zhr-chistye-prudy');
      expect(Object.keys(KSM_DEVELOPMENT_TO_SLUG)).toHaveLength(7);
    });

    it('falls back to matching developer and project name keywords', () => {
      expect(
        getKsmSlugForDevelopment({
          id: 'custom-ksm-1',
          developer: 'Кировспецмонтаж (КСМ)',
          name: 'ЖК Озерки (новый дом)',
        })
      ).toBe('mkr-ozerki');

      expect(
        getKsmSlugForDevelopment({
          id: 'custom-ksm-2',
          developer: 'ООО СЗ КСМ',
          name: 'Квартал Лайф',
        })
      ).toBe('life');

      expect(
        getKsmSlugForDevelopment({
          id: 'custom-ksm-3',
          developer: 'Кировспецмонтаж',
          name: 'ЖК Сити Парк',
        })
      ).toBe('siti-park');

      expect(
        getKsmSlugForDevelopment({
          id: 'custom-ksm-4',
          developer: 'КСМ',
          name: 'Чистопрудненская 15',
        })
      ).toBe('zhr-chistye-prudy');
    });

    it('returns null for non-KSM developments or invalid input', () => {
      expect(getKsmSlugForDevelopment(null)).toBeNull();
      expect(getKsmSlugForDevelopment(undefined)).toBeNull();
      expect(
        getKsmSlugForDevelopment({
          id: 'zhk-znak',
          developer: 'Железно',
          name: 'ЖК ZNAK',
        })
      ).toBeNull();
      expect(
        getKsmSlugForDevelopment({
          id: 'zhk-unknown-ksm',
          developer: 'КСМ',
          name: 'Новый неизвестный проект',
        })
      ).toBeNull();
    });
  });

  describe('buildKsmSummaryByProject', () => {
    it('aggregates counts, min prices, room breakdown and sync metadata per project', () => {
      const lots = [
        {
          id: '101',
          project_slug: 'mkr-ozerki',
          rooms_type: '1k',
          price: 4500000,
          price_sqm: 120000,
          is_available: true,
        },
        {
          id: '102',
          project_slug: 'mkr-ozerki',
          rooms_type: 'studio',
          price: 4187700,
          price_sqm: 135000,
          is_available: true,
        },
        {
          id: '103',
          project_slug: 'mkr-ozerki',
          rooms_type: '2k',
          price: 5900000,
          price_sqm: 115000,
          is_available: true,
        },
        {
          id: '201',
          project_slug: 'vidnyy',
          rooms_type: '3k',
          price: 13200000,
          price_sqm: 154000,
          is_available: true,
        },
        {
          id: '202',
          project_slug: 'vidnyy',
          rooms_type: '4k',
          price: 18500000,
          price_sqm: 170000,
          is_available: false,
        },
      ];

      const projectsMeta = [
        {
          projectSlug: 'mkr-ozerki',
          totalCount: 48,
          syncedCount: 3,
          lastSyncedAt: '2026-11-11T09:00:00Z',
          status: 'ok',
          errorMessage: null,
        },
        {
          projectSlug: 'siti-park',
          totalCount: 0,
          syncedCount: 0,
          lastSyncedAt: '2026-11-11T08:55:00Z',
          status: 'error',
          errorMessage: 'Timeout',
        },
      ];

      const summary = buildKsmSummaryByProject(lots, projectsMeta);

      expect(summary['mkr-ozerki']).toEqual({
        syncedCount: 3,
        totalCount: 48,
        minPrice: 4187700,
        minPriceSqm: 115000,
        lastSyncedAt: '2026-11-11T09:00:00Z',
        status: 'ok',
        errorMessage: null,
        byRoomType: {
          studio: 1,
          '1k': 1,
          '2k': 1,
          '3k': 0,
          '4k': 0,
        },
      });

      expect(summary['vidnyy']).toEqual({
        syncedCount: 1,
        totalCount: 1,
        minPrice: 13200000,
        minPriceSqm: 154000,
        lastSyncedAt: null,
        status: 'idle',
        errorMessage: null,
        byRoomType: {
          studio: 0,
          '1k': 0,
          '2k': 0,
          '3k': 1,
          '4k': 0,
        },
      });

      expect(summary['siti-park']).toEqual({
        syncedCount: 0,
        totalCount: 0,
        minPrice: null,
        minPriceSqm: null,
        lastSyncedAt: '2026-11-11T08:55:00Z',
        status: 'error',
        errorMessage: 'Timeout',
        byRoomType: {
          studio: 0,
          '1k': 0,
          '2k': 0,
          '3k': 0,
          '4k': 0,
        },
      });
    });

    it('returns empty map when lots and metadata are empty', () => {
      expect(buildKsmSummaryByProject([], [])).toEqual({});
    });
  });

  describe('filterAndSortKsmLots', () => {
    const sampleLots = [
      {
        id: '1',
        title: '1-комнатная, 38.5 м²',
        rooms_type: '1k',
        area: 38.5,
        floor: 7,
        flat_number: '45',
        address: 'ул. Торфяная, 13в',
        finishing: 'Чистовая',
        price: 4500000,
      },
      {
        id: '2',
        title: 'Студия, 27.0 м²',
        rooms_type: 'studio',
        area: 27.0,
        floor: 3,
        flat_number: '12',
        address: 'ул. Торфяная, 13в',
        finishing: 'Черновая',
        price: 4187700,
      },
      {
        id: '3',
        title: '2-комнатная, 58.2 м²',
        rooms_type: '2k',
        area: 58.2,
        floor: 14,
        flat_number: '108',
        address: 'Прибрежный бульвар, 6/2',
        finishing: 'White box',
        price: 6900000,
      },
    ];

    it('filters by roomType', () => {
      const res = filterAndSortKsmLots(sampleLots, { roomType: '1k' });
      expect(res.map((l) => l.id)).toEqual(['1']);

      const all = filterAndSortKsmLots(sampleLots, { roomType: 'all' });
      expect(all).toHaveLength(3);
    });

    it('filters by search across title, address, flat_number and finishing', () => {
      expect(filterAndSortKsmLots(sampleLots, { search: '108' }).map((l) => l.id)).toEqual(['3']);
      expect(filterAndSortKsmLots(sampleLots, { search: 'прибрежный' }).map((l) => l.id)).toEqual(['3']);
      expect(filterAndSortKsmLots(sampleLots, { search: 'черновая' }).map((l) => l.id)).toEqual(['2']);
      expect(filterAndSortKsmLots(sampleLots, { search: 'студия' }).map((l) => l.id)).toEqual(['2']);
    });

    it('sorts by price_asc, price_desc, area_asc and floor_asc without mutating input', () => {
      const originalOrder = sampleLots.map((l) => l.id);

      expect(filterAndSortKsmLots(sampleLots, { sortBy: 'price_asc' }).map((l) => l.id)).toEqual(['2', '1', '3']);
      expect(filterAndSortKsmLots(sampleLots, { sortBy: 'price_desc' }).map((l) => l.id)).toEqual(['3', '1', '2']);
      expect(filterAndSortKsmLots(sampleLots, { sortBy: 'area_asc' }).map((l) => l.id)).toEqual(['2', '1', '3']);
      expect(filterAndSortKsmLots(sampleLots, { sortBy: 'floor_asc' }).map((l) => l.id)).toEqual(['2', '1', '3']);

      expect(sampleLots.map((l) => l.id)).toEqual(originalOrder);
    });
  });
});
