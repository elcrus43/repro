/**
 * src/lib/developmentMatching.js - Матчинг live-лотов новостроек (КСМ/КССК)
 * с клиентскими запросами на покупку.
 */

import { isDealTypeCompatible } from '../utils/matching';
import { getKsmSlugForDevelopment } from './ksmLots';
import { getKsskSlugForDevelopment } from './ksskLots';
import { normalizeHouseAddress } from './houseCoordinates';

const ROOMS_TYPE_TO_NUM = {
  studio: 0,
  '1k': 1,
  '2k': 2,
  '3k': 3,
  '4k': 4,
};

function parseRoomsCount(lot) {
  if (!lot || typeof lot !== 'object') return null;

  if (lot.rooms_type && Object.prototype.hasOwnProperty.call(ROOMS_TYPE_TO_NUM, lot.rooms_type)) {
    return ROOMS_TYPE_TO_NUM[lot.rooms_type];
  }

  if (typeof lot.rooms === 'number' && Number.isFinite(lot.rooms) && lot.rooms >= 0) {
    return lot.rooms >= 4 ? 4 : Math.trunc(lot.rooms);
  }

  const text = `${lot.rooms_label || ''} ${lot.title || ''}`.toLowerCase();
  if (/студ/i.test(text)) return 0;
  const match = text.match(/(\d+)\s*[-\s]*(?:комн|к(?=$|[^а-яёa-z0-9]))/i);
  if (match) {
    const num = parseInt(match[1], 10);
    if (Number.isFinite(num) && num >= 1) {
      return num >= 4 ? 4 : num;
    }
  }

  return null;
}

function normalizeRequestRoomValue(val) {
  if (val === 0 || val === '0') return 0;
  if (typeof val === 'number' && Number.isFinite(val)) {
    return val >= 4 ? 4 : Math.trunc(val);
  }
  const s = String(val || '').trim().toLowerCase();
  if (!s) return null;
  if (s === 'studio' || s.includes('студ')) return 0;
  if (s in ROOMS_TYPE_TO_NUM) return ROOMS_TYPE_TO_NUM[s];
  const m = s.match(/^(\d+)/);
  if (m) {
    const n = parseInt(m[1], 10);
    return n >= 4 ? 4 : n;
  }
  return null;
}

function normalizeDistrictKey(val) {
  return String(val || '')
    .toLowerCase()
    .replace(/(?:^|[\s,])(?:район|р-н)(?=[\s,]|$)/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function formatShortPrice(n) {
  if (!n) return '0';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2).replace(/\.?0+$/, '')} млн`;
  if (n >= 1_000) return `${Math.round(n / 1_000)} тыс.`;
  return String(n);
}

/**
 * Преобразует live-лот КСМ/КССК в нормализованную структуру кандидата для матчинга.
 * @param {object} lot
 * @param {object | null} [dev]
 * @returns {object}
 */
export function normalizeLotToMatchCandidate(lot, dev = null) {
  const rooms = parseRoomsCount(lot);
  const priceNum = lot?.price !== null && lot?.price !== undefined ? Number(lot.price) : null;
  const areaNum = lot?.area !== null && lot?.area !== undefined
    ? Number(lot.area)
    : lot?.area_total !== null && lot?.area_total !== undefined
      ? Number(lot.area_total)
      : null;
  const floorNum = lot?.floor !== null && lot?.floor !== undefined ? Number(lot.floor) : null;
  const floorsTotalNum = lot?.floors_total !== null && lot?.floors_total !== undefined
    ? Number(lot.floors_total)
    : null;

  return {
    id: lot?.id ?? null,
    rooms,
    rooms_type: lot?.rooms_type ?? null,
    price: Number.isFinite(priceNum) && priceNum > 0 ? priceNum : null,
    area_total: Number.isFinite(areaNum) && areaNum > 0 ? areaNum : null,
    floor: Number.isFinite(floorNum) && floorNum > 0 ? floorNum : null,
    floors_total: Number.isFinite(floorsTotalNum) && floorsTotalNum > 0 ? floorsTotalNum : null,
    district: dev?.district || lot?.district || '',
    microdistrict: dev?.microdistrict || lot?.microdistrict || '',
    city: dev?.city || lot?.city || 'Киров',
    market_type: 'new_building',
    property_type: 'apartment',
    deal_type: 'sale',
    address: lot?.address || dev?.address || '',
    developer: dev?.developer || '',
    project_name: dev?.name || lot?.project_name || '',
    project_slug: lot?.project_slug || null,
    plan_image: lot?.plan_image || null,
    lot_url: lot?.lot_url || null,
  };
}

/**
 * Оценивает совместимость live-лота новостройки с клиентским запросом.
 * Возвращает null при жесткой несовместимости или низком скоре (< 50).
 * @param {object} lot
 * @param {object} request
 * @param {object | null} [dev]
 * @param {{ budgetTolerance?: number, strictMarketType?: boolean }} [options]
 * @returns {{ score: number, match_level: 'perfect' | 'good' | 'possible', matched_params: string[], mismatched_params: string[] } | null}
 */
export function scoreLiveLotForRequest(lot, request, dev = null, options = {}) {
  if (!lot || lot.is_available === false || !request) return null;

  const candidate = normalizeLotToMatchCandidate(lot, dev);

  // 0. Тип сделки (покупка vs аренда)
  if (!isDealTypeCompatible(candidate, request)) {
    return null;
  }

  // 1. Тип недвижимости: live-лоты застройщиков это квартиры
  if (Array.isArray(request.property_types) && request.property_types.length > 0) {
    if (!request.property_types.includes('apartment')) {
      return null;
    }
  }

  // 2. Город
  if (request.city && candidate.city.toLowerCase() !== String(request.city).trim().toLowerCase()) {
    return null;
  }

  // 3. Комнатность (поддержка studio / 0 / 1..4)
  if (Array.isArray(request.rooms) && request.rooms.length > 0) {
    const allowedRooms = request.rooms
      .map(normalizeRequestRoomValue)
      .filter((v) => v !== null);
    if (allowedRooms.length > 0) {
      if (candidate.rooms === null || !allowedRooms.includes(candidate.rooms)) {
        return null;
      }
    }
  }

  const budgetTolerance = typeof options.budgetTolerance === 'number' ? options.budgetTolerance : 0.05;
  const matched = [];
  const mismatched = [];
  let score = 0;

  // === БЮДЖЕТ (35 баллов) ===
  const budgetMax = Number(request.budget_max) || 0;
  const budgetMin = Number(request.budget_min) || 0;
  const price = candidate.price;

  if (price !== null) {
    if (budgetMax > 0 && price > budgetMax * (1 + budgetTolerance)) {
      return null;
    }

    if (budgetMax > 0 && price <= budgetMax && price >= budgetMin) {
      score += 35;
      matched.push(`Цена: ${formatShortPrice(price)} ₽ в бюджете`);
    } else if (budgetMax > 0 && price > budgetMax) {
      score += 15;
      mismatched.push(`Цена: ${formatShortPrice(price)} ₽ до +5% выше бюджета ${formatShortPrice(budgetMax)} ₽`);
    } else if (budgetMin > 0 && price < budgetMin) {
      if (price >= budgetMin * 0.9) {
        score += 25;
        matched.push(`Цена: ${formatShortPrice(price)} ₽ близко к нижнему порогу`);
      } else {
        score += 10;
        mismatched.push(`Цена: ${formatShortPrice(price)} ₽ ниже бюджета от ${formatShortPrice(budgetMin)} ₽`);
      }
    } else {
      score += 35;
      matched.push(`Цена: ${formatShortPrice(price)} ₽`);
    }
  } else {
    score += 20;
  }

  // === РАЙОН И МИКРОРАЙОН (25 + 5 бонус) ===
  const reqDistricts = Array.isArray(request.districts) ? request.districts.filter(Boolean) : [];
  if (reqDistricts.length === 0) {
    score += 25;
    matched.push('Район: любой');
  } else {
    const candDistrictKey = normalizeDistrictKey(candidate.district);
    const districtMatched = Boolean(
      candDistrictKey && reqDistricts.some((d) => normalizeDistrictKey(d) === candDistrictKey)
    );

    if (districtMatched) {
      score += 25;
      matched.push(`Район: ${candidate.district}`);

      const reqMicros = Array.isArray(request.microdistricts) ? request.microdistricts.filter(Boolean) : [];
      if (reqMicros.length > 0 && candidate.microdistrict) {
        const microMatch = reqMicros.some(
          (m) => m.trim().toLowerCase() === candidate.microdistrict.trim().toLowerCase()
        );
        if (microMatch) {
          score += 5;
          matched.push(`Микрорайон: ${candidate.microdistrict}`);
        }
      }
    } else {
      mismatched.push(
        `Район: ${candidate.district || 'не указан'} (в запросе: ${reqDistricts.join(', ')})`
      );
    }
  }

  // === ПЛОЩАДЬ (20 баллов) ===
  const areaMin = Number(request.area_min) || 0;
  const areaMax = Number(request.area_max) || 0;
  if ((areaMin > 0 || areaMax > 0) && candidate.area_total !== null) {
    const upper = areaMax > 0 ? areaMax : Number.POSITIVE_INFINITY;
    const area = candidate.area_total;
    if (area >= areaMin && area <= upper) {
      score += 20;
      matched.push(`Площадь: ${area} м²`);
    } else if (
      (areaMin > 0 && area >= areaMin * 0.9 && area < areaMin) ||
      (areaMax > 0 && area > areaMax && area <= areaMax * 1.1)
    ) {
      score += 10;
      mismatched.push(`Площадь: ${area} м² рядом с диапазоном [${areaMin || 0}-${areaMax || '∞'}]`);
    } else {
      mismatched.push(`Площадь: ${area} м² вне диапазона [${areaMin || 0}-${areaMax || '∞'}]`);
    }
  } else {
    score += 20;
    if (candidate.area_total !== null) {
      matched.push(`Площадь: ${candidate.area_total} м²`);
    }
  }

  // === ЭТАЖ (15 баллов) ===
  const floorMin = Number(request.floor_min) || 0;
  const floorMax = Number(request.floor_max) || 0;
  let floorScore = 15;

  if (candidate.floor !== null) {
    if (floorMin > 0 || floorMax > 0) {
      const fMin = floorMin > 0 ? floorMin : 1;
      const fMax = floorMax > 0 ? floorMax : 99;
      if (candidate.floor >= fMin && candidate.floor <= fMax) {
        matched.push(`Этаж: ${candidate.floor}`);
      } else {
        floorScore -= 10;
        mismatched.push(`Этаж: ${candidate.floor} вне диапазона [${fMin}-${fMax}]`);
      }
    }

    if (request.not_first_floor) {
      if (candidate.floor > 1) {
        matched.push('Не первый этаж');
      } else {
        floorScore -= 5;
        mismatched.push('Первый этаж (в запросе: не первый)');
      }
    }
  }
  score += Math.max(0, floorScore);

  // === РЫНОК И КОМНАТНОСТЬ (5 баллов) ===
  const reqMarkets = Array.isArray(request.market_types) ? request.market_types.filter(Boolean) : [];
  if (reqMarkets.length > 0 && !reqMarkets.includes('new_building')) {
    if (options.strictMarketType) {
      return null;
    }
    score -= 10;
    mismatched.push('Рынок: Новостройка (в запросе только вторичка)');
  } else {
    score += 5;
    if (reqMarkets.includes('new_building')) {
      matched.push('Рынок: Новостройка');
    }
  }

  const finalScore = Math.min(100, Math.max(0, Math.round(score)));
  if (finalScore < 50) return null;

  let match_level = 'possible';
  if (finalScore >= 85) match_level = 'perfect';
  else if (finalScore >= 65) match_level = 'good';

  return {
    score: finalScore,
    match_level,
    matched_params: matched,
    mismatched_params: mismatched,
  };
}

function buildDevIndex(developmentsByIdOrList) {
  const bySlug = new Map();
  const byId = new Map();

  let list = [];
  if (Array.isArray(developmentsByIdOrList)) {
    list = developmentsByIdOrList;
  } else if (developmentsByIdOrList instanceof Map) {
    list = Array.from(developmentsByIdOrList.values());
  } else if (developmentsByIdOrList && typeof developmentsByIdOrList === 'object') {
    list = Object.values(developmentsByIdOrList);
  }

  for (const dev of list) {
    if (!dev || typeof dev !== 'object') continue;
    if (dev.id) byId.set(dev.id, dev);

    const ksmSlug = getKsmSlugForDevelopment(dev);
    const ksskSlug = getKsskSlugForDevelopment(dev);
    const slug = ksmSlug || ksskSlug;
    if (!slug) continue;

    if (!bySlug.has(slug)) {
      bySlug.set(slug, []);
    }
    bySlug.get(slug).push(dev);
  }

  return { bySlug, byId };
}

function resolveDevForLot(lot, { bySlug, byId }) {
  if (!lot) return null;
  if (lot.devId && byId.has(lot.devId)) {
    return byId.get(lot.devId);
  }
  const slug = lot.project_slug;
  if (!slug) return null;
  if (byId.has(slug)) return byId.get(slug);

  const candidates = bySlug.get(slug);
  if (!candidates || candidates.length === 0) return null;
  if (candidates.length === 1) return candidates[0];

  const normAddr = normalizeHouseAddress(lot.address);
  if (normAddr === 'чистопрудненская, 11а') {
    const exact11a = candidates.find((d) => d.id === 'zhk-chistoprudnenskaya-11a');
    if (exact11a) return exact11a;
  }
  return candidates.find((d) => d.id === 'zhk-chistye-prudy') || candidates[0];
}

/**
 * Подбирает и ранжирует подходящие live-лоты новостроек под запрос клиента.
 * @param {Array<object>} lots
 * @param {object} request
 * @param {Array<object> | Map<string, object> | Record<string, object>} [developmentsByIdOrList]
 * @param {{ budgetTolerance?: number, strictMarketType?: boolean, limit?: number }} [options]
 * @returns {Array<{
 *   lot: object,
 *   dev: object | null,
 *   candidate: object,
 *   score: number,
 *   match_level: 'perfect' | 'good' | 'possible',
 *   matched_params: string[],
 *   mismatched_params: string[]
 * }>}
 */
export function matchLiveLotsToRequest(lots = [], request, developmentsByIdOrList = [], options = {}) {
  if (!Array.isArray(lots) || lots.length === 0 || !request) return [];

  const index = buildDevIndex(developmentsByIdOrList);
  const results = [];

  for (const lot of lots) {
    if (!lot || lot.is_available === false) continue;
    const dev = resolveDevForLot(lot, index);
    const scored = scoreLiveLotForRequest(lot, request, dev, options);
    if (!scored) continue;

    results.push({
      lot,
      dev,
      candidate: normalizeLotToMatchCandidate(lot, dev),
      ...scored,
    });
  }

  results.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    const priceA = Number(a.lot?.price) || Number.POSITIVE_INFINITY;
    const priceB = Number(b.lot?.price) || Number.POSITIVE_INFINITY;
    if (priceA !== priceB) return priceA - priceB;
    return String(a.lot?.id || '').localeCompare(String(b.lot?.id || ''));
  });

  if (Number.isFinite(options.limit) && options.limit > 0) {
    return results.slice(0, options.limit);
  }

  return results;
}

/**
 * Checks whether a CRM request is an active purchase request eligible for new-building suggestions.
 * @param {object | null | undefined} request
 * @returns {boolean}
 */
export function isPurchaseRequestForDevelopments(request) {
  if (!request || typeof request !== 'object') return false;
  const status = String(request.status || 'active').toLowerCase();
  if (status !== 'active') return false;

  const dealType = String(request.deal_type || 'sale').toLowerCase().trim();
  if (dealType === 'rent' || dealType === 'hire' || dealType === 'аренда' || dealType === 'найм') {
    return false;
  }

  if (Array.isArray(request.property_types) && request.property_types.length > 0) {
    if (!request.property_types.includes('apartment')) {
      return false;
    }
  }

  return true;
}

function getPositiveNumber(val) {
  if (val === null || val === undefined || val === '') return null;
  const num = Number(val);
  return Number.isFinite(num) && num > 0 ? num : null;
}

function buildLiveLotsLookup(liveLots = [], developments = []) {
  const byDevId = new Map();
  if (!Array.isArray(liveLots) || liveLots.length === 0) return byDevId;

  const index = buildDevIndex(developments);
  for (const lot of liveLots) {
    if (!lot || lot.is_available === false) continue;
    const dev = resolveDevForLot(lot, index);
    if (!dev?.id) continue;
    if (!byDevId.has(dev.id)) byDevId.set(dev.id, []);
    byDevId.get(dev.id).push(lot);
  }
  return byDevId;
}

/**
 * Matches catalog developments (ЖК) against a purchase request by price and location.
 * @param {Array<object>} [developments]
 * @param {object | null | undefined} request
 * @param {{ budgetTolerance?: number, limit?: number, liveLots?: Array<object> }} [options]
 * @returns {Array<{
 *   dev: object,
 *   score: number,
 *   match_level: 'perfect' | 'good' | 'possible',
 *   priceMatchType: 'exact' | 'near' | 'any',
 *   locationMatchType: 'microdistrict' | 'district' | 'any',
 *   effectivePriceFrom: number | null,
 *   matchedApartments: Array<object>,
 *   matchedLiveLots: Array<object>,
 *   liveLotsCount: number,
 *   liveMinPrice: number | null,
 *   priceReason: string,
 *   locationReason: string
 * }>}
 */
export function matchDevelopmentsToRequest(developments = [], request, options = {}) {
  if (!Array.isArray(developments) || developments.length === 0) return [];
  if (!isPurchaseRequestForDevelopments(request)) return [];

  const budgetTolerance = typeof options.budgetTolerance === 'number' ? options.budgetTolerance : 0.1;
  const budgetMax = getPositiveNumber(request.budget_max) || 0;
  const budgetMin = getPositiveNumber(request.budget_min) || 0;

  const reqCity = request.city ? String(request.city).trim().toLowerCase() : '';
  const reqDistricts = Array.isArray(request.districts) ? request.districts.filter(Boolean) : [];
  const reqMicros = Array.isArray(request.microdistricts) ? request.microdistricts.filter(Boolean) : [];

  const allowedRooms = Array.isArray(request.rooms) && request.rooms.length > 0
    ? request.rooms.map(normalizeRequestRoomValue).filter((v) => v !== null)
    : [];

  const liveLotsByDevId = buildLiveLotsLookup(options.liveLots, developments);
  const results = [];

  for (const dev of developments) {
    if (!dev || typeof dev !== 'object') continue;

    // 1. City check (developments catalog defaults to Киров)
    const devCity = String(dev.city || 'Киров').trim().toLowerCase();
    if (reqCity && devCity !== reqCity) {
      continue;
    }

    // 2. Location check (district & microdistrict)
    const devDistrictKey = normalizeDistrictKey(dev.district);
    const devMicroLower = String(dev.microdistrict || '').trim().toLowerCase();
    const devAddressLower = String(dev.address || '').toLowerCase();

    let locationMatchType = 'any';
    let locationMatched = false;

    if (reqDistricts.length === 0 && reqMicros.length === 0) {
      locationMatched = true;
      locationMatchType = 'any';
    } else {
      const microMatchedInMicros = reqMicros.length > 0 && (
        (devMicroLower && reqMicros.some((m) => {
          const mk = m.trim().toLowerCase();
          return devMicroLower === mk || devMicroLower.includes(mk) || mk.includes(devMicroLower);
        })) ||
        reqMicros.some((m) => devAddressLower.includes(m.trim().toLowerCase()))
      );

      const districtMatched = reqDistricts.length > 0 && reqDistricts.some((d) => {
        const dk = normalizeDistrictKey(d);
        if (!dk) return false;
        if (devDistrictKey && (devDistrictKey === dk || devDistrictKey.includes(dk) || dk.includes(devDistrictKey))) {
          return true;
        }
        // Fallback if microdistrict name was saved in districts
        if (devMicroLower && (devMicroLower === dk || devMicroLower.includes(dk))) {
          return true;
        }
        return false;
      });

      if (reqDistricts.length > 0 && !districtMatched) {
        continue;
      }
      if (reqDistricts.length === 0 && reqMicros.length > 0 && !microMatchedInMicros) {
        continue;
      }

      locationMatched = true;
      locationMatchType = microMatchedInMicros ? 'microdistrict' : 'district';
    }

    if (!locationMatched) continue;

    // 3. Rooms & Price check
    const rawApartments = Array.isArray(dev.apartments) ? dev.apartments : [];
    const roomFilteredApartments = allowedRooms.length > 0 && rawApartments.length > 0
      ? rawApartments.filter((apt) => {
          const r = normalizeRequestRoomValue(apt?.type ?? apt?.name);
          return r !== null && allowedRooms.includes(r);
        })
      : rawApartments;

    if (allowedRooms.length > 0 && rawApartments.length > 0 && roomFilteredApartments.length === 0) {
      continue;
    }

    // Check optional live lots for this dev
    const devLiveLots = liveLotsByDevId.get(dev.id) || [];
    const matchedLiveLots = devLiveLots.filter((lot) => {
      const lotCandidate = normalizeLotToMatchCandidate(lot, dev);
      if (allowedRooms.length > 0 && (lotCandidate.rooms === null || !allowedRooms.includes(lotCandidate.rooms))) {
        return false;
      }
      if (budgetMax > 0 && lotCandidate.price !== null && lotCandidate.price > budgetMax * (1 + budgetTolerance)) {
        return false;
      }
      return true;
    });

    const livePrices = matchedLiveLots
      .map((l) => getPositiveNumber(l.price))
      .filter((p) => p !== null);
    const liveMinPrice = livePrices.length > 0 ? Math.min(...livePrices) : null;

    const aptPrices = roomFilteredApartments
      .map((a) => getPositiveNumber(a.price_from))
      .filter((p) => p !== null);

    const devPriceFrom = getPositiveNumber(dev.price_from);
    const devPriceTo = getPositiveNumber(dev.price_to);

    const candidateMinPrices = [
      ...(aptPrices.length > 0 ? [Math.min(...aptPrices)] : []),
      ...(liveMinPrice !== null ? [liveMinPrice] : []),
    ];
    const effectivePriceFrom = candidateMinPrices.length > 0
      ? Math.min(...candidateMinPrices)
      : devPriceFrom;

    let priceMatchType = 'any';
    if (budgetMax > 0 && effectivePriceFrom !== null) {
      if (effectivePriceFrom > budgetMax * (1 + budgetTolerance)) {
        continue;
      }
      priceMatchType = effectivePriceFrom <= budgetMax ? 'exact' : 'near';
    }

    if (budgetMin > 0 && devPriceTo !== null && devPriceTo < budgetMin * 0.9) {
      continue;
    }

    const matchedApartments = roomFilteredApartments
      .filter((apt) => {
        const p = getPositiveNumber(apt.price_from);
        if (!budgetMax || p === null) return true;
        return p <= budgetMax * (1 + budgetTolerance);
      })
      .map((apt) => {
        const p = getPositiveNumber(apt.price_from);
        return {
          ...apt,
          inBudget: !budgetMax || p === null || p <= budgetMax,
        };
      });

    // 4. Score computation (price + location + live lots)
    let score = 50;
    if (priceMatchType === 'exact') score += 30;
    else if (priceMatchType === 'near') score += 15;
    else score += 20;

    if (locationMatchType === 'microdistrict') score += 20;
    else if (locationMatchType === 'district') score += 15;
    else score += 10;

    if (matchedLiveLots.length > 0) score += 5;
    const finalScore = Math.min(100, score);

    const match_level = finalScore >= 85 ? 'perfect' : finalScore >= 70 ? 'good' : 'possible';

    const priceReason = priceMatchType === 'exact'
      ? `В бюджете · от ${formatShortPrice(effectivePriceFrom)} ₽`
      : priceMatchType === 'near'
        ? `До +10% · от ${formatShortPrice(effectivePriceFrom)} ₽`
        : effectivePriceFrom
          ? `От ${formatShortPrice(effectivePriceFrom)} ₽`
          : 'Цена по запросу';

    const locationParts = [dev.district, dev.microdistrict].filter(Boolean);
    const locationReason = locationParts.length > 0
      ? locationParts.join(' · ')
      : (dev.address || 'Киров');

    results.push({
      dev,
      score: finalScore,
      match_level,
      priceMatchType,
      locationMatchType,
      effectivePriceFrom,
      matchedApartments,
      matchedLiveLots,
      liveLotsCount: matchedLiveLots.length,
      liveMinPrice,
      priceReason,
      locationReason,
    });
  }

  results.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    const pA = a.effectivePriceFrom ?? Number.POSITIVE_INFINITY;
    const pB = b.effectivePriceFrom ?? Number.POSITIVE_INFINITY;
    if (pA !== pB) return pA - pB;
    return String(a.dev?.name || '').localeCompare(String(b.dev?.name || ''), 'ru');
  });

  if (Number.isFinite(options.limit) && options.limit > 0) {
    return results.slice(0, options.limit);
  }

  return results;
}

/**
 * Builds a canonical CRM selection item from a catalog development and purchase request.
 * Only includes valid columns of the selection_items table.
 * @param {{ dev: object, request?: object | null, apartment?: object | null, realtorId?: string | null }} params
 * @returns {object}
 */
export function buildSelectionItemFromDevelopment({
  dev,
  request = null,
  apartment = null,
  realtorId = null,
} = {}) {
  const rawClientIds = Array.isArray(request?.client_ids) && request.client_ids.length > 0
    ? request.client_ids
    : (request?.client_id ? [request.client_id] : []);
  const clientIds = rawClientIds.filter(Boolean);
  const price = getPositiveNumber(apartment?.price_from)
    || getPositiveNumber(dev?.price_from)
    || 0;
  const rooms = apartment ? normalizeRequestRoomValue(apartment.type ?? apartment.name) : null;

  const noteParts = [
    `Новостройка от ${dev?.developer || 'застройщика'}`,
    apartment?.name ? `планировка: ${apartment.name}` : null,
    apartment?.area ? `площадь: ${apartment.area}` : null,
    dev?.completion_date ? `срок сдачи: ${dev.completion_date}` : null,
    price ? `от ${formatShortPrice(price)} ₽` : null,
  ].filter(Boolean);

  return {
    ...(realtorId ? { realtor_id: realtorId } : {}),
    client_id: clientIds[0] || null,
    client_ids: clientIds,
    address: [dev?.name, dev?.address].filter(Boolean).join(', '),
    city: dev?.city || 'Киров',
    price,
    ...(rooms !== null ? { rooms } : {}),
    property_type: 'apartment',
    images: Array.isArray(dev?.images) ? dev.images.slice(0, 3) : [],
    notes: noteParts.join(' · '),
    link: dev?.domrf_url || dev?.builder_url || dev?.avito_url || null,
    contact_name: dev?.developer ? `${dev.developer} (Отдел продаж)` : 'Отдел продаж',
    contact_phone: dev?.contact_phone || null,
  };
}
