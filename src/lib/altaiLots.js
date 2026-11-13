/**
 * src/lib/altaiLots.js - Клиентский модуль работы с live-лотами Алтай-Строй
 */

import {
  getAuthHeaders,
  fetchLotsFromEndpoint,
  syncProjectViaEndpoint,
  buildSummaryByProject,
  filterAndSortLots,
} from './liveLotsShared';

export const ALTAI_PROJECT_KEYS = ['dinastiya', 'erdyakova-9', 'oniks'];
export const ALTAI_PROJECT_SLUGS = ALTAI_PROJECT_KEYS;

export const ALTAI_PROJECT_NAMES = {
  dinastiya: 'ЖК Династия',
  'erdyakova-9': 'Дом на ул. Романа Ердякова, 9',
  oniks: 'ЖК Оникс',
};

export const ALTAI_DEVELOPMENT_TO_SLUG = {
  'zhk-dinastiya': 'dinastiya',
  'zhk-erdyakova-9': 'erdyakova-9',
  'zhk-oniks': 'oniks',
  dinastiya: 'dinastiya',
  'erdyakova-9': 'erdyakova-9',
  oniks: 'oniks',
};

export { getAuthHeaders };

/**
 * Возвращает slug проекта Алтай-Строй для карточки ЖК из каталога или null.
 * @param {object | null | undefined} dev
 * @returns {string | null}
 */
export function getAltaiSlugForDevelopment(dev) {
  if (!dev || typeof dev !== 'object') return null;

  if (dev.id && ALTAI_DEVELOPMENT_TO_SLUG[dev.id]) {
    return ALTAI_DEVELOPMENT_TO_SLUG[dev.id];
  }

  const developer = String(dev.developer || '').toLowerCase();
  if (
    !developer.includes('алтай') &&
    !developer.includes('altai') &&
    !developer.includes('смт')
  ) {
    return null;
  }

  const name = String(dev.name || '').toLowerCase();
  if (name.includes('династи')) return 'dinastiya';
  if (name.includes('ердяков')) return 'erdyakova-9';
  if (name.includes('оникс') || name.includes('oniks')) return 'oniks';

  return null;
}

/**
 * Загружает live-лоты Алтай-Строй с сервера.
 * @param {string | object} [projectSlug]
 * @param {object} [options]
 * @returns {Promise<{ projects: Array<object>, lots: Array<object>, configured: boolean }>}
 */
export async function fetchAltaiLots(projectSlug, options = {}) {
  const slug = typeof projectSlug === 'string' ? projectSlug : projectSlug?.projectSlug || '';
  const endpoint = options?.endpoint || (typeof projectSlug === 'object' && projectSlug?.endpoint) || '/api/altai-lots';
  return fetchLotsFromEndpoint(endpoint, slug || undefined, 'лотов Алтай-Строй');
}

/**
 * Запускает синхронизацию проекта Алтай-Строй на сервере.
 * @param {string | object} projectSlug
 * @param {object} [options]
 * @returns {Promise<object | null>}
 */
export async function syncAltaiProject(projectSlug, options = {}) {
  const slug = typeof projectSlug === 'string' ? projectSlug : projectSlug?.projectSlug || '';
  const endpoint = options?.endpoint || (typeof projectSlug === 'object' && projectSlug?.endpoint) || '/api/altai-lots';
  const timeoutMs = options?.timeoutMs || (typeof projectSlug === 'object' && projectSlug?.timeoutMs) || undefined;
  return syncProjectViaEndpoint(endpoint, slug, 'проекта Алтай-Строй', timeoutMs);
}

/**
 * Загружает лоты и возвращает сводную статистику по проекту (или всем проектам).
 * @param {string} [projectSlug]
 * @param {object} [options]
 * @returns {Promise<object | null>}
 */
export async function getAltaiProjectStats(projectSlug, options = {}) {
  const slug = typeof projectSlug === 'string' ? projectSlug : projectSlug?.projectSlug || '';
  const { lots, projects } = await fetchAltaiLots(slug || undefined, options);
  const summary = buildSummaryByProject(lots, projects);
  if (slug) {
    return summary[slug] || null;
  }
  return summary;
}

export const buildAltaiSummaryByProject = buildSummaryByProject;
export const filterAndSortAltaiLots = filterAndSortLots;
