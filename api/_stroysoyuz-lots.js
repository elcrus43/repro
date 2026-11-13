/**
 * api/stroysoyuz-lots.js - Vercel Serverless Function
 *
 * Интеграция и кэш свободных лотов застройщика "Стройсоюз" (stroy-soyuz.ru).
 *   GET  /api/stroysoyuz-lots?projectSlug=...            -> список кэшированных лотов и метаданных из Neon DB
 *   POST /api/stroysoyuz-lots { action: 'list', ... }    -> то же самое
 *   POST /api/stroysoyuz-lots { action: 'syncProject', projectSlug } -> сидирование/обновление лотов ЖК
 */

import {
  normalizeRoomsType,
  formatRoomsLabel,
  authenticateLotsRequest,
  createLotsRepository,
} from './_lots-shared.js';
import { STROYSOYUZ_PRICELIST_DATASET } from './_stroysoyuz-dataset.js';

export { normalizeRoomsType, STROYSOYUZ_PRICELIST_DATASET };

export const config = {
  maxDuration: 60,
};

export const STROYSOYUZ_BASE_URL = 'https://stroy-soyuz.ru';

export const STROYSOYUZ_PROJECTS = {
  'zhk-kholms': {
    projectName: 'ЖК Холмс (Успенская 33)',
    address: 'г. Киров, ул. Успенская, 33',
    completionDate: '4 кв. 2027 г.',
  },
  'uspenskaya-29': {
    projectName: 'Дом на ул. Успенская, 29',
    address: 'г. Киров, ул. Успенская, 29',
    completionDate: 'Дом сдан',
  },
  'solomintsy-michurina-28': {
    projectName: 'ЖК "Слобода Соломинцы", Мичурина 28',
    address: 'г. Киров, ул. Мичурина, 28',
    completionDate: '1 кв. 2029 г.',
  },
  'solomintsy-michurina-26': {
    projectName: 'ЖК "Слобода Соломинцы", Мичурина 26',
    address: 'г. Киров, ул. Мичурина, 26',
    completionDate: '4 кв. 2028 г.',
  },
  'blyuhera-46': {
    projectName: 'ЖК Репинские пруды, Блюхера 46',
    address: 'г. Киров, ул. Блюхера, 46',
    completionDate: 'Дом сдан',
  },
  'zapovedny-sandalovskaya-2a-1': {
    projectName: 'ЖК Заповедный (4 оч.), Сандаловская 2а к1',
    address: 'г. Киров, ул. Сандаловская, 2а к1',
    completionDate: '2 кв. 2027 г.',
  },
  'zapovedny-sandalovskaya-2a': {
    projectName: 'ЖК Заповедный (4 оч.), Сандаловская 2а',
    address: 'г. Киров, ул. Сандаловская, 2а',
    completionDate: '2 кв. 2027 г.',
  },
  'zapovedny-sandalovskaya-4-1': {
    projectName: 'ЖК Заповедный (3 оч.), Сандаловская 4 к1',
    address: 'г. Киров, ул. Сандаловская, 4 к1',
    completionDate: 'Дом сдан',
  },
  'volodarskogo-229': {
    projectName: 'ЖК Репинские пруды, Володарского 229',
    address: 'г. Киров, ул. Володарского, 229',
    completionDate: 'Дом сдан',
  },
  'svobody-115g': {
    projectName: 'Жилой дом, ул. Свободы, 115Г',
    address: 'г. Киров, ул. Свободы, 115Г',
    completionDate: 'Дом сдан',
  },
};

export const STROYSOYUZ_PROJECT_ALIASES = {
  kholms: 'zhk-kholms',
  'uspenskaya-33': 'zhk-kholms',
  uspenskaya: 'uspenskaya-29',
  'michurina-28': 'solomintsy-michurina-28',
  'michurina-26': 'solomintsy-michurina-26',
  blyuhera: 'blyuhera-46',
  'repinskie-prudy': 'blyuhera-46',
  'sandalovskaya-2a-1': 'zapovedny-sandalovskaya-2a-1',
  'sandalovskaya-2a': 'zapovedny-sandalovskaya-2a',
  'sandalovskaya-4-1': 'zapovedny-sandalovskaya-4-1',
  volodarskogo: 'volodarskogo-229',
  svobody: 'svobody-115g',
  'svobody-115': 'svobody-115g',
  zapovedny: 'zapovedny-sandalovskaya-2a-1',
  solomintsy: 'solomintsy-michurina-28',
};

export function resolveStroysoyuzProjectSlug(slug) {
  if (!slug) return slug;
  if (STROYSOYUZ_PROJECTS[slug]) return slug;
  if (STROYSOYUZ_PROJECT_ALIASES[slug]) return STROYSOYUZ_PROJECT_ALIASES[slug];
  return slug;
}

const stroysoyuzRepo = createLotsRepository('stroysoyuz', STROYSOYUZ_PROJECTS);

export async function ensureStroysoyuzTables(sql) {
  return stroysoyuzRepo.ensureTables(sql);
}

function sanitizeStroysoyuzError(err) {
  return String(err?.message || 'Ошибка обработки данных Стройсоюз').slice(0, 300);
}

/**
 * Нормализует сырой элемент прайслиста Стройсоюз в канонический объект лота.
 * @param {object} item
 * @param {object} projectSpec
 * @param {string} projectSlug
 * @returns {object}
 */
export function normalizeStroysoyuzLot(item = {}, projectSpec = {}, projectSlug = '') {
  const externalId = item.external_id || item.id || `lot-${item.flat_number || '0'}`;
  const id = `stroysoyuz-${projectSlug}-${externalId}`;

  const areaM2 = item.area_m2 !== null && item.area_m2 !== undefined
    ? Number(item.area_m2)
    : (item.area !== null && item.area !== undefined ? Number(item.area) : null);

  const floor = item.floor !== null && item.floor !== undefined ? Number(item.floor) : null;
  const flatNumber = item.flat_number ? String(item.flat_number) : null;
  const section = item.section || '';
  const completionDate = item.completion_date || projectSpec.completionDate || '';

  const rawRooms = Number(item.rooms);
  let roomType = item.room_type;
  if (!roomType) {
    if (rawRooms === 0 || (areaM2 && areaM2 <= 28)) {
      roomType = 'studio';
    } else if (rawRooms >= 4) {
      roomType = '4';
    } else {
      roomType = String(rawRooms || 1);
    }
  }

  const roomsType = roomType === 'studio' ? 'studio' : (normalizeRoomsType(roomType) || `${rawRooms || 1}k`);
  const roomsLabel = item.lot_type === 'commercial' ? 'Коммерческое помещение'
    : item.lot_type === 'storage' ? 'Кладовая'
    : item.lot_type === 'parking' ? 'Машино-место'
    : formatRoomsLabel(roomsType);

  const priceTotal = item.price_total !== null && item.price_total !== undefined
    ? Number(item.price_total)
    : (item.price !== null && item.price !== undefined ? Number(item.price) : null);

  const pricePerM2 = item.price_per_m2 !== null && item.price_per_m2 !== undefined
    ? Number(item.price_per_m2)
    : (item.price_sqm !== null && item.price_sqm !== undefined
        ? Number(item.price_sqm)
        : (priceTotal && areaM2 ? Math.round(priceTotal / areaM2) : null));

  const status = item.status === 'reserved' ? 'reserved' : 'available';
  const isAvailable = status === 'available';

  const projectName = projectSpec.projectName || projectSlug;
  const baseAddress = projectSpec.address || '';
  const fullAddress = section && baseAddress ? `${baseAddress} (${section})` : (baseAddress || null);

  const titleParts = [roomsLabel];
  if (areaM2) titleParts.push(`${areaM2} м²`);
  if (floor !== null) titleParts.push(`${floor} эт.`);
  const title = titleParts.join(', ');

  const planImage = item.plan_image || null;
  const lotUrl = item.lot_url || STROYSOYUZ_BASE_URL;

  return {
    // Database schema fields (used by saveProjectLots / Neon DB)
    id,
    project_slug: projectSlug,
    project_name: projectName,
    title,
    rooms_label: roomsLabel,
    rooms_type: roomsType,
    area: areaM2,
    floor,
    flat_number: flatNumber,
    address: fullAddress,
    finishing: item.finishing || 'Черновая',
    price: priceTotal,
    price_sqm: pricePerM2,
    plan_image: planImage,
    lot_url: lotUrl,
    is_available: isAvailable,

    // Canonical normalized lot schema fields
    external_id: String(externalId),
    rooms: Number.isFinite(rawRooms) ? rawRooms : 1,
    room_type: roomType,
    area_m2: areaM2,
    price_total: priceTotal,
    price_per_m2: pricePerM2,
    section,
    completion_date: completionDate,
    status,
  };
}

/**
 * Синхронизирует/сидирует лоты проекта Стройсоюз в Neon DB.
 * @param {string} projectSlug
 * @param {object} sql
 * @param {object} [_options]
 * @returns {Promise<object>}
 */
export async function syncStroysoyuzProject(projectSlug, sql, _options = {}) {
  const canonicalSlug = resolveStroysoyuzProjectSlug(projectSlug);
  const projectSpec = STROYSOYUZ_PROJECTS[canonicalSlug];
  if (!projectSpec) {
    const err = new Error('Неизвестный проект Стройсоюз');
    err.statusCode = 400;
    throw err;
  }

  const rawDataset = STROYSOYUZ_PRICELIST_DATASET[canonicalSlug] || [];
  const normalizedLots = rawDataset.map((item) =>
    normalizeStroysoyuzLot(item, projectSpec, canonicalSlug)
  );

  return stroysoyuzRepo.saveProjectLots(sql, {
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

  const auth = await authenticateLotsRequest(req, '[stroysoyuz-lots]');
  if (auth.error) {
    return res.status(auth.status).json({ data: null, error: auth.error });
  }
  const { sql } = auth;

  if (req.method === 'GET') {
    const rawSlug = req.query?.projectSlug ? String(req.query.projectSlug).trim() : '';
    const projectSlug = resolveStroysoyuzProjectSlug(rawSlug);
    if (projectSlug && !Object.prototype.hasOwnProperty.call(STROYSOYUZ_PROJECTS, projectSlug)) {
      return res.status(400).json({ data: null, error: 'Неизвестный проект Стройсоюз' });
    }
    try {
      const data = await stroysoyuzRepo.listCachedLots(sql, projectSlug || null, true);
      return res.status(200).json({ data, error: null });
    } catch (err) {
      console.error('[stroysoyuz-lots] GET error:', sanitizeStroysoyuzError(err));
      return res.status(500).json({ data: null, error: 'Не удалось получить лоты Стройсоюз' });
    }
  }

  const body = req.body && typeof req.body === 'object' ? req.body : {};
  const action = body.action || 'list';
  const rawSlug = body.projectSlug ? String(body.projectSlug).trim() : '';
  const projectSlug = resolveStroysoyuzProjectSlug(rawSlug);

  if (action === 'list') {
    if (projectSlug && !Object.prototype.hasOwnProperty.call(STROYSOYUZ_PROJECTS, projectSlug)) {
      return res.status(400).json({ data: null, error: 'Неизвестный проект Стройсоюз' });
    }
    try {
      const data = await stroysoyuzRepo.listCachedLots(sql, projectSlug || null, true);
      return res.status(200).json({ data, error: null });
    } catch (err) {
      console.error('[stroysoyuz-lots] list error:', sanitizeStroysoyuzError(err));
      return res.status(500).json({ data: null, error: 'Не удалось получить лоты Стройсоюз' });
    }
  }

  if (action === 'syncProject') {
    if (!projectSlug || !Object.prototype.hasOwnProperty.call(STROYSOYUZ_PROJECTS, projectSlug)) {
      return res.status(400).json({ data: null, error: 'Неизвестный проект Стройсоюз' });
    }

    try {
      const result = await syncStroysoyuzProject(projectSlug, sql);
      return res.status(200).json({ data: result, error: null });
    } catch (err) {
      const safeMsg = sanitizeStroysoyuzError(err);
      console.error('[stroysoyuz-lots] syncProject error:', safeMsg);
      try {
        await stroysoyuzRepo.recordSyncError(sql, projectSlug, STROYSOYUZ_PROJECTS[projectSlug].projectName, safeMsg);
      } catch (metaErr) {
        console.error('[stroysoyuz-lots] Failed to record sync error meta:', metaErr.message);
      }

      const status = err.statusCode || 502;
      return res.status(status).json({ data: null, error: safeMsg });
    }
  }

  return res.status(400).json({ data: null, error: 'Неизвестное действие' });
}
