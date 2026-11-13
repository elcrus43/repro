/**
 * api/avitek-lots.js - Vercel Serverless Function
 *
 * Интеграция и кэш свободных лотов застройщика "УКС АВИТЕК" (uksavitek.ru).
 *   GET  /api/avitek-lots?projectSlug=...            -> список кэшированных лотов и метаданных из Neon DB
 *   POST /api/avitek-lots { action: 'list', ... }    -> то же самое
 *   POST /api/avitek-lots { action: 'syncProject', projectSlug } -> живая синхронизация выбранного ЖК
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

export const AVITEK_BASE_URL = 'https://uksavitek.ru';

export const AVITEK_PROJECTS = {
  'zhk-na-popova': {
    id: 86,
    entrances: [60, 64],
    projectName: 'ЖК Крылья на Попова, 5-7',
    address: 'г. Киров, ул. Ивана Попова, 5-7',
  },
  'dom-na-ul-sovestkaya-75': {
    id: 88,
    entrances: [63],
    projectName: 'Дом на ул. Советская, 75',
    address: 'г. Киров, ул. Советская, 75',
  },
  'dom-na-ul-romana-erdyakova-19a': {
    id: 89,
    entrances: [65],
    projectName: 'Дом на ул. Романа Ердякова, 19а',
    address: 'г. Киров, ул. Романа Ердякова, 19а',
  },
};

// Поддержка алиасов с фронтенда
export const AVITEK_PROJECT_ALIASES = {
  krylya: 'zhk-na-popova',
  'sovetskaya-75': 'dom-na-ul-sovestkaya-75',
  'erdyakova-19a': 'dom-na-ul-romana-erdyakova-19a',
};

export function resolveAvitekProjectSlug(slug) {
  if (!slug) return slug;
  if (AVITEK_PROJECTS[slug]) return slug;
  if (AVITEK_PROJECT_ALIASES[slug]) return AVITEK_PROJECT_ALIASES[slug];
  return slug;
}

const avitekRepo = createLotsRepository('avitek', AVITEK_PROJECTS);

export async function ensureAvitekTables(sql) {
  return avitekRepo.ensureTables(sql);
}

function sanitizeAvitekError(err) {
  return String(err?.message || 'Ошибка синхронизации с API УКС АВИТЕК').slice(0, 300);
}

/**
 * Нормализует сырой объект квартиры из API УКС АВИТЕК.
 * @param {object} item
 * @param {object} projectConfig
 * @param {string} projectSlug
 * @param {object} [roomDetails]
 * @returns {object}
 */
export function normalizeAvitekLot(item = {}, projectConfig = {}, projectSlug = '', roomDetails = null) {
  const rawRooms = Number(item.rooms);
  const rawArea = typeof item.area === 'string' ? item.area.replace(',', '.') : item.area;
  const parsedArea = parseFloat(rawArea);
  const area_m2 = Number.isFinite(parsedArea) && parsedArea > 0 ? parsedArea : null;

  let room_type;
  if (rawRooms === 100 || (rawRooms === 1 && area_m2 && area_m2 <= 28) || (area_m2 && area_m2 <= 28)) {
    room_type = 'studio';
  } else if (rawRooms >= 4) {
    room_type = '4';
  } else if (rawRooms === 3) {
    room_type = '3';
  } else if (rawRooms === 2) {
    room_type = '2';
  } else if (rawRooms === 1) {
    room_type = '1';
  } else {
    room_type = '1';
  }

  const rooms_type = room_type === 'studio' ? 'studio' : (normalizeRoomsType(room_type) || `${room_type}k`);
  const rooms_label = formatRoomsLabel(rooms_type);

  const parsedPrice = parseInt(item.price, 10);
  const price_total = Number.isFinite(parsedPrice) && parsedPrice > 0 ? parsedPrice : null;
  const price_per_m2 = price_total && area_m2 ? Math.round(price_total / area_m2) : null;

  const rawId = item.apartament_id || item.apartment_id || item.id;
  const id = String(rawId);

  const floor = Number.isFinite(Number(item.floor)) ? Number(item.floor) : null;
  const flat_number = item.number !== undefined && item.number !== null ? String(item.number) : null;

  let plan_url = null;
  if (roomDetails?.img) {
    plan_url = roomDetails.img.startsWith('http')
      ? roomDetails.img
      : `${AVITEK_BASE_URL}${roomDetails.img}`;
  } else if (projectConfig.id && id) {
    plan_url = `${AVITEK_BASE_URL}/sale/current_room?apartment_id=${id}&facilityId=${projectConfig.id}`;
  }

  const finishing = roomDetails?.info || null;
  const status = item.status === 2 ? 'reserved' : 'available';

  const projectName = projectConfig.projectName || projectSlug;
  const address = projectConfig.address || null;

  const titleParts = [rooms_label];
  if (area_m2) titleParts.push(`${area_m2} м²`);
  if (floor !== null) titleParts.push(`${floor} эт.`);
  const title = titleParts.join(', ');

  const lot_url = `${AVITEK_BASE_URL}/sale/current_room?apartment_id=${id}&facilityId=${projectConfig.id || ''}`;

  return {
    id,
    project_slug: projectSlug,
    project_name: projectName,
    title,
    rooms_label,
    rooms_type,
    area: area_m2,
    floor,
    flat_number,
    address,
    finishing,
    price: price_total,
    price_sqm: price_per_m2,
    plan_image: plan_url,
    lot_url,
    is_available: true,
    external_id: id,
    room_type,
    rooms: rawRooms,
    area_m2,
    price_total,
    price_per_m2,
    plan_url,
    status,
  };
}

/**
 * Загружает детали квартиры (планировка, отделка) через /sale/current_room
 * @param {string|number} apartmentId
 * @param {string|number} facilityId
 * @param {object} [options]
 * @returns {Promise<object|null>}
 */
export async function fetchAvitekRoomDetails(apartmentId, facilityId, options = {}) {
  const fetchFn = options.fetchFn || fetch;
  const url = `${AVITEK_BASE_URL}/sale/current_room?apartment_id=${apartmentId}&facilityId=${facilityId}`;

  try {
    const res = await fetchFn(url, {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'Mozilla/5.0 (compatible; RealtorMatchCRM/1.0)',
        ...(options.headers || {}),
      },
      signal: options.signal,
    });
    if (!res.ok) return null;
    const json = await res.json();
    return json?.results || null;
  } catch (_e) {
    return null;
  }
}

/**
 * Загружает все доступные лоты проекта УКС АВИТЕК по всем подъездам.
 * @param {object} projectSpec
 * @param {object} [options]
 * @returns {Promise<Array<object>>}
 */
export async function fetchAvitekProjectLots(projectSpec, options = {}) {
  const fetchFn = options.fetchFn || fetch;
  const facilityId = projectSpec.id;
  const entrances = projectSpec.entrances || [];
  const rawLots = [];

  for (const entId of entrances) {
    const url = `${AVITEK_BASE_URL}/sale/form?facility_id=${facilityId}&entrance=${entId}`;
    const res = await fetchFn(url, {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'Mozilla/5.0 (compatible; RealtorMatchCRM/1.0)',
        ...(options.headers || {}),
      },
      signal: options.signal,
    });

    if (!res.ok) {
      throw new Error(`API УКС АВИТЕК вернул статус ${res.status} (${url})`);
    }

    const json = await res.json();
    const floorMap = json?.apartments || {};

    for (const apartmentsList of Object.values(floorMap)) {
      if (!Array.isArray(apartmentsList)) continue;
      for (const apt of apartmentsList) {
        // Status 1 = available, 2 = reserved. Status 3 = sold (filter out).
        if (apt.status === 1 || apt.status === 2) {
          rawLots.push(apt);
        }
      }
    }
  }

  return rawLots;
}

/**
 * Синхронизирует лоты проекта УКС АВИТЕК в Neon DB с дедупликацией.
 * @param {string} projectSlug
 * @param {object} sql
 * @param {object} [options]
 * @returns {Promise<object>}
 */
export async function syncAvitekProject(projectSlug, sql, options = {}) {
  const canonicalSlug = resolveAvitekProjectSlug(projectSlug);
  const projectSpec = AVITEK_PROJECTS[canonicalSlug];
  if (!projectSpec) {
    const err = new Error('Неизвестный проект УКС АВИТЕК');
    err.statusCode = 400;
    throw err;
  }

  const rawLots = await fetchAvitekProjectLots(projectSpec, options);

  // Дедупликация сырых квартир
  const uniqueLotsMap = new Map();
  for (const apt of rawLots) {
    const aptId = String(apt.apartament_id || apt.apartment_id || apt.id);
    if (!uniqueLotsMap.has(aptId)) {
      uniqueLotsMap.set(aptId, apt);
    }
  }
  const uniqueRawLots = Array.from(uniqueLotsMap.values());

  // Подгрузка деталей (планировка / отделка) пачками с ограничением параллелизма
  const detailsMap = new Map();
  if (options.skipDetails !== true && uniqueRawLots.length > 0) {
    const concurrency = 8;
    for (let i = 0; i < uniqueRawLots.length; i += concurrency) {
      const chunk = uniqueRawLots.slice(i, i + concurrency);
      await Promise.all(
        chunk.map(async (apt) => {
          const aptId = String(apt.apartament_id || apt.apartment_id || apt.id);
          const details = await fetchAvitekRoomDetails(aptId, projectSpec.id, options);
          if (details) {
            detailsMap.set(aptId, details);
          }
        })
      );
    }
  }

  const normalizedLots = uniqueRawLots.map((apt) => {
    const aptId = String(apt.apartament_id || apt.apartment_id || apt.id);
    const roomDetails = detailsMap.get(aptId) || null;
    return normalizeAvitekLot(apt, projectSpec, canonicalSlug, roomDetails);
  });

  return avitekRepo.saveProjectLots(sql, {
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

  const auth = await authenticateLotsRequest(req, '[avitek-lots]');
  if (auth.error) {
    return res.status(auth.status).json({ data: null, error: auth.error });
  }
  const { sql } = auth;

  if (req.method === 'GET') {
    const rawSlug = req.query?.projectSlug ? String(req.query.projectSlug).trim() : '';
    const projectSlug = resolveAvitekProjectSlug(rawSlug);
    if (projectSlug && !Object.prototype.hasOwnProperty.call(AVITEK_PROJECTS, projectSlug)) {
      return res.status(400).json({ data: null, error: 'Неизвестный проект УКС АВИТЕК' });
    }
    try {
      const data = await avitekRepo.listCachedLots(sql, projectSlug || null, true);
      return res.status(200).json({ data, error: null });
    } catch (err) {
      console.error('[avitek-lots] GET error:', sanitizeAvitekError(err));
      return res.status(500).json({ data: null, error: 'Не удалось получить лоты УКС АВИТЕК' });
    }
  }

  const body = req.body && typeof req.body === 'object' ? req.body : {};
  const action = body.action || 'list';
  const rawSlug = body.projectSlug ? String(body.projectSlug).trim() : '';
  const projectSlug = resolveAvitekProjectSlug(rawSlug);

  if (action === 'list') {
    if (projectSlug && !Object.prototype.hasOwnProperty.call(AVITEK_PROJECTS, projectSlug)) {
      return res.status(400).json({ data: null, error: 'Неизвестный проект УКС АВИТЕК' });
    }
    try {
      const data = await avitekRepo.listCachedLots(sql, projectSlug || null, true);
      return res.status(200).json({ data, error: null });
    } catch (err) {
      console.error('[avitek-lots] list error:', sanitizeAvitekError(err));
      return res.status(500).json({ data: null, error: 'Не удалось получить лоты УКС АВИТЕК' });
    }
  }

  if (action === 'syncProject') {
    if (!projectSlug || !Object.prototype.hasOwnProperty.call(AVITEK_PROJECTS, projectSlug)) {
      return res.status(400).json({ data: null, error: 'Неизвестный проект УКС АВИТЕК' });
    }

    try {
      const result = await syncAvitekProject(projectSlug, sql);
      return res.status(200).json({ data: result, error: null });
    } catch (err) {
      const safeMsg = sanitizeAvitekError(err);
      console.error('[avitek-lots] syncProject error:', safeMsg);
      try {
        await avitekRepo.recordSyncError(sql, projectSlug, AVITEK_PROJECTS[projectSlug].projectName, safeMsg);
      } catch (metaErr) {
        console.error('[avitek-lots] Failed to record sync error meta:', metaErr.message);
      }

      const status = err.statusCode || 502;
      return res.status(status).json({ data: null, error: safeMsg });
    }
  }

  return res.status(400).json({ data: null, error: 'Неизвестное действие' });
}
