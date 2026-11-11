/**
 * src/lib/ksmLots.js - Клиентский модуль работы с live-лотами КСМ (ksm-kirov.ru/seller)
 */

import {
  getAuthHeaders,
  fetchLotsFromEndpoint,
  syncProjectViaEndpoint,
  buildSummaryByProject,
  filterAndSortLots,
} from './liveLotsShared';

export const KSM_PROJECT_SLUGS = [
  'siti-park',
  'vidnyy',
  'life',
  'zhk-river-park',
  'mkr-ozerki',
  'zhr-chistye-prudy',
];

export const KSM_PROJECT_NAMES = {
  'siti-park': 'Сити Парк',
  'vidnyy': 'Видный',
  'life': 'Лайф',
  'zhk-river-park': 'РИВЕР ПАРК',
  'mkr-ozerki': 'Озерки',
  'zhr-chistye-prudy': 'Чистые пруды',
};

export const KSM_DEVELOPMENT_TO_SLUG = {
  'zhk-city-park': 'siti-park',
  'zhk-vidny': 'vidnyy',
  'zhk-life-ksm': 'life',
  'zhk-river-park': 'zhk-river-park',
  'zhk-ozerki-ksm': 'mkr-ozerki',
  'zhk-chistye-prudy': 'zhr-chistye-prudy',
  'zhk-chistoprudnenskaya-11a': 'zhr-chistye-prudy',
};

export { getAuthHeaders };

/**
 * Возвращает slug проекта КСМ для карточки ЖК из каталога или null.
 * @param {object | null | undefined} dev
 * @returns {string | null}
 */
export function getKsmSlugForDevelopment(dev) {
  if (!dev || typeof dev !== 'object') return null;

  if (dev.id && KSM_DEVELOPMENT_TO_SLUG[dev.id]) {
    return KSM_DEVELOPMENT_TO_SLUG[dev.id];
  }

  const developer = String(dev.developer || '').toLowerCase();
  if (!developer.includes('ксм') && !developer.includes('кировспецмонтаж')) {
    return null;
  }

  const name = String(dev.name || '').toLowerCase();
  if (name.includes('сити парк') || name.includes('city park')) return 'siti-park';
  if (name.includes('видный') || name.includes('vidny')) return 'vidnyy';
  if (name.includes('лайф') || name.includes('life')) return 'life';
  if (name.includes('ривер парк') || name.includes('river park')) return 'zhk-river-park';
  if (name.includes('озерк') || name.includes('ozerki')) return 'mkr-ozerki';
  if (name.includes('чист') || name.includes('чистопруд')) return 'zhr-chistye-prudy';

  return null;
}

export async function fetchKsmLots(projectSlug) {
  return fetchLotsFromEndpoint('/api/ksm-lots', projectSlug, 'лотов КСМ');
}

export async function syncKsmProject(projectSlug) {
  return syncProjectViaEndpoint('/api/ksm-lots', projectSlug, 'проекта КСМ');
}

export const buildKsmSummaryByProject = buildSummaryByProject;
export const filterAndSortKsmLots = filterAndSortLots;
