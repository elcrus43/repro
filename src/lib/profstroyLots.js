/**
 * src/lib/profstroyLots.js - Клиентский модуль работы с live-лотами Профстрой Недвижимость
 */

import {
  getAuthHeaders,
  fetchLotsFromEndpoint,
  syncProjectViaEndpoint,
  buildSummaryByProject,
  filterAndSortLots,
} from './liveLotsShared';

export const PROFSTROY_PROJECT_KEYS = [
  'kapital',
  'vdohnovenie',
  'murashinskiy-7',
  'garmoniya',
  'metropolis',
];

export const PROFSTROY_PROJECT_SLUGS = PROFSTROY_PROJECT_KEYS;

export const PROFSTROY_PROJECT_NAMES = {
  kapital: 'Клубный дом «Капитал»',
  vdohnovenie: 'ЖК «Вдохновение»',
  'murashinskiy-7': 'Дом на Мурашинском 7',
  garmoniya: 'ЖК «Гармония»',
  metropolis: 'ЖК «Метрополис»',
};

export const PROFSTROY_DEVELOPMENT_TO_SLUG = {
  'zhk-kapital': 'kapital',
  kapital: 'kapital',
  'zhk-vdohnovenie': 'vdohnovenie',
  vdohnovenie: 'vdohnovenie',
  'zhk-murashinskiy-7': 'murashinskiy-7',
  'murashinskiy-7': 'murashinskiy-7',
  'zhk-garmoniya': 'garmoniya',
  garmoniya: 'garmoniya',
  'zhk-metropolis': 'metropolis',
  metropolis: 'metropolis',
};

export { getAuthHeaders };

/**
 * Возвращает slug проекта Профстрой для карточки ЖК из каталога или null.
 * @param {object | null | undefined} dev
 * @returns {string | null}
 */
export function getProfstroySlugForDevelopment(dev) {
  if (!dev || typeof dev !== 'object') return null;

  if (dev.id && PROFSTROY_DEVELOPMENT_TO_SLUG[dev.id]) {
    return PROFSTROY_DEVELOPMENT_TO_SLUG[dev.id];
  }

  const developer = String(dev.developer || '').toLowerCase();
  const isProfstroy =
    developer.includes('профстрой') ||
    developer.includes('проф-строй') ||
    developer.includes('profstroy') ||
    developer.includes('проф строй');

  if (!isProfstroy) {
    return null;
  }

  const name = String(dev.name || '').toLowerCase();
  const address = String(dev.address || '').toLowerCase();

  if (
    name.includes('капитал') ||
    name.includes('kapital') ||
    address.includes('орловская') ||
    address.includes('владимирская')
  ) {
    return 'kapital';
  }
  if (
    name.includes('вдохновен') ||
    name.includes('vdohnov') ||
    address.includes('энтузиастов')
  ) {
    return 'vdohnovenie';
  }
  if (name.includes('мурашин') || address.includes('мурашин')) {
    return 'murashinskiy-7';
  }
  if (name.includes('гармони') || name.includes('garmoni') || address.includes('ленина')) {
    return 'garmoniya';
  }
  if (name.includes('метрополис') || name.includes('metropolis') || address.includes('воровского')) {
    return 'metropolis';
  }

  return null;
}

/**
 * Загружает live-лоты Профстрой с сервера.
 * @param {string | object} [projectSlug]
 * @param {object} [options]
 * @returns {Promise<{ projects: Array<object>, lots: Array<object>, configured: boolean }>}
 */
export async function fetchProfstroyLots(projectSlug, options = {}) {
  const slug = typeof projectSlug === 'string' ? projectSlug : projectSlug?.projectSlug || '';
  const endpoint = options?.endpoint || (typeof projectSlug === 'object' && projectSlug?.endpoint) || '/api/profstroy-lots';
  return fetchLotsFromEndpoint(endpoint, slug || undefined, 'лотов Профстрой');
}

/**
 * Запускает синхронизацию проекта Профстрой на сервере.
 * @param {string | object} projectSlug
 * @param {object} [options]
 * @returns {Promise<object | null>}
 */
export async function syncProfstroyProject(projectSlug, options = {}) {
  const slug = typeof projectSlug === 'string' ? projectSlug : projectSlug?.projectSlug || '';
  const endpoint = options?.endpoint || (typeof projectSlug === 'object' && projectSlug?.endpoint) || '/api/profstroy-lots';
  const timeoutMs = options?.timeoutMs || (typeof projectSlug === 'object' && projectSlug?.timeoutMs) || undefined;
  return syncProjectViaEndpoint(endpoint, slug, 'проекта Профстрой', timeoutMs);
}

/**
 * Загружает лоты и возвращает сводную статистику по проекту (или всем проектам).
 * @param {string} [projectSlug]
 * @param {object} [options]
 * @returns {Promise<object | null>}
 */
export async function getProfstroyProjectStats(projectSlug, options = {}) {
  const slug = typeof projectSlug === 'string' ? projectSlug : projectSlug?.projectSlug || '';
  const { lots, projects } = await fetchProfstroyLots(slug || undefined, options);
  const summary = buildSummaryByProject(lots, projects);
  if (slug) {
    return summary[slug] || null;
  }
  return summary;
}

export const buildProfstroySummaryByProject = buildSummaryByProject;
export const filterAndSortProfstroyLots = filterAndSortLots;
