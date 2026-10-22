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
import crypto from 'crypto';

const NEON_DATABASE_URL = process.env.NEON_DATABASE_URL;
const NEON_JWT_SECRET   = process.env.NEON_JWT_SECRET;

// Whitelist разрешённых таблиц (user_sessions исключена полностью — она строго серверная)
const ALLOWED_TABLES = new Set([
  'profiles', 'clients', 'properties', 'requests', 'matches',
  'showings', 'tasks', 'pricelist', 'deals', 'selection_items',
  'app_errors', 'deal_messages'
]);

// Зарезервированные ключевые слова SQL для исключения ложных алиасов
const SQL_RESERVED = new Set([
  'where', 'set', 'order', 'limit', 'offset', 'join', 'left', 'right',
  'inner', 'outer', 'cross', 'group', 'having', 'union', 'returning',
  'on', 'window', 'values', 'select', 'from', 'as', 'only', 'into'
]);

export function extractTableAndAlias(query, clauseType = 'FROM') {
  const pattern = new RegExp(
    `(?:\\b${clauseType}\\b)\\s+(?:ONLY\\s+)?["']?([a-zA-Z0-9_]+)["']?(?:\\s+(?:AS\\s+)?["']?([a-zA-Z0-9_]+)["']?)?`,
    'i'
  );
  const match = query.match(pattern);
  if (!match) return { table: null, alias: null };

  const table = match[1].toLowerCase();
  let alias = match[2] ? match[2].toLowerCase() : null;

  if (alias && SQL_RESERVED.has(alias)) {
    alias = null;
  }
  return { table, alias };
}

export function hasProfilesWildcard(query) {
  const profilesMatch = query.match(/\bFROM\s+(?:ONLY\s+)?["']?profiles["']?(?:\s+(?:AS\s+)?["']?([a-zA-Z0-9_]+)["']?)?/i);
  if (!profilesMatch) return false;
  const rawAlias = profilesMatch[1];
  const alias = rawAlias && !SQL_RESERVED.has(rawAlias.toLowerCase()) ? rawAlias.toLowerCase() : null;

  if (/\bSELECT\s+\*\s+FROM/i.test(query)) return true;
  const wcMatch = query.match(/\b([a-zA-Z0-9_]+)\.\*/i);
  if (wcMatch) {
    const target = wcMatch[1].toLowerCase();
    if (target === 'profiles' || (alias && target === alias)) {
      return true;
    }
  }
  return false;
}

// Серверная очистка конфиденциальных полей из ответов БД (Defense-in-Depth)
export function stripSensitiveFields(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(stripSensitiveFields);
  const clean = { ...obj };
  delete clean.password_hash;
  for (const k of Object.keys(clean)) {
    if (typeof clean[k] === 'object' && clean[k] !== null) {
      clean[k] = stripSensitiveFields(clean[k]);
    }
  }
  return clean;
}

export function isPublicQuery(query) {
  if (!query || typeof query !== 'string') return false;
  const cleanQuery = query.trim().replace(/\s+/g, ' ');

  // 1. SELECT 1 (healthcheck)
  if (/^SELECT\s+1$/i.test(cleanQuery)) return true;

  // 2. Public Property mini-site details (строгий белый список безопасных публичных полей, без p.*)
  if (/^SELECT\s+p\.id,\s*p\.title,\s*p\.price,\s*p\.address,\s*p\.city,\s*p\.rooms,\s*p\.area_total,\s*p\.floor,\s*p\.floors_total,\s*p\.property_type,\s*p\.building_type,\s*p\.description,\s*p\.images,\s*p\.cover_image,\s*json_build_object\([\s\S]*?\)\s+as\s+profiles\s+FROM\s+"?properties"?\s+p\s+LEFT\s+JOIN\s+"?profiles"?\s+prof\s+ON\s+p\.\"?realtor_id\"?\s*=\s*prof\.id\s+WHERE\s+p\.id\s*=\s*\$1$/i.test(cleanQuery)) {
    return true;
  }

  // 3. Public Client matching check by public_token (только безопасные поля, никакого '*')
  if (/^SELECT\s+id,\s*full_name,\s*realtor_id\s+FROM\s+"?clients"?\s+WHERE\s+"?public_token"?\s*=\s*\$1\s+LIMIT\s+1$/i.test(cleanQuery)) {
    return true;
  }

  // 4. Public Client requests fetching
  if (/^SELECT\s+id\s+FROM\s+"?requests"?\s+WHERE\s+"?client_id"?\s*=\s*\$1$/i.test(cleanQuery)) {
    return true;
  }

  // 5. Public Client matches fetching (строго безопасные поля без комментариев риелтора)
  if (/^SELECT\s+m\.id,\s*m\.request_id,\s*m\.property_id,\s*m\.score,\s*m\.match_level,\s*m\.matched_params,\s*m\.mismatched_params,\s*m\.status,\s*json_build_object\([\s\S]*?\)\s+as\s+properties\s+FROM\s+"?matches"?\s+m\s+JOIN\s+"?properties"?\s+pr\s+ON\s+m\.\"?property_id\"?\s*=\s*pr\.id\s+WHERE\s+m\.\"?request_id\"?\s*=\s*ANY\(\$1\)$/i.test(cleanQuery)) {
    return true;
  }

  // 6. Public Client updating match status (привязано к request_id)
  if (/^UPDATE\s+"?matches"?\s+SET\s+"?status"?\s*=\s*\$1,\s*"?updated_at"?\s*=\s*\$2\s+WHERE\s+id\s*=\s*\$3\s+AND\s+request_id\s*=\s*\$4$/i.test(cleanQuery)) {
    return true;
  }

  return false;
}

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
  const { query: rawQuery, params: rawParams = [], userId, role } = req.body || {};

  if (!rawQuery || typeof rawQuery !== 'string') {
    return res.status(400).json({ data: null, error: 'Missing or invalid query' });
  }

  if (!Array.isArray(rawParams)) {
    return res.status(400).json({ data: null, error: 'Invalid params: must be an array' });
  }

  let query = rawQuery;
  let params = [...rawParams];

  // ─── Универсальная защита от утечки хешей паролей (P0-2) ──────
  if (/\bpassword_hash\b/i.test(query)) {
    console.warn('[neon-query] Access to password_hash blocked in query');
    return res.status(403).json({ data: null, error: 'Access denied: cannot access password_hash' });
  }

  // ─── Защита profiles: создание профилей только через auth (P0-1) ───
  if (/\bINSERT\s+INTO\s+["']?profiles["']?\b/i.test(query)) {
    console.warn('[neon-query] Direct INSERT into profiles blocked');
    return res.status(403).json({ data: null, error: 'Access denied: profile creation is only permitted via auth endpoint' });
  }

  const isPublic = isPublicQuery(query);

  if (!isPublic) {
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

    // ─── Проверка статуса пользователя ──────────────────────────
    if (jwtPayload.status === 'pending') {
      return res.status(403).json({
        data: null,
        error: 'Ваш аккаунт ожидает подтверждения администратором'
      });
    }
    if (jwtPayload.status === 'rejected') {
      return res.status(403).json({
        data: null,
        error: 'Ваш аккаунт заблокирован'
      });
    }

    // ─── Проверка активности сессии в БД (Session Revocation) ───
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const sql = neon(NEON_DATABASE_URL);
    const activeSessions = await sql.query(
      'SELECT id FROM user_sessions WHERE token_hash = $1 AND expires_at > NOW() LIMIT 1',
      [tokenHash]
    );

    if (!activeSessions || activeSessions.length === 0) {
      return res.status(401).json({
        data: null,
        error: 'Сессия была отозвана или истекла. Пожалуйста, выполните вход снова.'
      });
    }

    // ─── Безопасность: userId в JWT должен совпадать с телом ─────
    if (userId && jwtPayload.sub !== userId) {
      console.warn('[neon-query] userId mismatch', { jwt: jwtPayload.sub, body: userId });
      return res.status(403).json({ data: null, error: 'Access denied: userId mismatch' });
    }

    // ─── Строгий контроль доступа к profiles (P0-1, P0-2, P0-3, P0-4) ───
    if (/\bprofiles\b/i.test(query)) {
      if (jwtPayload.role !== 'admin') {
        // Запрет прямого wildcard (SELECT *, SELECT p.*, SELECT "profiles".*)
        if (hasProfilesWildcard(query)) {
          console.warn('[neon-query] Wildcard SELECT from profiles blocked');
          return res.status(403).json({ data: null, error: 'Access denied: wildcard SELECT from profiles is forbidden' });
        }
        // Запрет удаления профилей
        if (/\bDELETE\s+FROM\b/i.test(query)) {
          return res.status(403).json({ data: null, error: 'Access denied: only admins can delete profiles' });
        }
        // Защита UPDATE:
        if (/\bUPDATE\b/i.test(query)) {
          if (/\b(role|status|password_hash|email)\b/i.test(query)) {
            console.warn('[neon-query] Unauthorized privilege escalation attempt on profiles');
            return res.status(403).json({ data: null, error: 'Access denied: cannot modify role, status, password_hash or email' });
          }
          if (/\bOR\b/i.test(query)) {
            return res.status(403).json({ data: null, error: 'Access denied: OR condition forbidden in profile update' });
          }
          const whereIdMatch = query.match(/WHERE\s+(?:[a-zA-Z0-9_]+\.)?["']?id["']?\s*=\s*\$(\d+)/i);
          if (!whereIdMatch) {
            return res.status(403).json({ data: null, error: 'Access denied: profile update must target own ID specifically' });
          }
          const paramIdx = parseInt(whereIdMatch[1], 10) - 1;
          if (params[paramIdx] !== jwtPayload.sub) {
            return res.status(403).json({ data: null, error: 'Access denied: cannot modify another user profile' });
          }
        }
        // Прямой SELECT по профилю: разрешён только собственный профиль
        if (/\bSELECT\b/i.test(query) && !query.trim().startsWith('SELECT json_build_object(')) {
          const whereIdMatch = query.match(/WHERE\s+(?:[a-zA-Z0-9_]+\.)?["']?id["']?\s*=\s*\$(\d+)/i);
          if (whereIdMatch) {
            const paramIdx = parseInt(whereIdMatch[1], 10) - 1;
            if (params[paramIdx] !== jwtPayload.sub) {
              return res.status(403).json({ data: null, error: 'Access denied: cannot query another user profile' });
            }
          }
        }
      }
    }

    // ─── Защита pricelist: только админ может модифицировать ──────
    if (/\b(INSERT\s+INTO|UPDATE|DELETE\s+FROM)\s+(?:ONLY\s+)?["']?pricelist["']?\b/i.test(query)) {
      if (jwtPayload.role !== 'admin') {
        return res.status(403).json({ data: null, error: 'Access denied: only admins can modify pricelist' });
      }
    }

    // ─── BOLA / IDOR Защита для не-админов (P0-1, P0-2, P0-5, P0-6) ───
    if (jwtPayload.role !== 'admin') {
      const trimmedQuery = query.trim();

      // 1. Защита INSERT: сопоставление колонки realtor_id с номером плейсхолдера ($N)
      const insertMatch = trimmedQuery.match(/^INSERT\s+INTO\s+["']?([a-zA-Z0-9_]+)["']?\s*\(([\s\S]*?)\)\s*VALUES\s*\(([\s\S]*?)\)/i);
      if (insertMatch) {
        const targetTable = insertMatch[1].toLowerCase();
        const realtorTables = new Set(['clients', 'properties', 'deals', 'tasks', 'showings', 'selection_items', 'requests', 'matches']);
        if (realtorTables.has(targetTable)) {
          const colList = insertMatch[2].split(',').map(c => c.trim().replace(/["']/g, '').toLowerCase());
          const valList = insertMatch[3].split(',').map(v => v.trim());
          if (colList.length !== valList.length) {
            return res.status(400).json({ data: null, error: 'Column and value counts mismatch in INSERT' });
          }
          for (const val of valList) {
            if (!/^\$\d+$/.test(val)) {
              return res.status(400).json({ data: null, error: 'Literal values or expressions forbidden in INSERT: use placeholders ($1, $2, ...)' });
            }
          }
          const realtorColIdx = colList.indexOf('realtor_id');
          if (realtorColIdx !== -1) {
            const phMatch = valList[realtorColIdx].match(/^\$(\d+)$/);
            if (phMatch) {
              const pIdx = parseInt(phMatch[1], 10) - 1;
              params[pIdx] = jwtPayload.sub;
            }
          }
        }
      }

      // 2. Защита DELETE: извлечение имени таблицы и корректного алиаса
      const { table: delTable, alias: delAlias } = extractTableAndAlias(query, 'FROM');
      if (delTable && /^\s*DELETE\b/i.test(query)) {
        const personalTables = new Set(['clients', 'properties', 'deals', 'tasks', 'showings', 'selection_items', 'requests', 'matches', 'deal_messages']);
        if (personalTables.has(delTable)) {
          const prefix = delAlias ? `"${delAlias}".` : '';
          const nextIdx = params.length + 1;
          params.push(jwtPayload.sub);
          if (/\bWHERE\b/i.test(query)) {
            query = query.replace(/\bWHERE\b/i, `WHERE ${prefix}"realtor_id" = $${nextIdx} AND `);
          } else {
            query = query.replace(/(RETURNING|$)/i, ` WHERE ${prefix}"realtor_id" = $${nextIdx} $1`);
          }
        }
      }

      // 3. Защита UPDATE с корректным распознаванием алиасов таблицы
      const { table: updTable, alias: updAlias } = extractTableAndAlias(query, 'UPDATE');
      if (updTable && /^\s*UPDATE\b/i.test(query)) {
        const strictlyIsolated = new Set(['clients', 'tasks', 'showings', 'selection_items', 'deals', 'requests', 'matches']);
        const prefix = updAlias ? `"${updAlias}".` : '';
        if (strictlyIsolated.has(updTable)) {
          const nextIdx = params.length + 1;
          params.push(jwtPayload.sub);
          if (/\bWHERE\b/i.test(query)) {
            query = query.replace(/\bWHERE\b/i, `WHERE ${prefix}"realtor_id" = $${nextIdx} AND `);
          } else {
            query = query.replace(/(RETURNING|$)/i, ` WHERE ${prefix}"realtor_id" = $${nextIdx} $1`);
          }
        } else if (updTable === 'properties') {
          // Для properties: если меняются поля кроме status/updated_at, требовать владения объектом
          const isStatusOnly = /SET\s+("?[a-zA-Z0-9_.]*status"?\s*=\s*\$\d+|"?[a-zA-Z0-9_.]*updated_at"?\s*=\s*\$\d+|,|\s)+\s+WHERE/i.test(query);
          if (!isStatusOnly) {
            const nextIdx = params.length + 1;
            params.push(jwtPayload.sub);
            if (/\bWHERE\b/i.test(query)) {
              query = query.replace(/\bWHERE\b/i, `WHERE ${prefix}"realtor_id" = $${nextIdx} AND `);
            }
          }
        }
      }

      // 4. Защита SELECT: прямое добавление фильтра realtor_id и проверка вложенных подзапросов
      if (!trimmedQuery.startsWith('SELECT json_build_object(')) {
        const { table: selTable, alias: selAlias } = extractTableAndAlias(query, 'FROM');
        if (selTable) {
          const privateTables = new Set(['clients', 'deals', 'tasks', 'showings', 'selection_items', 'requests', 'matches', 'deal_messages']);
          if (privateTables.has(selTable)) {
            const prefix = selAlias ? `"${selAlias}".` : '';
            const nextIdx = params.length + 1;
            params.push(jwtPayload.sub);
            if (/\bWHERE\b/i.test(query)) {
              query = query.replace(/\bWHERE\b/i, `WHERE ${prefix}"realtor_id" = $${nextIdx} AND `);
            } else {
              query = query.replace(/(ORDER\s+BY|LIMIT|$)/i, ` WHERE ${prefix}"realtor_id" = $${nextIdx} $1`);
            }
          }
        }
      } else {
        // Проверка вложенных подзапросов в агрегатном запросе:
        // Любой подзапрос к приватной таблице ОБЯЗАН содержать realtor_id
        const privateTables = ['clients', 'deals', 'tasks', 'showings', 'selection_items', 'matches', 'requests'];
        for (const tbl of privateTables) {
          const subqueryPattern = new RegExp(`\\(SELECT[\\s\\S]*?FROM\\s+["']?${tbl}["']?[\\s\\S]*?\\)`, 'gi');
          const subqueries = query.match(subqueryPattern) || [];
          for (const sq of subqueries) {
            if (!/\brealtor_id\b/i.test(sq)) {
              console.warn(`[neon-query] Subquery to ${tbl} lacks realtor_id filter:`, sq.slice(0, 100));
              return res.status(403).json({ data: null, error: `Access denied: subquery to ${tbl} must filter by realtor_id` });
            }
          }
        }
      }
    }
  } else {
    // Для публичных запросов на обновление статуса мэтча разрешены только допустимые статусы
    if (/^UPDATE\s+"?matches"?/i.test(query.trim())) {
      const allowedMatchStatuses = ['liked', 'rejected', 'viewed', 'declined', 'interested', 'new'];
      if (!allowedMatchStatuses.includes(params[0])) {
        return res.status(403).json({ data: null, error: 'Invalid match status transition' });
      }
    }
  }

  // ─── Защита SQL (Многоуровневая фильтрация) ──────────────────
  // 1. Блокировка null-byte атак
  if (query.includes('\0')) {
    console.warn('[neon-query] Null-byte detected in query');
    return res.status(400).json({ data: null, error: 'Query not allowed: invalid characters' });
  }

  // 2. Блокировка SQL-комментариев (-- и /* */), исключающая обход фильтров
  if (/(--|\/\*|\*\/)/.test(query)) {
    console.warn('[neon-query] SQL comments blocked in query:', query.slice(0, 100));
    return res.status(403).json({ data: null, error: 'Query not allowed: SQL comments forbidden' });
  }

  // 3. Блокировка multi-statement инъекций (любая точка с запятой запрещена в параметризованных запросах)
  if (/;/.test(query.trim())) {
    console.warn('[neon-query] Semicolon detected, chained query blocked:', query.slice(0, 100));
    return res.status(403).json({ data: null, error: 'Query not allowed: multiple statements forbidden' });
  }

  // 4. Блокировка DDL, системных каталогов PostgreSQL и процедур выполнения
  const dangerousPattern = /\b(DROP|TRUNCATE|ALTER|CREATE|GRANT|REVOKE|COPY|EXECUTE|PREPARE|DEALLOCATE|VACUUM|ANALYZE|REINDEX|pg_|information_schema|current_setting|set_config|lo_import|lo_export|lo_create|lo_unlink|dblink|crosstab)\b/i;
  if (dangerousPattern.test(query)) {
    console.warn('[neon-query] Dangerous query blocked:', query.slice(0, 100));
    return res.status(403).json({ data: null, error: 'Query not allowed: forbidden keyword or catalog access' });
  }

  // 5. Валидация всех таблиц по whitelist ALLOWED_TABLES
  const tableMatches = [...query.matchAll(/(?:\bFROM|\bJOIN|\bINTO|\bTABLE|(?<!\bDO\s+)\bUPDATE)\s+(?:ONLY\s+)?["']?([a-zA-Z0-9_]+)["']?/gi)];
  for (const match of tableMatches) {
    const table = match[1]?.toLowerCase();
    if (table === 'set' || table === 'only' || table === 'select' || table === 'values') continue;
    if (table && !ALLOWED_TABLES.has(table)) {
      console.warn('[neon-query] Unauthorized table access attempted:', table);
      return res.status(403).json({ data: null, error: `Access denied to table: ${table}` });
    }
  }

  // ─── Выполнение запроса ───────────────────────────────────────
  try {
    const sql = neon(NEON_DATABASE_URL);
    const rows = await sql.query(query, params);
    const sanitizedRows = stripSensitiveFields(rows);
    return res.status(200).json({ data: sanitizedRows, error: null });

  } catch (err) {
    console.error('[neon-query] DB error:', err.message);
    const pgCode = err.code;
    let clientMessage = err.message;
    if (pgCode === '23505') clientMessage = 'Запись уже существует (дубликат)';
    else if (pgCode === '23503') clientMessage = `Связанный объект не найден (${err.detail || err.message})`;
    else if (pgCode === '42703') clientMessage = 'Колонка не найдена в базе данных';

    return res.status(500).json({
      data: null,
      error: { message: clientMessage, code: pgCode || 'DB_ERROR' }
    });
  }
}
