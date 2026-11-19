/**
 * src/hooks/useClientSearch.js
 *
 * Хук поиска актуальных объявлений с Авито, ЦИАН, ДомКлик
 * по критериям клиентского запроса на покупку/аренду.
 *
 * Использование:
 *   const { results, loading, error, sources, search, sendTelegramAlert } = useClientSearch(request);
 */

import { useState, useCallback } from 'react';
import { apiFetch } from '../lib/apiConfig';

/**
 * @typedef {Object} ClientSearchResult
 * @property {string} source         - 'avito' | 'cian' | 'domclick' | 'yandex' | 'm2'
 * @property {string} source_id
 * @property {string} source_url     - прямая ссылка на объявление
 * @property {string|null} title
 * @property {number} price
 * @property {string|null} address
 * @property {string|null} district
 * @property {number|null} rooms
 * @property {number|null} total_area
 * @property {number|null} floor
 * @property {number|null} total_floors
 * @property {string|null} building_type
 * @property {string|null} image_url
 * @property {string} deal_type
 */

const SOURCE_LABELS = {
  avito: 'Авито',
  cian: 'ЦИАН',
  domclick: 'ДомКлик',
  yandex: 'Яндекс',
  m2: 'М2',
};

/**
 * Возвращает читаемое название площадки
 * @param {string} source
 */
export function getSourceLabel(source) {
  return SOURCE_LABELS[source] || source;
}

/**
 * Возвращает цвет бейджа источника
 * @param {string} source
 */
export function getSourceColor(source) {
  const colors = {
    avito: '#00aaff',
    cian: '#e34234',
    domclick: '#10b981',
    yandex: '#fc0',
    m2: '#ff6b35',
  };
  return colors[source] || 'var(--primary)';
}

/**
 * Формирует параметры поиска из запроса клиента
 * @param {object} request
 */
function buildSearchParams(request) {
  if (!request) return null;
  return {
    city: request.city || 'Киров',
    districts: Array.isArray(request.districts) && request.districts.length > 0
      ? request.districts
      : undefined,
    rooms: Array.isArray(request.rooms) && request.rooms.length > 0
      ? request.rooms
      : undefined,
    budget_max: request.budget_max || undefined,
    budget_min: request.budget_min || undefined,
    area_min: request.area_min || undefined,
    area_max: request.area_max || undefined,
    property_types: request.property_types || undefined,
    deal_type: request.deal_type || 'SALE',
    mortgage: request.mortgage || undefined,
  };
}

/**
 * @param {object|null} request - запрос клиента
 */
export function useClientSearch(request) {
  const [results, setResults] = useState(/** @type {ClientSearchResult[]} */ ([]));
  const [loading, setLoading] = useState(false);
  const [telegramLoading, setTelegramLoading] = useState(false);
  const [error, setError] = useState(/** @type {string|null} */ (null));
  const [sources, setSources] = useState(/** @type {Record<string,number>} */ ({}));
  const [lastSearched, setLastSearched] = useState(null);

  const search = useCallback(async (customParams = {}) => {
    const baseParams = buildSearchParams(request);
    if (!baseParams) {
      setError('Запрос не задан');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await apiFetch('/api/search-listings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...baseParams, ...customParams }),
      });

      if (!res.ok) {
        const text = await res.text().catch(() => res.statusText);
        throw new Error(`Ошибка сервера: ${res.status} - ${text}`);
      }

      const data = await res.json();
      setResults(data.results || []);
      setSources(data.sources || {});
      setLastSearched(new Date());
      return data;
    } catch (err) {
      setError(err.message || 'Ошибка при поиске');
      setResults([]);
      return null;
    } finally {
      setLoading(false);
    }
  }, [request]);

  const sendTelegramAlert = useCallback(async ({ clientName, querySummary } = {}) => {
    const baseParams = buildSearchParams(request);
    if (!baseParams) {
      throw new Error('Запрос не задан');
    }

    setTelegramLoading(true);
    try {
      const res = await apiFetch('/api/search-listings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...baseParams,
          notify_telegram: true,
          client_name: clientName || request?.client_name || '',
          query_summary: querySummary || '',
        }),
      });

      if (!res.ok) {
        const text = await res.text().catch(() => res.statusText);
        throw new Error(`Ошибка сервера: ${res.status} - ${text}`);
      }

      const data = await res.json();
      return data.telegram_sent;
    } finally {
      setTelegramLoading(false);
    }
  }, [request]);

  const clear = useCallback(() => {
    setResults([]);
    setSources({});
    setError(null);
    setLastSearched(null);
  }, []);

  return {
    results,
    loading,
    telegramLoading,
    error,
    sources,
    lastSearched,
    search,
    sendTelegramAlert,
    clear,
  };
}
