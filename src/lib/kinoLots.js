/**
 * src/lib/kinoLots.js - Клиентский модуль работы с live-лотами КИНО девелопмент
 */

import {
  getAuthHeaders,
  fetchLotsFromEndpoint,
  syncProjectViaEndpoint,
  buildSummaryByProject,
  filterAndSortLots,
} from './liveLotsShared';

export const KINO_PROJECT_KEYS = ['fusion', 'iuterra', 'gorkogo-2a'];
export const KINO_PROJECT_SLUGS = KINO_PROJECT_KEYS;

export const KINO_PROJECT_NAMES = {
  fusion: 'ЖК Fusion (Фьюжн)',
  iuterra: 'ЖК Ютерра',
  'gorkogo-2a': 'Дом на Горького, 2А',
};

export const KINO_DEVELOPMENT_TO_SLUG = {
  'zhk-fusion-kino': 'fusion',
  'zhk-yuterra': 'iuterra',
  'zhk-gorkogo-2a': 'gorkogo-2a',
  fusion: 'fusion',
  iuterra: 'iuterra',
  'gorkogo-2a': 'gorkogo-2a',
};

export { getAuthHeaders };

/**
 * Возвращает slug проекта КИНО для карточки ЖК из каталога или null.
 * @param {object | null | undefined} dev
 * @returns {string | null}
 */
export function getKinoSlugForDevelopment(dev) {
  if (!dev || typeof dev !== 'object') return null;

  if (dev.id && KINO_DEVELOPMENT_TO_SLUG[dev.id]) {
    return KINO_DEVELOPMENT_TO_SLUG[dev.id];
  }

  const developer = String(dev.developer || '').toLowerCase();
  if (!developer.includes('кино') && !developer.includes('kino')) {
    return null;
  }

  const name = String(dev.name || '').toLowerCase();
  if (name.includes('fusion') || name.includes('фьюжн')) return 'fusion';
  if (name.includes('ютерр') || name.includes('yuterra') || name.includes('iuterra')) return 'iuterra';
  if (name.includes('горького') || name.includes('gorkogo')) return 'gorkogo-2a';

  return null;
}

/**
 * Загружает live-лоты КИНО девелопмент с сервера.
 * @param {string | object} [projectSlug]
 * @param {object} [options]
 * @returns {Promise<{ projects: Array<object>, lots: Array<object>, configured: boolean }>}
 */
export async function fetchKinoLots(projectSlug, options = {}) {
  const slug = typeof projectSlug === 'string' ? projectSlug : projectSlug?.projectSlug || '';
  const endpoint = options?.endpoint || (typeof projectSlug === 'object' && projectSlug?.endpoint) || '/api/kino-lots';
  return fetchLotsFromEndpoint(endpoint, slug || undefined, 'лотов КИНО');
}

/**
 * Запускает синхронизацию проекта КИНО девелопмент на сервере.
 * @param {string | object} projectSlug
 * @param {object} [options]
 * @returns {Promise<object | null>}
 */
export async function syncKinoProject(projectSlug, options = {}) {
  const slug = typeof projectSlug === 'string' ? projectSlug : projectSlug?.projectSlug || '';
  const endpoint = options?.endpoint || (typeof projectSlug === 'object' && projectSlug?.endpoint) || '/api/kino-lots';
  const timeoutMs = options?.timeoutMs || (typeof projectSlug === 'object' && projectSlug?.timeoutMs) || undefined;
  return syncProjectViaEndpoint(endpoint, slug, 'проекта КИНО', timeoutMs);
}

/**
 * Загружает лоты и возвращает сводную статистику по проекту (или всем проектам).
 * @param {string} [projectSlug]
 * @param {object} [options]
 * @returns {Promise<object | null>}
 */
export async function getKinoProjectStats(projectSlug, options = {}) {
  const slug = typeof projectSlug === 'string' ? projectSlug : projectSlug?.projectSlug || '';
  const { lots, projects } = await fetchKinoLots(slug || undefined, options);
  const summary = buildSummaryByProject(lots, projects);
  if (slug) {
    return summary[slug] || null;
  }
  return summary;
}

export const buildKinoSummaryByProject = buildSummaryByProject;
export const filterAndSortKinoLots = filterAndSortLots;
