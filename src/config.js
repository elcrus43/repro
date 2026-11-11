/**
 * src/config.js — базовая точка API для фронтенда.
 *
 * Логика вынесена в src/lib/apiConfig.js:
 *  - в браузере используется same-origin (''), т.е. относительные пути /api/...;
 *  - в Capacitor/APK — https://reacrm.ru (с fallback в apiFetch);
 *  - VITE_API_URL переопределяет origin, если задан.
 *
 * Старый вариант возвращал http://localhost:8080 на проде и ломал
 * оценку, CMA и шаблоны сообщений (в т.ч. mixed content на HTTPS).
 */
import { getApiBaseUrl } from './lib/apiConfig';

export const API_BASE = getApiBaseUrl();
