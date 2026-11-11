import fs from 'fs';
import path from 'path';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  DEFAULT_DEVELOPMENTS,
  KIROV_DEVELOPERS,
  ROOM_TYPES,
  getStoredDevelopments,
  fetchLatestDevelopments,
  saveDevelopment
} from './developmentsData';

describe('developmentsData', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  beforeEach(() => {
    localStorage.clear();
  });

  it('has populated list of Kirov under-construction developments with valid Kirov coords', () => {
    expect(DEFAULT_DEVELOPMENTS.length).toBeGreaterThanOrEqual(30);

    DEFAULT_DEVELOPMENTS.forEach(dev => {
      expect(dev.id).toBeTruthy();
      expect(dev.name).toBeTruthy();
      expect(dev.developer).toBeTruthy();
      expect(dev.address).toBeTruthy();
      expect(dev.lat).toBeGreaterThan(58.4);
      expect(dev.lat).toBeLessThan(58.75);
      expect(dev.lng).toBeGreaterThan(49.4);
      expect(dev.lng).toBeLessThan(49.95);
      expect(dev.price_from).toBeGreaterThan(0);
      expect(Array.isArray(dev.apartments)).toBe(true);
    });
  });

  it('contains verified major Kirov developers', () => {
    expect(KIROV_DEVELOPERS).toContain('Железно');
    expect(KIROV_DEVELOPERS).toContain('Кировспецмонтаж (КСМ)');
    expect(KIROV_DEVELOPERS).toContain('Кировский ССК');
    expect(KIROV_DEVELOPERS).toContain('ПрофСтрой');
    expect(KIROV_DEVELOPERS).toContain('Стройсоюз');
    expect(KIROV_DEVELOPERS).toContain('КИНО Девелопмент');
    expect(KIROV_DEVELOPERS).toContain('СМУ-5');
    expect(KIROV_DEVELOPERS).toContain('Алтай-Строй');
  });

  it('contains links to official registers and portals where provided', () => {
    const withDomRf = DEFAULT_DEVELOPMENTS.filter(d => d.domrf_url);
    expect(withDomRf.length).toBeGreaterThan(0);

    const withAvito = DEFAULT_DEVELOPMENTS.filter(d => d.avito_url);
    expect(withAvito.length).toBeGreaterThan(0);
  });

  it('keeps public/data/developments.json synchronized with DEFAULT_DEVELOPMENTS', () => {
    const jsonPath = path.resolve(process.cwd(), 'public', 'data', 'developments.json');
    const raw = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    expect(Array.isArray(raw.developments)).toBe(true);
    expect(raw.developments.length).toBe(DEFAULT_DEVELOPMENTS.length);
    expect(raw.updated_at).toBeTruthy();
  });

  it('fetches daily developments feed and preserves custom entries', async () => {
    saveDevelopment({
      id: 'zhk-custom-test',
      name: 'ЖК Тестовый',
      developer: 'Железно',
      address: 'г. Киров, ул. Ленина, 1',
      lat: 58.6035,
      lng: 49.6679,
      price_from: 5000000
    });

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        updated_at: '2026-11-11T09:00:00+03:00',
        source: 'reacrm-kirov-registry',
        developments: DEFAULT_DEVELOPMENTS
      })
    }));

    const result = await fetchLatestDevelopments({ forceRefresh: true });
    expect(result.updatedAt).toBe('2026-11-11T09:00:00+03:00');
    expect(result.developments.some(d => d.id === 'zhk-custom-test')).toBe(true);
    expect(getStoredDevelopments().length).toBeGreaterThan(DEFAULT_DEVELOPMENTS.length);
  });
});
