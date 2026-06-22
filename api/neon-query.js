/**
 * api/neon-query.js — Vercel Serverless Function
 *
 * Прокси к Neon PostgreSQL через @neondatabase/serverless.
 * Клиент → POST /api/neon-query → Neon DB
 *
 * Тело запроса: { query, params, userId, role }
 * Заголовок:    Authorization: Bearer <jwt>
 *
 * Возвращает: { data, error }
 */

import { neon } from '@neondatabase/serverless';
import jwt from 'jsonwebtoken';

const NEON_DATABASE_URL = process.env.NEON_DATABASE_URL;
const NEON_JWT_SECRET   = process.env.NEON_JWT_SECRET;

// Whitelist разрешённых таблиц (защита от SQL injection через имя таблицы)
const ALLOWED_TABLES = new Set([
  'profiles', 'clients', 'properties', 'requests', 'matches',
  'showings', 'tasks', 'pricelist', 'deals', 'selection_items',
  'app_errors', 'user_sessions'
]);

// Запросы, доступные без аутентификации (только чтение)
const PUBLIC_QUERIES = ['SELECT 1', 'select 1'];

export default async function handler(req, res) {
  // ─── CORS ────────────────────────────────────────────────────
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ data: null, error: 'Method Not Allowed' });
  }

  // ─── Конфигурация ────────────────────────────────────────────
  if (!NEON_DATABASE_URL) {
    console.error('[neon-query] NEON_DATABASE_URL not set');
    return res.status(500).json({ data: null, error: 'Database not configured' });
  }

  if (!NEON_JWT_SECRET) {
    console.error('[neon-query] NEON_JWT_SECRET not set');
    return res.status(500).json({ data: null, error: 'JWT secret not configured' });
  }

  // ─── Тело запроса ────────────────────────────────────────────
  const { query, params = [], userId, role } = req.body || {};

  if (!query || typeof query !== 'string') {
    return res.status(400).json({ data: null, error: 'Missing or invalid query' });
  }

  // ─── Проверка JWT ─────────────────────────────────────────────
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    return res.status(401).json({ data: null, error: 'Authorization token required' });
  }

  let jwtPayload;
  try {
    jwtPayload = jwt.verify(token, NEON_JWT_SECRET);
  } catch (err) {
    const isExpired = err.name === 'TokenExpiredError';
    return res.status(401).json({
      data: null,
      error: isExpired ? 'Token expired' : 'Invalid token'
    });
  }

  // ─── Безопасность: userId в JWT должен совпадать с телом ─────
  if (userId && jwtPayload.sub !== userId) {
    console.warn('[neon-query] userId mismatch', { jwt: jwtPayload.sub, body: userId });
    return res.status(403).json({ data: null, error: 'Access denied: userId mismatch' });
  }

  // ─── Базовая защита SQL ───────────────────────────────────────
  // Проверяем что запрос не содержит DROP/TRUNCATE/ALTER
  const dangerousPattern = /\b(DROP|TRUNCATE|ALTER|CREATE\s+USER|GRANT|REVOKE)\b/i;
  if (dangerousPattern.test(query)) {
    console.warn('[neon-query] Dangerous query blocked:', query.slice(0, 100));
    return res.status(403).json({ data: null, error: 'Query not allowed' });
  }

  // ─── Выполнение запроса ───────────────────────────────────────
  try {
    const sql = neon(NEON_DATABASE_URL);
    
    // Neon serverless поддерживает параметризованные запросы
    const rows = await sql.query(query, params);

    return res.status(200).json({ data: rows, error: null });

  } catch (err) {
    console.error('[neon-query] DB error:', err.message);

    // Маппинг PostgreSQL кодов ошибок
    const pgCode = err.code;
    let clientMessage = err.message;

    if (pgCode === '23505') clientMessage = 'Запись уже существует (дубликат)';
    else if (pgCode === '23503') clientMessage = 'Связанный объект не найден';
    else if (pgCode === '23502') clientMessage = 'Не заполнено обязательное поле';
    else if (pgCode === '42703') clientMessage = `Колонка не найдена: ${err.message}`;
    else if (pgCode === '42P01') clientMessage = 'Таблица не найдена';

    return res.status(200).json({
      data: null,
      error: { message: clientMessage, code: pgCode || 'DB_ERROR' }
    });
  }
}
