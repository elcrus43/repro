import { describe, it, expect } from 'vitest';
import {
  mergeAllDeveloperLots,
  filterFinderLots,
  groupLotsByLayout,
  buildSelectionItemFromLot,
  findActiveBuyerRequestForClient,
  requestToFinderFilters,
  parseMaxFloor,
} from './liveLotsFinder';

const MOCK_DEVELOPMENTS = [
  {
    id: 'zhk-ozerki-ksm',
    name: 'ЖК Озерки',
    developer: 'Кировспецмонтаж (КСМ)',
    district: 'Первомайский район',
    address: 'г. Киров, ул. Торфяная, 11',
    floors: '17 этажей',
    completion_date: '2026',
    price_from: 3900000,
    images: ['https://example.com/ozerki.jpg'],
    builder_url: 'https://ksm-kirov.ru/ozerki',
    contact_phone: '+7 (8332) 111-111',
  },
  {
    id: 'zhk-chistoprudnenskaya-11a',
    name: 'Дом на Чистопрудненской, 11А',
    developer: 'Кировспецмонтаж (КСМ)',
    district: 'Ленинский район',
    address: 'г. Киров, ул. Чистопрудненская, 11А',
    floors: '4-8 этажей',
    completion_date: '2026',
    images: [],
  },
  {
    id: 'zhk-chistye-prudy',
    name: 'ЖК Чистые Пруды',
    developer: 'Кировспецмонтаж (КСМ)',
    district: 'Ленинский район',
    address: 'г. Киров, ул. Чистопрудненская, 11, 13',
    floors: '9-17 этажей',
    completion_date: '2027',
    images: [],
  },
  {
    id: 'zhk-skandinaviya',
    name: 'ЖК Скандинавия',
    developer: 'Кировский ССК',
    district: 'Ленинский район',
    address: 'г. Киров, ул. Анжелия Михеева, 1',
    floors: '16-18 этажей',
    completion_date: '2027',
    price_from: 4200000,
    images: ['https://example.com/skand.jpg'],
    builder_url: 'https://kvartiry.kssk.ru/objects/mikheeva-1/',
    contact_phone: '+7 (8332) 222-222',
  },
];

const MOCK_KSM_LOTS = [
  {
    id: 'ksm-1',
    project_slug: 'mkr-ozerki',
    title: '1-комнатная квартира, 38.4 м²',
    rooms_type: '1k',
    rooms_label: '1-комнатная',
    area: 38.42,
    floor: 1,
    flat_number: '5',
    address: 'ул. Торфяная, 11',
    finishing: 'Чистовая',
    price: 4200000,
    price_sqm: 109375,
    plan_image: 'https://ksm-kirov.ru/plans/1k-38.png',
    lot_url: 'https://ksm-kirov.ru/lot/ksm-1',
    is_available: true,
  },
  {
    id: 'ksm-2',
    project_slug: 'mkr-ozerki',
    title: '1-комнатная квартира, 38.4 м²',
    rooms_type: '1k',
    rooms_label: '1-комнатная',
    area: 38.44,
    floor: 17,
    flat_number: '85',
    address: 'ул. Торфяная, 11',
    finishing: 'Чистовая',
    price: 4550000,
    price_sqm: 118489,
    plan_image: 'http://ksm-kirov.ru/plans/1k-38.png',
    lot_url: 'https://ksm-kirov.ru/lot/ksm-2',
    is_available: true,
  },
  {
    id: 'ksm-3',
    project_slug: 'mkr-ozerki',
    title: '1-комнатная квартира, 38.4 м²',
    rooms_type: '1k',
    rooms_label: '1-комнатная',
    area: 38.4,
    floor: 5,
    flat_number: '25',
    address: 'ул. Торфяная, 11',
    finishing: 'Чистовая',
    price: 4350000,
    price_sqm: 113281,
    plan_image: 'https://ksm-kirov.ru/plans/1k-38.png',
    lot_url: 'https://ksm-kirov.ru/lot/ksm-3',
    is_available: true,
  },
  {
    id: 'ksm-unavailable',
    project_slug: 'mkr-ozerki',
    title: '2-комнатная',
    rooms_type: '2k',
    area: 55,
    floor: 4,
    price: 5800000,
    is_available: false,
  },
  {
    id: 'ksm-cp-11a',
    project_slug: 'zhr-chistye-prudy',
    title: 'Студия, 26.5 м²',
    rooms_type: 'studio',
    area: 26.5,
    floor: 3,
    address: 'ул. Чистопрудненская, 11А',
    finishing: 'Черновая',
    price: 3650000,
    price_sqm: 137735,
    is_available: true,
  },
];

const MOCK_KSSK_LOTS = [
  {
    id: 'kssk-1',
    project_slug: 'zhk-skandinaviya',
    title: '2-комнатная, 56.2 м²',
    rooms_type: '2k',
    rooms_label: '2-комнатная',
    area: 56.2,
    floor: 4,
    flat_number: '14',
    address: 'г. Киров, ул. Анжелия Михеева, 1',
    finishing: 'White box',
    price: 6100000,
    price_sqm: 108541,
    plan_image: 'https://kvartiry.kssk.ru/plans/2k-56.png',
    lot_url: 'https://kvartiry.kssk.ru/lot/kssk-1',
    is_available: true,
  },
  {
    id: 'kssk-2',
    project_slug: 'zhk-skandinaviya',
    title: '2-комнатная, 56.2 м²',
    rooms_type: '2k',
    rooms_label: '2-комнатная',
    area: 56.2,
    floor: 18,
    flat_number: '99',
    address: 'г. Киров, ул. Анжелия Михеева, 1',
    finishing: 'White box',
    price: 6500000,
    price_sqm: 115658,
    plan_image: 'https://kvartiry.kssk.ru/plans/2k-56.png',
    lot_url: 'https://kvartiry.kssk.ru/lot/kssk-2',
    is_available: true,
  },
];

describe('liveLotsFinder', () => {
  describe('parseMaxFloor', () => {
    it('extracts max floor from various development floor strings', () => {
      expect(parseMaxFloor('4-8 этажей')).toBe(8);
      expect(parseMaxFloor('17 этажей')).toBe(17);
      expect(parseMaxFloor('до 18 этажей')).toBe(18);
      expect(parseMaxFloor(25)).toBe(25);
      expect(parseMaxFloor('')).toBeNull();
      expect(parseMaxFloor(null)).toBeNull();
    });
  });

  describe('mergeAllDeveloperLots', () => {
    it('merges KSM and KSSK lots, skips unavailable lots, and enriches development metadata', () => {
      const merged = mergeAllDeveloperLots({
        ksmLots: MOCK_KSM_LOTS,
        ksskLots: MOCK_KSSK_LOTS,
        developments: MOCK_DEVELOPMENTS,
      });

      expect(merged).toHaveLength(6);

      const firstKsm = merged.find((l) => l._uid === 'ksm:ksm-1');
      expect(firstKsm).toMatchObject({
        _uid: 'ksm:ksm-1',
        _provider: 'ksm',
        _providerLabel: 'КСМ',
        _devId: 'zhk-ozerki-ksm',
        _devName: 'ЖК Озерки',
        _district: 'Первомайский район',
        _completionDate: '2026',
      });
      expect(firstKsm._dev?.id).toBe('zhk-ozerki-ksm');

      const cpLot = merged.find((l) => l._uid === 'ksm:ksm-cp-11a');
      expect(cpLot._devId).toBe('zhk-chistoprudnenskaya-11a');

      const ksskLot = merged.find((l) => l._uid === 'kssk:kssk-1');
      expect(ksskLot).toMatchObject({
        _uid: 'kssk:kssk-1',
        _provider: 'kssk',
        _providerLabel: 'КССК',
        _devId: 'zhk-skandinaviya',
        _devName: 'ЖК Скандинавия',
        _district: 'Ленинский район',
      });
    });
  });

  describe('filterFinderLots', () => {
    const merged = mergeAllDeveloperLots({
      ksmLots: MOCK_KSM_LOTS,
      ksskLots: MOCK_KSSK_LOTS,
      developments: MOCK_DEVELOPMENTS,
    });

    it('filters by provider and roomTypes', () => {
      const ksskOnly = filterFinderLots(merged, { provider: 'kssk' });
      expect(ksskOnly).toHaveLength(2);
      expect(ksskOnly.every((l) => l._provider === 'kssk')).toBe(true);

      const studiosAnd1k = filterFinderLots(merged, { roomTypes: ['studio', '1k'] });
      expect(studiosAnd1k).toHaveLength(4);
    });

    it('filters by price, area, floor ranges, notFirstFloor, and notLastFloor', () => {
      const notFirstOrLast = filterFinderLots(merged, {
        notFirstFloor: true,
        notLastFloor: true,
      });
      // Excludes ksm-1 (floor 1), ksm-2 (floor 17 of 17), kssk-2 (floor 18 of 18)
      expect(notFirstOrLast.map((l) => l._uid)).toEqual([
        'ksm:ksm-cp-11a',
        'ksm:ksm-3',
        'kssk:kssk-1',
      ]);

      const budgetFiltered = filterFinderLots(merged, {
        priceMin: 4000000,
        priceMax: 4400000,
        areaMin: 35,
        areaMax: 45,
        floorMin: 2,
        floorMax: 10,
      });
      expect(budgetFiltered.map((l) => l._uid)).toEqual(['ksm:ksm-3']);
    });

    it('filters by district and search query across fields', () => {
      const leninsky = filterFinderLots(merged, { district: 'Ленинский' });
      expect(leninsky.every((l) => l._district === 'Ленинский район')).toBe(true);
      expect(leninsky).toHaveLength(3);

      const searchByDev = filterFinderLots(merged, { search: 'Скандинавия' });
      expect(searchByDev).toHaveLength(2);

      const searchByFlat = filterFinderLots(merged, { search: '85' });
      expect(searchByFlat.map((l) => l._uid)).toEqual(['ksm:ksm-2']);

      const searchByFinishing = filterFinderLots(merged, { search: 'white box' });
      expect(searchByFinishing).toHaveLength(2);
    });

    it('supports all sortBy modes', () => {
      expect(filterFinderLots(merged, { sortBy: 'price_desc' })[0]._uid).toBe('kssk:kssk-2');
      expect(filterFinderLots(merged, { sortBy: 'price_sqm_asc' })[0]._uid).toBe('kssk:kssk-1');
      expect(filterFinderLots(merged, { sortBy: 'area_asc' })[0]._uid).toBe('ksm:ksm-cp-11a');
      expect(filterFinderLots(merged, { sortBy: 'area_desc' })[0]._uid).toBe('kssk:kssk-1');
      expect(filterFinderLots(merged, { sortBy: 'floor_asc' })[0]._uid).toBe('ksm:ksm-1');
    });
  });

  describe('groupLotsByLayout', () => {
    it('groups flats with identical planning and computes stats and floors summary', () => {
      const merged = mergeAllDeveloperLots({
        ksmLots: MOCK_KSM_LOTS,
        ksskLots: MOCK_KSSK_LOTS,
        developments: MOCK_DEVELOPMENTS,
      });
      const sorted = filterFinderLots(merged, { sortBy: 'price_asc' });
      const groups = groupLotsByLayout(sorted);

      // 4 distinct layouts:
      // 1) cp-11a studio 26.5 (minPrice 3,650,000)
      // 2) ozerki 1k 38.4 (3 flats, minPrice 4,200,000)
      // 3) skandinaviya 2k 56.2 (2 flats, minPrice 6,100,000)
      expect(groups).toHaveLength(3);
      expect(groups.map((g) => g.minPrice)).toEqual([3650000, 4200000, 6100000]);

      const ozerkiGroup = groups[1];
      expect(ozerkiGroup).toMatchObject({
        roomsLabel: '1-комнатная',
        roomsType: '1k',
        area: 38.4,
        devName: 'ЖК Озерки',
        devId: 'zhk-ozerki-ksm',
        providerLabel: 'КСМ',
        minPrice: 4200000,
        maxPrice: 4550000,
        minPriceSqm: 109375,
        finishing: 'Чистовая',
        count: 3,
        floorsSummary: '1, 5, 17 эт.',
      });
      // Inside group, sorted by floor ascending
      expect(ozerkiGroup.lots.map((l) => l.floor)).toEqual([1, 5, 17]);
    });

    it('groups lots without plan_image by address + _devId and formats contiguous floors', () => {
      const noPlanLots = [
        {
          id: 'a1',
          _devId: 'dev-1',
          _devName: 'ЖК Тест',
          _providerLabel: 'КСМ',
          rooms_type: '1k',
          area: 40.02,
          floor: 4,
          address: 'ул. Ленина, 10',
          price: 5000000,
        },
        {
          id: 'a2',
          _devId: 'dev-1',
          _devName: 'ЖК Тест',
          _providerLabel: 'КСМ',
          rooms_type: '1k',
          area: 40.04,
          floor: 3,
          address: 'ул. Ленина, 10',
          price: 4900000,
        },
      ];
      const groups = groupLotsByLayout(noPlanLots);
      expect(groups).toHaveLength(1);
      expect(groups[0].floorsSummary).toBe('3-4 эт.');
      expect(groups[0].lots.map((l) => l.floor)).toEqual([3, 4]);
    });
  });

  describe('buildSelectionItemFromLot', () => {
    it('builds canonical selection item with plan_image and all required fields', () => {
      const lot = MOCK_KSM_LOTS[2];
      const dev = MOCK_DEVELOPMENTS[0];
      const item = buildSelectionItemFromLot({
        lot,
        dev,
        providerLabel: 'КСМ',
        providerId: 'ksm',
        clientId: 'client-42',
        realtorId: 'user-7',
      });

      expect(item).toMatchObject({
        realtor_id: 'user-7',
        client_id: 'client-42',
        client_ids: ['client-42'],
        address: 'ЖК Озерки, ул. Торфяная, 11, кв. 25',
        city: 'Киров',
        price: 4350000,
        rooms: 1,
        floor: 5,
        area_total: 38.4,
        property_type: 'apartment',
        market_type: 'new_building',
        plan_image: 'https://ksm-kirov.ru/plans/1k-38.png',
        images: ['https://ksm-kirov.ru/plans/1k-38.png', 'https://example.com/ozerki.jpg'],
        link: 'https://ksm-kirov.ru/lot/ksm-3',
        contact_name: 'Кировспецмонтаж (КСМ) (Отдел продаж)',
        contact_phone: '+7 (8332) 111-111',
      });
      expect(item.notes).toContain('КСМ live');
      expect(item.notes).toContain('этаж 5');
      expect(item.notes).toContain('кв. 25');
      expect(item.id).toMatch(/^sel_ksm_ksm-3_/);
    });
  });

  describe('client request auto-filter helpers', () => {
    it('finds most recent active buyer request and maps to finder filters', () => {
      const requests = [
        {
          id: 'r-old',
          client_id: 'c1',
          status: 'completed',
          rooms: [3],
          budget_max: 9000000,
          updated_at: '2026-02-01T10:00:00Z',
        },
        {
          id: 'r-rent',
          client_id: 'c1',
          status: 'active',
          deal_type: 'rent',
          rooms: [1],
          budget_max: 30000,
          updated_at: '2026-03-01T10:00:00Z',
        },
        {
          id: 'r-active',
          client_ids: ['c1'],
          status: 'active',
          rooms: [0, 1],
          budget_min: 3200000,
          budget_max: 4800000,
          area_min: 28,
          area_max: 45,
          not_first_floor: true,
          districts: ['Ленинский район'],
          updated_at: '2026-02-15T10:00:00Z',
        },
      ];

      const activeReq = findActiveBuyerRequestForClient(requests, 'c1');
      expect(activeReq?.id).toBe('r-active');

      const mapped = requestToFinderFilters(activeReq);
      expect(mapped).toEqual({
        roomTypes: ['studio', '1k'],
        priceMin: '3200000',
        priceMax: '4800000',
        areaMin: '28',
        areaMax: '45',
        floorMin: '',
        floorMax: '',
        notFirstFloor: true,
        notLastFloor: false,
        districts: ['Ленинский район'],
      });
    });
  });
});
