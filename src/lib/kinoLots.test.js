import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  KINO_PROJECT_KEYS,
  KINO_PROJECT_SLUGS,
  KINO_PROJECT_NAMES,
  KINO_DEVELOPMENT_TO_SLUG,
  getKinoSlugForDevelopment,
  buildKinoSummaryByProject,
  filterAndSortKinoLots,
  fetchKinoLots,
  syncKinoProject,
  getKinoProjectStats,
} from './kinoLots';

describe('kinoLots', () => {
  describe('constants and project keys', () => {
    it('defines KINO_PROJECT_KEYS correctly', () => {
      expect(KINO_PROJECT_KEYS).toEqual(['fusion', 'iuterra', 'gorkogo-2a']);
      expect(KINO_PROJECT_SLUGS).toEqual(KINO_PROJECT_KEYS);
      expect(Object.keys(KINO_PROJECT_NAMES)).toEqual(['fusion', 'iuterra', 'gorkogo-2a']);
    });
  });

  describe('getKinoSlugForDevelopment', () => {
    it('maps configured development IDs to KINO slugs', () => {
      expect(getKinoSlugForDevelopment({ id: 'zhk-fusion-kino' })).toBe('fusion');
      expect(getKinoSlugForDevelopment({ id: 'zhk-yuterra' })).toBe('iuterra');
      expect(getKinoSlugForDevelopment({ id: 'zhk-gorkogo-2a' })).toBe('gorkogo-2a');
      expect(getKinoSlugForDevelopment({ id: 'fusion' })).toBe('fusion');
      expect(getKinoSlugForDevelopment({ id: 'iuterra' })).toBe('iuterra');
      expect(getKinoSlugForDevelopment({ id: 'gorkogo-2a' })).toBe('gorkogo-2a');
    });

    it('falls back to matching developer and project name keywords', () => {
      expect(
        getKinoSlugForDevelopment({
          id: 'custom-kino-1',
          developer: 'КИНО Девелопмент',
          name: 'ЖК Fusion (Фьюжн) очередь 2',
        })
      ).toBe('fusion');

      expect(
        getKinoSlugForDevelopment({
          id: 'custom-kino-2',
          developer: 'КИНО Девелопмент',
          name: 'Жилой квартал Ютерра',
        })
      ).toBe('iuterra');

      expect(
        getKinoSlugForDevelopment({
          id: 'custom-kino-3',
          developer: 'КИНО Девелопмент',
          name: 'Дом на Горького, 2А',
        })
      ).toBe('gorkogo-2a');

      expect(
        getKinoSlugForDevelopment({
          id: 'custom-kino-4',
          developer: 'Kino Development',
          name: 'Gorkogo 2A Residence',
        })
      ).toBe('gorkogo-2a');
    });

    it('returns null for non-KINO developments or invalid input', () => {
      expect(getKinoSlugForDevelopment(null)).toBeNull();
      expect(getKinoSlugForDevelopment(undefined)).toBeNull();
      expect(getKinoSlugForDevelopment({})).toBeNull();
      expect(
        getKinoSlugForDevelopment({
          id: 'zhk-metro',
          developer: 'Кировский ССК',
          name: 'ЖК Метро',
        })
      ).toBeNull();
      expect(
        getKinoSlugForDevelopment({
          id: 'other-id',
          developer: 'КИНО Девелопмент',
          name: 'Неизвестный объект',
        })
      ).toBeNull();
    });
  });

  describe('buildKinoSummaryByProject and filterAndSortKinoLots', () => {
    const sampleLots = [
      {
        id: 'kino-1',
        project_slug: 'fusion',
        title: 'Студия, 25.4 м²',
        rooms_type: 'studio',
        area: 25.4,
        floor: 3,
        flat_number: '12',
        address: 'д. Шутовщина, ул. Ботаническая, 7',
        finishing: 'Чистовая',
        price: 3420000,
        price_sqm: 134645,
        is_available: true,
      },
      {
        id: 'kino-2',
        project_slug: 'fusion',
        title: '1-комнатная, 38.2 м²',
        rooms_type: '1k',
        area: 38.2,
        floor: 6,
        flat_number: '45',
        address: 'д. Шутовщина, ул. Ботаническая, 7',
        finishing: 'Черновая',
        price: 4350000,
        price_sqm: 113874,
        is_available: true,
      },
      {
        id: 'kino-3',
        project_slug: 'gorkogo-2a',
        title: '2-комнатная, 68.5 м²',
        rooms_type: '2k',
        area: 68.5,
        floor: 4,
        flat_number: '18',
        address: 'г. Киров, ул. Горького, 2А',
        finishing: 'White box',
        price: 12330000,
        price_sqm: 180000,
        is_available: true,
      },
      {
        id: 'kino-4',
        project_slug: 'gorkogo-2a',
        title: '2-комнатная (продана)',
        rooms_type: '2k',
        area: 68.5,
        floor: 5,
        price: 12500000,
        is_available: false,
      },
    ];

    it('aggregates project summary statistics correctly', () => {
      const projectsMeta = [
        { projectSlug: 'fusion', totalCount: 2, syncedCount: 2, status: 'ok', lastSyncedAt: '2026-11-13T09:00:00Z' },
        { projectSlug: 'gorkogo-2a', totalCount: 1, syncedCount: 1, status: 'ok' },
        { projectSlug: 'iuterra', totalCount: 0, syncedCount: 0, status: 'idle' },
      ];

      const summary = buildKinoSummaryByProject(sampleLots, projectsMeta);

      expect(summary.fusion.syncedCount).toBe(2);
      expect(summary.fusion.minPrice).toBe(3420000);
      expect(summary.fusion.byRoomType.studio).toBe(1);
      expect(summary.fusion.byRoomType['1k']).toBe(1);
      expect(summary.fusion.byRoomType['2k']).toBe(0);

      expect(summary['gorkogo-2a'].syncedCount).toBe(1);
      expect(summary['gorkogo-2a'].minPrice).toBe(12330000);
      expect(summary['gorkogo-2a'].byRoomType['2k']).toBe(1);

      expect(summary.iuterra.syncedCount).toBe(0);
      expect(summary.iuterra.minPrice).toBeNull();
    });

    it('filters lots by roomType and search query', () => {
      const filteredRoom = filterAndSortKinoLots(sampleLots, { roomType: 'studio' });
      expect(filteredRoom).toHaveLength(1);
      expect(filteredRoom[0].id).toBe('kino-1');

      const filteredSearch = filterAndSortKinoLots(sampleLots, { search: 'горького' });
      expect(filteredSearch).toHaveLength(1);
      expect(filteredSearch[0].id).toBe('kino-3');
    });

    it('sorts lots by price ascending and descending', () => {
      const sortedAsc = filterAndSortKinoLots(sampleLots, { sortBy: 'price_asc' });
      expect(sortedAsc.map((l) => l.id)).toEqual(['kino-1', 'kino-2', 'kino-3', 'kino-4']);

      const sortedDesc = filterAndSortKinoLots(sampleLots, { sortBy: 'price_desc' });
      expect(sortedDesc.map((l) => l.id)).toEqual(['kino-4', 'kino-3', 'kino-2', 'kino-1']);
    });
  });

  describe('fetchKinoLots, syncKinoProject and getKinoProjectStats', () => {
    const originalFetch = globalThis.fetch;

    beforeEach(() => {
      vi.restoreAllMocks();
    });

    afterEach(() => {
      globalThis.fetch = originalFetch;
    });

    it('fetchKinoLots calls endpoint and returns parsed payload', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          data: {
            configured: true,
            projects: [{ projectSlug: 'fusion', syncedCount: 1 }],
            lots: [{ id: 'kino-1', project_slug: 'fusion', price: 3420000, is_available: true }],
          },
        }),
      });

      const res = await fetchKinoLots('fusion');
      expect(globalThis.fetch).toHaveBeenCalled();
      expect(res.configured).toBe(true);
      expect(res.lots).toHaveLength(1);
      expect(res.lots[0].id).toBe('kino-1');
    });

    it('syncKinoProject sends action: syncProject via POST', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          data: {
            projectSlug: 'fusion',
            syncedCount: 5,
            status: 'ok',
          },
        }),
      });

      const res = await syncKinoProject('fusion');
      expect(globalThis.fetch).toHaveBeenCalled();
      expect(res.projectSlug).toBe('fusion');
      expect(res.syncedCount).toBe(5);
    });

    it('getKinoProjectStats computes stats for specified project', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          data: {
            configured: true,
            projects: [{ projectSlug: 'fusion', syncedCount: 1, totalCount: 1 }],
            lots: [
              {
                id: 'kino-1',
                project_slug: 'fusion',
                rooms_type: 'studio',
                price: 3420000,
                price_sqm: 134645,
                is_available: true,
              },
            ],
          },
        }),
      });

      const stats = await getKinoProjectStats('fusion');
      expect(stats).toBeTruthy();
      expect(stats.syncedCount).toBe(1);
      expect(stats.minPrice).toBe(3420000);
      expect(stats.byRoomType.studio).toBe(1);

      const allStats = await getKinoProjectStats();
      expect(allStats.fusion).toBeTruthy();
    });
  });
});
