import { describe, it, expect } from 'vitest';
import {
  KSSK_PROJECT_SLUGS,
  KSSK_DEVELOPMENT_TO_SLUG,
  getKsskSlugForDevelopment,
  buildKsskSummaryByProject,
  filterAndSortKsskLots,
} from './ksskLots';

describe('ksskLots helpers', () => {
  describe('getKsskSlugForDevelopment', () => {
    it('maps all 6 configured KSSK development IDs', () => {
      expect(KSSK_PROJECT_SLUGS).toHaveLength(6);
      expect(Object.keys(KSSK_DEVELOPMENT_TO_SLUG)).toHaveLength(6);
      for (const slug of KSSK_PROJECT_SLUGS) {
        expect(getKsskSlugForDevelopment({ id: slug })).toBe(slug);
      }
    });

    it('falls back to matching developer and project name keywords', () => {
      expect(
        getKsskSlugForDevelopment({
          id: 'custom-1',
          developer: 'Кировский ССК',
          name: 'ЖК Скандинавия (новая очередь)',
        })
      ).toBe('zhk-skandinaviya');
      expect(
        getKsskSlugForDevelopment({
          id: 'custom-2',
          developer: 'АО СЗ КССК',
          name: 'Дом на Заводской (Дом у реки)',
        })
      ).toBe('zhk-dom-u-reki');
    });

    it('returns null for non-KSSK complexes', () => {
      expect(getKsskSlugForDevelopment(null)).toBeNull();
      expect(
        getKsskSlugForDevelopment({
          id: 'zhk-city-park',
          developer: 'Кировспецмонтаж (КСМ)',
          name: 'ЖК Сити Парк',
        })
      ).toBeNull();
    });
  });

  describe('buildKsskSummaryByProject and filterAndSortKsskLots', () => {
    it('computes summary stats and filters/sorts lots accurately', () => {
      const lots = [
        {
          id: '424215',
          project_slug: 'zhk-metro',
          title: '2-комнатная, 47.7 м², 17 эт.',
          rooms_type: '2k',
          area: 47.7,
          floor: 17,
          address: 'г. Киров, ул. Московская, 209А',
          finishing: 'Под отделку',
          price: 6630300,
          price_sqm: 139000,
          is_available: true,
        },
        {
          id: '424138',
          project_slug: 'zhk-metro',
          title: '1-комнатная, 27.7 м², 8 эт.',
          rooms_type: '1k',
          area: 27.7,
          floor: 8,
          address: 'г. Киров, ул. Московская, 209А',
          finishing: 'Под отделку',
          price: 4847500,
          price_sqm: 175000,
          is_available: true,
        },
      ];

      const summary = buildKsskSummaryByProject(lots, [
        { projectSlug: 'zhk-metro', totalCount: 2, syncedCount: 2, status: 'ok' },
      ]);
      expect(summary['zhk-metro'].syncedCount).toBe(2);
      expect(summary['zhk-metro'].minPrice).toBe(4847500);
      expect(summary['zhk-metro'].byRoomType['2k']).toBe(1);

      const filtered = filterAndSortKsskLots(lots, { roomType: '2k' });
      expect(filtered).toHaveLength(1);
      expect(filtered[0].id).toBe('424215');

      const sortedDesc = filterAndSortKsskLots(lots, { sortBy: 'price_desc' });
      expect(sortedDesc.map((l) => l.id)).toEqual(['424215', '424138']);
    });
  });
});
