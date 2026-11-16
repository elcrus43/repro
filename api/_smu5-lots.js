/**
 * api/_smu5-lots.js - Vercel Serverless Function Module
 *
 * Интеграция и кэш свободных лотов застройщика СМУ-5 (ООО СЗ "СМУ-5" / domoplaner.ru).
 * Проекты в продаже:
 *   - mayak: Дом «Маяк» (ул. Молодой Гвардии, 84/4), Domoplaner 585-0lS8wH
 *   - sovremennik: Дом «Современник» (ул. Хлыновская, 21), Domoplaner 585-MYYRQ3
 *   - rudnitskogo: Клубный дом на Рудницкого (ул. Рудницкого, 32), Domoplaner 585-njXV2j
 *
 *   GET  /api/developer-lots?provider=smu5&projectSlug=...
 *   POST /api/developer-lots?provider=smu5 { action: 'list' | 'syncProject', projectSlug }
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

export const DOMOPLANER_BASE_URL = 'https://domoplaner.ru';
export const SMU5_DEVELOPER_SITE = 'https://smu5kirov.ru';

export const SMU5_PROJECTS = {
  mayak: {
    id: 1201,
    code: '585-0lS8wH',
    projectName: 'Дом «Маяк»',
    address: 'г. Киров, ул. Молодой Гвардии, д. 84/4',
    domoplanerUrl: 'https://domoplaner.ru/catalog/585/0lS8wH/',
    siteUrl: 'https://smu5kirov.ru/project/dom-maiak',
    releaseDate: 'IV кв. 2027',
  },
  sovremennik: {
    id: 1194,
    code: '585-MYYRQ3',
    projectName: 'Дом «Современник»',
    address: 'г. Киров, ул. Хлыновская, д. 21',
    domoplanerUrl: 'https://domoplaner.ru/catalog/585/MYYRQ3/',
    siteUrl: 'https://smu5kirov.ru/project/dom-sovremennik',
    releaseDate: 'III кв. 2028',
  },
  rudnitskogo: {
    id: 1328,
    code: '585-njXV2j',
    projectName: 'Клубный дом на Рудницкого',
    address: 'г. Киров, ул. Рудницкого, д. 32',
    domoplanerUrl: 'https://domoplaner.ru/catalog/585/njXV2j/',
    siteUrl: 'https://smu5kirov.ru/project/klubnyi-dom-na-rudnitskogo',
    releaseDate: 'II кв. 2027',
  },
};

export const SMU5_PROJECT_ALIASES = {
  'dom-maiak': 'mayak',
  'zhk-maiak': 'mayak',
  'zhk-mayak': 'mayak',
  'dom-mayak': 'mayak',
  'dom-sovremennik': 'sovremennik',
  'zhk-sovremennik': 'sovremennik',
  'klubnyi-dom-na-rudnitskogo': 'rudnitskogo',
  'dom-na-rudnitskogo': 'rudnitskogo',
  'zhk-rudnitskogo': 'rudnitskogo',
  'zhk-rudnitskogo-32': 'rudnitskogo',
};

export function resolveSmu5ProjectSlug(slug) {
  if (!slug) return slug;
  if (SMU5_PROJECTS[slug]) return slug;
  if (SMU5_PROJECT_ALIASES[slug]) return SMU5_PROJECT_ALIASES[slug];
  return slug;
}

const smu5Repo = createLotsRepository('smu5', SMU5_PROJECTS);

export async function ensureSmu5Tables(sql) {
  return smu5Repo.ensureTables(sql);
}

function sanitizeSmu5Error(err) {
  return String(err?.message || 'Ошибка синхронизации с каталогом СМУ-5').slice(0, 300);
}

/**
 * Нормализует сырой объект квартиры из Domoplaner API в каноническую структуру лота.
 * @param {object} item
 * @param {object} [projectConfig]
 * @param {string} [projectSlug]
 * @returns {object}
 */
export function normalizeSmu5Lot(item = {}, projectConfig = {}, projectSlug = '') {
  const rawId = item.id !== undefined && item.id !== null ? String(item.id) : '';
  const lotId = rawId ? `smu5-${rawId}` : `smu5-${projectSlug}-${Math.random().toString(36).slice(2, 9)}`;

  const rawArea = item.area !== undefined && item.area !== null
    ? Number(item.area)
    : (item.main_area !== undefined && item.main_area !== null ? Number(item.main_area) : null);
  const area = Number.isFinite(rawArea) && rawArea > 0 ? rawArea : null;

  const rawRooms = item.rooms !== undefined && item.rooms !== null ? Number(item.rooms) : null;
  const isStudio = Boolean(item.is_studio) || rawRooms === 0 || (rawRooms === null && area !== null && area <= 28);
  const normalizedRooms = isStudio ? 'studio' : String(rawRooms || 1);
  const rooms_type = isStudio ? 'studio' : (normalizeRoomsType(normalizedRooms) || `${normalizedRooms}k`);
  const rooms_label = formatRoomsLabel(rooms_type);

  const floor = item.floor_number !== undefined && item.floor_number !== null ? Number(item.floor_number) : null;
  const flat_number = item.number !== undefined && item.number !== null ? String(item.number).trim() : '';

  // СМУ-5 / Domoplaner возвращает price и price_with_discount (со скидкой по акции)
  const priceDiscount = item.price_with_discount !== undefined && item.price_with_discount !== null
    ? Number(item.price_with_discount)
    : null;
  const priceBase = item.price !== undefined && item.price !== null ? Number(item.price) : null;
  const price = (priceDiscount && priceDiscount > 0) ? priceDiscount : (priceBase && priceBase > 0 ? priceBase : null);

  let price_sqm = null;
  if (item.metr_price !== undefined && item.metr_price !== null && Number(item.metr_price) > 0) {
    price_sqm = Math.round(Number(item.metr_price));
  } else if (price && area && area > 0) {
    price_sqm = Math.round(price / area);
  }

  const houseTitle = item.house_title || projectConfig.projectName || '';
  const floorPart = floor ? `, ${floor} эт.` : '';
  const areaPart = area ? ` ${area} м²` : '';
  const title = `${rooms_label}${areaPart}${floorPart}`;

  const plan_image = item.image && typeof item.image === 'string' && item.image.startsWith('http')
    ? item.image
    : null;

  const lot_url = projectConfig.domoplanerUrl || projectConfig.siteUrl || SMU5_DEVELOPER_SITE;

  return {
    id: lotId,
    project_slug: projectSlug,
    project_name: projectConfig.projectName || houseTitle,
    title,
    rooms_label,
    rooms_type,
    area,
    floor,
    flat_number,
    address: projectConfig.address || houseTitle,
    finishing: 'Черновая',
    price,
    price_sqm,
    plan_image,
    lot_url,
    is_available: item.status === 0 || item.status === '0' || item.status === undefined,
  };
}

/**
 * Загружает и нормализует свободные квартиры одного проекта СМУ-5 из Domoplaner API.
 * @param {string} projectSlug
 * @param {object} [fetchImpl]
 * @returns {Promise<Array<object>>}
 */
export async function fetchSmu5ProjectLots(projectSlug, fetchImpl = fetch) {
  const project = SMU5_PROJECTS[projectSlug];
  if (!project) {
    throw new Error(`Неизвестный проект СМУ-5: ${projectSlug}`);
  }

  const url = `${DOMOPLANER_BASE_URL}/widget-api/widget/c/${project.code}/`;
  const res = await fetchImpl(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      Accept: 'application/json, text/plain, */*',
    },
    signal: AbortSignal.timeout(15000),
  });

  if (!res.ok) {
    throw new Error(`Domoplaner API вернул статус ${res.status} для проекта ${projectSlug}`);
  }

  const payload = await res.json();
  const rawFlats = Array.isArray(payload?.flats) ? payload.flats : [];

  // Фильтруем свободные квартиры (status === 0)
  const availableFlats = rawFlats.filter((f) => f && (f.status === 0 || f.status === '0' || f.status === undefined));

  return availableFlats.map((flat) => normalizeSmu5Lot(flat, project, projectSlug));
}

/**
 * Синхронизирует один проект СМУ-5 в базу данных Neon.
 * @param {string} projectSlug
 * @param {object} sql
 * @param {object} [options]
 * @returns {Promise<{ projectSlug: string, count: number }>}
 */
export async function syncSmu5Project(projectSlug, sql, options = {}) {
  const project = SMU5_PROJECTS[projectSlug];
  if (!project) {
    throw new Error(`Неизвестный проект СМУ-5: ${projectSlug}`);
  }

  const fetchImpl = options.fetchImpl || fetch;
  const lots = await fetchSmu5ProjectLots(projectSlug, fetchImpl);

  return smu5Repo.saveProjectLots(sql, {
    projectSlug,
    projectName: project.projectName,
    totalCount: lots.length,
    lots,
  });
}

/**
 * Синхронизирует все активные проекты СМУ-5 последовательно.
 * @param {object} sql
 * @param {object} [options]
 * @returns {Promise<Record<string, number>>}
 */
export async function syncAllSmu5Projects(sql, options = {}) {
  await smu5Repo.ensureTables(sql);
  const results = {};

  for (const slug of Object.keys(SMU5_PROJECTS)) {
    try {
      const res = await syncSmu5Project(slug, sql, options);
      results[slug] = res.count;
    } catch (err) {
      const safeMsg = sanitizeSmu5Error(err);
      console.error(`[smu5-lots] Error syncing project ${slug}:`, safeMsg);
      try {
        await smu5Repo.recordSyncError(
          sql,
          slug,
          SMU5_PROJECTS[slug].projectName,
          safeMsg
        );
      } catch (metaErr) {
        console.error(`[smu5-lots] Failed to record error metadata for ${slug}:`, metaErr.message);
      }
      results[slug] = -1;
    }
  }

  return results;
}

/**
 * Обработчик запросов к лотам СМУ-5.
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

  const auth = await authenticateLotsRequest(req, '[smu5-lots]');
  if (auth.error) {
    return res.status(auth.status).json({ data: null, error: auth.error });
  }
  const { sql } = auth;

  if (req.method === 'GET') {
    const rawSlug = req.query?.projectSlug ? String(req.query.projectSlug).trim() : '';
    const projectSlug = resolveSmu5ProjectSlug(rawSlug);
    if (projectSlug && !Object.prototype.hasOwnProperty.call(SMU5_PROJECTS, projectSlug)) {
      return res.status(400).json({ data: null, error: 'Неизвестный проект СМУ-5' });
    }
    try {
      const data = await smu5Repo.listCachedLots(sql, projectSlug || null, true);
      return res.status(200).json({ data, error: null });
    } catch (err) {
      console.error('[smu5-lots] GET error:', sanitizeSmu5Error(err));
      return res.status(500).json({ data: null, error: 'Не удалось получить лоты СМУ-5' });
    }
  }

  const body = req.body && typeof req.body === 'object' ? req.body : {};
  const action = body.action || 'list';
  const rawSlug = body.projectSlug ? String(body.projectSlug).trim() : '';
  const projectSlug = resolveSmu5ProjectSlug(rawSlug);

  if (action === 'list') {
    if (projectSlug && !Object.prototype.hasOwnProperty.call(SMU5_PROJECTS, projectSlug)) {
      return res.status(400).json({ data: null, error: 'Неизвестный проект СМУ-5' });
    }
    try {
      const data = await smu5Repo.listCachedLots(sql, projectSlug || null, true);
      return res.status(200).json({ data, error: null });
    } catch (err) {
      console.error('[smu5-lots] list error:', sanitizeSmu5Error(err));
      return res.status(500).json({ data: null, error: 'Не удалось получить лоты СМУ-5' });
    }
  }

  if (action === 'syncProject') {
    if (!projectSlug || !Object.prototype.hasOwnProperty.call(SMU5_PROJECTS, projectSlug)) {
      return res.status(400).json({ data: null, error: 'Неизвестный проект СМУ-5' });
    }

    try {
      const result = await syncSmu5Project(projectSlug, sql);
      return res.status(200).json({ data: result, error: null });
    } catch (err) {
      const safeMsg = sanitizeSmu5Error(err);
      console.error('[smu5-lots] syncProject error:', safeMsg);
      try {
        await smu5Repo.recordSyncError(
          sql,
          projectSlug,
          SMU5_PROJECTS[projectSlug].projectName,
          safeMsg
        );
      } catch (metaErr) {
        console.error('[smu5-lots] Failed to record sync error meta:', metaErr.message);
      }

      const status = err.statusCode || 502;
      return res.status(status).json({ data: null, error: safeMsg });
    }
  }

  return res.status(400).json({ data: null, error: 'Неизвестное действие' });
}
