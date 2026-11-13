import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  ALTAI_PROJECT_KEYS,
  ALTAI_PROJECT_SLUGS,
  ALTAI_PROJECT_NAMES,
  ALTAI_DEVELOPMENT_TO_SLUG,
  getAltaiSlugForDevelopment,
  buildAltaiSummaryByProject,
  filterAndSortAltaiLots,
  fetchAltaiLots,
  syncAltaiProject,
  getAltaiProjectStats,
} from './altaiLots';

describe('altaiLots', () => {
  describe('constants and project keys', () => {
    it('defines ALTAI_PROJECT_KEYS correctly', () => {
      expect(ALTAI_PROJECT_KEYS).toEqual(['dinastiya', 'erdyakova-9', 'oniks']);
      expect(ALTAI_PROJECT_SLUGS).toEqual(ALTAI_PROJECT_KEYS);
      expect(Object.keys(ALTAI_PROJECT_NAMES)).toEqual(['dinastiya', 'erdyakova-9', 'oniks']);
    });
  });

  describe('getAltaiSlugForDevelopment', () => {
    it('maps configured development IDs to ALTAI slugs', () => {
      expect(getAltaiSlugForDevelopment({ id: 'zhk-dinastiya' })).toBe('dinastiya');
      expect(getAltaiSlugForDevelopment({ id: 'zhk-erdyakova-9' })).toBe('erdyakova-9');
      expect(getAltaiSlugForDevelopment({ id: 'zhk-oniks' })).toBe('oniks');
      expect(getAltaiSlugForDevelopment({ id: 'dinastiya' })).toBe('dinastiya');
      expect(getAltaiSlugForDevelopment({ id: 'erdyakova-9' })).toBe('erdyakova-9');
      expect(getAltaiSlugForDevelopment({ id: 'oniks' })).toBe('oniks');
    });

    it('falls back to matching developer and project name keywords', () => {
      expect(
        getAltaiSlugForDevelopment({
          id: 'custom-altai-1',
          developer: 'Алтай-Строй',
          name: 'ЖК Династия 2 очередь',
        })
      ).toBe('dinastiya');

      expect(
        getAltaiSlugForDevelopment({
          id: 'custom-altai-2',
          developer: 'СМТ (ГК Алтай-Строй)',
          name: 'ЖД на Ердякова, 9',
        })
      ).toBe('erdyakova-9');

      expect(
        getAltaiSlugForDevelopment({
          id: 'custom-altai-3',
          developer: 'Алтай-Строй',
          name: 'ЖК Оникс',
        })
      ).toBe('oniks');
    });

    it('returns null for non-ALTAI developments or invalid input', () => {
      expect(getAltaiSlugForDevelopment(null)).toBeNull();
      expect(getAltaiSlugForDevelopment(undefined)).toBeNull();
      expect(getAltaiSlugForDevelopment({})).toBeNull();
      expect(
        getAltaiSlugForDevelopment({
          id: 'zhk-metro',
          developer: 'Кировский ССК',
          name: 'ЖК Метро',
        })
      ).toBeNull();
      expect(
        getAltaiSlugForDevelopment({
          id: 'other-id',
          developer: 'Алтай-Строй',
          name: 'Неизвестный объект',
        })
      ).toBeNull();
    });
  });

  describe('buildAltaiSummaryByProject and filterAndSortAltaiLots', () => {
    const sampleLots = [
      {
        id: 'altai-1',
        project_slug: 'dinastiya',
        title: '1-комнатная, 45 м²',
        rooms_type: '1k',
        area: 45,
        floor: 6,
        price: 6500000,
        price_sqm: 144444,
        is_available: true,
      },
      {
        id: 'altai-2',
        project_slug: 'dinastiya',
        title: '3-комнатная, 85 м²',
        rooms_type: '3k',
        area: 85,
        floor: 12,
        price: 11000000,
        price_sqm: 129411,
        is_available: true,
      },
      {
        id: 'altai-3',
        project_slug: 'erdyakova-9',
        title: '2-комнатная, 58 м²',
        rooms_type: '2k',
        area: 58,
        floor: 5,
        price: 6600000,
        price_sqm: 113793,
        is_available: true,
      },
    ];

    it('builds summary stats aggregated by project slug', () => {
      const summary = buildAltaiSummaryByProject(sampleLots);
      expect(summary.dinastiya.totalCount).toBe(2);
      expect(summary.dinastiya.minPrice).toBe(6500000);
      expect(summary.dinastiya.byRoomType['1k']).toBe(1);
      expect(summary.dinastiya.byRoomType['3k']).toBe(1);
      expect(summary['erdyakova-9'].totalCount).toBe(1);
      expect(summary['erdyakova-9'].minPrice).toBe(6600000);
    });

    it('filters lots correctly', () => {
      const filtered = filterAndSortAltaiLots(sampleLots, { roomType: '1k' });
      expect(filtered).toHaveLength(1);
      expect(filtered[0].id).toBe('altai-1');
    });
  });

  describe('fetchAltaiLots and syncAltaiProject API calls', () => {
    const originalFetch = globalThis.fetch;

    beforeEach(() => {
      globalThis.fetch = vi.fn();
    });

    afterEach(() => {
      globalThis.fetch = originalFetch;
    });

    it('fetchAltaiLots calls endpoint with correct query param', async () => {
      globalThis.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: { lots: [], projects: [], configured: true },
        }),
      });

      const res = await fetchAltaiLots('dinastiya');
      expect(globalThis.fetch).toHaveBeenCalledWith(
        '/api/altai-lots?projectSlug=dinastiya',
        expect.objectContaining({ method: 'GET' })
      );
      expect(res.configured).toBe(true);
    });

    it('syncAltaiProject posts to endpoint with action=syncProject', async () => {
      globalThis.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: { projectSlug: 'dinastiya', syncedCount: 8, status: 'ok' },
        }),
      });

      const res = await syncAltaiProject('dinastiya');
      expect(globalThis.fetch).toHaveBeenCalledWith(
        '/api/altai-lots',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ action: 'syncProject', projectSlug: 'dinastiya' }),
        })
      );
      expect(res.syncedCount).toBe(8);
    });

    it('getAltaiProjectStats returns stats for specified project', async () => {
      globalThis.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            configured: true,
            projects: [{ projectSlug: 'dinastiya', projectName: 'ЖК Династия' }],
            lots: [{ id: '1', project_slug: 'dinastiya', price: 6500000, rooms_type: '1k', is_available: true }],
          },
        }),
      });

      const stats = await getAltaiProjectStats('dinastiya');
      expect(stats.totalCount).toBe(1);
      expect(stats.minPrice).toBe(6500000);
    });
  });
});
