import { describe, it, expect } from 'vitest';
import {
  HOUSE_COORDINATES,
  normalizeHouseAddress,
  formatHouseDisplayAddress,
  resolveHouseCoords,
  buildMapItemsFromDevelopments,
} from './houseCoordinates';

describe('houseCoordinates', () => {
  describe('normalizeHouseAddress', () => {
    it('strips city, street types, house prefix and section/queue suffixes', () => {
      expect(normalizeHouseAddress('г. Киров, ул. Московская, 209 (1 секция)')).toBe(
        normalizeHouseAddress('ул. Московская, 209')
      );
      expect(normalizeHouseAddress('Прибрежный, д. 6 (1 очередь)')).toBe(
        normalizeHouseAddress('Прибрежный, д. 6 (2 очередь)')
      );
      expect(normalizeHouseAddress('Прибрежный, д. 6 (1 очередь)')).toBe(
        normalizeHouseAddress('Прибрежный, д. 6')
      );
      expect(normalizeHouseAddress('Парковая улица, д.1В')).toBe('парковая, 1в');
      expect(normalizeHouseAddress('г. Киров, ул. Потребкооперации, 34 к. 1')).toBe('потребкооперации, 34к1');
      expect(normalizeHouseAddress('г. Киров, Хлебозаводской проезд, 2')).toBe('хлебозаводской, 2');
      expect(normalizeHouseAddress('г. Киров, Нововятский р-н, ул. Пушкина, 25')).toBe('пушкина, 25');
      expect(normalizeHouseAddress('Кирово-Чепецкий р-н, д. Шутовщина, ул. Ботаническая, 7')).toBe('ботаническая, 7');
      expect(normalizeHouseAddress('Шутовщина Ботаническая 7')).toBe('ботаническая, 7');
      expect(normalizeHouseAddress('г. Киров, ул. Горького, 2А')).toBe('горького, 2а');
      expect(normalizeHouseAddress('ул. Творчества, 1')).toBe('творчества, 1');
    });

    it('handles empty or invalid values safely', () => {
      expect(normalizeHouseAddress('')).toBe('');
      expect(normalizeHouseAddress(null)).toBe('');
      expect(normalizeHouseAddress(undefined)).toBe('');
    });
  });

  describe('formatHouseDisplayAddress', () => {
    it('cleans queue suffixes and city prefix for UI display', () => {
      expect(formatHouseDisplayAddress('Прибрежный, д. 6 (1 очередь)')).toBe('Прибрежный, д. 6');
      expect(formatHouseDisplayAddress('г. Киров, ул. Московская, 209 (1 секция)')).toBe('ул. Московская, 209');
    });
  });

  describe('HOUSE_COORDINATES and resolveHouseCoords', () => {
    it('contains all 24 verified KSM, KSSK, and KINO houses', () => {
      expect(Object.keys(HOUSE_COORDINATES)).toHaveLength(24);

      const checks = [
        ['Дорофеева, 20', 58.5851814, 49.5625922],
        ['Дорофеева, 22', 58.5843009, 49.5647537],
        ['Торфяная, 13в', 58.6624887, 49.6857951],
        ['Парковая улица, 1Б', 58.55388, 49.6465],
        ['Парковая улица, д.1В', 58.5533, 49.6476],
        ['Мелькомбинатовский, 3', 58.5917378, 49.6264372],
        ['Прибрежный, д. 6', 58.6558566, 49.6848787],
        ['Чистопрудненская, д. 11', 58.5630437, 49.6353832],
        ['Чистопрудненская, 11а', 58.5626433, 49.6345515],
        ['Чистопрудненская, д. 13', 58.5611115, 49.6341808],
        ['Чистопрудненская, д. 13а', 58.5601339, 49.6323136],
        ['ул. Анжелия Михеева, 1', 58.5902041, 49.5683998],
        ['ул. Анжелия Михеева, 5', 58.5862372, 49.5721589],
        ['ул. Московская, 209А', 58.598841, 49.576529],
        ['ул. Московская, 209', 58.598697, 49.5764385],
        ['ул. Потребкооперации, 34', 58.5628706, 49.6279464],
        ['ул. Потребкооперации, 34к1', 58.5628797, 49.6296959],
        ['Хлебозаводской пр-д, 2', 58.602647, 49.6450967],
        ['ул. Заводская, 14к2', 58.62781, 49.67669],
        ['ул. Пушкина, 25', 58.511224, 49.69181],
        ['ул. Пушкина, 25к1', 58.510721, 49.6919],
        ['ул. Горького, 2А', 58.603, 49.65067],
        ['д. Шутовщина, ул. Ботаническая, 7', 58.46621, 49.71345],
        ['ул. Творчества, 1', 58.4681, 49.7162],
      ];

      for (const [addr, lat, lng] of checks) {
        const resolved = resolveHouseCoords({ lat: 0, lng: 0 }, addr);
        expect(resolved.isExactHouse).toBe(true);
        expect(resolved.lat).toBe(lat);
        expect(resolved.lng).toBe(lng);
      }
    });

    it('falls back to parent dev coords and applies deterministic offset only for multiple siblings', () => {
      const dev = { id: 'zhk-test', lat: 58.6, lng: 49.6 };

      const single = resolveHouseCoords(dev, 'ул. Неизвестная, 10');
      expect(single).toEqual({
        lat: 58.6,
        lng: 49.6,
        normalizedAddress: 'неизвестная, 10',
        isExactHouse: false,
      });

      const first = resolveHouseCoords(dev, 'ул. Неизвестная, 10', { fallbackIndex: 0, fallbackTotal: 2 });
      const second = resolveHouseCoords(dev, 'ул. Неизвестная, 12', { fallbackIndex: 1, fallbackTotal: 2 });
      expect(first.isExactHouse).toBe(false);
      expect(second.isExactHouse).toBe(false);
      expect(first.lat).not.toBe(second.lat);
    });
  });

  describe('buildMapItemsFromDevelopments', () => {
    const devMetro = {
      id: 'zhk-metro',
      name: 'ЖК Метро',
      developer: 'Кировский ССК',
      district: 'Октябрьский район',
      microdistrict: 'Юго-Западный',
      address: 'г. Киров, ул. Московская, 209А',
      lat: 58.59839,
      lng: 49.57522,
      price_from: 5000000,
      completion_date: '2026',
      housing_class: 'Комфорт',
      images: ['https://example.com/metro.jpg'],
    };

    const devRiverPark = {
      id: 'zhk-river-park',
      name: 'ЖК River Park (Ривер Парк)',
      developer: 'Кировспецмонтаж (КСМ)',
      district: 'Первомайский район',
      microdistrict: 'Озерки',
      address: 'г. Киров, Прибрежный бульвар, 6/1, 6/2',
      lat: 58.65586,
      lng: 49.68488,
      price_from: 4200000,
      completion_date: '2027',
      housing_class: 'Комфорт',
      images: ['https://example.com/river.jpg'],
    };

    const devZnak = {
      id: 'zhk-znak',
      name: 'ЖК ZNAK (Знак)',
      developer: 'Железно',
      district: 'Ленинский район',
      microdistrict: 'Юго-Западный',
      address: 'г. Киров, ул. Капитана Дорофеева, 2',
      lat: 58.57985,
      lng: 49.55901,
      price_from: 6100000,
    };

    it('creates house pins grouped by normalized address with live min price and room stats', () => {
      const ksskLots = [
        {
          id: 'l1',
          project_slug: 'zhk-metro',
          address: 'г. Киров, ул. Московская, 209А',
          rooms_type: '1k',
          price: 4800000,
          plan_image: 'https://example.com/plan1.png',
          is_available: true,
        },
        {
          id: 'l2',
          project_slug: 'zhk-metro',
          address: 'г. Киров, ул. Московская, 209 (1 секция)',
          rooms_type: 'studio',
          price: 3950000,
          plan_image: 'https://example.com/plan2.png',
          is_available: true,
        },
        {
          id: 'l3',
          project_slug: 'zhk-metro',
          address: 'г. Киров, ул. Московская, 209',
          rooms_type: '2k',
          price: 6200000,
          is_available: true,
        },
        {
          id: 'l4-sold',
          project_slug: 'zhk-metro',
          address: 'г. Киров, ул. Московская, 209',
          rooms_type: '3k',
          price: 2000000,
          is_available: false,
        },
      ];

      const ksmLots = [
        {
          id: 'k1',
          project_slug: 'zhk-river-park',
          address: 'Прибрежный, д. 6 (1 очередь)',
          rooms_type: '1k',
          price: 4100000,
          is_available: true,
        },
        {
          id: 'k2',
          project_slug: 'zhk-river-park',
          address: 'Прибрежный, д. 6 (2 очередь)',
          rooms_type: '2k',
          price: 5300000,
          is_available: true,
        },
      ];

      const items = buildMapItemsFromDevelopments([devMetro, devRiverPark, devZnak], {
        ksmLots,
        ksskLots,
        showHousePins: true,
      });

      expect(items).toHaveLength(4);

      const metro209a = items.find((i) => i.id === 'zhk-metro::московская, 209а');
      expect(metro209a).toMatchObject({
        devId: 'zhk-metro',
        isHousePin: true,
        isExactHouse: true,
        lat: 58.598841,
        lng: 49.576529,
        price_from: 4800000,
        liveCount: 1,
        liveProviderLabel: 'КССК live',
        markerTitle: 'Метро · 209А',
        address: 'ул. Московская, 209А',
        samplePlanImage: 'https://example.com/plan1.png',
        sourceDev: devMetro,
      });

      const metro209 = items.find((i) => i.id === 'zhk-metro::московская, 209');
      expect(metro209).toMatchObject({
        devId: 'zhk-metro',
        isHousePin: true,
        lat: 58.598697,
        lng: 49.5764385,
        price_from: 3950000,
        liveCount: 2,
        byRoomType: { studio: 1, '1k': 0, '2k': 1, '3k': 0, '4k': 0 },
        markerTitle: 'Метро · 209',
      });

      const riverPin = items.find((i) => i.devId === 'zhk-river-park');
      expect(riverPin).toMatchObject({
        isHousePin: true,
        lat: 58.6558566,
        lng: 49.6848787,
        price_from: 4100000,
        liveCount: 2,
        liveProviderLabel: 'КСМ live',
        address: 'Прибрежный, д. 6',
        markerTitle: 'River Park · 6',
      });

      const znakPin = items.find((i) => i.devId === 'zhk-znak');
      expect(znakPin).toMatchObject({
        id: 'zhk-znak',
        devId: 'zhk-znak',
        isHousePin: false,
        price_from: 6100000,
      });
    });

    it('enriches parent marker from summary when 0 detailed lots or showHousePins is false', () => {
      const itemsFromSummary = buildMapItemsFromDevelopments([devMetro], {
        ksskSummaryBySlug: {
          'zhk-metro': {
            syncedCount: 18,
            minPrice: 4450000,
            byRoomType: { studio: 3, '1k': 7, '2k': 8, '3k': 0, '4k': 0 },
          },
        },
      });

      expect(itemsFromSummary).toHaveLength(1);
      expect(itemsFromSummary[0]).toMatchObject({
        id: 'zhk-metro',
        devId: 'zhk-metro',
        isHousePin: false,
        price_from: 4450000,
        liveCount: 18,
        liveProviderLabel: 'КССК live',
      });

      const itemsCollapsed = buildMapItemsFromDevelopments([devMetro], {
        ksskLots: [
          { id: '1', project_slug: 'zhk-metro', address: 'ул. Московская, 209', rooms_type: '1k', price: 4300000, is_available: true },
          { id: '2', project_slug: 'zhk-metro', address: 'ул. Московская, 209А', rooms_type: '2k', price: 5900000, is_available: true },
        ],
        showHousePins: false,
      });

      expect(itemsCollapsed).toHaveLength(1);
      expect(itemsCollapsed[0]).toMatchObject({
        id: 'zhk-metro',
        devId: 'zhk-metro',
        isHousePin: false,
        price_from: 4300000,
        liveCount: 2,
        liveProviderLabel: 'КССК live',
      });
    });

    it('creates house pins and parent markers for KINO developments', () => {
      const devFusion = {
        id: 'zhk-fusion-kino',
        name: 'ЖК Fusion (Фьюжн)',
        developer: 'КИНО Девелопмент',
        address: 'д. Шутовщина, ул. Ботаническая, 7',
        lat: 58.46621,
        lng: 49.71345,
        price_from: 3420000,
      };

      const kinoLots = [
        {
          id: 'k1',
          project_slug: 'fusion',
          address: 'д. Шутовщина, ул. Ботаническая, 7',
          rooms_type: 'studio',
          price: 3420000,
          is_available: true,
        },
      ];

      const items = buildMapItemsFromDevelopments([devFusion], {
        kinoLots,
        showHousePins: true,
      });

      expect(items).toHaveLength(1);
      expect(items[0]).toMatchObject({
        devId: 'zhk-fusion-kino',
        isHousePin: true,
        lat: 58.46621,
        lng: 49.71345,
        liveProviderLabel: 'КИНО live',
        liveCount: 1,
      });
    });
  });
});
