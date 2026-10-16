import { describe, it, expect } from 'vitest';
import { 
  DEFAULT_DEVELOPMENTS, 
  KIROV_DEVELOPERS, 
  ROOM_TYPES,
  getStoredDevelopments, 
  saveDevelopment 
} from './developmentsData';

describe('developmentsData', () => {
  it('has populated list of default Kirov developments', () => {
    expect(DEFAULT_DEVELOPMENTS.length).toBeGreaterThan(5);
    
    DEFAULT_DEVELOPMENTS.forEach(dev => {
      expect(dev.id).toBeTruthy();
      expect(dev.name).toBeTruthy();
      expect(dev.developer).toBeTruthy();
      expect(dev.address).toBeTruthy();
      expect(dev.lat).toBeGreaterThan(58);
      expect(dev.lng).toBeGreaterThan(49);
      expect(dev.price_from).toBeGreaterThan(0);
      expect(Array.isArray(dev.apartments)).toBe(true);
    });
  });

  it('contains verified major Kirov developers', () => {
    expect(KIROV_DEVELOPERS).toContain('Железно');
    expect(KIROV_DEVELOPERS).toContain('Кировспецмонтаж (КСМ)');
    expect(KIROV_DEVELOPERS).toContain('Кировский ССК');
  });

  it('contains links to official registers and portals where provided', () => {
    const withDomRf = DEFAULT_DEVELOPMENTS.filter(d => d.domrf_url);
    expect(withDomRf.length).toBeGreaterThan(0);

    const withAvito = DEFAULT_DEVELOPMENTS.filter(d => d.avito_url);
    expect(withAvito.length).toBeGreaterThan(0);
  });
});
