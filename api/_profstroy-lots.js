/**
 * api/profstroy-lots.js - Vercel Serverless Function
 *
 * Интеграция и кэш свободных лотов застройщика "Профстрой Недвижимость" (unitflow.profstroy-services.ru).
 *   GET  /api/profstroy-lots?projectSlug=...            -> список кэшированных лотов и метаданных из Neon DB
 *   POST /api/profstroy-lots { action: 'list', ... }    -> то же самое
 *   POST /api/profstroy-lots { action: 'syncProject', projectSlug } -> синхронизация выбранного ЖК
 */

import {
  normalizeRoomsType,
  formatRoomsLabel,
  authenticateLotsRequest,
  createLotsRepository,
} from './_lots-shared.js';

export { normalizeRoomsType };

export const config = {
  maxDuration: 60,
};

export const PROFSTROY_BASE_URL = 'https://unitflow.profstroy-services.ru';
export const PROFSTROY_API_URL = 'https://unitflow.profstroy-services.ru/apartments';

export const PROFSTROY_PROJECTS = {
  kapital: {
    id: 1,
    projectName: 'Клубный дом «Капитал»',
    address: 'г. Киров, ул. Владимирская, 99 / ул. Орловская, 62Б',
  },
  vdohnovenie: {
    id: 2,
    projectName: 'ЖК «Вдохновение»',
    address: 'г. Киров, ул. Энтузиастов, д. 17, корп. 1',
  },
  'murashinskiy-7': {
    id: 3,
    projectName: 'Дом на Мурашинском 7',
    address: 'г. Киров, Мурашинский проезд, д. 7',
  },
  garmoniya: {
    id: 4,
    projectName: 'ЖК «Гармония»',
    address: 'г. Киров, ул. Ленина, д. 106',
  },
  metropolis: {
    id: 6,
    projectName: 'ЖК «Метрополис»',
    address: 'г. Киров, ул. Воровского, 173, корп. 1',
  },
};

export const PROFSTROY_PROJECT_ALIASES = {
  murashinskiy: 'murashinskiy-7',
  murashinskiy7: 'murashinskiy-7',
  'murashinskiy-proezd-7': 'murashinskiy-7',
  vdokhnovenie: 'vdohnovenie',
  vdokhnoveniye: 'vdohnovenie',
  harmony: 'garmoniya',
  capital: 'kapital',
};

export function resolveProfstroyProjectSlug(slug) {
  if (!slug) return slug;
  if (PROFSTROY_PROJECTS[slug]) return slug;
  if (PROFSTROY_PROJECT_ALIASES[slug]) return PROFSTROY_PROJECT_ALIASES[slug];
  return slug;
}

const profstroyRepo = createLotsRepository('profstroy', PROFSTROY_PROJECTS);

export async function ensureProfstroyTables(sql) {
  return profstroyRepo.ensureTables(sql);
}

function sanitizeProfstroyError(err) {
  return String(err?.message || 'Ошибка синхронизации с API Профстрой Недвижимость').slice(0, 300);
}

/**
 * Нормализует сырой объект лота из Unitflow API.
 * @param {object} item
 * @param {object} [projectConfig]
 * @param {string} [projectSlug]
 * @param {object} [options]
 * @returns {object}
 */
export function normalizeProfstroyLot(item = {}, projectConfig = {}, projectSlug = '', options = {}) {
  const rawRooms = item.rooms !== undefined && item.rooms !== null ? Number(item.rooms) : null;
  const rawArea = typeof item.total_area === 'string'
    ? parseFloat(item.total_area.replace(',', '.'))
    : Number(item.total_area);
  const total_area = Number.isFinite(rawArea) && rawArea > 0 ? rawArea : null;

  // rooms: rooms === null || rooms === 0 || total_area <= 28 ? 'studio' : String(rooms)
  const isStudio = rawRooms === null || rawRooms === 0 || (total_area !== null && total_area <= 28);
  const normalizedRooms = isStudio ? 'studio' : String(rawRooms);
  const rooms_type = isStudio ? 'studio' : (normalizeRoomsType(normalizedRooms) || `${normalizedRooms}k`);
  const rooms_label = formatRoomsLabel(rooms_type);

  // plan_url: floor_plan_url (prefix with https://unitflow.profstroy-services.ru if relative)
  let plan_url = null;
  if (item.floor_plan_url) {
    const rawPlan = String(item.floor_plan_url).trim();
    if (rawPlan.startsWith('http://') || rawPlan.startsWith('https://')) {
      plan_url = rawPlan;
    } else if (rawPlan.startsWith('/')) {
      plan_url = `${PROFSTROY_BASE_URL}${rawPlan}`;
    } else if (rawPlan.length > 0) {
      plan_url = `${PROFSTROY_BASE_URL}/${rawPlan}`;
    }
  }

  // price: calculate actual price with discount if active (discount_percent > 0 and discount_until >= now)
  const now = options.now !== undefined ? new Date(options.now).getTime() : Date.now();
  const discountUntil = item.discount_until ? new Date(item.discount_until).getTime() : null;
  const discountPercent = Number(item.discount_percent);
  const hasActiveDiscount =
    Number.isFinite(discountPercent) &&
    discountPercent > 0 &&
    discountUntil !== null &&
    !Number.isNaN(discountUntil) &&
    discountUntil >= now;

  const rawTotalPrice = Number(item.total_price);
  const baseTotalPrice = Number.isFinite(rawTotalPrice) && rawTotalPrice > 0 ? rawTotalPrice : null;
  const rawPricePerSqm = Number(item.price_per_sqm);
  const basePricePerSqm = Number.isFinite(rawPricePerSqm) && rawPricePerSqm > 0 ? rawPricePerSqm : null;

  let price = null;
  let price_sqm = null;

  if (baseTotalPrice !== null) {
    if (hasActiveDiscount) {
      const factor = 1 - discountPercent / 100;
      price = Math.round(baseTotalPrice * factor);
      price_sqm = total_area
        ? Math.round(price / total_area)
        : (basePricePerSqm ? Math.round(basePricePerSqm * factor) : null);
    } else {
      price = Math.round(baseTotalPrice);
      price_sqm = basePricePerSqm
        ? Math.round(basePricePerSqm)
        : (total_area ? Math.round(price / total_area) : null);
    }
  } else if (basePricePerSqm !== null && total_area) {
    if (hasActiveDiscount) {
      const factor = 1 - discountPercent / 100;
      price_sqm = Math.round(basePricePerSqm * factor);
      price = Math.round(price_sqm * total_area);
    } else {
      price_sqm = Math.round(basePricePerSqm);
      price = Math.round(price_sqm * total_area);
    }
  }

  // status: item.status === 'free' ? 'available' : (item.status === 'reserved' ? 'reserved' : 'sold')
  const status = item.status === 'free'
    ? 'available'
    : (item.status === 'reserved' ? 'reserved' : 'sold');
  const is_available = status !== 'sold';

  const rawFloor = Number(item.floor);
  const floor = Number.isFinite(rawFloor) ? rawFloor : null;
  const flat_number = item.number !== undefined && item.number !== null ? String(item.number) : null;
  const section = item.section !== undefined && item.section !== null ? String(item.section) : null;

  const projectName = projectConfig.projectName || projectSlug;
  const baseAddress = projectConfig.address || '';
  const sectionPart = section ? `${item.section_label || 'Секция'} ${section}` : '';
  const fullAddress = sectionPart && baseAddress
    ? `${baseAddress} (${sectionPart})`
    : (baseAddress || null);

  const titleParts = [rooms_label];
  if (total_area) titleParts.push(`${total_area} м²`);
  if (floor !== null) titleParts.push(`${floor} эт.`);
  const title = titleParts.join(', ');

  const external_id = item.id !== undefined && item.id !== null ? item.id : null;
  const id = external_id !== null ? String(external_id) : `profstroy-${projectSlug}-${flat_number || '0'}`;
  const lot_url = `${PROFSTROY_BASE_URL}/apartments`;

  return {
    // Neon DB schema fields
    id,
    project_slug: projectSlug,
    project_name: projectName,
    title,
    rooms_label,
    rooms_type,
    area: total_area,
    floor,
    flat_number,
    address: fullAddress,
    finishing: null,
    price,
    price_sqm,
    plan_image: plan_url,
    lot_url,
    is_available,

    // Normalized schema fields
    external_id,
    rooms: normalizedRooms,
    room_type: normalizedRooms,
    total_area,
    area_m2: total_area,
    price_total: price,
    price_per_m2: price_sqm,
    plan_url,
    status,
    discount_percent: Number.isFinite(discountPercent) ? discountPercent : null,
    discount_until: item.discount_until || null,
  };
}

/**
 * Загружает сырой список квартир из открытого Unitflow API.
 * @param {object} [options]
 * @returns {Promise<Array<object>>}
 */
export async function fetchProfstroyApartments(options = {}) {
  const fetchFn = options.fetchFn || fetch;
  const url = options.url || PROFSTROY_API_URL;

  const res = await fetchFn(url, {
    headers: {
      Accept: 'application/json',
      'User-Agent': 'Mozilla/5.0 (compatible; RealtorMatchCRM/1.0)',
      ...(options.headers || {}),
    },
    signal: options.signal,
  });

  if (!res.ok) {
    throw new Error(`API Профстрой Недвижимость вернул статус ${res.status} (${url})`);
  }

  const json = await res.json();
  const list = Array.isArray(json) ? json : (Array.isArray(json?.data) ? json.data : []);
  return list;
}

/**
 * Загружает и фильтрует лоты для конкретного проекта Профстрой Недвижимость.
 * @param {object} projectSpec
 * @param {object} [options]
 * @returns {Promise<Array<object>>}
 */
export async function fetchProfstroyProjectLots(projectSpec, options = {}) {
  const allUnits = await fetchProfstroyApartments(options);
  const targetObjectId = projectSpec.id;
  const filterApartment = options.filterApartment ?? true;

  return allUnits.filter((item) => {
    if (item.object_id !== targetObjectId) return false;
    if (filterApartment && item.unit_type !== 'apartment') return false;
    if (options.onlyAvailable && item.status === 'sold') return false;
    return true;
  });
}

/**
 * Синхронизирует лоты проекта Профстрой Недвижимость в Neon DB.
 * @param {string} projectSlug
 * @param {object} sql
 * @param {object} [options]
 * @returns {Promise<object>}
 */
export async function syncProfstroyProject(projectSlug, sql, options = {}) {
  const canonicalSlug = resolveProfstroyProjectSlug(projectSlug);
  const projectSpec = PROFSTROY_PROJECTS[canonicalSlug];
  if (!projectSpec) {
    const err = new Error('Неизвестный проект Профстрой Недвижимость');
    err.statusCode = 400;
    throw err;
  }

  const rawLots = await fetchProfstroyProjectLots(projectSpec, options);
  const normalizedLots = rawLots.map((item) =>
    normalizeProfstroyLot(item, projectSpec, canonicalSlug, options)
  );

  return profstroyRepo.saveProjectLots(sql, {
    projectSlug: canonicalSlug,
    projectName: projectSpec.projectName,
    totalCount: normalizedLots.length,
    lots: normalizedLots,
  });
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ data: null, error: 'Method Not Allowed' });
  }

  const auth = await authenticateLotsRequest(req, '[profstroy-lots]');
  if (auth.error) {
    return res.status(auth.status).json({ data: null, error: auth.error });
  }
  const { sql } = auth;

  if (req.method === 'GET') {
    const rawSlug = req.query?.projectSlug ? String(req.query.projectSlug).trim() : '';
    const projectSlug = resolveProfstroyProjectSlug(rawSlug);
    if (projectSlug && !Object.prototype.hasOwnProperty.call(PROFSTROY_PROJECTS, projectSlug)) {
      return res.status(400).json({ data: null, error: 'Неизвестный проект Профстрой Недвижимость' });
    }
    try {
      const data = await profstroyRepo.listCachedLots(sql, projectSlug || null, true);
      return res.status(200).json({ data, error: null });
    } catch (err) {
      console.error('[profstroy-lots] GET error:', sanitizeProfstroyError(err));
      return res.status(500).json({ data: null, error: 'Не удалось получить лоты Профстрой Недвижимость' });
    }
  }

  const body = req.body && typeof req.body === 'object' ? req.body : {};
  const action = body.action || 'list';
  const rawSlug = body.projectSlug ? String(body.projectSlug).trim() : '';
  const projectSlug = resolveProfstroyProjectSlug(rawSlug);

  if (action === 'list') {
    if (projectSlug && !Object.prototype.hasOwnProperty.call(PROFSTROY_PROJECTS, projectSlug)) {
      return res.status(400).json({ data: null, error: 'Неизвестный проект Профстрой Недвижимость' });
    }
    try {
      const data = await profstroyRepo.listCachedLots(sql, projectSlug || null, true);
      return res.status(200).json({ data, error: null });
    } catch (err) {
      console.error('[profstroy-lots] list error:', sanitizeProfstroyError(err));
      return res.status(500).json({ data: null, error: 'Не удалось получить лоты Профстрой Недвижимость' });
    }
  }

  if (action === 'syncProject') {
    if (!projectSlug || !Object.prototype.hasOwnProperty.call(PROFSTROY_PROJECTS, projectSlug)) {
      return res.status(400).json({ data: null, error: 'Неизвестный проект Профстрой Недвижимость' });
    }

    try {
      const result = await syncProfstroyProject(projectSlug, sql);
      return res.status(200).json({ data: result, error: null });
    } catch (err) {
      const safeMsg = sanitizeProfstroyError(err);
      console.error('[profstroy-lots] syncProject error:', safeMsg);
      try {
        await profstroyRepo.recordSyncError(
          sql,
          projectSlug,
          PROFSTROY_PROJECTS[projectSlug].projectName,
          safeMsg
        );
      } catch (metaErr) {
        console.error('[profstroy-lots] Failed to record sync error meta:', metaErr.message);
      }

      const status = err.statusCode || 502;
      return res.status(status).json({ data: null, error: safeMsg });
    }
  }

  return res.status(400).json({ data: null, error: 'Неизвестное действие' });
}
