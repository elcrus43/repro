/**
 * api/_zhelezno-lots.js - Vercel Serverless Function Module
 *
 * Интеграция и кэш свободных лотов девелопера "Железно" (zhcom.ru).
 * Проекты в Кирове:
 *   - bulychev: Дом «Булычев» (ул. Свободы, 28)
 *   - zaryadnoe: ЖК «Зарядное» (ул. 4-й Пятилетки, 82)
 *   - znak_kirov: ЖК ZNAK (ул. Энтузиастов / ул. Капитана Дорофеева)
 *   - innograd: ЖК «Инноград» (ул. Песочная)
 *
 *   GET  /api/developer-lots?provider=zhelezno&projectSlug=...
 *   POST /api/developer-lots?provider=zhelezno { action: 'list' | 'syncProject', projectSlug }
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

export const ZHELEZNO_BASE_URL = 'https://zhcom.ru';
export const ZHELEZNO_PROPERTIES_API = 'https://zhcom.ru/api/properties/?city=0c032551-bcef-11e9-aeaf-00155d058100&limit=500&offset=0';

export const ZHELEZNO_PROJECTS = {
  bulychev: {
    id: 41,
    projectName: 'Дом «Булычев»',
    address: 'г. Киров, ул. Свободы, д. 28',
    slug: 'bulychev',
    siteUrl: 'https://zhcom.ru/kirov/projects/bulychev/',
  },
  zaryadnoe: {
    id: 43,
    projectName: 'ЖК «Зарядное»',
    address: 'г. Киров, ул. 4-й Пятилетки, д. 82',
    slug: 'zaryadnoe',
    siteUrl: 'https://zhcom.ru/kirov/projects/zaryadnoe/',
  },
  znak_kirov: {
    id: 47,
    projectName: 'ЖК ZNAK',
    address: 'г. Киров, ул. Энтузиастов / ул. Капитана Дорофеева',
    slug: 'znak_kirov',
    siteUrl: 'https://zhcom.ru/kirov/projects/znak_kirov/',
  },
  innograd: {
    id: 56,
    projectName: 'ЖК «Инноград»',
    address: 'г. Киров, ул. Песочная',
    slug: 'innograd',
    siteUrl: 'https://zhcom.ru/kirov/projects/innograd/',
  },
};

export const ZHELEZNO_PROJECT_ALIASES = {
  'zhk-bulychev': 'bulychev',
  'dom-bulychev': 'bulychev',
  'zhk-zaryadnoe': 'zaryadnoe',
  'zhk-znak': 'znak_kirov',
  znak: 'znak_kirov',
  'zhk-innograd': 'innograd',
};

export function resolveZheleznoProjectSlug(slug) {
  if (!slug) return slug;
  if (ZHELEZNO_PROJECTS[slug]) return slug;
  if (ZHELEZNO_PROJECT_ALIASES[slug]) return ZHELEZNO_PROJECT_ALIASES[slug];
  return slug;
}

const zheleznoRepo = createLotsRepository('zhelezno', ZHELEZNO_PROJECTS);

export async function ensureZheleznoTables(sql) {
  return zheleznoRepo.ensureTables(sql);
}

function sanitizeZheleznoError(err) {
  return String(err?.message || 'Ошибка синхронизации с каталогом Железно').slice(0, 300);
}

/**
 * Нормализует сырой объект квартиры из API Железно в каноническую структуру лота.
 * @param {object} item
 * @param {object} [projectConfig]
 * @param {string} [projectSlug]
 * @returns {object}
 */
export function normalizeZheleznoLot(item = {}, projectConfig = {}, projectSlug = '') {
  const rawId = item.id !== undefined && item.id !== null ? String(item.id) : '';
  const lotId = rawId ? `zhelezno-${rawId}` : `zhelezno-${projectSlug}-${Math.random().toString(36).slice(2, 9)}`;

  const rawArea = item.area !== undefined && item.area !== null
    ? (typeof item.area === 'string' ? parseFloat(item.area.replace(',', '.')) : Number(item.area))
    : null;
  const area = Number.isFinite(rawArea) && rawArea > 0 ? rawArea : null;

  const rawRooms = item.rooms !== undefined && item.rooms !== null ? Number(item.rooms) : null;
  const customRooms = String(item.custom_rooms || '').toLowerCase();
  const isStudio = rawRooms === 0 || customRooms === '0' || customRooms === 'st' || (rawRooms === null && area !== null && area <= 28);
  const normalizedRooms = isStudio ? 'studio' : String(rawRooms || 1);
  const rooms_type = isStudio ? 'studio' : (normalizeRoomsType(normalizedRooms) || `${normalizedRooms}k`);
  const rooms_label = formatRoomsLabel(rooms_type);

  const floor = item.floor?.number !== undefined && item.floor?.number !== null
    ? Number(item.floor.number)
    : null;
  const flat_number = item.number !== undefined && item.number !== null ? String(item.number).trim() : '';

  const priceRaw = item.price !== undefined && item.price !== null
    ? (typeof item.price === 'string' ? parseFloat(item.price) : Number(item.price))
    : null;
  const originalPriceRaw = item.original_price !== undefined && item.original_price !== null
    ? (typeof item.original_price === 'string' ? parseFloat(item.original_price) : Number(item.original_price))
    : null;

  const price = Number.isFinite(priceRaw) && priceRaw > 0
    ? Math.round(priceRaw)
    : (Number.isFinite(originalPriceRaw) && originalPriceRaw > 0 ? Math.round(originalPriceRaw) : null);

  let price_sqm = null;
  if (item.price_per_meter !== undefined && item.price_per_meter !== null) {
    const rawMeter = typeof item.price_per_meter === 'string' ? parseFloat(item.price_per_meter) : Number(item.price_per_meter);
    if (Number.isFinite(rawMeter) && rawMeter > 0) {
      price_sqm = Math.round(rawMeter);
    }
  }
  if (!price_sqm && price && area && area > 0) {
    price_sqm = Math.round(price / area);
  }

  const buildingNum = item.building?.number ? String(item.building.number) : '';
  const houseAddress = buildingNum
    ? `${projectConfig.address || ''}, д. ${buildingNum}`
    : (projectConfig.address || '');

  const floorPart = floor ? `, ${floor} эт.` : '';
  const areaPart = area ? ` ${area} м²` : '';
  const title = item.name ? `${item.name}${floorPart}` : `${rooms_label}${areaPart}${floorPart}`;

  const plan_image = item.plan_png || item.plan || null;
  const lot_url = `https://zhcom.ru/kirov/flats/?project=${projectSlug}`;

  return {
    id: lotId,
    project_slug: projectSlug,
    project_name: projectConfig.projectName || item.project?.name || '',
    title,
    rooms_label,
    rooms_type,
    area,
    floor,
    flat_number,
    address: houseAddress,
    finishing: 'Предчистовая',
    price,
    price_sqm,
    plan_image,
    lot_url,
    is_available: true,
  };
}

let cachedGroupedLots = null;
let cacheTimestamp = 0;
const CACHE_TTL_MS = 60000;

/**
 * Загружает все квартиры по Кирову из API Железно и группирует по project_slug.
 * @param {object} [fetchImpl]
 * @param {boolean} [forceRefresh=false]
 * @returns {Promise<Record<string, Array<object>>>}
 */
export async function fetchZheleznoAllLots(fetchImpl = fetch, forceRefresh = false) {
  const now = Date.now();
  if (!forceRefresh && cachedGroupedLots && now - cacheTimestamp < CACHE_TTL_MS) {
    return cachedGroupedLots;
  }

  const res = await fetchImpl(ZHELEZNO_PROPERTIES_API, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      Accept: 'application/json, text/plain, */*',
    },
    signal: AbortSignal.timeout(20000),
  });

  if (!res.ok) {
    throw new Error(`API Железно вернуло статус ${res.status}`);
  }

  const payload = await res.json();
  const results = Array.isArray(payload?.results) ? payload.results : [];

  const grouped = {};
  for (const slug of Object.keys(ZHELEZNO_PROJECTS)) {
    grouped[slug] = [];
  }

  for (const item of results) {
    const rawSlug = item.project?.slug;
    const slug = resolveZheleznoProjectSlug(rawSlug);
    if (!slug || !ZHELEZNO_PROJECTS[slug]) continue;

    const projectConfig = ZHELEZNO_PROJECTS[slug];
    grouped[slug].push(normalizeZheleznoLot(item, projectConfig, slug));
  }

  cachedGroupedLots = grouped;
  cacheTimestamp = now;

  return grouped;
}

/**
 * Синхронизирует один проект Железно в базу данных Neon.
 * @param {string} projectSlug
 * @param {object} sql
 * @param {object} [options]
 * @returns {Promise<object>}
 */
export async function syncZheleznoProject(projectSlug, sql, options = {}) {
  const canonicalSlug = resolveZheleznoProjectSlug(projectSlug);
  const project = ZHELEZNO_PROJECTS[canonicalSlug];
  if (!project) {
    throw new Error(`Неизвестный проект Железно: ${projectSlug}`);
  }

  const fetchImpl = options.fetchImpl || fetch;
  const allGrouped = await fetchZheleznoAllLots(fetchImpl);
  const lots = allGrouped[canonicalSlug] || [];

  return zheleznoRepo.saveProjectLots(sql, {
    projectSlug: canonicalSlug,
    projectName: project.projectName,
    totalCount: lots.length,
    lots,
  });
}

/**
 * Синхронизирует все проекты Железно за один сетевой запрос к API properties.
 * @param {object} sql
 * @param {object} [options]
 * @returns {Promise<Record<string, number>>}
 */
export async function syncAllZheleznoProjects(sql, options = {}) {
  await zheleznoRepo.ensureTables(sql);
  const fetchImpl = options.fetchImpl || fetch;
  const allGrouped = await fetchZheleznoAllLots(fetchImpl);
  const results = {};

  for (const slug of Object.keys(ZHELEZNO_PROJECTS)) {
    const project = ZHELEZNO_PROJECTS[slug];
    const lots = allGrouped[slug] || [];
    try {
      await zheleznoRepo.saveProjectLots(sql, {
        projectSlug: slug,
        projectName: project.projectName,
        totalCount: lots.length,
        lots,
      });
      results[slug] = lots.length;
    } catch (err) {
      const safeMsg = sanitizeZheleznoError(err);
      console.error(`[zhelezno-lots] Error saving project ${slug}:`, safeMsg);
      try {
        await zheleznoRepo.recordSyncError(sql, slug, project.projectName, safeMsg);
      } catch (metaErr) {
        console.error(`[zhelezno-lots] Failed to record error metadata for ${slug}:`, metaErr.message);
      }
      results[slug] = -1;
    }
  }

  return results;
}

/**
 * Обработчик запросов к лотам Железно.
 */
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-lots-cron-secret, x-developer-provider');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ data: null, error: 'Method Not Allowed' });
  }

  const auth = await authenticateLotsRequest(req, '[zhelezno-lots]');
  if (auth.error) {
    return res.status(auth.status).json({ data: null, error: auth.error });
  }
  const { sql } = auth;

  if (req.method === 'GET') {
    const rawSlug = req.query?.projectSlug ? String(req.query.projectSlug).trim() : '';
    const projectSlug = resolveZheleznoProjectSlug(rawSlug);
    if (projectSlug && !Object.prototype.hasOwnProperty.call(ZHELEZNO_PROJECTS, projectSlug)) {
      return res.status(400).json({ data: null, error: 'Неизвестный проект Железно' });
    }
    try {
      const data = await zheleznoRepo.listCachedLots(sql, projectSlug || null, true);
      return res.status(200).json({ data, error: null });
    } catch (err) {
      console.error('[zhelezno-lots] GET error:', sanitizeZheleznoError(err));
      return res.status(500).json({ data: null, error: 'Не удалось получить лоты Железно' });
    }
  }

  const body = req.body && typeof req.body === 'object' ? req.body : {};
  const action = body.action || 'list';
  const rawSlug = body.projectSlug ? String(body.projectSlug).trim() : '';
  const projectSlug = resolveZheleznoProjectSlug(rawSlug);

  if (action === 'list') {
    if (projectSlug && !Object.prototype.hasOwnProperty.call(ZHELEZNO_PROJECTS, projectSlug)) {
      return res.status(400).json({ data: null, error: 'Неизвестный проект Железно' });
    }
    try {
      const data = await zheleznoRepo.listCachedLots(sql, projectSlug || null, true);
      return res.status(200).json({ data, error: null });
    } catch (err) {
      console.error('[zhelezno-lots] list error:', sanitizeZheleznoError(err));
      return res.status(500).json({ data: null, error: 'Не удалось получить лоты Железно' });
    }
  }

  if (action === 'syncProject') {
    if (!projectSlug || !Object.prototype.hasOwnProperty.call(ZHELEZNO_PROJECTS, projectSlug)) {
      return res.status(400).json({ data: null, error: 'Неизвестный проект Железно' });
    }

    try {
      const result = await syncZheleznoProject(projectSlug, sql);
      return res.status(200).json({ data: result, error: null });
    } catch (err) {
      const safeMsg = sanitizeZheleznoError(err);
      console.error('[zhelezno-lots] syncProject error:', safeMsg);
      try {
        await zheleznoRepo.recordSyncError(
          sql,
          projectSlug,
          ZHELEZNO_PROJECTS[projectSlug].projectName,
          safeMsg
        );
      } catch (metaErr) {
        console.error('[zhelezno-lots] Failed to record sync error meta:', metaErr.message);
      }

      const status = err.statusCode || 502;
      return res.status(status).json({ data: null, error: safeMsg });
    }
  }

  return res.status(400).json({ data: null, error: 'Неизвестное действие' });
}
