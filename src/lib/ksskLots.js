/**
 * src/lib/ksskLots.js - Клиентский модуль работы с live-лотами Кировский ССК (kvartiry.kssk.ru)
 */

import {
  getAuthHeaders,
  fetchLotsFromEndpoint,
  syncProjectViaEndpoint,
  buildSummaryByProject,
  filterAndSortLots,
} from './liveLotsShared';

export const KSSK_PROJECT_SLUGS = [
  'zhk-skandinaviya',
  'zhk-metro',
  'zhk-sloboda',
  'zhk-x2',
  'zhk-dom-u-reki',
  'zhk-pushkina',
];

export const KSSK_PROJECT_NAMES = {
  'zhk-skandinaviya': 'ЖК Скандинавия',
  'zhk-metro': 'ЖК Метро',
  'zhk-sloboda': 'ЖК Слобода',
  'zhk-x2': 'ЖК Х2',
  'zhk-dom-u-reki': 'ЖК Дом у реки',
  'zhk-pushkina': 'ЖК Пушкина',
};

export const KSSK_DEVELOPMENT_TO_SLUG = {
  'zhk-skandinaviya': 'zhk-skandinaviya',
  'zhk-metro': 'zhk-metro',
  'zhk-sloboda': 'zhk-sloboda',
  'zhk-x2': 'zhk-x2',
  'zhk-dom-u-reki': 'zhk-dom-u-reki',
  'zhk-pushkina': 'zhk-pushkina',
};

export { getAuthHeaders };

/**
 * Возвращает slug проекта КССК для карточки ЖК из каталога или null.
 * @param {object | null | undefined} dev
 * @returns {string | null}
 */
export function getKsskSlugForDevelopment(dev) {
  if (!dev || typeof dev !== 'object') return null;

  if (dev.id && KSSK_DEVELOPMENT_TO_SLUG[dev.id]) {
    return KSSK_DEVELOPMENT_TO_SLUG[dev.id];
  }

  const developer = String(dev.developer || '').toLowerCase();
  if (!developer.includes('ксск') && !developer.includes('кировский сск')) {
    return null;
  }

  const name = String(dev.name || '').toLowerCase();
  if (name.includes('скандинав')) return 'zhk-skandinaviya';
  if (name.includes('метро') || name.includes('metro')) return 'zhk-metro';
  if (name.includes('слобод')) return 'zhk-sloboda';
  if (name.includes('х2') || name.includes('x2')) return 'zhk-x2';
  if (name.includes('дом у реки') || name.includes('заводск')) return 'zhk-dom-u-reki';
  if (name.includes('пушкин')) return 'zhk-pushkina';

  return null;
}

export async function fetchKsskLots(projectSlug) {
  return fetchLotsFromEndpoint('/api/kssk-lots', projectSlug, 'лотов КССК');
}

export async function syncKsskProject(projectSlug) {
  return syncProjectViaEndpoint('/api/kssk-lots', projectSlug, 'проекта КССК');
}

export const buildKsskSummaryByProject = buildSummaryByProject;
export const filterAndSortKsskLots = filterAndSortLots;
