import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  PROFSTROY_PROJECT_KEYS,
  PROFSTROY_PROJECT_SLUGS,
  PROFSTROY_PROJECT_NAMES,
  PROFSTROY_DEVELOPMENT_TO_SLUG,
  getProfstroySlugForDevelopment,
  buildProfstroySummaryByProject,
  filterAndSortProfstroyLots,
  fetchProfstroyLots,
  syncProfstroyProject,
  getProfstroyProjectStats,
} from './profstroyLots';

describe('profstroyLots', () => {
  describe('constants and project keys', () => {
    it('defines PROFSTROY_PROJECT_KEYS correctly', () => {
      expect(PROFSTROY_PROJECT_KEYS).toEqual([
        'kapital',
        'vdohnovenie',
        'murashinskiy-7',
        'garmoniya',
        'metropolis',
      ]);
      expect(PROFSTROY_PROJECT_SLUGS).toEqual(PROFSTROY_PROJECT_KEYS);
      expect(Object.keys(PROFSTROY_PROJECT_NAMES)).toEqual([
        'kapital',
        'vdohnovenie',
        'murashinskiy-7',
        'garmoniya',
        'metropolis',
      ]);
    });
  });

  describe('getProfstroySlugForDevelopment', () => {
    it('maps configured development IDs to Profstroy slugs', () => {
      expect(getProfstroySlugForDevelopment({ id: 'zhk-kapital' })).toBe('kapital');
      expect(getProfstroySlugForDevelopment({ id: 'kapital' })).toBe('kapital');
      expect(getProfstroySlugForDevelopment({ id: 'zhk-vdohnovenie' })).toBe('vdohnovenie');
      expect(getProfstroySlugForDevelopment({ id: 'vdohnovenie' })).toBe('vdohnovenie');
      expect(getProfstroySlugForDevelopment({ id: 'zhk-murashinskiy-7' })).toBe('murashinskiy-7');
      expect(getProfstroySlugForDevelopment({ id: 'murashinskiy-7' })).toBe('murashinskiy-7');
      expect(getProfstroySlugForDevelopment({ id: 'zhk-garmoniya' })).toBe('garmoniya');
      expect(getProfstroySlugForDevelopment({ id: 'garmoniya' })).toBe('garmoniya');
      expect(getProfstroySlugForDevelopment({ id: 'zhk-metropolis' })).toBe('metropolis');
      expect(getProfstroySlugForDevelopment({ id: 'metropolis' })).toBe('metropolis');
    });

    it('falls back to matching developer and project name keywords', () => {
      expect(
        getProfstroySlugForDevelopment({
          id: 'custom-p1',
          developer: 'ПрофСтрой',
          name: 'Клубный дом Капитал',
        })
      ).toBe('kapital');

      expect(
        getProfstroySlugForDevelopment({
          id: 'custom-p2',
          developer: 'Профстрой Недвижимость',
          name: 'ЖК Вдохновение',
        })
      ).toBe('vdohnovenie');

      expect(
        getProfstroySlugForDevelopment({
          id: 'custom-p3',
          developer: 'Profstroy',
          name: 'Дом на Мурашинском 7',
        })
      ).toBe('murashinskiy-7');

      expect(
        getProfstroySlugForDevelopment({
          id: 'custom-p4',
          developer: 'Профстрой',
          name: 'ЖК Гармония',
        })
      ).toBe('garmoniya');

      expect(
        getProfstroySlugForDevelopment({
          id: 'custom-p5',
          developer: 'ПрофСтрой',
          name: 'ЖК Метрополис',
        })
      ).toBe('metropolis');
    });

    it('returns null for non-Profstroy developments or invalid input', () => {
      expect(getProfstroySlugForDevelopment(null)).toBeNull();
      expect(getProfstroySlugForDevelopment(undefined)).toBeNull();
      expect(getProfstroySlugForDevelopment({})).toBeNull();
      expect(
        getProfstroySlugForDevelopment({
          id: 'zhk-metro',
          developer: 'Кировский ССК',
          name: 'ЖК Метро',
        })
      ).toBeNull();
      expect(
        getProfstroySlugForDevelopment({
          id: 'other-id',
          developer: 'ПрофСтрой',
          name: 'Неизвестный объект',
        })
      ).toBeNull();
    });
  });

  describe('buildProfstroySummaryByProject and filterAndSortProfstroyLots', () => {
    const sampleLots = [
      {
        id: 'profstroy-1',
        project_slug: 'kapital',
        title: '2-комнатная, 66 м²',
        rooms_type: '2k',
        area: 66,
        floor: 4,
        price: 12800000,
        price_sqm: 193939,
        is_available: true,
      },
      {
        id: 'profstroy-2',
        project_slug: 'kapital',
        title: '3-комнатная, 95 м²',
        rooms_type: '3k',
        area: 95,
        floor: 7,
        price: 17500000,
        price_sqm: 184210,
        is_available: true,
      },
      {
        id: 'profstroy-3',
        project_slug: 'metropolis',
        title: '1-комнатная, 35 м²',
        rooms_type: '1k',
        area: 35,
        floor: 12,
        price: 4950000,
        price_sqm: 141428,
        is_available: true,
      },
    ];

    it('builds summary stats aggregated by project slug', () => {
      const summary = buildProfstroySummaryByProject(sampleLots);
      expect(summary.kapital.totalCount).toBe(2);
      expect(summary.kapital.minPrice).toBe(12800000);
      expect(summary.kapital.byRoomType['2k']).toBe(1);
      expect(summary.kapital.byRoomType['3k']).toBe(1);
      expect(summary.metropolis.totalCount).toBe(1);
      expect(summary.metropolis.minPrice).toBe(4950000);
    });

    it('filters lots correctly', () => {
      const filtered = filterAndSortProfstroyLots(sampleLots, { roomType: '1k' });
      expect(filtered).toHaveLength(1);
      expect(filtered[0].id).toBe('profstroy-3');
    });
  });

  describe('fetchProfstroyLots and syncProfstroyProject API calls', () => {
    const originalFetch = globalThis.fetch;

    beforeEach(() => {
      globalThis.fetch = vi.fn();
    });

    afterEach(() => {
      globalThis.fetch = originalFetch;
    });

    it('fetchProfstroyLots calls endpoint with correct query param', async () => {
      globalThis.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: { lots: [], projects: [], configured: true },
        }),
      });

      const res = await fetchProfstroyLots('kapital');
      expect(globalThis.fetch).toHaveBeenCalledWith(
        '/api/profstroy-lots?projectSlug=kapital',
        expect.objectContaining({ method: 'GET' })
      );
      expect(res.configured).toBe(true);
    });

    it('syncProfstroyProject posts to endpoint with action=syncProject', async () => {
      globalThis.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: { projectSlug: 'kapital', syncedCount: 15, status: 'ok' },
        }),
      });

      const res = await syncProfstroyProject('kapital');
      expect(globalThis.fetch).toHaveBeenCalledWith(
        '/api/profstroy-lots',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ action: 'syncProject', projectSlug: 'kapital' }),
        })
      );
      expect(res.syncedCount).toBe(15);
    });

    it('getProfstroyProjectStats returns stats for specified project', async () => {
      globalThis.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            configured: true,
            projects: [{ projectSlug: 'kapital', projectName: 'Клубный дом «Капитал»' }],
            lots: [
              {
                id: '1',
                project_slug: 'kapital',
                price: 12800000,
                rooms_type: '2k',
                is_available: true,
              },
            ],
          },
        }),
      });

      const stats = await getProfstroyProjectStats('kapital');
      expect(stats.totalCount).toBe(1);
      expect(stats.minPrice).toBe(12800000);
    });
  });
});
