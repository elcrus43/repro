import { describe, it, expect } from 'vitest';
import {
  normalizeLotToMatchCandidate,
  scoreLiveLotForRequest,
  matchLiveLotsToRequest,
  isPurchaseRequestForDevelopments,
  matchDevelopmentsToRequest,
  buildSelectionItemFromDevelopment,
} from './developmentMatching';

describe('developmentMatching', () => {
  const devMetro = {
    id: 'zhk-metro',
    name: 'ЖК Метро',
    developer: 'Кировский ССК',
    district: 'Октябрьский район',
    microdistrict: 'Юго-Западный',
    address: 'г. Киров, ул. Московская, 209А',
  };

  const devCityPark = {
    id: 'zhk-city-park',
    name: 'ЖК Сити Парк',
    developer: 'Кировспецмонтаж (КСМ)',
    district: 'Ленинский район',
    microdistrict: 'Чистые Пруды',
    address: 'г. Киров, мкр. Чистые Пруды, ул. Парковая, 1Б',
  };

  describe('normalizeLotToMatchCandidate', () => {
    it('maps room types 0..4 and enriches dev metadata', () => {
      const studio = normalizeLotToMatchCandidate(
        { id: '1', rooms_type: 'studio', price: 3200000, area: 24.5, floor: 3 },
        devMetro
      );
      expect(studio).toMatchObject({
        rooms: 0,
        price: 3200000,
        area_total: 24.5,
        floor: 3,
        district: 'Октябрьский район',
        city: 'Киров',
        market_type: 'new_building',
        property_type: 'apartment',
      });

      expect(normalizeLotToMatchCandidate({ rooms_type: '1k' }).rooms).toBe(1);
      expect(normalizeLotToMatchCandidate({ rooms_type: '2k' }).rooms).toBe(2);
      expect(normalizeLotToMatchCandidate({ rooms_type: '3k' }).rooms).toBe(3);
      expect(normalizeLotToMatchCandidate({ rooms_type: '4k' }).rooms).toBe(4);
      expect(normalizeLotToMatchCandidate({ title: '2-комнатная, 52 м²' }).rooms).toBe(2);
    });
  });

  describe('scoreLiveLotForRequest', () => {
    it('scores a fully matching lot as perfect', () => {
      const lot = {
        id: 'lot-1',
        project_slug: 'zhk-metro',
        rooms_type: '2k',
        price: 5800000,
        area: 52.4,
        floor: 7,
        is_available: true,
      };
      const request = {
        city: 'Киров',
        property_types: ['apartment'],
        rooms: [2],
        budget_min: 4500000,
        budget_max: 6000000,
        districts: ['Октябрьский'],
        area_min: 48,
        area_max: 60,
        floor_min: 2,
        floor_max: 12,
        not_first_floor: true,
      };

      const res = scoreLiveLotForRequest(lot, request, devMetro);
      expect(res).not.toBeNull();
      expect(res.score).toBeGreaterThanOrEqual(85);
      expect(res.match_level).toBe('perfect');
      expect(res.mismatched_params).toEqual([]);
    });

    it('supports studio rooms as 0 or "studio" and 5% soft budget tolerance', () => {
      const studioLot = {
        id: 'lot-studio',
        rooms_type: 'studio',
        price: 3120000,
        area: 25,
        floor: 4,
        is_available: true,
      };

      const withinTolerance = scoreLiveLotForRequest(
        studioLot,
        {
          city: 'Киров',
          rooms: ['studio'],
          budget_max: 3000000, // +4%
          districts: ['Ленинский район'],
        },
        devCityPark
      );
      expect(withinTolerance).not.toBeNull();
      expect(withinTolerance.match_level).toBe('good');
      expect(withinTolerance.mismatched_params.some((m) => m.includes('выше бюджета'))).toBe(true);

      const zeroRooms = scoreLiveLotForRequest(
        studioLot,
        { city: 'Киров', rooms: [0], budget_max: 3500000 },
        devCityPark
      );
      expect(zeroRooms?.match_level).toBe('perfect');

      const overTolerance = scoreLiveLotForRequest(
        { ...studioLot, price: 3300000 }, // +10%
        { city: 'Киров', rooms: [0], budget_max: 3000000 },
        devCityPark
      );
      expect(overTolerance).toBeNull();
    });

    it('penalizes first floor when not_first_floor is set and rejects incompatible requests', () => {
      const firstFloorLot = {
        id: 'lot-1f',
        rooms_type: '1k',
        price: 4200000,
        area: 36,
        floor: 1,
        is_available: true,
      };

      const res = scoreLiveLotForRequest(
        firstFloorLot,
        {
          city: 'Киров',
          rooms: [1],
          budget_max: 4500000,
          not_first_floor: true,
        },
        devCityPark
      );
      expect(res).not.toBeNull();
      expect(res.score).toBe(95);
      expect(res.mismatched_params).toContain('Первый этаж (в запросе: не первый)');

      expect(scoreLiveLotForRequest({ ...firstFloorLot, is_available: false }, { budget_max: 5000000 }, devCityPark)).toBeNull();
      expect(scoreLiveLotForRequest(firstFloorLot, { deal_type: 'rent', budget_max: 5000000 }, devCityPark)).toBeNull();
      expect(scoreLiveLotForRequest(firstFloorLot, { property_types: ['house'], budget_max: 5000000 }, devCityPark)).toBeNull();
      expect(scoreLiveLotForRequest(firstFloorLot, { city: 'Москва', budget_max: 5000000 }, devCityPark)).toBeNull();
      expect(scoreLiveLotForRequest(firstFloorLot, { rooms: [3], budget_max: 5000000 }, devCityPark)).toBeNull();
    });
  });

  describe('matchLiveLotsToRequest', () => {
    it('matches lots against developments catalog and sorts by score desc then price asc', () => {
      const lots = [
        {
          id: 'm1',
          project_slug: 'zhk-metro',
          rooms_type: '2k',
          price: 5900000,
          area: 54,
          floor: 5,
          is_available: true,
        },
        {
          id: 'm2',
          project_slug: 'zhk-metro',
          rooms_type: '2k',
          price: 5400000,
          area: 50,
          floor: 8,
          is_available: true,
        },
        {
          id: 'c1',
          project_slug: 'siti-park',
          rooms_type: '2k',
          price: 5600000,
          area: 51,
          floor: 4,
          is_available: true,
        },
        {
          id: 'c-sold',
          project_slug: 'siti-park',
          rooms_type: '2k',
          price: 4900000,
          area: 51,
          floor: 4,
          is_available: false,
        },
      ];

      const request = {
        city: 'Киров',
        rooms: [2],
        budget_max: 6000000,
        districts: ['Октябрьский район'],
        area_min: 48,
      };

      const matches = matchLiveLotsToRequest(lots, request, [devMetro, devCityPark]);
      expect(matches.map((m) => m.lot.id)).toEqual(['m2', 'm1', 'c1']);
      expect(matches[0].dev.id).toBe('zhk-metro');
      expect(matches[0].score).toBe(100);
      expect(matches[2].score).toBe(75);
      expect(matches[2].match_level).toBe('good');

      const limited = matchLiveLotsToRequest(lots, request, { 'zhk-metro': devMetro, 'zhk-city-park': devCityPark }, { limit: 2 });
      expect(limited).toHaveLength(2);
    });
  });

  describe('isPurchaseRequestForDevelopments', () => {
    it('allows active purchase apartment requests and rejects rent/completed/land', () => {
      expect(isPurchaseRequestForDevelopments({ status: 'active', property_types: ['apartment'] })).toBe(true);
      expect(isPurchaseRequestForDevelopments({ status: 'active' })).toBe(true);
      expect(isPurchaseRequestForDevelopments({ status: 'completed', property_types: ['apartment'] })).toBe(false);
      expect(isPurchaseRequestForDevelopments({ status: 'active', deal_type: 'rent', property_types: ['apartment'] })).toBe(false);
      expect(isPurchaseRequestForDevelopments({ status: 'active', property_types: ['land'] })).toBe(false);
      expect(isPurchaseRequestForDevelopments(null)).toBe(false);
    });
  });

  describe('matchDevelopmentsToRequest', () => {
    const catalog = [
      {
        ...devMetro,
        price_from: 4200000,
        price_to: 8500000,
        apartments: [
          { type: '1k', name: '1-комнатная', price_from: 4200000 },
          { type: '2k', name: '2-комнатная', price_from: 5900000 },
        ],
      },
      {
        ...devCityPark,
        price_from: 3900000,
        price_to: 7800000,
        apartments: [
          { type: '1k', name: '1-комнатная', price_from: 3900000 },
          { type: '2k', name: '2-комнатная', price_from: 5300000 },
        ],
      },
      {
        id: 'zhk-luxury',
        name: 'ЖК Элитный',
        developer: 'Застройщик',
        district: 'Первомайский район',
        microdistrict: 'Исторический центр',
        address: 'г. Киров, ул. Спасская, 10',
        price_from: 12000000,
        price_to: 20000000,
        apartments: [{ type: '2k', name: '2-комнатная', price_from: 12000000 }],
      },
    ];

    it('matches developments by district, microdistrict, rooms and budget', () => {
      const request = {
        id: 'req-1',
        status: 'active',
        city: 'Киров',
        property_types: ['apartment'],
        districts: ['Ленинский район'],
        microdistricts: ['Чистые Пруды'],
        rooms: [2],
        budget_max: 5500000,
      };

      const matches = matchDevelopmentsToRequest(catalog, request);
      expect(matches).toHaveLength(1);
      expect(matches[0].dev.id).toBe('zhk-city-park');
      expect(matches[0].priceMatchType).toBe('exact');
      expect(matches[0].locationMatchType).toBe('microdistrict');
      expect(matches[0].effectivePriceFrom).toBe(5300000);
      expect(matches[0].matchedApartments).toHaveLength(1);
      expect(matches[0].matchedApartments[0].inBudget).toBe(true);
    });

    it('supports near-budget tolerance (+10%) and excludes over-budget or wrong city', () => {
      const nearReq = {
        status: 'active',
        city: 'Киров',
        districts: ['Октябрьский'],
        rooms: [2],
        budget_max: 5500000, // 5.9M is +7.2% <= +10%
      };

      const nearMatches = matchDevelopmentsToRequest(catalog, nearReq);
      expect(nearMatches).toHaveLength(1);
      expect(nearMatches[0].dev.id).toBe('zhk-metro');
      expect(nearMatches[0].priceMatchType).toBe('near');
      expect(nearMatches[0].matchedApartments[0].inBudget).toBe(false);

      expect(matchDevelopmentsToRequest(catalog, { ...nearReq, city: 'Москва' })).toHaveLength(0);
      expect(matchDevelopmentsToRequest(catalog, { ...nearReq, status: 'completed' })).toHaveLength(0);
      expect(matchDevelopmentsToRequest(catalog, { ...nearReq, budget_max: 4000000 })).toHaveLength(0);
    });

    it('enriches matches with live lots when provided', () => {
      const request = {
        status: 'active',
        city: 'Киров',
        districts: ['Октябрьский район'],
        rooms: [2],
        budget_max: 6000000,
      };
      const liveLots = [
        { id: 'l1', project_slug: 'zhk-metro', rooms_type: '2k', price: 5400000, area: 50, is_available: true },
        { id: 'l2', project_slug: 'zhk-metro', rooms_type: '2k', price: 6900000, area: 60, is_available: true },
      ];

      const matches = matchDevelopmentsToRequest(catalog, request, { liveLots });
      expect(matches).toHaveLength(1);
      expect(matches[0].liveLotsCount).toBe(1);
      expect(matches[0].liveMinPrice).toBe(5400000);
      expect(matches[0].effectivePriceFrom).toBe(5400000);
    });
  });

  describe('buildSelectionItemFromDevelopment', () => {
    it('builds valid selection item tied to request clients', () => {
      const item = buildSelectionItemFromDevelopment({
        dev: {
          ...devCityPark,
          price_from: 3900000,
          completion_date: '2027',
          images: ['https://example.com/1.jpg'],
          domrf_url: 'https://domrf.example',
          contact_phone: '+78332000000',
        },
        request: {
          client_id: 'c1',
          client_ids: ['c1', 'c2'],
        },
        apartment: { type: '2k', name: '2-комнатная', area: '52 м²', price_from: 5300000 },
        realtorId: 'u1',
      });

      expect(item.realtor_id).toBe('u1');
      expect(item.client_id).toBe('c1');
      expect(item.client_ids).toEqual(['c1', 'c2']);
      expect(item.price).toBe(5300000);
      expect(item.rooms).toBe(2);
      expect(item.property_type).toBe('apartment');
      expect(item.address).toContain('ЖК Сити Парк');
      expect(item.link).toBe('https://domrf.example');
    });
  });
});
