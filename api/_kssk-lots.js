/**
 * api/kssk-lots.js - Vercel Serverless Function
 *
 * Парсер и кэш свободных лотов застройщика Кировский ССК (kvartiry.kssk.ru).
 * Использует открытый каталог объектов /objects/... без авторизации и капчи.
 *   GET  /api/kssk-lots?projectSlug=...            -> список кэшированных лотов и метаданных из Neon DB
 *   POST /api/kssk-lots { action: 'list', ... }    -> то же самое
 *   POST /api/kssk-lots { action: 'syncProject', projectSlug } -> живая синхронизация выбранного ЖК КССК
 */

import {
  cleanText,
  decodeHtmlEntities,
  extractAttrFromTag,
  normalizeRoomsType,
  formatRoomsLabel,
  authenticateLotsRequest,
  createLotsRepository,
} from './_lots-shared.js';

export { normalizeRoomsType };

export const config = {
  maxDuration: 60,
};

const KSSK_BASE_URL = 'https://kvartiry.kssk.ru';

export const KSSK_PROJECTS = {
  'zhk-skandinaviya': {
    projectName: 'ЖК Скандинавия',
    houses: [
      { path: '/objects/mikheeva-1/', address: 'г. Киров, ул. Анжелия Михеева, 1' },
      { path: '/objects/ul-mikheeva-5/', address: 'г. Киров, ул. Анжелия Михеева, 5' },
    ],
  },
  'zhk-metro': {
    projectName: 'ЖК Метро',
    houses: [
      { path: '/objects/ul-moskovskaya-d-209a/', address: 'г. Киров, ул. Московская, 209А' },
      { path: '/objects/ul-moskovskaya-209/', address: 'г. Киров, ул. Московская, 209' },
    ],
  },
  'zhk-sloboda': {
    projectName: 'ЖК Слобода',
    houses: [
      { path: '/objects/ul-potrebkooperatsii-34/', address: 'г. Киров, ул. Потребкооперации, 34' },
      { path: '/objects/potrebkooperatsii-34-k-1-sloboda/', address: 'г. Киров, ул. Потребкооперации, 34к1' },
    ],
  },
  'zhk-x2': {
    projectName: 'ЖК Х2',
    houses: [
      { path: '/objects/khlebozavodskoy-pr-d-d-2-kh2/', address: 'г. Киров, Хлебозаводской пр-д, 2' },
    ],
  },
  'zhk-dom-u-reki': {
    projectName: 'ЖК Дом у реки',
    houses: [
      { path: '/objects/ul-zavodskaya-14-k2/', address: 'г. Киров, ул. Заводская, 14к2' },
    ],
  },
  'zhk-pushkina': {
    projectName: 'ЖК Пушкина',
    houses: [
      { path: '/objects/pushkina-25/', address: 'г. Киров, ул. Пушкина, 25' },
      { path: '/objects/pushkina-25-k1/', address: 'г. Киров, ул. Пушкина, 25к1' },
    ],
  },
};

const ksskRepo = createLotsRepository('kssk', KSSK_PROJECTS);

function toAbsoluteKsskUrl(rawUrl) {
  const trimmed = decodeHtmlEntities(String(rawUrl || '')).trim();
  if (!trimmed || trimmed.startsWith('data:')) return null;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (trimmed.startsWith('//')) return `https:${trimmed}`;
  return `${KSSK_BASE_URL}${trimmed.startsWith('/') ? '' : '/'}${trimmed}`;
}

function sanitizeKsskError(err) {
  return String(err?.message || 'Ошибка синхронизации с сайтом КССК').slice(0, 300);
}

/**
 * Извлекает список секций (.sectionpicker) со страницы дома КССК.
 * @param {string} html
 * @returns {Array<{ id: string, label: string, active: boolean }>}
 */
export function parseKsskSections(html) {
  if (!html || typeof html !== 'string') return [];
  const sections = [];
  const seen = new Set();
  const re = /<a\b([^>]*\bsectionpicker\b[^>]*)>([\s\S]*?)<\/a>/gi;
  let m;
  while ((m = re.exec(html)) !== null) {
    const attrs = m[1];
    const id = extractAttrFromTag(`<a ${attrs}>`, 'data-id');
    const className = extractAttrFromTag(`<a ${attrs}>`, 'class') || '';
    if (!id || seen.has(id)) continue;
    seen.add(id);
    sections.push({
      id: String(id).trim(),
      label: cleanText(m[2]) || `${sections.length + 1} секция`,
      active: /\bactive\b/i.test(className),
    });
  }
  return sections;
}

function extractMoreroomsFinishing(html) {
  const byId = new Map();
  const uniqueFinishings = new Set();
  const cardRe = /<a\b[^>]*\bappartbycard\b[^>]*>([\s\S]*?)<\/a>/gi;
  let m;
  while ((m = cardRe.exec(html)) !== null) {
    const id = extractAttrFromTag(m[0], 'data-id');
    const textBlockMatch = m[1].match(/<div\b[^>]*\btext-block-house\b[^>]*>([\s\S]*?)<\/div>\s*$/i)
      || m[1].match(/<div\b[^>]*\btext-block-house\b[^>]*>[\s\S]*?<p>[^<]*<\/p>\s*<span>([^<]+)<\/span>/i);
    if (!textBlockMatch) continue;

    let finishing = null;
    if (textBlockMatch[1] && !textBlockMatch[1].includes('<')) {
      finishing = cleanText(textBlockMatch[1]);
    } else {
      const spanMatches = [...m[1].matchAll(/<span>([^<]+)<\/span>/gi)];
      const lastSpan = spanMatches[spanMatches.length - 1];
      if (lastSpan) finishing = cleanText(lastSpan[1]);
    }

    if (finishing) {
      uniqueFinishings.add(finishing);
      if (id) byId.set(String(id), finishing);
    }
  }

  return {
    byId,
    fallback: uniqueFinishings.size === 1 ? Array.from(uniqueFinishings)[0] : null,
  };
}

/**
 * Разбирает HTML шахматки дома КССК в массив структурированных свободных лотов.
 * @param {string} html
 * @param {{ projectSlug: string, projectName?: string, housePath?: string, houseAddress?: string, sectionLabel?: string }} meta
 * @returns {Array<object>}
 */
export function parseKsskHouseHtml(html, meta = {}) {
  if (!html || typeof html !== 'string') return [];

  const projectSlug = meta.projectSlug || '';
  const projectName = meta.projectName || KSSK_PROJECTS[projectSlug]?.projectName || projectSlug;
  const housePath = meta.housePath || '';
  const baseAddress = meta.houseAddress || '';
  const finishingMeta = extractMoreroomsFinishing(html);

  const sections = parseKsskSections(html);
  const activeSection = sections.find((s) => s.active);
  const resolvedSectionLabel = meta.sectionLabel || activeSection?.label || '';
  const fullAddress = resolvedSectionLabel && baseAddress
    ? `${baseAddress} (${resolvedSectionLabel})`
    : baseAddress || resolvedSectionLabel || null;

  const lots = [];
  const seenIds = new Set();

  const rowRe = /<tr\b[^>]*\bdata-for-floor\s*=\s*["'][^"']*["'][^>]*>([\s\S]*?)<\/tr>/gi;
  let rowMatch;
  while ((rowMatch = rowRe.exec(html)) !== null) {
    const rowHtml = rowMatch[1];
    const floorTagMatch = rowHtml.match(/<td\b[^>]*\bdata-floor\s*=\s*["']?(\d+)["']?[^>]*>/i);
    const floor = floorTagMatch ? parseInt(floorTagMatch[1], 10) : null;

    const tdRe = /<td\b([^>]*)>([\s\S]*?)<\/td>/gi;
    let tdMatch;
    while ((tdMatch = tdRe.exec(rowHtml)) !== null) {
      const tdAttrs = tdMatch[1];
      const tdInner = tdMatch[2];
      const tdClass = extractAttrFromTag(`<td ${tdAttrs}>`, 'class') || '';
      if (!/\bactive\b/i.test(tdClass)) continue;

      const planDivMatch = tdInner.match(/<div\b([^>]*\bitem__plan-div\b[^>]*)>([\s\S]*?)<\/div>/i);
      if (!planDivMatch) continue;
      const lotId = extractAttrFromTag(`<div ${planDivMatch[1]}>`, 'data-id');
      if (!lotId || seenIds.has(lotId)) continue;
      seenIds.add(lotId);

      const badgeText = cleanText(planDivMatch[2]);
      const cardInfoMatch = tdInner.match(/<div\b[^>]*\binfo__card-room\b[^>]*>([\s\S]*?)<\/div>/i);
      const cardInfoHtml = cardInfoMatch ? cardInfoMatch[1] : tdInner;

      const imgMatch = cardInfoHtml.match(/<img\b[^>]*>/i);
      const rawImgSrc = imgMatch
        ? (extractAttrFromTag(imgMatch[0], 'data-src') || extractAttrFromTag(imgMatch[0], 'src'))
        : null;
      const planImage = toAbsoluteKsskUrl(rawImgSrc);

      const cardSpanMatch = cardInfoHtml.match(/<span>([\s\S]*?)<\/span>/i);
      const cardSpanText = cardSpanMatch ? cleanText(cardSpanMatch[1]) : '';
      const areaMatch = cardSpanText.match(/(\d+(?:[.,]\d+)?)\s*(?:м²|м2|кв\.?\s*м)/i);
      const parsedArea = areaMatch ? parseFloat(areaMatch[1].replace(',', '.')) : null;
      const area = Number.isFinite(parsedArea) ? parsedArea : null;

      const roomsSource = cardSpanText
        .replace(/(\d+(?:[.,]\d+)?)\s*(?:м²|м2|кв\.?\s*м).*/i, '')
        .trim() || badgeText;
      const roomsType = normalizeRoomsType(roomsSource) || normalizeRoomsType(badgeText);
      const roomsLabel = formatRoomsLabel(roomsType);

      const priceMatch = cardInfoHtml.match(/<p>([\s\S]*?)<\/p>/i);
      const priceDigits = priceMatch ? cleanText(priceMatch[1]).replace(/[^\d]/g, '') : '';
      const parsedPrice = priceDigits ? parseInt(priceDigits, 10) : null;
      const price = Number.isFinite(parsedPrice) && parsedPrice > 0 ? parsedPrice : null;
      const priceSqm = price && area ? Math.round(price / area) : null;

      const finishing = finishingMeta.byId.get(String(lotId)) || finishingMeta.fallback;
      const lotUrl = housePath
        ? `${KSSK_BASE_URL}${housePath}?appartModal=${encodeURIComponent(String(lotId))}`
        : null;

      const titleParts = [roomsLabel];
      if (area) titleParts.push(`${area} м²`);
      if (Number.isFinite(floor)) titleParts.push(`${floor} эт.`);

      lots.push({
        id: String(lotId),
        project_slug: projectSlug,
        project_name: projectName,
        title: titleParts.join(', '),
        rooms_label: roomsLabel,
        rooms_type: roomsType,
        area,
        floor: Number.isFinite(floor) ? floor : null,
        flat_number: null,
        address: fullAddress,
        finishing,
        price,
        price_sqm: priceSqm,
        plan_image: planImage,
        lot_url: lotUrl,
        is_available: true,
      });
    }
  }

  return lots;
}

async function fetchKsskPage(url, options = {}) {
  const res = await fetch(url, {
    ...options,
    headers: {
      'Accept-Language': 'ru',
      'User-Agent': 'Mozilla/5.0 (compatible; RealtorMatchCRM/1.0)',
      ...(options.headers || {}),
    },
  });
  if (!res.ok) {
    throw new Error(`Сайт КССК вернул статус ${res.status} (${url})`);
  }
  return res.text();
}

async function syncHouse(house, projectSlug, projectName) {
  const houseUrl = `${KSSK_BASE_URL}${house.path}`;
  const initialHtml = await fetchKsskPage(houseUrl, { method: 'GET' });
  const sections = parseKsskSections(initialHtml);

  const collected = [
    ...parseKsskHouseHtml(initialHtml, {
      projectSlug,
      projectName,
      housePath: house.path,
      houseAddress: house.address,
    }),
  ];

  const inactiveSections = sections.filter((s) => !s.active);
  if (inactiveSections.length > 0) {
    const sectionLotsList = await Promise.all(
      inactiveSections.map(async (sec) => {
        const secHtml = await fetchKsskPage(houseUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
            'X-Requested-With': 'XMLHttpRequest',
          },
          body: new URLSearchParams({ sectionId: sec.id }).toString(),
        });
        return parseKsskHouseHtml(secHtml, {
          projectSlug,
          projectName,
          housePath: house.path,
          houseAddress: house.address,
          sectionLabel: sec.label,
        });
      })
    );
    for (const secLots of sectionLotsList) {
      collected.push(...secLots);
    }
  }

  return collected;
}

export async function syncKsskProject(projectSlug, sql) {
  const projectSpec = KSSK_PROJECTS[projectSlug];
  if (!projectSpec) {
    const err = new Error('Неизвестный проект КССК');
    err.statusCode = 400;
    throw err;
  }

  const houseResults = await Promise.all(
    projectSpec.houses.map((house) => syncHouse(house, projectSlug, projectSpec.projectName))
  );

  const deduped = new Map();
  for (const houseLots of houseResults) {
    for (const lot of houseLots) {
      if (!deduped.has(lot.id)) {
        deduped.set(lot.id, lot);
      }
    }
  }
  const lots = Array.from(deduped.values());

  return ksskRepo.saveProjectLots(sql, {
    projectSlug,
    projectName: projectSpec.projectName,
    totalCount: lots.length,
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

  const auth = await authenticateLotsRequest(req, '[kssk-lots]');
  if (auth.error) {
    return res.status(auth.status).json({ data: null, error: auth.error });
  }
  const { sql } = auth;

  if (req.method === 'GET') {
    const projectSlug = req.query?.projectSlug ? String(req.query.projectSlug).trim() : '';
    if (projectSlug && !Object.prototype.hasOwnProperty.call(KSSK_PROJECTS, projectSlug)) {
      return res.status(400).json({ data: null, error: 'Неизвестный проект КССК' });
    }
    try {
      const data = await ksskRepo.listCachedLots(sql, projectSlug || null, true);
      return res.status(200).json({ data, error: null });
    } catch (err) {
      console.error('[kssk-lots] GET error:', sanitizeKsskError(err));
      return res.status(500).json({ data: null, error: 'Не удалось получить лоты КССК' });
    }
  }

  const body = req.body && typeof req.body === 'object' ? req.body : {};
  const action = body.action || 'list';
  const projectSlug = body.projectSlug ? String(body.projectSlug).trim() : '';

  if (action === 'list') {
    if (projectSlug && !Object.prototype.hasOwnProperty.call(KSSK_PROJECTS, projectSlug)) {
      return res.status(400).json({ data: null, error: 'Неизвестный проект КССК' });
    }
    try {
      const data = await ksskRepo.listCachedLots(sql, projectSlug || null, true);
      return res.status(200).json({ data, error: null });
    } catch (err) {
      console.error('[kssk-lots] list error:', sanitizeKsskError(err));
      return res.status(500).json({ data: null, error: 'Не удалось получить лоты КССК' });
    }
  }

  if (action === 'syncProject') {
    if (!projectSlug || !Object.prototype.hasOwnProperty.call(KSSK_PROJECTS, projectSlug)) {
      return res.status(400).json({ data: null, error: 'Неизвестный проект КССК' });
    }

    try {
      const result = await syncKsskProject(projectSlug, sql);
      return res.status(200).json({ data: result, error: null });
    } catch (err) {
      const safeMsg = sanitizeKsskError(err);
      console.error('[kssk-lots] syncProject error:', safeMsg);
      try {
        await ksskRepo.recordSyncError(sql, projectSlug, KSSK_PROJECTS[projectSlug].projectName, safeMsg);
      } catch (metaErr) {
        console.error('[kssk-lots] Failed to record sync error meta:', metaErr.message);
      }

      const status = err.statusCode || 502;
      return res.status(status).json({ data: null, error: safeMsg });
    }
  }

  return res.status(400).json({ data: null, error: 'Неизвестное действие' });
}
