/* global process */
/**
 * api/ksm-lots.js - Vercel Serverless Function
 *
 * Парсер и кэш свободных лотов застройщика КСМ (ksm-kirov.ru/seller).
 *   GET  /api/ksm-lots?projectSlug=...            -> список кэшированных лотов и метаданных из Neon DB
 *   POST /api/ksm-lots { action: 'list', ... }    -> то же самое
 *   POST /api/ksm-lots { action: 'syncProject', projectSlug } -> живая синхронизация выбранного ЖК КСМ
 */

import {
  decodeHtmlEntities,
  cleanText,
  escapeRegExp,
  extractAttrFromTag,
  normalizeRoomsType,
  authenticateLotsRequest,
  createLotsRepository,
} from './_lots-shared.js';

export { normalizeRoomsType };

export const config = {
  maxDuration: 60,
};

export const KSM_PROJECTS = {
  'siti-park': 'Сити Парк',
  'vidnyy': 'Видный',
  'life': 'Лайф',
  'zhk-river-park': 'РИВЕР ПАРК',
  'mkr-ozerki': 'Озерки',
  'zhr-chistye-prudy': 'Чистые пруды',
};

const KSM_BASE_URL = 'https://ksm-kirov.ru';
const KSM_PAGE_SIZE = 9;
const KSM_BATCH_SIZE = 5;

const ksmRepo = createLotsRepository('ksm', KSM_PROJECTS);

function toAbsoluteKsmUrl(rawUrl) {
  const trimmed = decodeHtmlEntities(String(rawUrl || '')).trim();
  if (!trimmed || trimmed.startsWith('data:')) return null;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (trimmed.startsWith('//')) return `https:${trimmed}`;
  return `${KSM_BASE_URL}${trimmed.startsWith('/') ? '' : '/'}${trimmed}`;
}

function findTagWithClass(html, className) {
  const re = new RegExp(`<([a-z0-9]+)\\b[^>]*\\bclass\\s*=\\s*["'][^"']*\\b${escapeRegExp(className)}\\b[^"']*["'][^>]*>`, 'i');
  const match = html.match(re);
  if (!match) return null;
  return { tagName: match[1], openTag: match[0], index: match.index };
}

function extractElementInnerHtmlByClass(html, className) {
  const found = findTagWithClass(html, className);
  if (!found) return null;
  const start = found.index + found.openTag.length;
  const tagRe = new RegExp(`<(\\/)?${escapeRegExp(found.tagName)}\\b[^>]*>`, 'gi');
  tagRe.lastIndex = start;
  let depth = 1;
  let m;
  while ((m = tagRe.exec(html)) !== null) {
    if (m[1]) {
      depth -= 1;
      if (depth === 0) {
        return html.slice(start, m.index);
      }
    } else if (!m[0].endsWith('/>')) {
      depth += 1;
    }
  }
  return html.slice(start);
}

function splitCardBlocks(html) {
  const startRe = /<li\b[^>]*\bclass\s*=\s*["'][^"']*\blayout-card\b[^"']*\bcatalog-grid__item\b[^"']*["'][^>]*>/gi;
  const blocks = [];
  let match;
  while ((match = startRe.exec(html)) !== null) {
    const start = match.index + match[0].length;
    const liRe = /<(\/)?li\b[^>]*>/gi;
    liRe.lastIndex = start;
    let depth = 1;
    let end = html.length;
    let liMatch;
    while ((liMatch = liRe.exec(html)) !== null) {
      if (liMatch[1]) {
        depth -= 1;
        if (depth === 0) {
          end = liMatch.index;
          break;
        }
      } else {
        depth += 1;
      }
    }
    blocks.push(html.slice(start, end));
  }
  return blocks;
}

/**
 * Извлекает общее число лотов из кнопки пагинации ("Показать еще N из M").
 * @param {string} html
 * @returns {number | null}
 */
export function parseTotalCount(html) {
  const text = cleanText(html);
  const match = text.match(/Показать\s+ещ[её]\s+\d+\s+из\s+(\d+)/i);
  if (!match) return null;
  const count = parseInt(match[1], 10);
  return Number.isFinite(count) ? count : null;
}

function parseCardInfoItems(cardHtml) {
  const info = {
    projectName: null,
    finishing: null,
    address: null,
    floor: null,
    flatNumber: null,
  };

  const itemRe = /<li\b[^>]*\bclass\s*=\s*["'][^"']*\blayout-card__info-item\b[^"']*["'][^>]*>([\s\S]*?)<\/li>/gi;
  let itemMatch;
  while ((itemMatch = itemRe.exec(cardHtml)) !== null) {
    const inner = itemMatch[1];
    const parts = decodeHtmlEntities(inner)
      .replace(/<[^>]+>/g, '\n')
      .split('\n')
      .map((line) => line.replace(/[\u00a0\u202f]/g, ' ').replace(/\s+/g, ' ').trim())
      .filter(Boolean);

    let key = '';
    let value = '';
    if (parts.length >= 2) {
      key = parts[0].replace(/:$/, '').trim().toLowerCase();
      value = parts.slice(1).join(' ').trim();
    } else if (parts.length === 1 && parts[0].includes(':')) {
      const idx = parts[0].indexOf(':');
      key = parts[0].slice(0, idx).trim().toLowerCase();
      value = parts[0].slice(idx + 1).trim();
    }

    if (!key || !value) continue;
    if (key.includes('проект')) {
      info.projectName = value;
    } else if (key.includes('отделк')) {
      info.finishing = value;
    } else if (key.includes('адрес')) {
      info.address = value;
    } else if (key.includes('этаж')) {
      const floorNum = parseInt(value, 10);
      info.floor = Number.isFinite(floorNum) ? floorNum : null;
    } else if (key.includes('номер')) {
      info.flatNumber = value;
    }
  }

  return info;
}

function extractPlanImage(cardHtml) {
  const pictureInner =
    extractElementInnerHtmlByClass(cardHtml, 'layout-card__picture') || cardHtml;

  const imgMatch = pictureInner.match(/<img\b[^>]*>/i);
  if (imgMatch) {
    const src = extractAttrFromTag(imgMatch[0], 'src');
    const abs = toAbsoluteKsmUrl(src);
    if (abs) return abs;
  }

  const sourceMatch = pictureInner.match(/<source\b[^>]*>/i);
  if (sourceMatch) {
    const srcset = extractAttrFromTag(sourceMatch[0], 'srcset');
    if (srcset) {
      const firstCandidate = srcset.split(',')[0].trim().split(/\s+/)[0];
      const abs = toAbsoluteKsmUrl(firstCandidate);
      if (abs) return abs;
    }
  }

  return null;
}

function extractLotUrl(cardHtml) {
  const titleTag = findTagWithClass(cardHtml, 'layout-card__title');
  if (titleTag) {
    const href = extractAttrFromTag(titleTag.openTag, 'href');
    const abs = toAbsoluteKsmUrl(href);
    if (abs) return abs;
  }

  const imageWrapTag = findTagWithClass(cardHtml, 'layout-card__image-wrap');
  if (imageWrapTag) {
    const href = extractAttrFromTag(imageWrapTag.openTag, 'href');
    const abs = toAbsoluteKsmUrl(href);
    if (abs) return abs;
  }

  return null;
}

function extractTitle(cardHtml) {
  const imageWrapTag = findTagWithClass(cardHtml, 'layout-card__image-wrap');
  if (imageWrapTag) {
    const titleAttr = extractAttrFromTag(imageWrapTag.openTag, 'title');
    if (titleAttr && titleAttr.trim()) {
      return cleanText(titleAttr);
    }
  }

  const titleTextHtml = extractElementInnerHtmlByClass(cardHtml, 'layout-card__title-text');
  if (titleTextHtml) {
    const text = cleanText(titleTextHtml);
    if (text) return text;
  }

  const titleHtml = extractElementInnerHtmlByClass(cardHtml, 'layout-card__title');
  if (titleHtml) {
    const text = cleanText(titleHtml);
    if (text) return text;
  }

  return '';
}

/**
 * Разбирает HTML страницы каталога квартир КСМ в массив структурированных лотов.
 * @param {string} html
 * @param {string} fallbackProjectSlug
 * @returns {Array<object>}
 */
export function parseApartmentsPageHtml(html, fallbackProjectSlug = '') {
  if (!html || typeof html !== 'string') return [];

  const blocks = splitCardBlocks(html);
  const lots = [];

  for (const cardHtml of blocks) {
    const idMatch = cardHtml.match(/(?:favorites\/add|create_with_apartment)\/(\d+)/i);
    if (!idMatch) continue;
    const id = idMatch[1];

    const title = extractTitle(cardHtml);
    const areaMatch = title.match(/(\d+(?:[.,]\d+)?)\s*(?:м²|м2|кв\.?\s*м)/i);
    const area = areaMatch ? parseFloat(areaMatch[1].replace(',', '.')) : null;
    const validArea = Number.isFinite(area) ? area : null;

    const strippedTitle = title
      .replace(/(?:,\s*|\s+)\d+(?:[.,]\d+)?\s*(?:м²|м2|кв\.?\s*м).*$/i, '')
      .trim();
    const roomsLabel = strippedTitle || title || null;
    const roomsType = normalizeRoomsType(roomsLabel || title);

    const priceInner = extractElementInnerHtmlByClass(cardHtml, 'layout-card__price');
    const priceDigits = priceInner ? cleanText(priceInner).replace(/[^\d]/g, '') : '';
    const parsedPrice = priceDigits ? parseInt(priceDigits, 10) : null;
    const price = Number.isFinite(parsedPrice) && parsedPrice > 0 ? parsedPrice : null;
    const priceSqm = price && validArea ? Math.round(price / validArea) : null;

    const info = parseCardInfoItems(cardHtml);
    const projectSlug = fallbackProjectSlug || '';
    const projectName = KSM_PROJECTS[projectSlug] || info.projectName || projectSlug;

    lots.push({
      id,
      project_slug: projectSlug,
      project_name: projectName,
      title: title || roomsLabel || `Квартира #${id}`,
      rooms_label: roomsLabel,
      rooms_type: roomsType,
      area: validArea,
      floor: info.floor,
      flat_number: info.flatNumber,
      address: info.address,
      finishing: info.finishing,
      price,
      price_sqm: priceSqm,
      plan_image: extractPlanImage(cardHtml),
      lot_url: extractLotUrl(cardHtml),
      is_available: true,
    });
  }

  return lots;
}

export async function ensureKsmTables(sql) {
  return ksmRepo.ensureTables(sql);
}

function createCookieJar() {
  const cookies = new Map();

  function collect(response) {
    const rawList =
      typeof response.headers.getSetCookie === 'function'
        ? response.headers.getSetCookie()
        : (response.headers.get('set-cookie') ? [response.headers.get('set-cookie')] : []);

    for (const raw of rawList) {
      if (!raw) continue;
      const pair = raw.split(';')[0];
      const eqIdx = pair.indexOf('=');
      if (eqIdx <= 0) continue;
      const name = pair.slice(0, eqIdx).trim();
      const value = pair.slice(eqIdx + 1).trim();
      if (name) {
        cookies.set(name, value);
      }
    }
  }

  function toHeader() {
    return Array.from(cookies.entries())
      .map(([k, v]) => `${k}=${v}`)
      .join('; ');
  }

  return { collect, toHeader };
}

function sanitizeKsmError(err) {
  let msg = String(err?.message || 'Ошибка синхронизации с сайтом КСМ');
  const phone = process.env.KSM_PHONE;
  const password = process.env.KSM_PASSWORD;
  if (phone) msg = msg.split(phone).join('***');
  if (password) msg = msg.split(password).join('***');
  msg = msg.replace(/PHPSESSID=[^;\s]+/gi, 'PHPSESSID=***');
  return msg;
}

async function ksmFetch(url, jar, options = {}) {
  const headers = {
    'Accept-Language': 'ru',
    'User-Agent': 'Mozilla/5.0 (compatible; RealtorMatchCRM/1.0)',
    ...(options.headers || {}),
  };
  const cookieHeader = jar.toHeader();
  if (cookieHeader) {
    headers.Cookie = cookieHeader;
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });
  jar.collect(response);
  return response;
}

export async function syncKsmProject(projectSlug, sql) {
  if (!Object.prototype.hasOwnProperty.call(KSM_PROJECTS, projectSlug)) {
    const err = new Error('Неизвестный проект КСМ');
    err.statusCode = 400;
    throw err;
  }

  const phone = process.env.KSM_PHONE;
  const password = process.env.KSM_PASSWORD;
  if (!phone || !password) {
    const err = new Error('Учетные данные КСМ (KSM_PHONE, KSM_PASSWORD) не настроены на сервере');
    err.statusCode = 500;
    throw err;
  }

  const projectName = KSM_PROJECTS[projectSlug];
  const jar = createCookieJar();

  // 1. Получаем стартовую сессию
  const loginPageRes = await ksmFetch(`${KSM_BASE_URL}/seller/auth/login/agent`, jar, {
    method: 'GET',
    redirect: 'manual',
  });
  if (loginPageRes.status >= 400) {
    throw new Error(`Страница входа КСМ вернула статус ${loginPageRes.status}`);
  }

  // 2. Авторизация агента
  const formBody = new URLSearchParams({
    'PhoneLoginProfileForm[phone]': phone,
    'PhoneLoginProfileForm[password]': password,
  }).toString();

  const loginPostRes = await ksmFetch(`${KSM_BASE_URL}/seller/auth/login/agent`, jar, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: formBody,
    redirect: 'manual',
  });

  const loginLocation = loginPostRes.headers.get('location') || '';
  if (loginPostRes.status !== 302 || loginLocation.includes('/auth/login')) {
    throw new Error('Ошибка авторизации в личном кабинете КСМ');
  }

  // 3. Переключаем активный ЖК в PHPSESSID-сессии
  const projectRes = await ksmFetch(`${KSM_BASE_URL}/seller/projects/${encodeURIComponent(projectSlug)}`, jar, {
    method: 'GET',
  });
  if (!projectRes.ok || (projectRes.url && projectRes.url.includes('/auth/login'))) {
    throw new Error(`Не удалось выбрать проект ${projectName} в кабинете КСМ`);
  }

  // 4. Загружаем 1-ю страницу каталога лотов
  const page1Res = await ksmFetch(`${KSM_BASE_URL}/seller/project/apartments?Pagination_1=1`, jar, {
    method: 'GET',
  });
  if (!page1Res.ok || (page1Res.url && page1Res.url.includes('/auth/login'))) {
    throw new Error(`Не удалось загрузить каталог квартир проекта ${projectName}`);
  }
  const page1Html = await page1Res.text();
  const totalCount = parseTotalCount(page1Html);
  const page1Lots = parseApartmentsPageHtml(page1Html, projectSlug);
  const totalPages = totalCount ? Math.max(1, Math.ceil(totalCount / KSM_PAGE_SIZE)) : 1;

  const allParsed = [...page1Lots];

  // 5. Загружаем страницы 2..totalPages батчами по 5
  const pageNumbers = [];
  for (let p = 2; p <= totalPages; p += 1) {
    pageNumbers.push(p);
  }

  for (let i = 0; i < pageNumbers.length; i += KSM_BATCH_SIZE) {
    const batch = pageNumbers.slice(i, i + KSM_BATCH_SIZE);
    const batchLots = await Promise.all(
      batch.map(async (pageNum) => {
        const res = await ksmFetch(
          `${KSM_BASE_URL}/seller/project/apartments?Pagination_1=${pageNum}`,
          jar,
          { method: 'GET' }
        );
        if (!res.ok || (res.url && res.url.includes('/auth/login'))) {
          throw new Error(`Ошибка загрузки страницы ${pageNum} проекта ${projectName}`);
        }
        const html = await res.text();
        return parseApartmentsPageHtml(html, projectSlug);
      })
    );
    for (const pageLots of batchLots) {
      allParsed.push(...pageLots);
    }
  }

  // 6. Дедупликация по id + guardrail
  const dedupedMap = new Map();
  for (const lot of allParsed) {
    if (!dedupedMap.has(lot.id)) {
      dedupedMap.set(lot.id, lot);
    }
  }
  const lots = Array.from(dedupedMap.values());

  if (totalCount && totalCount > 0 && lots.length === 0) {
    throw new Error(`Парсер не обнаружил лоты для проекта ${projectName} (ожидалось ${totalCount})`);
  }

  // 7. Сохраняем в Neon DB
  return ksmRepo.saveProjectLots(sql, {
    projectSlug,
    projectName,
    totalCount,
    lots,
  });
}

async function listCachedLots(sql, projectSlug) {
  const configured = Boolean(process.env.KSM_PHONE && process.env.KSM_PASSWORD);
  return ksmRepo.listCachedLots(sql, projectSlug, configured);
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

  const auth = await authenticateLotsRequest(req, '[ksm-lots]');
  if (auth.error) {
    return res.status(auth.status).json({ data: null, error: auth.error });
  }
  const { sql } = auth;

  if (req.method === 'GET') {
    const projectSlug = req.query?.projectSlug ? String(req.query.projectSlug).trim() : '';
    if (projectSlug && !Object.prototype.hasOwnProperty.call(KSM_PROJECTS, projectSlug)) {
      return res.status(400).json({ data: null, error: 'Неизвестный проект КСМ' });
    }
    try {
      const data = await listCachedLots(sql, projectSlug || null);
      return res.status(200).json({ data, error: null });
    } catch (err) {
      console.error('[ksm-lots] GET error:', sanitizeKsmError(err));
      return res.status(500).json({ data: null, error: 'Не удалось получить лоты КСМ' });
    }
  }

  const body = req.body && typeof req.body === 'object' ? req.body : {};
  const action = body.action || 'list';
  const projectSlug = body.projectSlug ? String(body.projectSlug).trim() : '';

  if (action === 'list') {
    if (projectSlug && !Object.prototype.hasOwnProperty.call(KSM_PROJECTS, projectSlug)) {
      return res.status(400).json({ data: null, error: 'Неизвестный проект КСМ' });
    }
    try {
      const data = await listCachedLots(sql, projectSlug || null);
      return res.status(200).json({ data, error: null });
    } catch (err) {
      console.error('[ksm-lots] list error:', sanitizeKsmError(err));
      return res.status(500).json({ data: null, error: 'Не удалось получить лоты КСМ' });
    }
  }

  if (action === 'syncProject') {
    if (!projectSlug || !Object.prototype.hasOwnProperty.call(KSM_PROJECTS, projectSlug)) {
      return res.status(400).json({ data: null, error: 'Неизвестный проект КСМ' });
    }
    if (!process.env.KSM_PHONE || !process.env.KSM_PASSWORD) {
      return res.status(500).json({
        data: null,
        error: 'Учетные данные КСМ (KSM_PHONE, KSM_PASSWORD) не настроены на сервере',
      });
    }

    try {
      const result = await syncKsmProject(projectSlug, sql);
      return res.status(200).json({ data: result, error: null });
    } catch (err) {
      const safeMsg = sanitizeKsmError(err);
      console.error('[ksm-lots] syncProject error:', safeMsg);
      try {
        await ksmRepo.recordSyncError(sql, projectSlug, KSM_PROJECTS[projectSlug], safeMsg);
      } catch (metaErr) {
        console.error('[ksm-lots] Failed to record sync error meta:', metaErr.message);
      }

      const status = err.statusCode || 502;
      return res.status(status).json({ data: null, error: safeMsg });
    }
  }

  return res.status(400).json({ data: null, error: 'Неизвестное действие' });
}
