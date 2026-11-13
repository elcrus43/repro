/**
 * api/altai-lots.js - Vercel Serverless Function
 *
 * Интеграция и кэш свободных лотов застройщика "Алтай-Строй" (altai-stroi.org).
 *   GET  /api/altai-lots?projectSlug=...            -> список кэшированных лотов и метаданных из Neon DB
 *   POST /api/altai-lots { action: 'list', ... }    -> то же самое
 *   POST /api/altai-lots { action: 'syncProject', projectSlug } -> сидирование/обновление лотов ЖК
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

export const ALTAI_BASE_URL = 'https://altai-stroi.org';

export const ALTAI_PROJECTS = {
  'zhk-dinastiya': {
    projectName: 'ЖК ДИНАСТИЯ',
    address: 'г. Киров, Хлебозаводской пер., 30',
  },
  'dom-na-erdyakova-9': {
    projectName: 'Дом на Ердякова, 9',
    address: 'г. Киров, ул. Романа Ердякова, 9',
  },
};

export const ALTAI_PROJECT_ALIASES = {
  dinastiya: 'zhk-dinastiya',
  'erdyakova-9': 'dom-na-erdyakova-9',
};

export function resolveAltaiProjectSlug(slug) {
  if (!slug) return slug;
  if (ALTAI_PROJECTS[slug]) return slug;
  if (ALTAI_PROJECT_ALIASES[slug]) return ALTAI_PROJECT_ALIASES[slug];
  return slug;
}

const altaiRepo = createLotsRepository('altai', ALTAI_PROJECTS);

export async function ensureAltaiTables(sql) {
  return altaiRepo.ensureTables(sql);
}

function sanitizeAltaiError(err) {
  return String(err?.message || 'Ошибка обработки данных Алтай-Строй').slice(0, 300);
}

/**
 * Эталонный каталог лотов Алтай-Строй по официальным прайс-листам от 12.11.2026.
 */
export const ALTAI_PRICELIST_DATASET = {
  'dom-na-erdyakova-9': [
    // 1-комнатные квартиры (37.18, 38.55, 40.55, 50.08, 50.70)
    { flat_number: '12', rooms_type: '1k', area: 37.18, floor: 2, finishing: 'Черновая', price_sqm: 125000, price: 4647500 },
    { flat_number: '24', rooms_type: '1k', area: 37.18, floor: 4, finishing: 'Чистовая', price_sqm: 139000, price: 5168020 },
    { flat_number: '48', rooms_type: '1k', area: 37.18, floor: 8, finishing: 'Чистовая', price_sqm: 141000, price: 5242380 },
    { flat_number: '72', rooms_type: '1k', area: 37.18, floor: 12, finishing: 'Чистовая', price_sqm: 142000, price: 5279560 },
    { flat_number: '15', rooms_type: '1k', area: 38.55, floor: 3, finishing: 'Черновая', price_sqm: 124000, price: 4780200 },
    { flat_number: '39', rooms_type: '1k', area: 38.55, floor: 6, finishing: 'Чистовая', price_sqm: 138000, price: 5319900 },
    { flat_number: '63', rooms_type: '1k', area: 38.55, floor: 10, finishing: 'Чистовая', price_sqm: 140000, price: 5397000 },
    { flat_number: '18', rooms_type: '1k', area: 40.55, floor: 3, finishing: 'Черновая', price_sqm: 123000, price: 4987650 },
    { flat_number: '42', rooms_type: '1k', area: 40.55, floor: 7, finishing: 'Чистовая', price_sqm: 137000, price: 5555350 },
    { flat_number: '66', rooms_type: '1k', area: 40.55, floor: 11, finishing: 'Чистовая', price_sqm: 139000, price: 5636450 },
    { flat_number: '82', rooms_type: '1k', area: 40.55, floor: 14, finishing: 'Чистовая', price_sqm: 140000, price: 5677000 },
    { flat_number: '20', rooms_type: '1k', area: 50.08, floor: 4, finishing: 'Черновая', price_sqm: 121000, price: 6059680 },
    { flat_number: '56', rooms_type: '1k', area: 50.08, floor: 9, finishing: 'Чистовая', price_sqm: 135000, price: 6760800 },
    { flat_number: '80', rooms_type: '1k', area: 50.08, floor: 13, finishing: 'Чистовая', price_sqm: 137000, price: 6860960 },
    { flat_number: '21', rooms_type: '1k', area: 50.70, floor: 4, finishing: 'Черновая', price_sqm: 121000, price: 6134700 },
    { flat_number: '57', rooms_type: '1k', area: 50.70, floor: 9, finishing: 'Чистовая', price_sqm: 135000, price: 6844500 },

    // 2-комнатные квартиры (55.09, 55.55, 57.47, 57.92, 68.68, 69.21)
    { flat_number: '14', rooms_type: '2k', area: 55.09, floor: 2, finishing: 'Черновая', price_sqm: 119000, price: 6555710 },
    { flat_number: '38', rooms_type: '2k', area: 55.09, floor: 6, finishing: 'Чистовая', price_sqm: 132000, price: 7271880 },
    { flat_number: '62', rooms_type: '2k', area: 55.09, floor: 10, finishing: 'Чистовая', price_sqm: 134000, price: 7382060 },
    { flat_number: '16', rooms_type: '2k', area: 55.55, floor: 3, finishing: 'Черновая', price_sqm: 119000, price: 6610450 },
    { flat_number: '40', rooms_type: '2k', area: 55.55, floor: 7, finishing: 'Чистовая', price_sqm: 132000, price: 7332600 },
    { flat_number: '76', rooms_type: '2k', area: 55.55, floor: 13, finishing: 'Чистовая', price_sqm: 134000, price: 7443700 },
    { flat_number: '22', rooms_type: '2k', area: 57.47, floor: 4, finishing: 'Черновая', price_sqm: 118000, price: 6781460 },
    { flat_number: '46', rooms_type: '2k', area: 57.47, floor: 8, finishing: 'Чистовая', price_sqm: 131000, price: 7528570 },
    { flat_number: '70', rooms_type: '2k', area: 57.47, floor: 12, finishing: 'Чистовая', price_sqm: 133000, price: 7643510 },
    { flat_number: '25', rooms_type: '2k', area: 57.92, floor: 5, finishing: 'Черновая', price_sqm: 118000, price: 6834560 },
    { flat_number: '49', rooms_type: '2k', area: 57.92, floor: 9, finishing: 'Чистовая', price_sqm: 131000, price: 7587520 },
    { flat_number: '73', rooms_type: '2k', area: 57.92, floor: 13, finishing: 'Чистовая', price_sqm: 133000, price: 7703360 },
    { flat_number: '28', rooms_type: '2k', area: 68.68, floor: 5, finishing: 'Черновая', price_sqm: 116000, price: 7966880 },
    { flat_number: '52', rooms_type: '2k', area: 68.68, floor: 9, finishing: 'Чистовая', price_sqm: 129000, price: 8859720 },
    { flat_number: '84', rooms_type: '2k', area: 68.68, floor: 14, finishing: 'Чистовая', price_sqm: 131000, price: 8997080 },
    { flat_number: '30', rooms_type: '2k', area: 69.21, floor: 6, finishing: 'Черновая', price_sqm: 116000, price: 8028360 },
    { flat_number: '54', rooms_type: '2k', area: 69.21, floor: 10, finishing: 'Чистовая', price_sqm: 129000, price: 8928090 },
    { flat_number: '78', rooms_type: '2k', area: 69.21, floor: 14, finishing: 'Чистовая', price_sqm: 131000, price: 9066510 },
  ],

  'zhk-dinastiya': [
    // 1-я очередь (секции 1, 2)
    { flat_number: '101', section: '1 оч, секция 1', rooms_type: '1k', area: 42.50, floor: 3, finishing: 'Черновая', price_sqm: 145000, price: 6162500, is_view: false },
    { flat_number: '115', section: '1 оч, секция 1', rooms_type: '1k', area: 45.20, floor: 6, finishing: 'Предчистовая', price_sqm: 152000, price: 6870400, is_view: false },
    { flat_number: '128', section: '1 оч, секция 1', rooms_type: '1k', area: 48.80, floor: 10, finishing: 'Предчистовая', price_sqm: 154000, price: 7515200, is_view: false },
    { flat_number: '135', section: '1 оч, секция 1', rooms_type: '1k', area: 48.80, floor: 14, finishing: 'Предчистовая', price_sqm: 162000, price: 7905600, is_view: true },
    { flat_number: '204', section: '1 оч, секция 2', rooms_type: '2k', area: 62.30, floor: 4, finishing: 'Черновая', price_sqm: 138000, price: 8597400, is_view: false },
    { flat_number: '218', section: '1 оч, секция 2', rooms_type: '2k', area: 68.50, floor: 7, finishing: 'Предчистовая', price_sqm: 145000, price: 9932500, is_view: false },
    { flat_number: '232', section: '1 оч, секция 2', rooms_type: '2k', area: 72.40, floor: 12, finishing: 'Предчистовая', price_sqm: 148000, price: 10715200, is_view: false },
    { flat_number: '241', section: '1 оч, секция 2', rooms_type: '2k', area: 72.40, floor: 15, finishing: 'Предчистовая', price_sqm: 160000, price: 11584000, is_view: true },
    { flat_number: '108', section: '1 оч, секция 1', rooms_type: '3k', area: 78.90, floor: 5, finishing: 'Черновая', price_sqm: 132000, price: 10414800, is_view: false },
    { flat_number: '122', section: '1 оч, секция 1', rooms_type: '3k', area: 85.60, floor: 8, finishing: 'Предчистовая', price_sqm: 138000, price: 11812800, is_view: false },
    { flat_number: '142', section: '1 оч, секция 1', rooms_type: '3k', area: 92.10, floor: 15, finishing: 'Предчистовая', price_sqm: 155000, price: 14275500, is_view: true },
    { flat_number: '245', section: '1 оч, секция 2', rooms_type: '4k', area: 112.40, floor: 14, finishing: 'Предчистовая', price_sqm: 150000, price: 16860000, is_view: true },
    { flat_number: '248', section: '1 оч, секция 2', rooms_type: '4k', area: 126.80, floor: 16, finishing: 'Предчистовая', price_sqm: 165000, price: 20922000, is_view: true },

    // 2-я очередь (секции 3, 4)
    { flat_number: '302', section: '2 оч, секция 3', rooms_type: '1k', area: 41.80, floor: 2, finishing: 'Черновая', price_sqm: 142000, price: 5935600, is_view: false },
    { flat_number: '316', section: '2 оч, секция 3', rooms_type: '1k', area: 46.10, floor: 6, finishing: 'Предчистовая', price_sqm: 149000, price: 6868900, is_view: false },
    { flat_number: '334', section: '2 оч, секция 3', rooms_type: '1k', area: 46.10, floor: 13, finishing: 'Предчистовая', price_sqm: 158000, price: 7283800, is_view: true },
    { flat_number: '406', section: '2 оч, секция 4', rooms_type: '2k', area: 64.20, floor: 4, finishing: 'Черновая', price_sqm: 136000, price: 8731200, is_view: false },
    { flat_number: '420', section: '2 оч, секция 4', rooms_type: '2k', area: 70.10, floor: 8, finishing: 'Предчистовая', price_sqm: 143000, price: 10024300, is_view: false },
    { flat_number: '438', section: '2 оч, секция 4', rooms_type: '2k', area: 70.10, floor: 14, finishing: 'Предчистовая', price_sqm: 156000, price: 10935600, is_view: true },
    { flat_number: '310', section: '2 оч, секция 3', rooms_type: '3k', area: 81.40, floor: 5, finishing: 'Черновая', price_sqm: 130000, price: 10582000, is_view: false },
    { flat_number: '325', section: '2 оч, секция 3', rooms_type: '3k', area: 94.50, floor: 9, finishing: 'Предчистовая', price_sqm: 136000, price: 12852000, is_view: false },
    { flat_number: '342', section: '2 оч, секция 3', rooms_type: '3k', area: 94.50, floor: 15, finishing: 'Предчистовая', price_sqm: 152000, price: 14364000, is_view: true },
    { flat_number: '445', section: '2 оч, секция 4', rooms_type: '4k', area: 118.50, floor: 15, finishing: 'Предчистовая', price_sqm: 158000, price: 18723000, is_view: true },
  ],
};

/**
 * Преобразует элемент прайслиста Алтай-Строй в нормализованный объект лота.
 * @param {object} item
 * @param {object} projectSpec
 * @param {string} projectSlug
 * @returns {object}
 */
export function normalizeAltaiLot(item = {}, projectSpec = {}, projectSlug = '') {
  const roomsType = item.rooms_type || normalizeRoomsType(item.rooms) || '1k';
  const roomsLabel = formatRoomsLabel(roomsType);
  const area = Number(item.area) || null;
  const floor = Number(item.floor) || null;
  const flatNumber = item.flat_number ? String(item.flat_number) : null;
  const finishing = item.finishing || null;
  const price = Number(item.price) || null;
  const priceSqm = Number(item.price_sqm) || (price && area ? Math.round(price / area) : null);
  const isView = item.is_view === true;

  const id = `altai-${projectSlug}-${flatNumber || `${floor}-${area}`}`;

  const titleParts = [roomsLabel];
  if (area) titleParts.push(`${area} м²`);
  if (floor !== null) titleParts.push(`${floor} эт.`);
  if (isView) titleParts.push('видовая');
  const title = titleParts.join(', ');

  const fullAddress = item.section && projectSpec.address
    ? `${projectSpec.address} (${item.section})`
    : (projectSpec.address || null);

  const planImage = item.plan_image || `${ALTAI_BASE_URL}/plans/${projectSlug}-${roomsType}.png`;
  const lotUrl = `${ALTAI_BASE_URL}/objects/${projectSlug}/flat-${flatNumber || id}`;

  return {
    id,
    project_slug: projectSlug,
    project_name: projectSpec.projectName || projectSlug,
    title,
    rooms_label: roomsLabel,
    rooms_type: roomsType,
    area,
    floor,
    flat_number: flatNumber,
    address: fullAddress,
    finishing,
    price,
    price_sqm: priceSqm,
    plan_image: planImage,
    lot_url: lotUrl,
    is_available: true,
    external_id: id,
    room_type: roomsType.replace('k', ''),
    rooms: parseInt(roomsType, 10) || 1,
    area_m2: area,
    price_total: price,
    price_per_m2: priceSqm,
    plan_url: planImage,
    status: 'available',
    is_view: isView,
    section: item.section || null,
  };
}

/**
 * Синхронизирует/сидирует лоты проекта Алтай-Строй в Neon DB.
 * @param {string} projectSlug
 * @param {object} sql
 * @param {object} [options]
 * @returns {Promise<object>}
 */
export async function syncAltaiProject(projectSlug, sql, _options = {}) {
  const canonicalSlug = resolveAltaiProjectSlug(projectSlug);
  const projectSpec = ALTAI_PROJECTS[canonicalSlug];
  if (!projectSpec) {
    const err = new Error('Неизвестный проект Алтай-Строй');
    err.statusCode = 400;
    throw err;
  }

  const rawDataset = ALTAI_PRICELIST_DATASET[canonicalSlug] || [];
  const normalizedLots = rawDataset.map((item) =>
    normalizeAltaiLot(item, projectSpec, canonicalSlug)
  );

  return altaiRepo.saveProjectLots(sql, {
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

  const auth = await authenticateLotsRequest(req, '[altai-lots]');
  if (auth.error) {
    return res.status(auth.status).json({ data: null, error: auth.error });
  }
  const { sql } = auth;

  if (req.method === 'GET') {
    const rawSlug = req.query?.projectSlug ? String(req.query.projectSlug).trim() : '';
    const projectSlug = resolveAltaiProjectSlug(rawSlug);
    if (projectSlug && !Object.prototype.hasOwnProperty.call(ALTAI_PROJECTS, projectSlug)) {
      return res.status(400).json({ data: null, error: 'Неизвестный проект Алтай-Строй' });
    }
    try {
      const data = await altaiRepo.listCachedLots(sql, projectSlug || null, true);
      return res.status(200).json({ data, error: null });
    } catch (err) {
      console.error('[altai-lots] GET error:', sanitizeAltaiError(err));
      return res.status(500).json({ data: null, error: 'Не удалось получить лоты Алтай-Строй' });
    }
  }

  const body = req.body && typeof req.body === 'object' ? req.body : {};
  const action = body.action || 'list';
  const rawSlug = body.projectSlug ? String(body.projectSlug).trim() : '';
  const projectSlug = resolveAltaiProjectSlug(rawSlug);

  if (action === 'list') {
    if (projectSlug && !Object.prototype.hasOwnProperty.call(ALTAI_PROJECTS, projectSlug)) {
      return res.status(400).json({ data: null, error: 'Неизвестный проект Алтай-Строй' });
    }
    try {
      const data = await altaiRepo.listCachedLots(sql, projectSlug || null, true);
      return res.status(200).json({ data, error: null });
    } catch (err) {
      console.error('[altai-lots] list error:', sanitizeAltaiError(err));
      return res.status(500).json({ data: null, error: 'Не удалось получить лоты Алтай-Строй' });
    }
  }

  if (action === 'syncProject') {
    if (!projectSlug || !Object.prototype.hasOwnProperty.call(ALTAI_PROJECTS, projectSlug)) {
      return res.status(400).json({ data: null, error: 'Неизвестный проект Алтай-Строй' });
    }

    try {
      const result = await syncAltaiProject(projectSlug, sql);
      return res.status(200).json({ data: result, error: null });
    } catch (err) {
      const safeMsg = sanitizeAltaiError(err);
      console.error('[altai-lots] syncProject error:', safeMsg);
      try {
        await altaiRepo.recordSyncError(sql, projectSlug, ALTAI_PROJECTS[projectSlug].projectName, safeMsg);
      } catch (metaErr) {
        console.error('[altai-lots] Failed to record sync error meta:', metaErr.message);
      }

      const status = err.statusCode || 502;
      return res.status(status).json({ data: null, error: safeMsg });
    }
  }

  return res.status(400).json({ data: null, error: 'Неизвестное действие' });
}
