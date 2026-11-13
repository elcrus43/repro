/**
 * src/lib/liveLotsFinder.js - Unified search, layout grouping, client auto-filter,
 * and canonical selection item builder for live developer lots (KSM + KSSK + KINO).
 */

import { getKsmSlugForDevelopment, KSM_PROJECT_NAMES } from './ksmLots';
import { getKsskSlugForDevelopment, KSSK_PROJECT_NAMES } from './ksskLots';
import { getKinoSlugForDevelopment, KINO_PROJECT_NAMES } from './kinoLots';
import { getAvitekSlugForDevelopment, AVITEK_PROJECT_NAMES } from './avitekLots';
import { getAltaiSlugForDevelopment, ALTAI_PROJECT_NAMES } from './altaiLots';
import { getStroysoyuzSlugForDevelopment, STROYSOYUZ_PROJECT_NAMES } from './stroysoyuzLots';
import { getProfstroySlugForDevelopment, PROFSTROY_PROJECT_NAMES } from './profstroyLots';
import { formatNumber } from '../utils/format';

export const ROOM_FILTER_OPTIONS = [
  { id: 'studio', label: 'Студия', short: 'Ст' },
  { id: '1k', label: '1к', short: '1к' },
  { id: '2k', label: '2к', short: '2к' },
  { id: '3k', label: '3к', short: '3к' },
  { id: '4k', label: '4к', short: '4к+' },
];

const ROOM_LABELS = {
  studio: 'Студия',
  '1k': '1-комнатная',
  '2k': '2-комнатная',
  '3k': '3-комнатная',
  '4k': '4-комнатная',
};

export const PROVIDER_META = {
  ksm: {
    id: 'ksm',
    label: 'КСМ',
    badgeClass: 'ksm',
    color: '#0284c7',
    projectNames: KSM_PROJECT_NAMES,
    getSlug: getKsmSlugForDevelopment,
  },
  kssk: {
    id: 'kssk',
    label: 'КССК',
    badgeClass: 'kssk',
    color: '#ea580c',
    projectNames: KSSK_PROJECT_NAMES,
    getSlug: getKsskSlugForDevelopment,
  },
  kino: {
    id: 'kino',
    label: 'КИНО',
    badgeClass: 'kino',
    color: '#8b5cf6',
    projectNames: KINO_PROJECT_NAMES,
    getSlug: getKinoSlugForDevelopment,
  },
  avitek: {
    id: 'avitek',
    label: 'АВИТЕК',
    badgeClass: 'avitek',
    color: '#10b981',
    projectNames: AVITEK_PROJECT_NAMES,
    getSlug: getAvitekSlugForDevelopment,
  },
  altai: {
    id: 'altai',
    label: 'АЛТАЙ-СТРОЙ',
    badgeClass: 'altai',
    color: '#f59e0b',
    projectNames: ALTAI_PROJECT_NAMES,
    getSlug: getAltaiSlugForDevelopment,
  },
  stroysoyuz: {
    id: 'stroysoyuz',
    label: 'СТРОЙСОЮЗ',
    badgeClass: 'stroysoyuz',
    color: '#0d9488',
    projectNames: STROYSOYUZ_PROJECT_NAMES,
    getSlug: getStroysoyuzSlugForDevelopment,
  },
  profstroy: {
    id: 'profstroy',
    label: 'ПРОФСТРОЙ',
    badgeClass: 'profstroy',
    color: '#4f46e5',
    projectNames: PROFSTROY_PROJECT_NAMES,
    getSlug: getProfstroySlugForDevelopment,
  },
};

function toPositiveNumber(value) {
  if (value === null || value === undefined || value === '') return null;
  const num = typeof value === 'number' ? value : Number(String(value).replace(/\s+/g, '').replace(',', '.'));
  return Number.isFinite(num) && num > 0 ? num : null;
}

function toSortableAsc(value) {
  const num = toPositiveNumber(value);
  return num !== null ? num : Number.POSITIVE_INFINITY;
}

function toSortableDesc(value) {
  const num = toPositiveNumber(value);
  return num !== null ? num : -1;
}

/**
 * Converts canonical rooms_type to numeric room count for CRM selection items.
 * @param {string | null | undefined} roomsType
 * @returns {number | null}
 */
export function mapRoomsTypeToCount(roomsType) {
  if (roomsType === 'studio') return 0;
  if (roomsType === '1k') return 1;
  if (roomsType === '2k') return 2;
  if (roomsType === '3k') return 3;
  if (roomsType === '4k') return 4;
  return null;
}

/**
 * Formats canonical rooms_type to human-readable label.
 * @param {string | null | undefined} roomsType
 * @returns {string}
 */
export function formatRoomsLabel(roomsType) {
  return ROOM_LABELS[roomsType] || 'Квартира';
}

/**
 * Parses max floor number from strings like "4-8 этажей", "17 этажей", "до 18 этажей".
 * @param {string | number | null | undefined} floorsValue
 * @returns {number | null}
 */
export function parseMaxFloor(floorsValue) {
  if (floorsValue === null || floorsValue === undefined) return null;
  if (typeof floorsValue === 'number') {
    return Number.isFinite(floorsValue) && floorsValue > 0 ? floorsValue : null;
  }
  const matches = String(floorsValue).match(/\d+/g);
  if (!matches || matches.length === 0) return null;
  const nums = matches.map((m) => parseInt(m, 10)).filter((n) => Number.isFinite(n) && n > 0);
  return nums.length > 0 ? Math.max(...nums) : null;
}

function normalizeDistrict(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/\bрайон\b/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function buildDevSlugLookup(developments, getSlugFn) {
  const map = new Map();
  for (const dev of Array.isArray(developments) ? developments : []) {
    const slug = getSlugFn(dev);
    if (!slug) continue;
    if (!map.has(slug)) {
      map.set(slug, []);
    }
    map.get(slug).push(dev);
  }
  return map;
}

function resolveMatchedDevelopment(candidates, lot) {
  if (!Array.isArray(candidates) || candidates.length === 0) return null;
  if (candidates.length === 1) return candidates[0];

  const lotAddr = String(lot?.address || '').toLowerCase();
  if (lotAddr) {
    // Prefer a specific house match when multiple catalog entries share a slug (e.g. 11А vs 11, 13)
    const houseMatch = candidates.find((dev) => {
      const devAddr = String(dev.address || '').toLowerCase();
      const tokens = devAddr.match(/\d+[а-яa-z]?/gi) || [];
      return tokens.some((tok) => lotAddr.includes(tok));
    });
    if (houseMatch) return houseMatch;
  }

  return candidates.find((d) => !String(d.id || '').includes('11a')) || candidates[0];
}

/**
 * Merges and enriches KSM, KSSK, KINO, AVITEK, ALTAI, and STROYSOYUZ live lots with matched development metadata.
 * @param {{ ksmLots?: Array<object>, ksskLots?: Array<object>, kinoLots?: Array<object>, avitekLots?: Array<object>, altaiLots?: Array<object>, stroysoyuzLots?: Array<object>, developments?: Array<object> }} [params]
 * @returns {Array<object>}
 */
export function mergeAllDeveloperLots({
  ksmLots = [],
  ksskLots = [],
  kinoLots = [],
  avitekLots = [],
  altaiLots = [],
  stroysoyuzLots = [],
  profstroyLots = [],
  developments = [],
} = {}) {
  const ksmLookup = buildDevSlugLookup(developments, PROVIDER_META.ksm.getSlug);
  const ksskLookup = buildDevSlugLookup(developments, PROVIDER_META.kssk.getSlug);
  const kinoLookup = buildDevSlugLookup(developments, PROVIDER_META.kino.getSlug);
  const avitekLookup = buildDevSlugLookup(developments, PROVIDER_META.avitek.getSlug);
  const altaiLookup = buildDevSlugLookup(developments, PROVIDER_META.altai.getSlug);
  const stroysoyuzLookup = buildDevSlugLookup(developments, PROVIDER_META.stroysoyuz.getSlug);
  const profstroyLookup = buildDevSlugLookup(developments, PROVIDER_META.profstroy.getSlug);

  const sources = [
    { provider: PROVIDER_META.ksm, lots: ksmLots, lookup: ksmLookup },
    { provider: PROVIDER_META.kssk, lots: ksskLots, lookup: ksskLookup },
    { provider: PROVIDER_META.kino, lots: kinoLots, lookup: kinoLookup },
    { provider: PROVIDER_META.avitek, lots: avitekLots, lookup: avitekLookup },
    { provider: PROVIDER_META.altai, lots: altaiLots, lookup: altaiLookup },
    { provider: PROVIDER_META.stroysoyuz, lots: stroysoyuzLots, lookup: stroysoyuzLookup },
    { provider: PROVIDER_META.profstroy, lots: profstroyLots, lookup: profstroyLookup },
  ];

  const seenUids = new Set();
  const merged = [];

  for (const { provider, lots, lookup } of sources) {
    for (const lot of Array.isArray(lots) ? lots : []) {
      if (!lot || lot.id === undefined || lot.id === null || lot.is_available === false) {
        continue;
      }

      const uid = `${provider.id}:${lot.id}`;
      if (seenUids.has(uid)) continue;
      seenUids.add(uid);

      const candidates = lot.project_slug ? lookup.get(lot.project_slug) : null;
      const dev = resolveMatchedDevelopment(candidates, lot);

      merged.push({
        ...lot,
        _uid: uid,
        _provider: provider.id,
        _providerLabel: provider.label,
        _dev: dev || null,
        _devId: dev?.id || null,
        _devName: dev?.name || lot.project_name || provider.projectNames[lot.project_slug] || '',
        _district: dev?.district || '',
        _completionDate: dev?.completion_date || '',
      });
    }
  }

  return merged;
}

function getEffectivePriceSqm(lot) {
  const direct = toPositiveNumber(lot?.price_sqm);
  if (direct !== null) return direct;
  const price = toPositiveNumber(lot?.price);
  const area = toPositiveNumber(lot?.area);
  if (price !== null && area !== null) {
    return Math.round(price / area);
  }
  return null;
}

/**
 * Filters and sorts enriched live lots according to finder criteria.
 * @param {Array<object>} [mergedLots]
 * @param {object} [filters]
 * @returns {Array<object>}
 */
export function filterFinderLots(mergedLots = [], filters = {}) {
  const list = Array.isArray(mergedLots) ? mergedLots : [];
  const {
    provider = 'all',
    roomTypes = [],
    priceMin = null,
    priceMax = null,
    areaMin = null,
    areaMax = null,
    floorMin = null,
    floorMax = null,
    notFirstFloor = false,
    notLastFloor = false,
    district = '',
    districts = [],
    search = '',
    sortBy = 'price_asc',
  } = filters || {};

  const minPrice = toPositiveNumber(priceMin);
  const maxPrice = toPositiveNumber(priceMax);
  const minArea = toPositiveNumber(areaMin);
  const maxArea = toPositiveNumber(areaMax);
  const minFloor = toPositiveNumber(floorMin);
  const maxFloor = toPositiveNumber(floorMax);

  const normalizedRoomTypes = Array.isArray(roomTypes) ? roomTypes.filter(Boolean) : [];
  const rawDistricts = [
    ...(Array.isArray(districts) ? districts : []),
    ...(Array.isArray(district) ? district : district && district !== 'all' ? [district] : []),
  ]
    .map(normalizeDistrict)
    .filter(Boolean);

  const query = String(search || '').trim().toLowerCase();

  const filtered = list.filter((lot) => {
    if (!lot) return false;

    if (provider && provider !== 'all' && lot._provider !== provider) {
      return false;
    }

    if (normalizedRoomTypes.length > 0 && !normalizedRoomTypes.includes(lot.rooms_type)) {
      return false;
    }

    const price = toPositiveNumber(lot.price);
    if (minPrice !== null && (price === null || price < minPrice)) {
      return false;
    }
    if (maxPrice !== null && (price === null || price > maxPrice)) {
      return false;
    }

    const area = toPositiveNumber(lot.area);
    if (minArea !== null && (area === null || area < minArea)) {
      return false;
    }
    if (maxArea !== null && (area === null || area > maxArea)) {
      return false;
    }

    const floor = toPositiveNumber(lot.floor);
    if (minFloor !== null && (floor === null || floor < minFloor)) {
      return false;
    }
    if (maxFloor !== null && (floor === null || floor > maxFloor)) {
      return false;
    }

    if (notFirstFloor && (floor === null || floor <= 1)) {
      return false;
    }

    if (notLastFloor) {
      const devMaxFloor = toPositiveNumber(lot.floors_total) ?? parseMaxFloor(lot._dev?.floors);
      if (devMaxFloor !== null && (floor === null || floor >= devMaxFloor)) {
        return false;
      }
    }

    if (rawDistricts.length > 0) {
      const lotDistrict = normalizeDistrict(lot._district || lot._dev?.district || '');
      if (!lotDistrict) return false;
      const matchesDistrict = rawDistricts.some(
        (d) => lotDistrict === d || lotDistrict.includes(d) || d.includes(lotDistrict)
      );
      if (!matchesDistrict) return false;
    }

    if (query) {
      const haystack = [
        lot.title,
        lot.address,
        lot.flat_number,
        lot._devName,
        lot.project_name,
        lot.finishing,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      if (!haystack.includes(query)) {
        return false;
      }
    }

    return true;
  });

  return [...filtered].sort((a, b) => {
    let diff = 0;
    if (sortBy === 'price_desc') {
      diff = toSortableDesc(b.price) - toSortableDesc(a.price);
    } else if (sortBy === 'price_sqm_asc') {
      diff = toSortableAsc(getEffectivePriceSqm(a)) - toSortableAsc(getEffectivePriceSqm(b));
    } else if (sortBy === 'area_asc') {
      diff = toSortableAsc(a.area) - toSortableAsc(b.area);
    } else if (sortBy === 'area_desc') {
      diff = toSortableDesc(b.area) - toSortableDesc(a.area);
    } else if (sortBy === 'floor_asc') {
      diff = toSortableAsc(a.floor) - toSortableAsc(b.floor);
    } else {
      diff = toSortableAsc(a.price) - toSortableAsc(b.price);
    }

    if (diff !== 0) return diff;
    return String(a._uid || a.id || '').localeCompare(String(b._uid || b.id || ''));
  });
}

function normalizePlanKey(url) {
  const trimmed = String(url || '').trim();
  if (!trimmed) return '';
  return trimmed.replace(/^http:\/\//i, 'https://');
}

function normalizeAddressKey(address) {
  return String(address || '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function formatFloorsSummary(lots) {
  const floors = Array.from(
    new Set(
      lots
        .map((l) => toPositiveNumber(l.floor))
        .filter((f) => f !== null)
    )
  ).sort((a, b) => a - b);

  if (floors.length === 0) return '';
  if (floors.length === 1) return `${floors[0]} эт.`;

  let isContiguous = true;
  for (let i = 1; i < floors.length; i++) {
    if (floors[i] !== floors[i - 1] + 1) {
      isContiguous = false;
      break;
    }
  }

  if (isContiguous || floors.length > 5) {
    return `${floors[0]}-${floors[floors.length - 1]} эт.`;
  }

  return `${floors.join(', ')} эт.`;
}

/**
 * Groups flats with identical planning into layout groups while preserving outer order.
 * @param {Array<object>} [lots]
 * @returns {Array<object>}
 */
export function groupLotsByLayout(lots = []) {
  const list = Array.isArray(lots) ? lots : [];
  const groupOrder = [];
  const groupsMap = new Map();

  for (const lot of list) {
    if (!lot) continue;

    const roomsType = lot.rooms_type || null;
    const areaNum = toPositiveNumber(lot.area);
    const areaKey = areaNum !== null ? areaNum.toFixed(1) : 'na';
    const devKey = lot._devId || lot.project_slug || lot._devName || 'dev';
    const planKey = normalizePlanKey(lot.plan_image);
    const addrKey = normalizeAddressKey(lot.address || lot._dev?.address || '');
    const layoutPart = planKey ? `plan:${planKey}` : `addr:${addrKey || 'none'}`;
    const groupKey = `${devKey}::${roomsType || 'unknown'}::${areaKey}::${layoutPart}`;

    if (!groupsMap.has(groupKey)) {
      groupsMap.set(groupKey, []);
      groupOrder.push(groupKey);
    }
    groupsMap.get(groupKey).push(lot);
  }

  return groupOrder.map((groupKey) => {
    const rawLots = groupsMap.get(groupKey);
    const sortedLots = [...rawLots].sort((a, b) => {
      const floorDiff = toSortableAsc(a.floor) - toSortableAsc(b.floor);
      if (floorDiff !== 0) return floorDiff;
      const priceDiff = toSortableAsc(a.price) - toSortableAsc(b.price);
      if (priceDiff !== 0) return priceDiff;
      return String(a.flat_number || a._uid || a.id || '').localeCompare(
        String(b.flat_number || b._uid || b.id || '')
      );
    });

    const prices = sortedLots.map((l) => toPositiveNumber(l.price)).filter((p) => p !== null);
    const pricesSqm = sortedLots.map(getEffectivePriceSqm).filter((p) => p !== null);
    const minPrice = prices.length > 0 ? Math.min(...prices) : null;
    const maxPrice = prices.length > 0 ? Math.max(...prices) : null;
    const minPriceSqm = pricesSqm.length > 0 ? Math.min(...pricesSqm) : null;

    const representativeLot =
      sortedLots.find((l) => toPositiveNumber(l.price) === minPrice && l.plan_image) ||
      sortedLots.find((l) => toPositiveNumber(l.price) === minPrice) ||
      sortedLots.find((l) => Boolean(l.plan_image)) ||
      sortedLots[0];

    const areaNum = toPositiveNumber(representativeLot.area);
    const roundedArea = areaNum !== null ? Number(areaNum.toFixed(1)) : null;
    const planImage = sortedLots.find((l) => l.plan_image)?.plan_image || null;
    const address =
      sortedLots.find((l) => l.address)?.address ||
      representativeLot._dev?.address ||
      '';
    const finishingList = Array.from(
      new Set(sortedLots.map((l) => l.finishing).filter(Boolean))
    );

    return {
      groupKey,
      representativeLot,
      planImage,
      roomsLabel: representativeLot.rooms_label || formatRoomsLabel(representativeLot.rooms_type),
      roomsType: representativeLot.rooms_type || null,
      area: roundedArea,
      address,
      dev: representativeLot._dev || null,
      devName: representativeLot._devName || representativeLot.project_name || '',
      devId: representativeLot._devId || null,
      provider: representativeLot._provider || null,
      providerLabel: representativeLot._providerLabel || '',
      minPrice,
      maxPrice,
      minPriceSqm,
      finishing: finishingList.join(', '),
      count: sortedLots.length,
      floorsSummary: formatFloorsSummary(sortedLots),
      lots: sortedLots,
    };
  });
}

/**
 * Canonical builder for CRM selection items created from live developer lots.
 * Used by both LiveLotsFinder and DevelopmentDetailModal.
 * @param {{ lot: object, dev?: object | null, providerLabel?: string, providerId?: string, clientId?: string | null, realtorId?: string | null }} params
 * @returns {object}
 */
export function buildSelectionItemFromLot({
  lot,
  dev = null,
  providerLabel = '',
  providerId = '',
  clientId = null,
  realtorId = null,
} = {}) {
  const resolvedDev = dev || lot?._dev || null;
  const resolvedProviderId = providerId || lot?._provider || 'ksm';
  const defaultProviderLabel =
    resolvedProviderId === 'kino'
      ? 'КИНО'
      : resolvedProviderId === 'kssk'
        ? 'КССК'
        : resolvedProviderId === 'avitek'
          ? 'АВИТЕК'
          : resolvedProviderId === 'altai'
            ? 'АЛТАЙ-СТРОЙ'
            : resolvedProviderId === 'stroysoyuz'
              ? 'СТРОЙСОЮЗ'
              : resolvedProviderId === 'profstroy'
                ? 'ПРОФСТРОЙ'
                : 'КСМ';
  const resolvedProviderLabel =
    providerLabel || lot?._providerLabel || defaultProviderLabel;
  const devImages = Array.isArray(resolvedDev?.images) ? resolvedDev.images : [];
  const devName = resolvedDev?.name || lot?._devName || lot?.project_name || '';
  const baseAddress = lot?.address || resolvedDev?.address || '';
  const flatSuffix = lot?.flat_number ? `, кв. ${lot.flat_number}` : '';
  const address = [devName, baseAddress].filter(Boolean).join(', ') + flatSuffix;

  const priceSqm = getEffectivePriceSqm(lot);
  const completionDate = resolvedDev?.completion_date || lot?._completionDate || '';
  const notesParts = [
    `${resolvedProviderLabel} live: ${lot?.title || formatRoomsLabel(lot?.rooms_type)}`,
    lot?.finishing ? `отделка: ${lot.finishing}` : null,
    lot?.floor ? `этаж ${lot.floor}` : null,
    lot?.flat_number ? `кв. ${lot.flat_number}` : null,
  ].filter(Boolean);

  let notes = `${notesParts.join(', ')}.`;
  if (priceSqm) {
    notes += ` За м²: ${formatNumber(priceSqm)} ₽.`;
  }
  if (completionDate) {
    notes += ` Срок: ${completionDate}.`;
  }

  const uniqueSuffix = Math.random().toString(36).slice(2, 6);

  return {
    id: `sel_${resolvedProviderId}_${lot?.id ?? 'lot'}_${Date.now()}_${uniqueSuffix}`,
    ...(realtorId ? { realtor_id: realtorId } : {}),
    client_id: clientId || null,
    client_ids: clientId ? [clientId] : [],
    address,
    city: 'Киров',
    price: toPositiveNumber(lot?.price) ?? toPositiveNumber(resolvedDev?.price_from) ?? 0,
    rooms: mapRoomsTypeToCount(lot?.rooms_type),
    floor: lot?.floor ?? null,
    area_total: toPositiveNumber(lot?.area),
    property_type: 'apartment',
    market_type: 'new_building',
    plan_image: lot?.plan_image || null,
    images: lot?.plan_image
      ? [lot.plan_image, ...devImages.slice(0, 2)]
      : devImages.slice(0, 3),
    notes,
    link: lot?.lot_url || resolvedDev?.builder_url || resolvedDev?.avito_url || null,
    contact_name: resolvedDev?.developer
      ? `${resolvedDev.developer} (Отдел продаж)`
      : `${resolvedProviderLabel} (Отдел продаж)`,
    contact_phone: resolvedDev?.contact_phone || null,
    created_at: new Date().toISOString(),
  };
}

/**
 * Finds the most recent active buyer (purchase) request for the selected client.
 * @param {Array<object>} [requests]
 * @param {string | null | undefined} clientId
 * @returns {object | null}
 */
export function findActiveBuyerRequestForClient(requests = [], clientId) {
  if (!clientId || !Array.isArray(requests)) return null;

  const matching = requests.filter((req) => {
    if (!req) return false;
    const status = String(req.status || 'active').toLowerCase();
    if (status === 'completed' || status === 'closed' || status === 'archived') {
      return false;
    }
    const dealType = String(req.deal_type || 'sale').toLowerCase();
    if (dealType === 'rent' || dealType === 'hire') {
      return false;
    }
    const clientIds = Array.isArray(req.client_ids) ? req.client_ids : [];
    return req.client_id === clientId || clientIds.includes(clientId);
  });

  if (matching.length === 0) return null;

  return [...matching].sort((a, b) => {
    const tA = new Date(a.updated_at || a.created_at || 0).getTime() || 0;
    const tB = new Date(b.updated_at || b.created_at || 0).getTime() || 0;
    return tB - tA;
  })[0];
}

function mapRequestRoomToType(roomVal) {
  if (roomVal === 0 || roomVal === '0' || roomVal === 'studio') return 'studio';
  if (roomVal === 1 || roomVal === '1' || roomVal === '1k') return '1k';
  if (roomVal === 2 || roomVal === '2' || roomVal === '2k') return '2k';
  if (roomVal === 3 || roomVal === '3' || roomVal === '3k') return '3k';
  const num = Number(roomVal);
  if (Number.isFinite(num) && num >= 4) return '4k';
  if (roomVal === '4k') return '4k';
  return null;
}

/**
 * Converts a CRM client request object into LiveLotsFinder filter state fields.
 * @param {object | null | undefined} request
 * @returns {object | null}
 */
export function requestToFinderFilters(request) {
  if (!request) return null;

  const roomTypes = Array.from(
    new Set(
      (Array.isArray(request.rooms) ? request.rooms : [])
        .map(mapRequestRoomToType)
        .filter(Boolean)
    )
  );

  return {
    roomTypes,
    priceMin: toPositiveNumber(request.budget_min) ? String(request.budget_min) : '',
    priceMax: toPositiveNumber(request.budget_max) ? String(request.budget_max) : '',
    areaMin: toPositiveNumber(request.area_min) ? String(request.area_min) : '',
    areaMax: toPositiveNumber(request.area_max) ? String(request.area_max) : '',
    floorMin: toPositiveNumber(request.floor_min) ? String(request.floor_min) : '',
    floorMax: toPositiveNumber(request.floor_max) ? String(request.floor_max) : '',
    notFirstFloor: Boolean(request.not_first_floor),
    notLastFloor: Boolean(request.not_last_floor),
    districts: Array.isArray(request.districts) ? request.districts.filter(Boolean) : [],
  };
}
