import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  STROYSOYUZ_PROJECT_KEYS,
  STROYSOYUZ_PROJECT_SLUGS,
  STROYSOYUZ_PROJECT_NAMES,
  STROYSOYUZ_DEVELOPMENT_TO_SLUG,
  getStroysoyuzSlugForDevelopment,
  buildStroysoyuzSummaryByProject,
  filterAndSortStroysoyuzLots,
  fetchStroysoyuzLots,
  syncStroysoyuzProject,
  getStroysoyuzProjectStats,
} from './stroysoyuzLots';

describe('stroysoyuzLots', () => {
  describe('constants and project keys', () => {
    it('defines STROYSOYUZ_PROJECT_KEYS correctly with 10 projects', () => {
      expect(STROYSOYUZ_PROJECT_KEYS).toEqual([
        'zhk-kholms',
        'uspenskaya-29',
        'solomintsy-michurina-28',
        'solomintsy-michurina-26',
        'blyuhera-46',
        'zapovedny-sandalovskaya-2a-1',
        'zapovedny-sandalovskaya-2a',
        'zapovedny-sandalovskaya-4-1',
        'volodarskogo-229',
        'svobody-115g',
      ]);
      expect(STROYSOYUZ_PROJECT_SLUGS).toEqual(STROYSOYUZ_PROJECT_KEYS);
      expect(Object.keys(STROYSOYUZ_PROJECT_NAMES)).toHaveLength(10);
    });
  });

  describe('getStroysoyuzSlugForDevelopment', () => {
    it('maps configured development IDs to STROYSOYUZ slugs', () => {
      expect(getStroysoyuzSlugForDevelopment({ id: 'zhk-kholms' })).toBe('zhk-kholms');
      expect(getStroysoyuzSlugForDevelopment({ id: 'zhk-uspenskaya' })).toBe('zhk-kholms');
      expect(getStroysoyuzSlugForDevelopment({ id: 'zhk-sloboda-solomintsy' })).toBe('solomintsy-michurina-28');
      expect(getStroysoyuzSlugForDevelopment({ id: 'zhk-repinskie-prudy' })).toBe('blyuhera-46');
      expect(getStroysoyuzSlugForDevelopment({ id: 'zhk-zapovedny' })).toBe('zapovedny-sandalovskaya-2a-1');
      expect(getStroysoyuzSlugForDevelopment({ id: 'zhk-premier' })).toBe('svobody-115g');
    });

    it('falls back to matching developer and project name keywords', () => {
      expect(
        getStroysoyuzSlugForDevelopment({
          developer: 'Стройсоюз',
          name: 'ЖК Холмс',
          address: 'ул. Успенская, 33',
        })
      ).toBe('zhk-kholms');

      expect(
        getStroysoyuzSlugForDevelopment({
          developer: 'Стройсоюз',
          name: 'Успенская 29',
          address: 'ул. Успенская, 29',
        })
      ).toBe('uspenskaya-29');

      expect(
        getStroysoyuzSlugForDevelopment({
          developer: 'Стройсоюз',
          name: 'ЖК Слобода Соломинцы',
          address: 'ул. Мичурина, 28',
        })
      ).toBe('solomintsy-michurina-28');

      expect(
        getStroysoyuzSlugForDevelopment({
          developer: 'Стройсоюз',
          name: 'ЖК Слобода Соломинцы',
          address: 'ул. Мичурина, 26',
        })
      ).toBe('solomintsy-michurina-26');

      expect(
        getStroysoyuzSlugForDevelopment({
          developer: 'Стройсоюз',
          name: 'Репинские пруды',
          address: 'ул. Блюхера, 46',
        })
      ).toBe('blyuhera-46');

      expect(
        getStroysoyuzSlugForDevelopment({
          developer: 'Стройсоюз',
          name: 'Заповедный',
          address: 'ул. Сандаловская, 2а к1',
        })
      ).toBe('zapovedny-sandalovskaya-2a-1');

      expect(
        getStroysoyuzSlugForDevelopment({
          developer: 'Стройсоюз',
          name: 'Заповедный',
          address: 'ул. Сандаловская, 4 к1',
        })
      ).toBe('zapovedny-sandalovskaya-4-1');

      expect(
        getStroysoyuzSlugForDevelopment({
          developer: 'Стройсоюз',
          name: 'Репинские пруды',
          address: 'ул. Володарского, 229',
        })
      ).toBe('volodarskogo-229');

      expect(
        getStroysoyuzSlugForDevelopment({
          developer: 'Стройсоюз',
          name: 'Премьер',
          address: 'ул. Свободы, 115Г',
        })
      ).toBe('svobody-115g');
    });

    it('returns null for non-Stroysoyuz developments or invalid input', () => {
      expect(getStroysoyuzSlugForDevelopment(null)).toBeNull();
      expect(getStroysoyuzSlugForDevelopment({})).toBeNull();
      expect(
        getStroysoyuzSlugForDevelopment({
          developer: 'Кировспецмонтаж (КСМ)',
          name: 'ЖК Лайф',
        })
      ).toBeNull();
    });
  });

  describe('fetchStroysoyuzLots and getStroysoyuzProjectStats', () => {
    let originalFetch;

    beforeEach(() => {
      originalFetch = global.fetch;
    });

    afterEach(() => {
      global.fetch = originalFetch;
    });

    it('fetches lots from /api/stroysoyuz-lots and parses response', async () => {
      const mockLots = [
        { id: '1', project_slug: 'zhk-kholms', price: 10000000, rooms_type: '2k' },
      ];
      const mockProjects = [
        { projectSlug: 'zhk-kholms', totalCount: 1, syncedCount: 1 },
      ];

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          data: { lots: mockLots, projects: mockProjects, configured: true },
          error: null,
        }),
      });

      const res = await fetchStroysoyuzLots('zhk-kholms');
      expect(res.lots).toEqual(mockLots);
      expect(res.projects).toEqual(mockProjects);
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/stroysoyuz-lots?projectSlug=zhk-kholms',
        expect.any(Object)
      );
    });

    it('syncStroysoyuzProject posts action syncProject', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          data: { projectSlug: 'zhk-kholms', syncedCount: 10 },
          error: null,
        }),
      });

      const res = await syncStroysoyuzProject('zhk-kholms');
      expect(res).toEqual({ projectSlug: 'zhk-kholms', syncedCount: 10 });
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/stroysoyuz-lots',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ action: 'syncProject', projectSlug: 'zhk-kholms' }),
        })
      );
    });
  });

  describe('normalizeStroysoyuzLot plan and pantry handling', () => {
    it('maps real plan image for Holms apartment 46.97 m2', async () => {
      const { normalizeStroysoyuzLot } = await import('../../api/_stroysoyuz-lots.js');
      const item = { flat_number: '5', rooms: 2, area_m2: 46.97, floor: 2, price_total: 12000000, lot_type: 'flat' };
      const lot = normalizeStroysoyuzLot(item, { projectName: 'ЖК Холмс' }, 'zhk-kholms');
      expect(lot.plan_image).toBe('https://holms.stroy-soyuz.ru/upload/Plan/5-et4697.png');
    });

    it('identifies storage lot as pantry and assigns SVG blueprint', async () => {
      const { normalizeStroysoyuzLot } = await import('../../api/_stroysoyuz-lots.js');
      const item = {
        flat_number: 'К1 (паркинг)',
        lot_type: 'storage',
        section: '1 подъезд',
        floor: -1,
        area_m2: 3.23,
        rooms: 0,
        price_total: 646000,
      };
      const lot = normalizeStroysoyuzLot(item, { projectName: 'ЖК Холмс' }, 'zhk-kholms');
      expect(lot.rooms_type).toBe('pantry');
      expect(lot.rooms_label).toBe('Кладовая');
      expect(lot.plan_image).toMatch(/^data:image\/svg\+xml/);
      expect(lot.title).toContain('Кладовая');
      expect(lot.title).toContain('3.23 м²');
    });
  });
});
