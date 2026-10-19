import { describe, it, expect, beforeEach } from 'vitest';
import { getSavedDealLocations, saveDealLocation, DEFAULT_DEAL_LOCATIONS } from './DealLocationSelect';

describe('DealLocationSelect storage logic', () => {
    beforeEach(() => {
        localStorage.clear();
    });

    it('returns default locations initially', () => {
        const locations = getSavedDealLocations();
        expect(locations).toEqual(DEFAULT_DEAL_LOCATIONS);
        expect(locations).toContain('Сбер (Всесвятская 25)');
        expect(locations).toContain('Офис (Ленина 89)');
    });

    it('saves a new location and persists to localStorage', () => {
        const updated = saveDealLocation('ВТБ (Ленина 50)');
        expect(updated).toContain('ВТБ (Ленина 50)');
        expect(getSavedDealLocations()).toContain('ВТБ (Ленина 50)');
    });

    it('does not duplicate existing locations', () => {
        saveDealLocation('Сбер (Всесвятская 25)');
        const locs = getSavedDealLocations();
        const sberCount = locs.filter(l => l === 'Сбер (Всесвятская 25)').length;
        expect(sberCount).toBe(1);
    });

    it('ignores empty or whitespace strings', () => {
        const locs = saveDealLocation('   ');
        expect(locs).toEqual(DEFAULT_DEAL_LOCATIONS);
    });
});
