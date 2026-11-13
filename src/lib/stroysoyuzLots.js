/**
 * src/lib/stroysoyuzLots.js - Клиентский модуль работы с live-лотами Стройсоюз
 */

import {
  getAuthHeaders,
  fetchLotsFromEndpoint,
  syncProjectViaEndpoint,
  buildSummaryByProject,
  filterAndSortLots,
} from './liveLotsShared';

export const STROYSOYUZ_PROJECT_KEYS = [
  'zhk-kholms',
  'uspenskaya-29',
  'solomintsy-michurina-28',
  'solomintsy-michurina-26',
  'blyuhera-46',
  'zapovedny-sandalovskaya-2a-1',
  'zapovedny-sandalovskaya-2a',
  'zapovedny-sandalovskaya-4-1',
  'volodarskogo-229',
  'svobody-115g',
];

export const STROYSOYUZ_PROJECT_SLUGS = STROYSOYUZ_PROJECT_KEYS;

export const STROYSOYUZ_PROJECT_NAMES = {
  'zhk-kholms': 'ЖК Холмс (Успенская 33)',
  'uspenskaya-29': 'Дом на ул. Успенская, 29',
  'solomintsy-michurina-28': 'ЖК "Слобода Соломинцы", Мичурина 28',
  'solomintsy-michurina-26': 'ЖК "Слобода Соломинцы", Мичурина 26',
  'blyuhera-46': 'ЖК Репинские пруды, Блюхера 46',
  'zapovedny-sandalovskaya-2a-1': 'ЖК Заповедный, Сандаловская 2а к1',
  'zapovedny-sandalovskaya-2a': 'ЖК Заповедный, Сандаловская 2а',
  'zapovedny-sandalovskaya-4-1': 'ЖК Заповедный, Сандаловская 4 к1',
  'volodarskogo-229': 'ЖК Репинские пруды, Володарского 229',
  'svobody-115g': 'Жилой дом, ул. Свободы, 115Г',
};

export const STROYSOYUZ_DEVELOPMENT_TO_SLUG = {
  'zhk-kholms': 'zhk-kholms',
  'uspenskaya-29': 'uspenskaya-29',
  'zhk-uspenskaya': 'zhk-kholms',
  'solomintsy-michurina-28': 'solomintsy-michurina-28',
  'solomintsy-michurina-26': 'solomintsy-michurina-26',
  'zhk-sloboda-solomintsy': 'solomintsy-michurina-28',
  'blyuhera-46': 'blyuhera-46',
  'zhk-repinskie-prudy': 'blyuhera-46',
  'zapovedny-sandalovskaya-2a-1': 'zapovedny-sandalovskaya-2a-1',
  'zapovedny-sandalovskaya-2a': 'zapovedny-sandalovskaya-2a',
  'zapovedny-sandalovskaya-4-1': 'zapovedny-sandalovskaya-4-1',
  'zhk-zapovedny': 'zapovedny-sandalovskaya-2a-1',
  'volodarskogo-229': 'volodarskogo-229',
  'svobody-115g': 'svobody-115g',
  'zhk-premier': 'svobody-115g',
};

export { getAuthHeaders };

/**
 * Возвращает slug проекта Стройсоюз для карточки ЖК из каталога или null.
 * @param {object | null | undefined} dev
 * @returns {string | null}
 */
export function getStroysoyuzSlugForDevelopment(dev) {
  if (!dev || typeof dev !== 'object') return null;

  if (dev.id && STROYSOYUZ_DEVELOPMENT_TO_SLUG[dev.id]) {
    return STROYSOYUZ_DEVELOPMENT_TO_SLUG[dev.id];
  }

  const developer = String(dev.developer || '').toLowerCase();
  const isStroysoyuz =
    developer.includes('стройсоюз') ||
    developer.includes('stroy-soyuz') ||
    developer.includes('премьер');

  if (!isStroysoyuz) {
    return null;
  }

  const name = String(dev.name || '').toLowerCase();
  const address = String(dev.address || '').toLowerCase();

  if (name.includes('холм')) return 'zhk-kholms';
  if (address.includes('33') && (address.includes('успен') || name.includes('холм'))) return 'zhk-kholms';
  if (address.includes('29') && address.includes('успен')) return 'uspenskaya-29';
  if (name.includes('успен')) return 'zhk-kholms';

  if (address.includes('28') && address.includes('мичурин')) return 'solomintsy-michurina-28';
  if (address.includes('26') && address.includes('мичурин')) return 'solomintsy-michurina-26';
  if (name.includes('соломин')) return 'solomintsy-michurina-28';

  if (address.includes('229') || name.includes('володар')) return 'volodarskogo-229';
  if (address.includes('46') || name.includes('репин') || address.includes('блюхер')) return 'blyuhera-46';

  if (address.includes('2а к1') || address.includes('2а/1') || address.includes('2ак1')) return 'zapovedny-sandalovskaya-2a-1';
  if (address.includes('2а') || address.includes('2a')) return 'zapovedny-sandalovskaya-2a';
  if (address.includes('4 к1') || address.includes('4/1') || address.includes('4к1')) return 'zapovedny-sandalovskaya-4-1';
  if (name.includes('заповед')) return 'zapovedny-sandalovskaya-2a-1';

  if (name.includes('премьер') || address.includes('115')) return 'svobody-115g';

  return null;
}

/**
 * Загружает live-лоты Стройсоюз с сервера.
 * @param {string | object} [projectSlug]
 * @param {object} [options]
 * @returns {Promise<{ projects: Array<object>, lots: Array<object>, configured: boolean }>}
 */
export async function fetchStroysoyuzLots(projectSlug, options = {}) {
  const slug = typeof projectSlug === 'string' ? projectSlug : projectSlug?.projectSlug || '';
  const endpoint = options?.endpoint || (typeof projectSlug === 'object' && projectSlug?.endpoint) || '/api/stroysoyuz-lots';
  return fetchLotsFromEndpoint(endpoint, slug || undefined, 'лотов Стройсоюз');
}

/**
 * Запускает синхронизацию проекта Стройсоюз на сервере.
 * @param {string | object} projectSlug
 * @param {object} [options]
 * @returns {Promise<object | null>}
 */
export async function syncStroysoyuzProject(projectSlug, options = {}) {
  const slug = typeof projectSlug === 'string' ? projectSlug : projectSlug?.projectSlug || '';
  const endpoint = options?.endpoint || (typeof projectSlug === 'object' && projectSlug?.endpoint) || '/api/stroysoyuz-lots';
  const timeoutMs = options?.timeoutMs || (typeof projectSlug === 'object' && projectSlug?.timeoutMs) || undefined;
  return syncProjectViaEndpoint(endpoint, slug, 'проекта Стройсоюз', timeoutMs);
}

/**
 * Загружает лоты и возвращает сводную статистику по проекту (или всем проектам).
 * @param {string} [projectSlug]
 * @param {object} [options]
 * @returns {Promise<object | null>}
 */
export async function getStroysoyuzProjectStats(projectSlug, options = {}) {
  const slug = typeof projectSlug === 'string' ? projectSlug : projectSlug?.projectSlug || '';
  const { lots, projects } = await fetchStroysoyuzLots(slug || undefined, options);
  const summary = buildSummaryByProject(lots, projects);
  if (slug) {
    return summary[slug] || null;
  }
  return summary;
}

export const buildStroysoyuzSummaryByProject = buildSummaryByProject;
export const filterAndSortStroysoyuzLots = filterAndSortLots;
