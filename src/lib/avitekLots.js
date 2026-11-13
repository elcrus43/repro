/**
 * src/lib/avitekLots.js - Клиентский модуль работы с live-лотами УКС АВИТЕК
 */

import {
  getAuthHeaders,
  fetchLotsFromEndpoint,
  syncProjectViaEndpoint,
  buildSummaryByProject,
  filterAndSortLots,
} from './liveLotsShared';

export const AVITEK_PROJECT_KEYS = ['krylya', 'sovetskaya-75', 'erdyakova-19a'];
export const AVITEK_PROJECT_SLUGS = AVITEK_PROJECT_KEYS;

export const AVITEK_PROJECT_NAMES = {
  krylya: 'ЖК Крылья на Попова, 5-7',
  'sovetskaya-75': 'Дом на ул. Советская, 75',
  'erdyakova-19a': 'Дом на ул. Романа Ердякова, 19а',
};

export const AVITEK_DEVELOPMENT_TO_SLUG = {
  'zhk-krylya': 'krylya',
  'zhk-sovetskaya-75': 'sovetskaya-75',
  'zhk-erdyakova-19a': 'erdyakova-19a',
  krylya: 'krylya',
  'sovetskaya-75': 'sovetskaya-75',
  'erdyakova-19a': 'erdyakova-19a',
};

export { getAuthHeaders };

/**
 * Возвращает slug проекта АВИТЕК для карточки ЖК из каталога или null.
 * @param {object | null | undefined} dev
 * @returns {string | null}
 */
export function getAvitekSlugForDevelopment(dev) {
  if (!dev || typeof dev !== 'object') return null;

  if (dev.id && AVITEK_DEVELOPMENT_TO_SLUG[dev.id]) {
    return AVITEK_DEVELOPMENT_TO_SLUG[dev.id];
  }

  const developer = String(dev.developer || '').toLowerCase();
  if (!developer.includes('авитек') && !developer.includes('avitek') && !developer.includes('укс')) {
    return null;
  }

  const name = String(dev.name || '').toLowerCase();
  if (name.includes('крыл') || name.includes('попова')) return 'krylya';
  if (name.includes('советск')) return 'sovetskaya-75';
  if (name.includes('ердяков') || name.includes('19а')) return 'erdyakova-19a';

  return null;
}

/**
 * Загружает live-лоты УКС АВИТЕК с сервера.
 * @param {string | object} [projectSlug]
 * @param {object} [options]
 * @returns {Promise<{ projects: Array<object>, lots: Array<object>, configured: boolean }>}
 */
export async function fetchAvitekLots(projectSlug, options = {}) {
  const slug = typeof projectSlug === 'string' ? projectSlug : projectSlug?.projectSlug || '';
  const endpoint = options?.endpoint || (typeof projectSlug === 'object' && projectSlug?.endpoint) || '/api/avitek-lots';
  return fetchLotsFromEndpoint(endpoint, slug || undefined, 'лотов УКС АВИТЕК');
}

/**
 * Запускает синхронизацию проекта УКС АВИТЕК на сервере.
 * @param {string | object} projectSlug
 * @param {object} [options]
 * @returns {Promise<object | null>}
 */
export async function syncAvitekProject(projectSlug, options = {}) {
  const slug = typeof projectSlug === 'string' ? projectSlug : projectSlug?.projectSlug || '';
  const endpoint = options?.endpoint || (typeof projectSlug === 'object' && projectSlug?.endpoint) || '/api/avitek-lots';
  const timeoutMs = options?.timeoutMs || (typeof projectSlug === 'object' && projectSlug?.timeoutMs) || undefined;
  return syncProjectViaEndpoint(endpoint, slug, 'проекта УКС АВИТЕК', timeoutMs);
}

/**
 * Загружает лоты и возвращает сводную статистику по проекту (или всем проектам).
 * @param {string} [projectSlug]
 * @param {object} [options]
 * @returns {Promise<object | null>}
 */
export async function getAvitekProjectStats(projectSlug, options = {}) {
  const slug = typeof projectSlug === 'string' ? projectSlug : projectSlug?.projectSlug || '';
  const { lots, projects } = await fetchAvitekLots(slug || undefined, options);
  const summary = buildSummaryByProject(lots, projects);
  if (slug) {
    return summary[slug] || null;
  }
  return summary;
}

export const buildAvitekSummaryByProject = buildSummaryByProject;
export const filterAndSortAvitekLots = filterAndSortLots;
