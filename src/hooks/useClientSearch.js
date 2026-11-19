/**
 * src/hooks/useClientSearch.js
 *
 * Хук поиска актуальных объявлений с Авито, ЦИАН, ДомКлик
 * по критериям клиентского запроса на покупку/аренду.
 *
 * Включает автоматический fallback на прямой запрос к базе Neon
 * при недоступности серверного эндпоинта /api/search-listings (404/ошибки сети).
 */

import { useState, useCallback } from 'react';
import { apiFetch } from '../lib/apiConfig';
import neonDb from '../lib/neon';

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
 * Fallback: прямой поиск в Neon (analog_listings) через /api/neon-query
 * если эндпоинт /api/search-listings вернул 404
 */
async function searchListingsViaNeon(params) {
  const {
    city = 'Киров',
    districts,
    rooms,
    budget_max,
    budget_min,
    area_min,
    area_max,
    deal_type = 'SALE',
    limit = 40,
  } = params || {};

  const conditions = ['is_active = true'];
  const sqlParams = [];
  let pIdx = 1;

  if (city) {
    conditions.push(`city ILIKE $${pIdx}`);
    sqlParams.push(`%${city.trim()}%`);
    pIdx++;
  }

  if (deal_type) {
    conditions.push(`deal_type = $${pIdx}`);
    sqlParams.push(deal_type.toUpperCase());
    pIdx++;
  }

  if (Array.isArray(rooms) && rooms.length > 0) {
    const roomNums = rooms.map(Number).filter(n => !isNaN(n));
    if (roomNums.length > 0) {
      conditions.push(`rooms = ANY($${pIdx}::int[])`);
      sqlParams.push(roomNums);
      pIdx++;
    }
  }

  if (budget_max && Number(budget_max) > 0) {
    conditions.push(`price <= $${pIdx}`);
    sqlParams.push(Number(budget_max));
    pIdx++;
  }

  if (budget_min && Number(budget_min) > 0) {
    conditions.push(`price >= $${pIdx}`);
    sqlParams.push(Number(budget_min));
    pIdx++;
  }

  if (area_min && Number(area_min) > 0) {
    conditions.push(`total_area >= $${pIdx}`);
    sqlParams.push(Number(area_min));
    pIdx++;
  }

  if (area_max && Number(area_max) > 0) {
    conditions.push(`total_area <= $${pIdx}`);
    sqlParams.push(Number(area_max));
    pIdx++;
  }

  if (Array.isArray(districts) && districts.length > 0) {
    const districtConds = [];
    for (const d of districts) {
      if (!d) continue;
      districtConds.push(`(district ILIKE $${pIdx} OR address ILIKE $${pIdx})`);
      sqlParams.push(`%${d.trim()}%`);
      pIdx++;
    }
    if (districtConds.length > 0) {
      conditions.push(`(${districtConds.join(' OR ')})`);
    }
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const query = `
    SELECT 
      id, source, source_id, source_url, title, price, address, district,
      rooms, total_area, floor, total_floors, building_type, deal_type,
      raw_data, last_seen_at
    FROM analog_listings
    ${whereClause}
    ORDER BY last_seen_at DESC
    LIMIT ${Math.min(Number(limit) || 40, 100)}
  `;

  const { data: rows, error } = await neonDb.query(query, sqlParams);
  if (error) {
    throw new Error(error.message || 'Ошибка базы данных');
  }

  const sourcesCount = {};
  const results = (rows || []).map(r => {
    const src = (r.source || 'AVITO').toLowerCase();
    sourcesCount[src] = (sourcesCount[src] || 0) + 1;
    let raw = {};
    try {
      raw = typeof r.raw_data === 'string' ? JSON.parse(r.raw_data || '{}') : (r.raw_data || {});
    } catch {
      raw = {};
    }

    return {
      id: r.id,
      source: src,
      source_id: r.source_id,
      source_url: r.source_url,
      title: r.title,
      price: Number(r.price),
      address: r.address,
      district: r.district,
      rooms: r.rooms,
      total_area: r.total_area ? parseFloat(r.total_area) : null,
      floor: r.floor,
      total_floors: r.total_floors,
      building_type: r.building_type,
      image_url: raw.image_url || raw.photo_url || (Array.isArray(raw.photos) ? raw.photos[0] : null) || null,
      deal_type: r.deal_type || deal_type,
      last_seen_at: r.last_seen_at,
    };
  });

  return { results, sources: sourcesCount, total: results.length };
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
      let data = null;
      try {
        const res = await apiFetch('/api/search-listings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...baseParams, ...customParams }),
        });

        if (res.ok) {
          data = await res.json();
        } else if (res.status === 404) {
          // Автоматический fallback на прямой запрос к Neon при 404
          data = await searchListingsViaNeon({ ...baseParams, ...customParams });
        } else {
          const text = await res.text().catch(() => res.statusText);
          throw new Error(`Ошибка сервера: ${res.status} - ${text}`);
        }
      } catch (fetchErr) {
        // Если эндпоинт вернул сетевую ошибку или 404 — пробуем fallback через neonDb
        data = await searchListingsViaNeon({ ...baseParams, ...customParams });
      }

      setResults(data?.results || []);
      setSources(data?.sources || {});
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
