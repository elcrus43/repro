/**
 * src/lib/apiConfig.js — Централизованная конфигурация эндпоинтов API
 *
 * Обеспечивает корректную работу:
 *  1. В обычном браузере на сайте (относительные пути /api/...)
 *  2. В мобильном приложении Capacitor (абсолютные URL с fallback на случай блокировок провайдеров)
 *  3. В локальной разработке Vite dev proxy
 */

export const PRIMARY_API_ORIGIN  = 'https://reacrm.ru';
export const FALLBACK_API_ORIGIN = 'https://realtor-match.vercel.app';

/**
 * Определяет, работает ли приложение внутри мобильного WebView (Capacitor / Cordova / APK)
 */
export function isCapacitorApp() {
  if (typeof window === 'undefined') return false;
  return Boolean(
    window.Capacitor ||
    window.location.protocol === 'capacitor:' ||
    window.location.href.startsWith('file:') ||
    window.location.hostname === '' ||
    // На Android Capacitor часто запускает WebView на http://localhost без указания порта
    (window.location.hostname === 'localhost' && (!window.location.port || window.location.port === '80'))
  );
}

/**
 * Возвращает базовый URL для API
 */
export function getApiBaseUrl() {
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL.replace(/\/$/, '');
  }
  if (isCapacitorApp()) {
    return PRIMARY_API_ORIGIN;
  }
  return '';
}

/**
 * Формирует полный URL для эндпоинта
 * @param {string} endpoint путь (напр. '/api/neon-query')
 * @param {string} [originOverride] принудительный origin
 */
export function buildApiUrl(endpoint, originOverride = null) {
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  if (originOverride) {
    return `${originOverride.replace(/\/$/, '')}${cleanEndpoint}`;
  }
  const base = getApiBaseUrl();
  return base ? `${base}${cleanEndpoint}` : cleanEndpoint;
}

/**
 * URL AI-прокси.
 *
 * Gemini блокирует запросы с российских IP ("User location is not supported"),
 * поэтому обращения к ИИ всегда должны уходить на серверный прокси (Vercel/US):
 *  - в мобильном приложении и в dev-режиме - на основной домен (или VITE_API_URL);
 *  - в продакшен-сборке - относительный путь на текущем origin.
 */
export function getAiProxyUrl() {
  const endpoint = '/api/ai-proxy';
  const isDev = typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.DEV;

  if (isCapacitorApp()) {
    return buildApiUrl(endpoint);
  }
  if (isDev) {
    return buildApiUrl(endpoint, getApiBaseUrl() || PRIMARY_API_ORIGIN);
  }
  return buildApiUrl(endpoint);
}

/**
 * Обёртка над fetch с автоматическим переключением на резервный домен
 * (актуально для мобильного приложения, если основной домен временно недоступен у сотового оператора)
 */
export async function apiFetch(endpoint, options = {}) {
  const url = buildApiUrl(endpoint);
  
  try {
    const res = await fetch(url, options);
    return res;
  } catch (err) {
    // Если запрос упал по сети в Capacitor или на кастомном домене — пробуем резервный vercel.app
    const isNetworkErr = err.name !== 'AbortError';
    if (isNetworkErr && (isCapacitorApp() || typeof window !== 'undefined')) {
      const fallbackUrl = buildApiUrl(endpoint, FALLBACK_API_ORIGIN);
      if (fallbackUrl !== url) {
        console.warn(`[apiConfig] Request to ${url} failed (${err.message}). Retrying with fallback: ${fallbackUrl}`);
        return fetch(fallbackUrl, options);
      }
    }
    throw err;
  }
}

/**
 * Запрос к AI-прокси с резервным доменом.
 * Использует getAiProxyUrl(), чтобы ИИ-вызовы всегда выполнялись с сервера (US),
 * а не с локального IP разработчика.
 */
export async function aiFetch(options = {}) {
  const url = getAiProxyUrl();
  try {
    return await fetch(url, options);
  } catch (err) {
    const isNetworkErr = err.name !== 'AbortError';
    if (isNetworkErr && /^https?:\/\//.test(url)) {
      const fallbackUrl = buildApiUrl('/api/ai-proxy', FALLBACK_API_ORIGIN);
      if (fallbackUrl !== url) {
        console.warn(`[apiConfig] AI request to ${url} failed (${err.message}). Retrying with fallback: ${fallbackUrl}`);
        return fetch(fallbackUrl, options);
      }
    }
    throw err;
  }
}
