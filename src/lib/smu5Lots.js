/**
 * src/lib/smu5Lots.js - Клиентский модуль работы с live-лотами СМУ-5
 */

import {
  getAuthHeaders,
  fetchLotsFromEndpoint,
  syncProjectViaEndpoint,
  buildSummaryByProject,
  filterAndSortLots,
} from './liveLotsShared';

export const SMU5_PROJECT_KEYS = [
  'mayak',
  'sovremennik',
  'rudnitskogo',
];

export const SMU5_PROJECT_SLUGS = SMU5_PROJECT_KEYS;

export const SMU5_PROJECT_NAMES = {
  mayak: 'Дом «Маяк»',
  sovremennik: 'Дом «Современник»',
  rudnitskogo: 'Клубный дом на Рудницкого',
};

export const SMU5_DEVELOPMENT_TO_SLUG = {
  'zhk-mayak': 'mayak',
  'zhk-maiak': 'mayak',
  'dom-mayak': 'mayak',
  'dom-maiak': 'mayak',
  mayak: 'mayak',
  'zhk-sovremennik': 'sovremennik',
  'dom-sovremennik': 'sovremennik',
  sovremennik: 'sovremennik',
  'zhk-rudnitskogo-32': 'rudnitskogo',
  'zhk-rudnitskogo': 'rudnitskogo',
  'dom-na-rudnitskogo': 'rudnitskogo',
  'klubnyi-dom-na-rudnitskogo': 'rudnitskogo',
  rudnitskogo: 'rudnitskogo',
};

export { getAuthHeaders };

/**
 * Возвращает slug проекта СМУ-5 для карточки ЖК из каталога или null.
 * @param {object | null | undefined} dev
 * @returns {string | null}
 */
export function getSmu5SlugForDevelopment(dev) {
  if (!dev || typeof dev !== 'object') return null;

  if (dev.id && SMU5_DEVELOPMENT_TO_SLUG[dev.id]) {
    return SMU5_DEVELOPMENT_TO_SLUG[dev.id];
  }

  const developer = String(dev.developer || '').toLowerCase();
  const isSmu5 =
    developer.includes('сму-5') ||
    developer.includes('сму 5') ||
    developer.includes('сму5') ||
    developer.includes('smu-5') ||
    developer.includes('smu5');

  if (!isSmu5) {
    return null;
  }

  const name = String(dev.name || '').toLowerCase();
  const address = String(dev.address || '').toLowerCase();

  if (
    name.includes('маяк') ||
    name.includes('mayak') ||
    name.includes('maiak') ||
    address.includes('молодой гвардии') ||
    address.includes('м. гвардии') ||
    address.includes('м.гвардии')
  ) {
    return 'mayak';
  }

  if (
    name.includes('современник') ||
    name.includes('sovremennik') ||
    address.includes('хлыновская')
  ) {
    return 'sovremennik';
  }

  if (
    name.includes('рудницк') ||
    name.includes('rudnitsk') ||
    address.includes('рудницк')
  ) {
    return 'rudnitskogo';
  }

  return null;
}

/**
 * Загружает live-лоты СМУ-5 с сервера.
 * @param {string | object} [projectSlug]
 * @param {object} [options]
 * @returns {Promise<{ projects: Array<object>, lots: Array<object>, configured: boolean }>}
 */
export async function fetchSmu5Lots(projectSlug, options = {}) {
  const slug = typeof projectSlug === 'string' ? projectSlug : projectSlug?.projectSlug || '';
  const endpoint = options?.endpoint || (typeof projectSlug === 'object' && projectSlug?.endpoint) || '/api/developer-lots?provider=smu5';
  return fetchLotsFromEndpoint(endpoint, slug || undefined, 'лотов СМУ-5');
}

/**
 * Запускает синхронизацию проекта СМУ-5 на сервере.
 * @param {string | object} projectSlug
 * @param {object} [options]
 * @returns {Promise<object | null>}
 */
export async function syncSmu5Project(projectSlug, options = {}) {
  const slug = typeof projectSlug === 'string' ? projectSlug : projectSlug?.projectSlug || '';
  const endpoint = options?.endpoint || (typeof projectSlug === 'object' && projectSlug?.endpoint) || '/api/developer-lots?provider=smu5';
  const timeoutMs = options?.timeoutMs || (typeof projectSlug === 'object' && projectSlug?.timeoutMs) || undefined;
  return syncProjectViaEndpoint(endpoint, slug, 'проекта СМУ-5', timeoutMs);
}

/**
 * Загружает лоты и возвращает сводную статистику по проекту (или всем проектам СМУ-5).
 * @param {string} [projectSlug]
 * @param {object} [options]
 * @returns {Promise<object | null>}
 */
export async function getSmu5ProjectStats(projectSlug, options = {}) {
  const slug = typeof projectSlug === 'string' ? projectSlug : projectSlug?.projectSlug || '';
  const { lots, projects } = await fetchSmu5Lots(slug || undefined, options);
  const summary = buildSummaryByProject(lots, projects);
  if (slug) {
    return summary[slug] || null;
  }
  return summary;
}

export const buildSmu5SummaryByProject = buildSummaryByProject;
export const filterAndSortSmu5Lots = filterAndSortLots;
