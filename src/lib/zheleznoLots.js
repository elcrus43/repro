/**
 * src/lib/zheleznoLots.js - Клиентский модуль работы с live-лотами девелопера "Железно"
 */

import {
  getAuthHeaders,
  fetchLotsFromEndpoint,
  syncProjectViaEndpoint,
  buildSummaryByProject,
  filterAndSortLots,
} from './liveLotsShared';

export const ZHELEZNO_PROJECT_KEYS = [
  'bulychev',
  'zaryadnoe',
  'znak_kirov',
  'innograd',
];

export const ZHELEZNO_PROJECT_SLUGS = ZHELEZNO_PROJECT_KEYS;

export const ZHELEZNO_PROJECT_NAMES = {
  bulychev: 'Дом «Булычев»',
  zaryadnoe: 'ЖК «Зарядное»',
  znak_kirov: 'ЖК ZNAK',
  innograd: 'ЖК «Инноград»',
};

export const ZHELEZNO_DEVELOPMENT_TO_SLUG = {
  'zhk-bulychev': 'bulychev',
  'dom-bulychev': 'bulychev',
  bulychev: 'bulychev',
  'zhk-zaryadnoe': 'zaryadnoe',
  zaryadnoe: 'zaryadnoe',
  'zhk-znak': 'znak_kirov',
  'zhk-znak-kirov': 'znak_kirov',
  znak_kirov: 'znak_kirov',
  znak: 'znak_kirov',
  'zhk-innograd': 'innograd',
  innograd: 'innograd',
};

export { getAuthHeaders };

/**
 * Возвращает slug проекта Железно для карточки ЖК из каталога или null.
 * @param {object | null | undefined} dev
 * @returns {string | null}
 */
export function getZheleznoSlugForDevelopment(dev) {
  if (!dev || typeof dev !== 'object') return null;

  if (dev.id && ZHELEZNO_DEVELOPMENT_TO_SLUG[dev.id]) {
    return ZHELEZNO_DEVELOPMENT_TO_SLUG[dev.id];
  }

  const developer = String(dev.developer || '').toLowerCase();
  const isZhelezno =
    developer.includes('железно') ||
    developer.includes('zhelezno') ||
    developer.includes('zhcom') ||
    developer.includes('жк знак') ||
    developer.includes('гк железно');

  if (!isZhelezno) {
    return null;
  }

  const name = String(dev.name || '').toLowerCase();
  const address = String(dev.address || '').toLowerCase();

  if (
    name.includes('булычев') ||
    name.includes('bulychev') ||
    address.includes('свободы, 28') ||
    address.includes('свободы 28') ||
    address.includes('панфилова')
  ) {
    return 'bulychev';
  }

  if (
    name.includes('зарядн') ||
    name.includes('zaryadn') ||
    address.includes('пятилетки')
  ) {
    return 'zaryadnoe';
  }

  if (
    name.includes('знак') ||
    name.includes('znak') ||
    address.includes('дорофеева') ||
    address.includes('энтузиастов') ||
    address.includes('козулева')
  ) {
    return 'znak_kirov';
  }

  if (
    name.includes('инноград') ||
    name.includes('innograd') ||
    address.includes('песочная')
  ) {
    return 'innograd';
  }

  return null;
}

/**
 * Загружает live-лоты Железно с сервера.
 * @param {string | object} [projectSlug]
 * @param {object} [options]
 * @returns {Promise<{ projects: Array<object>, lots: Array<object>, configured: boolean }>}
 */
export async function fetchZheleznoLots(projectSlug, options = {}) {
  const slug = typeof projectSlug === 'string' ? projectSlug : projectSlug?.projectSlug || '';
  const endpoint = options?.endpoint || (typeof projectSlug === 'object' && projectSlug?.endpoint) || '/api/developer-lots?provider=zhelezno';
  return fetchLotsFromEndpoint(endpoint, slug || undefined, 'лотов Железно');
}

/**
 * Запускает синхронизацию проекта Железно на сервере.
 * @param {string | object} projectSlug
 * @param {object} [options]
 * @returns {Promise<object | null>}
 */
export async function syncZheleznoProject(projectSlug, options = {}) {
  const slug = typeof projectSlug === 'string' ? projectSlug : projectSlug?.projectSlug || '';
  const endpoint = options?.endpoint || (typeof projectSlug === 'object' && projectSlug?.endpoint) || '/api/developer-lots?provider=zhelezno';
  const timeoutMs = options?.timeoutMs || (typeof projectSlug === 'object' && projectSlug?.timeoutMs) || undefined;
  return syncProjectViaEndpoint(endpoint, slug, 'проекта Железно', timeoutMs);
}

/**
 * Загружает лоты и возвращает сводную статистику по проекту (или всем проектам Железно).
 * @param {string} [projectSlug]
 * @param {object} [options]
 * @returns {Promise<object | null>}
 */
export async function getZheleznoProjectStats(projectSlug, options = {}) {
  const slug = typeof projectSlug === 'string' ? projectSlug : projectSlug?.projectSlug || '';
  const { lots, projects } = await fetchZheleznoLots(slug || undefined, options);
  const summary = buildSummaryByProject(lots, projects);
  if (slug) {
    return summary[slug] || null;
  }
  return summary;
}

export const buildZheleznoSummaryByProject = buildSummaryByProject;
export const filterAndSortZheleznoLots = filterAndSortLots;
