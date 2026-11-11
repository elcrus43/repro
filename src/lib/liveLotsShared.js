/**
 * src/lib/liveLotsShared.js - Общие клиентские утилиты для работы с live-лотами застройщиков.
 */

import { apiFetch } from './apiConfig';

const DEFAULT_SYNC_TIMEOUT_MS = 45000;
export const ROOM_TYPE_KEYS = ['studio', '1k', '2k', '3k', '4k'];

/**
 * Читает access_token из localStorage('neon_session') и формирует заголовки авторизации.
 * @returns {Record<string, string>}
 */
export function getAuthHeaders() {
  if (typeof localStorage === 'undefined') return {};
  try {
    const raw = localStorage.getItem('neon_session');
    if (!raw) return {};
    const session = JSON.parse(raw);
    const token = session?.access_token;
    return token ? { Authorization: `Bearer ${token}` } : {};
  } catch {
    return {};
  }
}

/**
 * Загружает кэшированные свободные лоты с указанного API endpoint.
 * @param {string} endpoint
 * @param {string} [projectSlug]
 * @param {string} [errorLabel]
 * @returns {Promise<{ projects: Array<object>, lots: Array<object>, configured: boolean }>}
 */
export async function fetchLotsFromEndpoint(endpoint, projectSlug, errorLabel = 'лотов') {
  const query = projectSlug ? `?projectSlug=${encodeURIComponent(projectSlug)}` : '';
  const res = await apiFetch(`${endpoint}${query}`, {
    method: 'GET',
    headers: getAuthHeaders(),
  });

  const payload = await res.json().catch(() => null);
  if (!res.ok || payload?.error) {
    throw new Error(payload?.error || `Ошибка загрузки ${errorLabel} (${res.status})`);
  }

  const data = payload?.data || {};
  return {
    projects: Array.isArray(data.projects) ? data.projects : [],
    lots: Array.isArray(data.lots) ? data.lots : [],
    configured: Boolean(data.configured),
  };
}

/**
 * Запускает синхронизацию одного проекта застройщика на сервере (с таймаутом).
 * @param {string} endpoint
 * @param {string} projectSlug
 * @param {string} [errorLabel]
 * @param {number} [timeoutMs]
 * @returns {Promise<object | null>}
 */
export async function syncProjectViaEndpoint(
  endpoint,
  projectSlug,
  errorLabel = 'проекта',
  timeoutMs = DEFAULT_SYNC_TIMEOUT_MS
) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await apiFetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      },
      body: JSON.stringify({ action: 'syncProject', projectSlug }),
      signal: controller.signal,
    });

    const payload = await res.json().catch(() => null);
    if (!res.ok || payload?.error) {
      throw new Error(payload?.error || `Ошибка синхронизации ${errorLabel} (${res.status})`);
    }

    return payload?.data || null;
  } catch (err) {
    if (err?.name === 'AbortError') {
      throw new Error(`Превышено время ожидания синхронизации ${errorLabel} (${Math.round(timeoutMs / 1000)} сек.)`);
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

function createEmptyProjectSummary(meta = null) {
  return {
    syncedCount: meta ? Number(meta.syncedCount) || 0 : 0,
    totalCount: meta ? Number(meta.totalCount) || 0 : 0,
    minPrice: null,
    minPriceSqm: null,
    lastSyncedAt: meta?.lastSyncedAt || null,
    status: meta?.status || 'idle',
    errorMessage: meta?.errorMessage || null,
    byRoomType: {
      studio: 0,
      '1k': 0,
      '2k': 0,
      '3k': 0,
      '4k': 0,
    },
    _lotCount: 0,
  };
}

/**
 * Строит сводную статистику лотов по каждому project_slug.
 * @param {Array<object>} [lots]
 * @param {Array<object>} [projectsMeta]
 * @returns {Record<string, object>}
 */
export function buildSummaryByProject(lots = [], projectsMeta = []) {
  const summary = {};

  for (const meta of Array.isArray(projectsMeta) ? projectsMeta : []) {
    if (!meta?.projectSlug) continue;
    summary[meta.projectSlug] = createEmptyProjectSummary(meta);
  }

  for (const lot of Array.isArray(lots) ? lots : []) {
    const slug = lot?.project_slug;
    if (!slug || lot.is_available === false) continue;

    if (!summary[slug]) {
      summary[slug] = createEmptyProjectSummary();
    }

    const entry = summary[slug];
    entry._lotCount += 1;

    if (ROOM_TYPE_KEYS.includes(lot.rooms_type)) {
      entry.byRoomType[lot.rooms_type] += 1;
    }

    const price = typeof lot.price === 'number' ? lot.price : Number(lot.price);
    if (Number.isFinite(price) && price > 0) {
      entry.minPrice = entry.minPrice === null ? price : Math.min(entry.minPrice, price);
    }

    const priceSqm = typeof lot.price_sqm === 'number' ? lot.price_sqm : Number(lot.price_sqm);
    if (Number.isFinite(priceSqm) && priceSqm > 0) {
      entry.minPriceSqm = entry.minPriceSqm === null ? priceSqm : Math.min(entry.minPriceSqm, priceSqm);
    }
  }

  for (const slug of Object.keys(summary)) {
    const entry = summary[slug];
    if (entry._lotCount > 0) {
      entry.syncedCount = entry._lotCount;
      if (!entry.totalCount) {
        entry.totalCount = entry._lotCount;
      }
    }
    delete entry._lotCount;
  }

  return summary;
}

/**
 * Фильтрует и сортирует лоты для отображения в карточке ЖК.
 * @param {Array<object>} [lots]
 * @param {{ roomType?: string, search?: string, sortBy?: string }} [options]
 * @returns {Array<object>}
 */
export function filterAndSortLots(lots = [], { roomType = 'all', search = '', sortBy = 'price_asc' } = {}) {
  const list = Array.isArray(lots) ? lots : [];
  const normalizedQuery = String(search || '').trim().toLowerCase();

  const filtered = list.filter((lot) => {
    if (!lot) return false;
    if (roomType && roomType !== 'all' && lot.rooms_type !== roomType) {
      return false;
    }
    if (normalizedQuery) {
      const haystack = [
        lot.title,
        lot.address,
        lot.flat_number,
        lot.finishing,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      if (!haystack.includes(normalizedQuery)) {
        return false;
      }
    }
    return true;
  });

  const toSortableAsc = (val) => {
    const num = Number(val);
    return Number.isFinite(num) && num > 0 ? num : Number.POSITIVE_INFINITY;
  };

  const toSortableDesc = (val) => {
    const num = Number(val);
    return Number.isFinite(num) && num > 0 ? num : -1;
  };

  return [...filtered].sort((a, b) => {
    if (sortBy === 'price_desc') {
      const diff = toSortableDesc(b.price) - toSortableDesc(a.price);
      if (diff !== 0) return diff;
    } else if (sortBy === 'area_asc') {
      const diff = toSortableAsc(a.area) - toSortableAsc(b.area);
      if (diff !== 0) return diff;
    } else if (sortBy === 'floor_asc') {
      const diff = toSortableAsc(a.floor) - toSortableAsc(b.floor);
      if (diff !== 0) return diff;
    } else {
      const diff = toSortableAsc(a.price) - toSortableAsc(b.price);
      if (diff !== 0) return diff;
    }
    return String(a.id || '').localeCompare(String(b.id || ''));
  });
}
