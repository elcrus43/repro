/**
 * api/kino-lots.js - Vercel Serverless Function
 *
 * Интеграция и кэш свободных лотов застройщика "КИНО девелопмент" (api.kino-dev.ru).
 *   GET  /api/kino-lots?projectSlug=...            -> список кэшированных лотов и метаданных из Neon DB
 *   POST /api/kino-lots { action: 'list', ... }    -> то же самое
 *   POST /api/kino-lots { action: 'syncProject', projectSlug } -> живая синхронизация выбранного ЖК
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

export const KINO_BASE_URL = 'https://kino-dev.ru';
export const KINO_API_BASE_URL = 'https://api.kino-dev.ru/api/v1/public/flats';

export const KINO_PROJECTS = {
  fusion: {
    id: 3,
    projectName: 'ЖК ФЬЮЖН',
    address: 'д. Шутовщина, ул. Ботаническая, 7',
  },
  iuterra: {
    id: 5747,
    projectName: 'ЖК ЮТЕРРА',
    address: 'Кировская обл., ул. Творчества, 1',
  },
  'gorkogo-2a': {
    id: 1,
    projectName: 'Дом на Горького, 2А',
    address: 'г. Киров, ул. Горького, 2А',
  },
};

const kinoRepo = createLotsRepository('kino', KINO_PROJECTS);

export async function ensureKinoTables(sql) {
  return kinoRepo.ensureTables(sql);
}

function sanitizeKinoError(err) {
  return String(err?.message || 'Ошибка синхронизации с API КИНО девелопмент').slice(0, 300);
}

/**
 * Нормализует сырой объект квартиры из API КИНО в стандартную схему лота.
 * @param {object} item
 * @param {{ id?: number, projectName?: string, address?: string }} [projectConfig]
 * @param {string} [projectSlug]
 * @returns {object}
 */
export function normalizeKinoLot(item = {}, projectConfig = {}, projectSlug = '') {
  const rooms = Number(item.rooms) || 0;
  const rawSquare = typeof item.square === 'string' ? item.square.replace(',', '.') : item.square;
  const parsedSquare = parseFloat(rawSquare);
  const area_m2 = Number.isFinite(parsedSquare) && parsedSquare > 0 ? parsedSquare : null;
  const square = area_m2 || 0;

  const room_type = rooms === 1 && square <= 28 ? 'studio' : String(rooms);
  const rooms_type = room_type === 'studio' ? 'studio' : (normalizeRoomsType(room_type) || `${rooms}k`);
  const rooms_label = formatRoomsLabel(rooms_type);

  const rawPrice = item.price_promotional || item.price_base;
  const parsedPrice = parseInt(rawPrice, 10);
  const price_total = Number.isFinite(parsedPrice) && parsedPrice > 0 ? parsedPrice : null;
  const price_per_m2 = price_total && area_m2 ? Math.round(price_total / area_m2) : null;

  const external_id = item.external_id || item.id;
  const id = String(external_id);

  const floor = Number.isFinite(Number(item.floor)) ? Number(item.floor) : null;
  const total_floors = Number.isFinite(Number(item.max_floor)) ? Number(item.max_floor) : null;
  const section = item.house_title || '';
  const completion_date = item.release_date || '';
  const plan_url = item.plan?.base_src || '';
  const status = 'available';

  const projectName = projectConfig.projectName || item.project_title || projectSlug;
  const baseAddress = projectConfig.address || '';
  const fullAddress = section && baseAddress ? `${baseAddress} (${section})` : (baseAddress || null);

  const titleParts = [rooms_label];
  if (area_m2) titleParts.push(`${area_m2} м²`);
  if (floor !== null) titleParts.push(`${floor} эт.`);
  const title = titleParts.join(', ');

  const lot_url = item.slug ? `${KINO_BASE_URL}/flats/${item.slug}` : null;

  return {
    // Database schema fields (used by saveProjectLots / Neon DB)
    id,
    project_slug: projectSlug,
    project_name: projectName,
    title,
    rooms_label,
    rooms_type,
    area: area_m2,
    floor,
    flat_number: null,
    address: fullAddress,
    finishing: null,
    price: price_total,
    price_sqm: price_per_m2,
    plan_image: plan_url || null,
    lot_url,
    is_available: true,

    // Normalized Lot schema fields specified in backend integration prompt
    external_id,
    room_type,
    rooms: item.rooms,
    area_m2,
    total_floors,
    price_total,
    price_per_m2,
    section,
    completion_date,
    plan_url,
    status,
  };
}

/**
 * Загружает список квартир по ID проекта из открытого API КИНО.
 * При наличии нескольких страниц автоматически обходит их.
 * @param {number|string} projectId
 * @param {object} [options]
 * @returns {Promise<{ data: Array<object>, meta: object }>}
 */
export async function fetchKinoProjectFlats(projectId, options = {}) {
  const fetchFn = options.fetchFn || fetch;
  const initialUrl = `${KINO_API_BASE_URL}?project=${projectId}&per_page=500&page=1`;

  const res = await fetchFn(initialUrl, {
    headers: {
      Accept: 'application/json',
      'User-Agent': 'Mozilla/5.0 (compatible; RealtorMatchCRM/1.0)',
      ...(options.headers || {}),
    },
    signal: options.signal,
  });

  if (!res.ok) {
    throw new Error(`API КИНО девелопмент вернул статус ${res.status} (${initialUrl})`);
  }

  const json = await res.json();
  const allItems = Array.isArray(json?.data) ? [...json.data] : [];
  const lastPage = Number(json?.meta?.last_page) || 1;

  if (lastPage > 1) {
    for (let page = 2; page <= lastPage; page += 1) {
      const pageUrl = `${KINO_API_BASE_URL}?project=${projectId}&per_page=500&page=${page}`;
      const pageRes = await fetchFn(pageUrl, {
        headers: {
          Accept: 'application/json',
          'User-Agent': 'Mozilla/5.0 (compatible; RealtorMatchCRM/1.0)',
          ...(options.headers || {}),
        },
        signal: options.signal,
      });
      if (pageRes.ok) {
        const pageJson = await pageRes.json();
        if (Array.isArray(pageJson?.data)) {
          allItems.push(...pageJson.data);
        }
      }
    }
  }

  return {
    data: allItems,
    meta: json?.meta || { total: allItems.length },
  };
}

/**
 * Выполняет живую синхронизацию одного ЖК КИНО девелопмент в Neon DB.
 * @param {string} projectSlug
 * @param {object} sql
 * @param {object} [options]
 * @returns {Promise<object>}
 */
export async function syncKinoProject(projectSlug, sql, options = {}) {
  const projectSpec = KINO_PROJECTS[projectSlug];
  if (!projectSpec) {
    const err = new Error('Неизвестный проект КИНО девелопмент');
    err.statusCode = 400;
    throw err;
  }

  const { data: rawFlats, meta } = await fetchKinoProjectFlats(projectSpec.id, options);
  const normalizedLots = (rawFlats || []).map((item) =>
    normalizeKinoLot(item, projectSpec, projectSlug)
  );

  const deduped = new Map();
  for (const lot of normalizedLots) {
    if (!deduped.has(lot.id)) {
      deduped.set(lot.id, lot);
    }
  }
  const lots = Array.from(deduped.values());
  const totalCount = meta?.total !== undefined && Number.isFinite(Number(meta.total))
    ? Number(meta.total)
    : lots.length;

  return kinoRepo.saveProjectLots(sql, {
    projectSlug,
    projectName: projectSpec.projectName,
    totalCount,
    lots,
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

  const auth = await authenticateLotsRequest(req, '[kino-lots]');
  if (auth.error) {
    return res.status(auth.status).json({ data: null, error: auth.error });
  }
  const { sql } = auth;

  if (req.method === 'GET') {
    const projectSlug = req.query?.projectSlug ? String(req.query.projectSlug).trim() : '';
    if (projectSlug && !Object.prototype.hasOwnProperty.call(KINO_PROJECTS, projectSlug)) {
      return res.status(400).json({ data: null, error: 'Неизвестный проект КИНО девелопмент' });
    }
    try {
      const data = await kinoRepo.listCachedLots(sql, projectSlug || null, true);
      return res.status(200).json({ data, error: null });
    } catch (err) {
      console.error('[kino-lots] GET error:', sanitizeKinoError(err));
      return res.status(500).json({ data: null, error: 'Не удалось получить лоты КИНО девелопмент' });
    }
  }

  const body = req.body && typeof req.body === 'object' ? req.body : {};
  const action = body.action || 'list';
  const projectSlug = body.projectSlug ? String(body.projectSlug).trim() : '';

  if (action === 'list') {
    if (projectSlug && !Object.prototype.hasOwnProperty.call(KINO_PROJECTS, projectSlug)) {
      return res.status(400).json({ data: null, error: 'Неизвестный проект КИНО девелопмент' });
    }
    try {
      const data = await kinoRepo.listCachedLots(sql, projectSlug || null, true);
      return res.status(200).json({ data, error: null });
    } catch (err) {
      console.error('[kino-lots] list error:', sanitizeKinoError(err));
      return res.status(500).json({ data: null, error: 'Не удалось получить лоты КИНО девелопмент' });
    }
  }

  if (action === 'syncProject') {
    if (!projectSlug || !Object.prototype.hasOwnProperty.call(KINO_PROJECTS, projectSlug)) {
      return res.status(400).json({ data: null, error: 'Неизвестный проект КИНО девелопмент' });
    }

    try {
      const result = await syncKinoProject(projectSlug, sql);
      return res.status(200).json({ data: result, error: null });
    } catch (err) {
      const safeMsg = sanitizeKinoError(err);
      console.error('[kino-lots] syncProject error:', safeMsg);
      try {
        await kinoRepo.recordSyncError(sql, projectSlug, KINO_PROJECTS[projectSlug].projectName, safeMsg);
      } catch (metaErr) {
        console.error('[kino-lots] Failed to record sync error meta:', metaErr.message);
      }

      const status = err.statusCode || 502;
      return res.status(status).json({ data: null, error: safeMsg });
    }
  }

  return res.status(400).json({ data: null, error: 'Неизвестное действие' });
}
