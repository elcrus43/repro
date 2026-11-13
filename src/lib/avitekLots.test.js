import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  AVITEK_PROJECT_KEYS,
  AVITEK_PROJECT_SLUGS,
  AVITEK_PROJECT_NAMES,
  AVITEK_DEVELOPMENT_TO_SLUG,
  getAvitekSlugForDevelopment,
  buildAvitekSummaryByProject,
  filterAndSortAvitekLots,
  fetchAvitekLots,
  syncAvitekProject,
  getAvitekProjectStats,
} from './avitekLots';

describe('avitekLots', () => {
  describe('constants and project keys', () => {
    it('defines AVITEK_PROJECT_KEYS correctly', () => {
      expect(AVITEK_PROJECT_KEYS).toEqual(['krylya', 'sovetskaya-75', 'erdyakova-19a']);
      expect(AVITEK_PROJECT_SLUGS).toEqual(AVITEK_PROJECT_KEYS);
      expect(Object.keys(AVITEK_PROJECT_NAMES)).toEqual(['krylya', 'sovetskaya-75', 'erdyakova-19a']);
    });
  });

  describe('getAvitekSlugForDevelopment', () => {
    it('maps configured development IDs to AVITEK slugs', () => {
      expect(getAvitekSlugForDevelopment({ id: 'zhk-krylya' })).toBe('krylya');
      expect(getAvitekSlugForDevelopment({ id: 'zhk-sovetskaya-75' })).toBe('sovetskaya-75');
      expect(getAvitekSlugForDevelopment({ id: 'zhk-erdyakova-19a' })).toBe('erdyakova-19a');
      expect(getAvitekSlugForDevelopment({ id: 'krylya' })).toBe('krylya');
      expect(getAvitekSlugForDevelopment({ id: 'sovetskaya-75' })).toBe('sovetskaya-75');
      expect(getAvitekSlugForDevelopment({ id: 'erdyakova-19a' })).toBe('erdyakova-19a');
    });

    it('falls back to matching developer and project name keywords', () => {
      expect(
        getAvitekSlugForDevelopment({
          id: 'custom-avitek-1',
          developer: 'УКС АВИТЕК',
          name: 'ЖК Крылья на Попова, 5-7',
        })
      ).toBe('krylya');

      expect(
        getAvitekSlugForDevelopment({
          id: 'custom-avitek-2',
          developer: 'УКС АВИТЕК',
          name: 'Дом на Советской, 75',
        })
      ).toBe('sovetskaya-75');

      expect(
        getAvitekSlugForDevelopment({
          id: 'custom-avitek-3',
          developer: 'УКС АВИТЕК',
          name: 'Дом на Романа Ердякова, 19а',
        })
      ).toBe('erdyakova-19a');
    });

    it('returns null for non-AVITEK developments or invalid input', () => {
      expect(getAvitekSlugForDevelopment(null)).toBeNull();
      expect(getAvitekSlugForDevelopment(undefined)).toBeNull();
      expect(getAvitekSlugForDevelopment({})).toBeNull();
      expect(
        getAvitekSlugForDevelopment({
          id: 'zhk-metro',
          developer: 'Кировский ССК',
          name: 'ЖК Метро',
        })
      ).toBeNull();
      expect(
        getAvitekSlugForDevelopment({
          id: 'other-id',
          developer: 'УКС АВИТЕК',
          name: 'Неизвестный объект',
        })
      ).toBeNull();
    });
  });

  describe('buildAvitekSummaryByProject and filterAndSortAvitekLots', () => {
    const sampleLots = [
      {
        id: 'avitek-1',
        project_slug: 'krylya',
        title: 'Студия, 28 м²',
        rooms_type: 'studio',
        area: 28,
        floor: 4,
        price: 3200000,
        price_sqm: 114285,
        is_available: true,
      },
      {
        id: 'avitek-2',
        project_slug: 'krylya',
        title: '2-комнатная, 56 м²',
        rooms_type: '2k',
        area: 56,
        floor: 10,
        price: 6100000,
        price_sqm: 108928,
        is_available: true,
      },
      {
        id: 'avitek-3',
        project_slug: 'sovetskaya-75',
        title: '1-комнатная, 42 м²',
        rooms_type: '1k',
        area: 42,
        floor: 5,
        price: 4500000,
        price_sqm: 107142,
        is_available: true,
      },
    ];

    it('builds summary stats aggregated by project slug', () => {
      const summary = buildAvitekSummaryByProject(sampleLots);
      expect(summary.krylya.totalCount).toBe(2);
      expect(summary.krylya.minPrice).toBe(3200000);
      expect(summary.krylya.byRoomType.studio).toBe(1);
      expect(summary.krylya.byRoomType['2k']).toBe(1);
      expect(summary['sovetskaya-75'].totalCount).toBe(1);
      expect(summary['sovetskaya-75'].minPrice).toBe(4500000);
    });

    it('filters lots correctly', () => {
      const filtered = filterAndSortAvitekLots(sampleLots, { roomType: 'studio' });
      expect(filtered).toHaveLength(1);
      expect(filtered[0].id).toBe('avitek-1');
    });
  });

  describe('fetchAvitekLots and syncAvitekProject API calls', () => {
    const originalFetch = globalThis.fetch;

    beforeEach(() => {
      globalThis.fetch = vi.fn();
    });

    afterEach(() => {
      globalThis.fetch = originalFetch;
    });

    it('fetchAvitekLots calls endpoint with correct query param', async () => {
      globalThis.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: { lots: [], projects: [], configured: true },
        }),
      });

      const res = await fetchAvitekLots('krylya');
      expect(globalThis.fetch).toHaveBeenCalledWith(
        '/api/avitek-lots?projectSlug=krylya',
        expect.objectContaining({ method: 'GET' })
      );
      expect(res.configured).toBe(true);
    });

    it('syncAvitekProject posts to endpoint with action=syncProject', async () => {
      globalThis.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: { projectSlug: 'krylya', syncedCount: 5, status: 'ok' },
        }),
      });

      const res = await syncAvitekProject('krylya');
      expect(globalThis.fetch).toHaveBeenCalledWith(
        '/api/avitek-lots',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ action: 'syncProject', projectSlug: 'krylya' }),
        })
      );
      expect(res.syncedCount).toBe(5);
    });

    it('getAvitekProjectStats returns stats for specified project', async () => {
      globalThis.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            configured: true,
            projects: [{ projectSlug: 'krylya', projectName: 'ЖК Крылья' }],
            lots: [{ id: '1', project_slug: 'krylya', price: 3000000, rooms_type: '1k', is_available: true }],
          },
        }),
      });

      const stats = await getAvitekProjectStats('krylya');
      expect(stats.totalCount).toBe(1);
      expect(stats.minPrice).toBe(3000000);
    });
  });
});
