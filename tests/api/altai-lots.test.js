import { describe, it, expect, vi } from 'vitest';
import {
  config,
  ALTAI_PROJECTS,
  ALTAI_PRICELIST_DATASET,
  resolveAltaiProjectSlug,
  normalizeAltaiLot,
  syncAltaiProject,
} from '../../api/_altai-lots.js';

describe('altai-lots config and projects catalog', () => {
  it('exports maxDuration 60', () => {
    expect(config).toEqual({ maxDuration: 60 });
  });

  it('defines ALTAI_PROJECTS mapping with zhk-dinastiya and dom-na-erdyakova-9', () => {
    expect(Object.keys(ALTAI_PROJECTS)).toEqual(['zhk-dinastiya', 'dom-na-erdyakova-9']);

    expect(ALTAI_PROJECTS['zhk-dinastiya']).toEqual({
      projectName: 'ЖК ДИНАСТИЯ',
      address: 'г. Киров, Хлебозаводской пер., 30',
    });

    expect(ALTAI_PROJECTS['dom-na-erdyakova-9']).toEqual({
      projectName: 'Дом на Ердякова, 9',
      address: 'г. Киров, ул. Романа Ердякова, 9',
    });
  });

  it('resolves aliases correctly', () => {
    expect(resolveAltaiProjectSlug('dinastiya')).toBe('zhk-dinastiya');
    expect(resolveAltaiProjectSlug('erdyakova-9')).toBe('dom-na-erdyakova-9');
    expect(resolveAltaiProjectSlug('zhk-dinastiya')).toBe('zhk-dinastiya');
  });
});

describe('ALTAI_PRICELIST_DATASET', () => {
  it('includes required 1k and 2k areas and finishings for dom-na-erdyakova-9', () => {
    const erdLots = ALTAI_PRICELIST_DATASET['dom-na-erdyakova-9'];
    expect(Array.isArray(erdLots)).toBe(true);
    expect(erdLots.length).toBeGreaterThanOrEqual(20);

    const areas1k = [37.18, 38.55, 40.55, 50.08, 50.70];
    const areas2k = [55.09, 55.55, 57.47, 57.92, 68.68, 69.21];

    for (const a of areas1k) {
      expect(erdLots.some((l) => l.rooms_type === '1k' && l.area === a)).toBe(true);
    }
    for (const a of areas2k) {
      expect(erdLots.some((l) => l.rooms_type === '2k' && l.area === a)).toBe(true);
    }

    const finishings = new Set(erdLots.map((l) => l.finishing));
    expect(finishings.has('Черновая')).toBe(true);
    expect(finishings.has('Чистовая')).toBe(true);

    const minFloor = Math.min(...erdLots.map((l) => l.floor));
    const maxFloor = Math.max(...erdLots.map((l) => l.floor));
    expect(minFloor).toBeGreaterThanOrEqual(1);
    expect(maxFloor).toBeLessThanOrEqual(14);
  });

  it('includes 1k, 2k, 3k, 4k and view lots for zhk-dinastiya', () => {
    const dinLots = ALTAI_PRICELIST_DATASET['zhk-dinastiya'];
    expect(Array.isArray(dinLots)).toBe(true);

    const types = new Set(dinLots.map((l) => l.rooms_type));
    expect(types.has('1k')).toBe(true);
    expect(types.has('2k')).toBe(true);
    expect(types.has('3k')).toBe(true);
    expect(types.has('4k')).toBe(true);

    const hasView = dinLots.some((l) => l.is_view === true);
    expect(hasView).toBe(true);

    const sections = new Set(dinLots.map((l) => l.section));
    expect(sections.has('1 оч, секция 1')).toBe(true);
    expect(sections.has('1 оч, секция 2')).toBe(true);
    expect(sections.has('2 оч, секция 3')).toBe(true);
    expect(sections.has('2 оч, секция 4')).toBe(true);
  });
});

describe('normalizeAltaiLot', () => {
  it('formats lot with title, price_sqm, and view label', () => {
    const spec = ALTAI_PROJECTS['zhk-dinastiya'];
    const item = {
      flat_number: '142',
      section: '1 оч, секция 1',
      rooms_type: '3k',
      area: 92.10,
      floor: 15,
      finishing: 'Предчистовая',
      price_sqm: 155000,
      price: 14275500,
      is_view: true,
    };

    const lot = normalizeAltaiLot(item, spec, 'zhk-dinastiya');
    expect(lot.id).toBe('altai-zhk-dinastiya-142');
    expect(lot.project_name).toBe('ЖК ДИНАСТИЯ');
    expect(lot.title).toBe('3-комнатная, 92.1 м², 15 эт., видовая');
    expect(lot.rooms_type).toBe('3k');
    expect(lot.rooms_label).toBe('3-комнатная');
    expect(lot.area).toBe(92.1);
    expect(lot.floor).toBe(15);
    expect(lot.price).toBe(14275500);
    expect(lot.price_sqm).toBe(155000);
    expect(lot.is_view).toBe(true);
    expect(lot.address).toBe('г. Киров, Хлебозаводской пер., 30 (1 оч, секция 1)');
  });
});

describe('syncAltaiProject', () => {
  it('seeds lots into DB and returns synced lots list', async () => {
    const mockSql = {
      query: vi.fn().mockImplementation(async (queryText) => {
        if (queryText.includes('CREATE TABLE') || queryText.includes('CREATE INDEX')) {
          return [];
        }
        if (queryText.includes('INSERT INTO altai_sync_meta')) {
          return [{ last_synced_at: '2026-11-13T12:00:00Z' }];
        }
        if (queryText.includes('SELECT * FROM altai_lots')) {
          return [
            {
              id: 'altai-dom-na-erdyakova-9-12',
              project_slug: 'dom-na-erdyakova-9',
              project_name: 'Дом на Ердякова, 9',
              title: '1-комнатная, 37.18 м², 2 эт.',
              rooms_label: '1-комнатная',
              rooms_type: '1k',
              area: 37.18,
              floor: 2,
              flat_number: '12',
              price: 4647500,
              price_sqm: 125000,
              is_available: true,
            },
          ];
        }
        return [];
      }),
    };

    const res = await syncAltaiProject('dom-na-erdyakova-9', mockSql);
    expect(res.projectSlug).toBe('dom-na-erdyakova-9');
    expect(res.syncedCount).toBeGreaterThan(0);
    expect(res.lots.length).toBe(1);
    expect(res.lots[0].id).toBe('altai-dom-na-erdyakova-9-12');
  });
});
