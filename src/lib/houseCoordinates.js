/**
 * src/lib/houseCoordinates.js - Реальные координаты домов КСМ/КССК в г. Кирове
 * и сборка маркеров карты (по домам при наличии live-лотов или по ЖК).
 */

import { getKsmSlugForDevelopment } from './ksmLots';
import { getKsskSlugForDevelopment } from './ksskLots';
import { ROOM_TYPE_KEYS } from './liveLotsShared';

/**
 * Нормализует адрес дома для сопоставления с геокодированной базой HOUSE_COORDINATES
 * и группировки секций/очередей одного дома.
 * @param {string | null | undefined} rawAddress
 * @returns {string}
 */
export function normalizeHouseAddress(rawAddress) {
  if (!rawAddress || typeof rawAddress !== 'string') return '';

  let s = rawAddress
    .replace(/[\u00a0\u202f]/g, ' ')
    .replace(/ё/gi, 'е')
    .toLowerCase()
    .trim();

  if (!s) return '';

  // Удаляем пометки очередей, секций, этапов и подъездов в скобках
  s = s.replace(/\([^)]*(?:секц|очеред|этап|подъезд|лит|корп)[^)]*\)/gi, ' ');
  s = s.replace(/\(\s*\)/g, ' ');

  // Удаляем город, область, микрорайон и административный район
  s = s.replace(/(?:^|[\s,])(?:г\.?\s*)?киров(?:\s*,|\s+|$)/gi, ' ');
  s = s.replace(/(?:^|[\s,])кировская\s+обл(?:асть|\.)?(?:\s*,|\s+|$)/gi, ' ');
  s = s.replace(/(?:^|[\s,])(?:мкр\.?|микрорайон)\s*[^,]+(?=,|$)/gi, ' ');
  s = s.replace(/(?:^|[\s,])[^,]*(?:^|\s)(?:р-н|район)(?=,|$)/gi, ' ');

  // Удаляем типовые обозначения улиц/проездов (границы без \b для кириллицы)
  s = s.replace(
    /(^|[\s,])(?:улица|ул\.?|проезд|пр-д|проспект|пр-кт|бульвар|б-р|переулок|пер\.?|шоссе|ш\.?)(?=[\s,]|$)/gi,
    '$1'
  );

  // Синонимы названий улиц между каталогом и фидами застройщиков
  s = s.replace(/(^|[\s,])капитана\s+дорофеева(?=[\s,]|$)/gi, '$1дорофеева');

  // Нормализуем "д." / "дом" перед номером дома
  s = s.replace(/(^|[\s,])(?:д\.?|дом)\s*(?=\d)/gi, '$1');

  // Нормализуем корпус и литеры: "34 к. 1" -> "34к1", "11 а" -> "11а"
  s = s.replace(/(\d+)\s*(?:корпус|корп\.?|к\.?)\s*(\d+)/gi, '$1к$2');
  s = s.replace(/(\d+)\s+([а-яa-z])(?=$|[\s,])/gi, '$1$2');

  // Очищаем запятые и пробелы
  s = s
    .replace(/\s*,\s*/g, ', ')
    .replace(/(?:^[\s,]+|[\s,]+$)/g, '')
    .replace(/,\s*,+/g, ', ')
    .replace(/\s+/g, ' ')
    .trim();

  // Если между улицей и номером дома нет запятой ("московская 209а"), приводим к "московская, 209а"
  if (s && !s.includes(',')) {
    const match = s.match(/^(.+?)\s+(\d+[а-яa-z]?(?:к\d+)?(?:\/\d+)?)$/i);
    if (match) {
      s = `${match[1].trim()}, ${match[2].trim()}`;
    }
  }

  return s;
}

/**
 * Очищает отображаемый адрес дома от города и пометок секций/очередей.
 * @param {string | null | undefined} rawAddress
 * @returns {string}
 */
export function formatHouseDisplayAddress(rawAddress) {
  if (!rawAddress || typeof rawAddress !== 'string') return '';

  return rawAddress
    .replace(/[\u00a0\u202f]/g, ' ')
    .replace(/\([^)]*(?:секц|очеред|этап|подъезд|лит|корп)[^)]*\)/gi, ' ')
    .replace(/^\s*(?:г\.?\s*)?киров\s*,\s*/i, '')
    .replace(/\s*,\s*/g, ', ')
    .replace(/(?:^[\s,]+|[\s,]+$)/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

const VERIFIED_HOUSE_ENTRIES = [
  // КСМ
  { devId: 'zhk-life-ksm', address: 'Дорофеева, 20', lat: 58.5851814, lng: 49.5625922 },
  { devId: 'zhk-life-ksm', address: 'Дорофеева, 22', lat: 58.5843009, lng: 49.5647537 },
  { devId: 'zhk-ozerki-ksm', address: 'Торфяная, 13в', lat: 58.6624887, lng: 49.6857951 },
  { devId: 'zhk-city-park', address: 'Парковая улица, 1Б', lat: 58.55388, lng: 49.6465 },
  { devId: 'zhk-city-park', address: 'Парковая улица, д.1В', lat: 58.5533, lng: 49.6476 },
  { devId: 'zhk-vidny', address: 'Мелькомбинатовский, 3', lat: 58.5917378, lng: 49.6264372 },
  { devId: 'zhk-river-park', address: 'Прибрежный, д. 6', lat: 58.6558566, lng: 49.6848787 },
  { devId: 'zhk-chistye-prudy', address: 'Чистопрудненская, д. 11', lat: 58.5630437, lng: 49.6353832 },
  { devId: 'zhk-chistye-prudy', address: 'Чистопрудненская, 11а', lat: 58.5626433, lng: 49.6345515 },
  { devId: 'zhk-chistye-prudy', address: 'Чистопрудненская, д. 13', lat: 58.5611115, lng: 49.6341808 },
  { devId: 'zhk-chistye-prudy', address: 'Чистопрудненская, д. 13а', lat: 58.5601339, lng: 49.6323136 },
  // КССК
  { devId: 'zhk-skandinaviya', address: 'ул. Анжелия Михеева, 1', lat: 58.5902041, lng: 49.5683998 },
  { devId: 'zhk-skandinaviya', address: 'ул. Анжелия Михеева, 5', lat: 58.5862372, lng: 49.5721589 },
  { devId: 'zhk-metro', address: 'ул. Московская, 209А', lat: 58.598841, lng: 49.576529 },
  { devId: 'zhk-metro', address: 'ул. Московская, 209', lat: 58.598697, lng: 49.5764385 },
  { devId: 'zhk-sloboda', address: 'ул. Потребкооперации, 34', lat: 58.5628706, lng: 49.6279464 },
  { devId: 'zhk-sloboda', address: 'ул. Потребкооперации, 34к1', lat: 58.5628797, lng: 49.6296959 },
  { devId: 'zhk-x2', address: 'Хлебозаводской пр-д, 2', lat: 58.602647, lng: 49.6450967 },
  { devId: 'zhk-dom-u-reki', address: 'ул. Заводская, 14к2', lat: 58.62781, lng: 49.67669 },
  { devId: 'zhk-pushkina', address: 'ул. Пушкина, 25', lat: 58.511224, lng: 49.69181 },
  { devId: 'zhk-pushkina', address: 'ул. Пушкина, 25к1', lat: 58.510721, lng: 49.6919 },
];

/**
 * Словарь проверенных координат домов Кирова, индексированный по normalizeHouseAddress.
 */
export const HOUSE_COORDINATES = Object.fromEntries(
  VERIFIED_HOUSE_ENTRIES.map((entry) => [
    normalizeHouseAddress(entry.address),
    {
      lat: entry.lat,
      lng: entry.lng,
      devId: entry.devId,
      address: entry.address,
    },
  ])
);

function computeDeterministicOffset(index, total) {
  if (!total || total <= 1) return { dLat: 0, dLng: 0 };
  const angle = Math.PI / 4 + (2 * Math.PI * index) / total;
  const radius = 0.00035;
  return {
    dLat: Number((Math.sin(angle) * radius).toFixed(7)),
    dLng: Number((Math.cos(angle) * radius * 1.4).toFixed(7)),
  };
}

/**
 * Определяет координаты конкретного дома: точное совпадение в HOUSE_COORDINATES
 * или fallback на координаты родительского ЖК (с детерминированным смещением только
 * если несколько негеокодированных домов делят координаты одного ЖК).
 * @param {object | null | undefined} dev
 * @param {string | null | undefined} rawAddress
 * @param {{ fallbackIndex?: number, fallbackTotal?: number }} [options]
 * @returns {{ lat: number | null, lng: number | null, normalizedAddress: string, isExactHouse: boolean }}
 */
export function resolveHouseCoords(dev, rawAddress, options = {}) {
  const normalizedAddress = normalizeHouseAddress(rawAddress);
  const exact = normalizedAddress ? HOUSE_COORDINATES[normalizedAddress] : null;

  if (exact && Number.isFinite(exact.lat) && Number.isFinite(exact.lng)) {
    return {
      lat: exact.lat,
      lng: exact.lng,
      normalizedAddress,
      isExactHouse: true,
    };
  }

  const baseLat = Number(dev?.lat);
  const baseLng = Number(dev?.lng);
  if (!Number.isFinite(baseLat) || !Number.isFinite(baseLng)) {
    return {
      lat: null,
      lng: null,
      normalizedAddress,
      isExactHouse: false,
    };
  }

  const fallbackTotal = Number(options.fallbackTotal) || 1;
  const fallbackIndex = Number(options.fallbackIndex) || 0;
  const { dLat, dLng } = computeDeterministicOffset(fallbackIndex, fallbackTotal);

  return {
    lat: Number((baseLat + dLat).toFixed(7)),
    lng: Number((baseLng + dLng).toFixed(7)),
    normalizedAddress,
    isExactHouse: false,
  };
}

function getShortDevName(devName) {
  let clean = String(devName || '').trim();
  clean = clean.replace(/^ЖК\s+/i, '');
  clean = clean.replace(/^Квартал\s+/i, '');
  clean = clean.replace(/^Дом\s+на\s+/i, '');
  clean = clean.replace(/^Дом\s+/i, '');
  clean = clean.replace(/\s*\([^)]*\)\s*/g, ' ');
  clean = clean.replace(/[«»"]/g, '').replace(/\s+/g, ' ').trim();
  return clean || String(devName || '');
}

function extractHouseNumber(displayAddress) {
  if (!displayAddress) return '';
  const commaParts = String(displayAddress).split(',').map((p) => p.trim()).filter(Boolean);
  const tail = commaParts.length > 0 ? commaParts[commaParts.length - 1] : String(displayAddress).trim();
  const stripped = tail.replace(/^(?:д\.?|дом)\s*/i, '').trim();
  if (stripped && /\d/.test(stripped)) {
    return stripped;
  }
  const match = String(displayAddress).match(/(\d+[а-яa-z]?(?:к\d+)?(?:\/\d+)?)\s*$/i);
  return match ? match[1] : '';
}

function buildMarkerTitle(devName, displayAddress) {
  const shortName = getShortDevName(devName);
  const houseNum = extractHouseNumber(displayAddress);
  if (shortName && houseNum) {
    return `${shortName} · ${houseNum}`;
  }
  return shortName || displayAddress || '';
}

function createEmptyRoomStats() {
  return {
    studio: 0,
    '1k': 0,
    '2k': 0,
    '3k': 0,
    '4k': 0,
  };
}

function aggregateLotsStats(lots) {
  const byRoomType = createEmptyRoomStats();
  let minPrice = null;
  let samplePlanImage = null;

  for (const lot of lots) {
    if (ROOM_TYPE_KEYS.includes(lot.rooms_type)) {
      byRoomType[lot.rooms_type] += 1;
    }
    const price = Number(lot.price);
    if (Number.isFinite(price) && price > 0) {
      minPrice = minPrice === null ? price : Math.min(minPrice, price);
    }
    if (!samplePlanImage && lot.plan_image) {
      samplePlanImage = lot.plan_image;
    }
  }

  return { byRoomType, minPrice, samplePlanImage };
}

function createParentMarker(dev, extra = {}) {
  return {
    ...dev,
    devId: dev.id,
    isHousePin: false,
    sourceDev: dev,
    ...extra,
  };
}

/**
 * Формирует список элементов для карты (отдельные маркеры домов при наличии live-лотов
 * или обогащенные маркеры ЖК).
 * @param {Array<object>} developments
 * @param {{
 *   ksmLots?: Array<object>,
 *   ksskLots?: Array<object>,
 *   ksmSummaryBySlug?: Record<string, object>,
 *   ksskSummaryBySlug?: Record<string, object>,
 *   showHousePins?: boolean,
 * }} [options]
 * @returns {Array<object>}
 */
export function buildMapItemsFromDevelopments(
  developments = [],
  {
    ksmLots = [],
    ksskLots = [],
    ksmSummaryBySlug = {},
    ksskSummaryBySlug = {},
    showHousePins = true,
  } = {}
) {
  if (!Array.isArray(developments) || developments.length === 0) return [];

  const hasMainChistyePrudy = developments.some((d) => d?.id === 'zhk-chistye-prudy');
  const items = [];

  for (const dev of developments) {
    if (!dev || typeof dev !== 'object') continue;

    const ksmSlug = getKsmSlugForDevelopment(dev);
    const ksskSlug = getKsskSlugForDevelopment(dev);
    const providerId = ksmSlug ? 'ksm' : ksskSlug ? 'kssk' : null;
    const activeSlug = ksmSlug || ksskSlug;

    if (!providerId || !activeSlug) {
      items.push(createParentMarker(dev));
      continue;
    }

    const sourceLots = providerId === 'ksm' ? ksmLots : ksskLots;
    const summaryMap = providerId === 'ksm' ? ksmSummaryBySlug : ksskSummaryBySlug;
    const liveProviderLabel = providerId === 'ksm' ? 'КСМ live' : 'КССК live';
    const summary = summaryMap?.[activeSlug] || null;

    let matchingLots = (Array.isArray(sourceLots) ? sourceLots : []).filter(
      (lot) => lot && lot.project_slug === activeSlug && lot.is_available !== false
    );

    // Если в списке есть и ЖК Чистые Пруды, и отдельная карточка дома 11А,
    // не дублируем все 4 дома: 11А остается родительским маркером для своего дома.
    const isSecondaryChistoprudnenskaya =
      dev.id === 'zhk-chistoprudnenskaya-11a' && hasMainChistyePrudy;
    if (isSecondaryChistoprudnenskaya) {
      const lots11a = matchingLots.filter(
        (lot) => normalizeHouseAddress(lot.address) === 'чистопрудненская, 11а'
      );
      const stats11a = aggregateLotsStats(lots11a);
      items.push(
        createParentMarker(dev, {
          price_from: stats11a.minPrice || dev.price_from,
          liveCount: lots11a.length,
          liveProviderLabel: lots11a.length > 0 ? liveProviderLabel : undefined,
          byRoomType: lots11a.length > 0 ? stats11a.byRoomType : undefined,
          samplePlanImage: stats11a.samplePlanImage,
        })
      );
      continue;
    }

    if (showHousePins && matchingLots.length > 0) {
      const groupsMap = new Map();

      for (const lot of matchingLots) {
        const rawAddr = lot.address || dev.address || '';
        const normKey = normalizeHouseAddress(rawAddr) || '__default__';
        const displayAddr = formatHouseDisplayAddress(rawAddr) || dev.address || '';

        if (!groupsMap.has(normKey)) {
          groupsMap.set(normKey, {
            houseKey: normKey,
            rawAddress: rawAddr,
            displayAddress: displayAddr,
            lots: [],
          });
        }
        groupsMap.get(normKey).lots.push(lot);
      }

      const groups = Array.from(groupsMap.values());
      const unGeocodedGroups = groups.filter(
        (g) => !HOUSE_COORDINATES[g.houseKey]
      );
      const unGeocodedTotal = unGeocodedGroups.length;
      let unGeocodedIdx = 0;

      for (const group of groups) {
        const isExactInDict = Boolean(HOUSE_COORDINATES[group.houseKey]);
        const coords = resolveHouseCoords(dev, group.rawAddress, {
          fallbackIndex: isExactInDict ? 0 : unGeocodedIdx++,
          fallbackTotal: isExactInDict ? 1 : unGeocodedTotal,
        });

        const { byRoomType, minPrice, samplePlanImage } = aggregateLotsStats(group.lots);

        items.push({
          id: `${dev.id}::${group.houseKey}`,
          devId: dev.id,
          isHousePin: true,
          isExactHouse: coords.isExactHouse,
          name: dev.name,
          markerTitle: buildMarkerTitle(dev.name, group.displayAddress),
          address: group.displayAddress,
          lat: coords.lat,
          lng: coords.lng,
          price_from: minPrice || dev.price_from,
          liveCount: group.lots.length,
          liveProviderLabel,
          byRoomType,
          samplePlanImage,
          developer: dev.developer,
          district: dev.district,
          microdistrict: dev.microdistrict,
          completion_date: dev.completion_date,
          housing_class: dev.housing_class,
          images: dev.images,
          sourceDev: dev,
        });
      }

      continue;
    }

    // Fallback на родительский маркер ЖК, обогащенный сводкой или лотами
    if (matchingLots.length > 0) {
      const stats = aggregateLotsStats(matchingLots);
      items.push(
        createParentMarker(dev, {
          price_from: stats.minPrice || dev.price_from,
          liveCount: matchingLots.length,
          liveProviderLabel,
          byRoomType: stats.byRoomType,
          samplePlanImage: stats.samplePlanImage,
        })
      );
      continue;
    }

    if (summary && ((Number(summary.syncedCount) || 0) > 0 || (Number(summary.minPrice) || 0) > 0)) {
      items.push(
        createParentMarker(dev, {
          price_from: Number(summary.minPrice) > 0 ? Number(summary.minPrice) : dev.price_from,
          liveCount: Number(summary.syncedCount) || 0,
          liveProviderLabel,
          byRoomType: summary.byRoomType || createEmptyRoomStats(),
          samplePlanImage: null,
        })
      );
      continue;
    }

    items.push(createParentMarker(dev));
  }

  return items;
}

const ROOM_BREAKDOWN_LABELS = [
  ['studio', 'Ст'],
  ['1k', '1к'],
  ['2k', '2к'],
  ['3k', '3к'],
  ['4k', '4к+'],
];

/**
 * Форматирует краткую разбивку свободных квартир по комнатности ("Ст: 2 · 1к: 5").
 * @param {Record<string, number> | null | undefined} byRoomType
 * @returns {string}
 */
export function formatRoomBreakdownText(byRoomType) {
  if (!byRoomType || typeof byRoomType !== 'object') return '';
  const parts = [];
  for (const [key, label] of ROOM_BREAKDOWN_LABELS) {
    const count = Number(byRoomType[key]) || 0;
    if (count > 0) {
      parts.push(`${label}: ${count}`);
    }
  }
  return parts.join(' · ');
}

/**
 * Проверяет, соответствует ли маркер карты (ЖК или дом) выбранному ID.
 * @param {object | null | undefined} item
 * @param {string | number | null | undefined} selectedId
 * @returns {boolean}
 */
export function isSelectedMapItem(item, selectedId) {
  if (!item || selectedId === null || selectedId === undefined || selectedId === '') {
    return false;
  }
  const target = String(selectedId);
  return String(item.id) === target || (Boolean(item.devId) && String(item.devId) === target);
}

/**
 * Экранирует строку для безопасной подстановки в HTML-шаблоны попапов и балунов карты.
 * @param {unknown} value
 * @returns {string}
 */
export function escapeMapHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

