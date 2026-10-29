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
import { reportSecurityIncident } from './security-alerts.js';

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
  const wcMatch = query.match(/["']?([a-zA-Z0-9_]+)["']?\s*\.\s*\*/i);
  if (wcMatch) {
    const target = wcMatch[1].toLowerCase();
    if (target === 'profiles' || (alias && target === alias)) {
      return true;
    }
  }
  return false;
}

export function injectWhereCondition(sql, cond) {
  if (/\bWHERE\b/i.test(sql)) {
    return sql.replace(/\bWHERE\s+([\s\S]+?)(\s+(?:ORDER\s+BY|GROUP\s+BY|HAVING|WINDOW|LIMIT|OFFSET|RETURNING)|$)/i, (match, whereBody, trailing) => {
      return `WHERE ${cond} AND (${whereBody.trim()})${trailing || ''}`;
    });
  } else {
    return sql.replace(/(\s+(?:ORDER\s+BY|GROUP\s+BY|HAVING|WINDOW|LIMIT|OFFSET|RETURNING)|$)/i, (match) => {
      return ` WHERE ${cond}${match}`;
    });
  }
}

/**
 * Точный парсинг вложенных подзапросов (SELECT ...) с учётом строк и скобочного стека.
 * Предотвращает объединение нескольких подзапросов в один span (защита от "приманок", P0-3).
 */
export function extractSubqueries(sql) {
  if (!sql || typeof sql !== 'string') return [];
  const subqueries = [];
  let inString = false;
  let stringChar = '';

  for (let i = 0; i < sql.length; i++) {
    const char = sql[i];
    if (inString) {
      if (char === stringChar) {
        if (sql[i + 1] === stringChar) {
          i++; // экранированная кавычка
        } else {
          inString = false;
        }
      }
      continue;
    }

    if (char === "'" || char === '"') {
      inString = true;
      stringChar = char;
      continue;
    }

    if (char === '(') {
      const rest = sql.slice(i + 1).trimStart();
      if (/^(?:SELECT|WITH)\b/i.test(rest)) {
        let depth = 1;
        let j = i + 1;
        let subInString = false;
        let subStrChar = '';
        for (; j < sql.length; j++) {
          const c = sql[j];
          if (subInString) {
            if (c === subStrChar) {
              if (sql[j + 1] === subStrChar) j++;
              else subInString = false;
            }
            continue;
          }
          if (c === "'" || c === '"') {
            subInString = true;
            subStrChar = c;
            continue;
          }
          if (c === '(') depth++;
          else if (c === ')') {
            depth--;
            if (depth === 0) break;
          }
        }
        if (depth === 0) {
          subqueries.push(sql.slice(i, j + 1));
        }
      }
    }
  }
  return subqueries;
}

/**
 * Единый сквозной конвейер валидации и трансформации SQL для изоляции данных (P0-1 ... P0-6).
 * Экспортируется для прямого тестирования серверного пайплайна без расхождений с production.
 */
export function transformAndValidateQuery(rawQuery, rawParams = [], jwtPayload = {}) {
  let query = rawQuery;
  const params = [...rawParams];

  // 1. Пароли
  if (/\bpassword_hash\b/i.test(query)) {
    return { error: 'Access denied: cannot access password_hash', status: 403 };
  }

  // 2. Создание профилей только через auth
  if (/\bINSERT\s+INTO\s+["']?profiles["']?\b/i.test(query)) {
    return { error: 'Access denied: profile creation is only permitted via auth endpoint', status: 403 };
  }

  // Администратор — полный доступ без добавления фильтров изоляции
  if (jwtPayload.role === 'admin') {
    return { query, params, error: null };
  }

  // ─── Правила для не-админов (риелторов) ───

  // P0-1: Запрет UNION / UNION ALL
  if (/\bUNION\b/i.test(query)) {
    return { error: 'Access denied: UNION queries are forbidden', status: 403 };
  }

  // P0-4: Контроль доступа к profiles
  if (/\bprofiles\b/i.test(query)) {
    if (hasProfilesWildcard(query)) {
      return { error: 'Access denied: wildcard SELECT from profiles is forbidden', status: 403 };
    }
    if (/\bDELETE\s+FROM\b/i.test(query)) {
      return { error: 'Access denied: only admins can delete profiles', status: 403 };
    }
    if (/\bUPDATE\b/i.test(query)) {
      if (/\b(role|status|password_hash|email)\b/i.test(query)) {
        return { error: 'Access denied: cannot modify role, status, password_hash or email', status: 403 };
      }
      if (/\bOR\b/i.test(query)) {
        return { error: 'Access denied: OR condition forbidden in profile update', status: 403 };
      }
      const whereIdMatch = query.match(/WHERE\s+(?:[a-zA-Z0-9_]+\.)?["']?id["']?\s*=\s*\$(\d+)/i);
      if (!whereIdMatch) {
        return { error: 'Access denied: profile update must target own ID specifically', status: 403 };
      }
      const paramIdx = parseInt(whereIdMatch[1], 10) - 1;
      if (params[paramIdx] !== jwtPayload.sub) {
        return { error: 'Access denied: cannot modify another user profile', status: 403 };
      }
    }
    // Прямой SELECT по профилю: обязателен фильтр по собственному id
    if (/\bSELECT\b/i.test(query) && !query.trim().startsWith('SELECT json_build_object(')) {
      const fromProfiles = /\bFROM\s+(?:ONLY\s+)?["']?profiles["']?\b/i.test(query);
      if (fromProfiles) {
        const whereIdMatch = query.match(/WHERE\s+(?:[a-zA-Z0-9_]+\.)?["']?id["']?\s*=\s*\$(\d+)/i);
        if (!whereIdMatch) {
          return { error: 'Access denied: profile query must specify own id in WHERE', status: 403 };
        }
        const paramIdx = parseInt(whereIdMatch[1], 10) - 1;
        if (params[paramIdx] !== jwtPayload.sub) {
          return { error: 'Access denied: cannot query another user profile', status: 403 };
        }
      }
    }
  }

  // Защита pricelist: только админ может модифицировать
  if (/\b(INSERT\s+INTO|UPDATE|DELETE\s+FROM)\s+(?:ONLY\s+)?["']?pricelist["']?\b/i.test(query)) {
    return { error: 'Access denied: only admins can modify pricelist', status: 403 };
  }

  const trimmedQuery = query.trim();

  // P0-2, P0-3, SQLi-2, SQLi-5: Валидация ВСЕХ подзапросов в запросе
  const subqueries = extractSubqueries(query);
  const privateTablesList = ['clients', 'deals', 'tasks', 'showings', 'selection_items', 'matches', 'requests'];
  for (const sq of subqueries) {
    for (const tbl of privateTablesList) {
      const fromPattern = new RegExp(`\\bFROM\\s+(?:ONLY\\s+)?["']?${tbl}["']?\\b`, 'i');
      if (fromPattern.test(sq)) {
        // Подзапрос к приватной таблице обязан фильтровать по realtor_id = $N, совпадающим с текущим пользователем
        const realtorMatch = sq.match(/(?:[a-zA-Z0-9_]+\.)?["']?realtor_id["']?\s*=\s*\$(\d+)/i);
        if (!realtorMatch) {
          return { error: `Access denied: subquery to ${tbl} must filter by realtor_id = $N`, status: 403 };
        }
        const paramIdx = parseInt(realtorMatch[1], 10) - 1;
        if (params[paramIdx] !== jwtPayload.sub) {
          return { error: `Access denied: subquery to ${tbl} realtor_id parameter does not match current user`, status: 403 };
        }
      }
    }
    if (/\bFROM\s+(?:ONLY\s+)?["']?deal_messages["']?\b/i.test(sq)) {
      if (!/\bdeal_id\b/i.test(sq)) {
        return { error: 'Access denied: subquery to deal_messages must filter by deal_id', status: 403 };
      }
    }
  }

  // 1. Защита INSERT
  const insertMatch = trimmedQuery.match(/^INSERT\s+INTO\s+["']?([a-zA-Z0-9_]+)["']?\s*\(([\s\S]*?)\)\s*VALUES\s*\(([\s\S]*?)\)/i);
  if (insertMatch) {
    const targetTable = insertMatch[1].toLowerCase();
    const realtorTables = new Set(['clients', 'properties', 'deals', 'tasks', 'showings', 'selection_items', 'requests', 'matches']);
    if (realtorTables.has(targetTable)) {
      const colList = insertMatch[2].split(',').map(c => c.trim().replace(/["']/g, '').toLowerCase());
      const valList = insertMatch[3].split(',').map(v => v.trim());
      if (colList.length !== valList.length) {
        return { error: 'Column and value counts mismatch in INSERT', status: 400 };
      }
      for (const val of valList) {
        if (!/^\$\d+$/.test(val)) {
          return { error: 'Literal values or expressions forbidden in INSERT: use placeholders ($1, $2, ...)', status: 400 };
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

  // 2. Защита DELETE (P0-5 deal_messages, SQLi-1 скобочная изоляция)
  const { table: delTable, alias: delAlias } = extractTableAndAlias(query, 'FROM');
  if (delTable && /^\s*DELETE\b/i.test(query)) {
    if (delTable === 'deal_messages') {
      const nextIdx = params.length + 1;
      params.push(jwtPayload.sub);
      const cond = `"deal_id" IN (SELECT id FROM deals WHERE realtor_id = $${nextIdx})`;
      query = injectWhereCondition(query, cond);
    } else {
      const personalTables = new Set(['clients', 'properties', 'deals', 'tasks', 'showings', 'selection_items', 'requests', 'matches']);
      if (personalTables.has(delTable)) {
        const prefix = delAlias ? `"${delAlias}".` : '';
        const nextIdx = params.length + 1;
        params.push(jwtPayload.sub);
        query = injectWhereCondition(query, `${prefix}"realtor_id" = $${nextIdx}`);
      }
    }
  }

  // 3. Защита UPDATE (SQLi-1 скобочная изоляция, снятие регрессии matches)
  const { table: updTable, alias: updAlias } = extractTableAndAlias(query, 'UPDATE');
  if (updTable && /^\s*UPDATE\b/i.test(query)) {
    const strictlyIsolated = new Set(['clients', 'tasks', 'showings', 'selection_items', 'deals', 'requests']);
    const prefix = updAlias ? `"${updAlias}".` : '';
    if (strictlyIsolated.has(updTable)) {
      const nextIdx = params.length + 1;
      params.push(jwtPayload.sub);
      query = injectWhereCondition(query, `${prefix}"realtor_id" = $${nextIdx}`);
    } else if (updTable === 'matches') {
      const isMatchesStatusRejectOnly = /SET\s+("?[a-zA-Z0-9_.]*status"?\s*=\s*(?:'rejected'|\$\d+)|"?[a-zA-Z0-9_.]*updated_at"?\s*=\s*(?:NOW\(\)|\$\d+)|,|[ ]|\s)+\s+WHERE/i.test(query);
      const nextIdx = params.length + 1;
      params.push(jwtPayload.sub);
      if (isMatchesStatusRejectOnly) {
        // Разрешено отклонение мэтчей для своих объектов или своих заявок
        const cond = `(${prefix}"realtor_id" = $${nextIdx} OR ${prefix}"property_id" IN (SELECT id FROM properties WHERE realtor_id = $${nextIdx}) OR ${prefix}"request_id" IN (SELECT id FROM requests WHERE realtor_id = $${nextIdx}))`;
        query = injectWhereCondition(query, cond);
      } else {
        query = injectWhereCondition(query, `${prefix}"realtor_id" = $${nextIdx}`);
      }
    } else if (updTable === 'properties') {
      const isStatusOnly = /SET\s+("?[a-zA-Z0-9_.]*status"?\s*=\s*\$\d+|"?[a-zA-Z0-9_.]*updated_at"?\s*=\s*\$\d+|,|\s)+\s+WHERE/i.test(query);
      if (!isStatusOnly) {
        const nextIdx = params.length + 1;
        params.push(jwtPayload.sub);
        query = injectWhereCondition(query, `${prefix}"realtor_id" = $${nextIdx}`);
      }
    }
  }

  // 4. Защита SELECT (P0-5 deal_messages, SQLi-1 скобочная изоляция)
  if (/^\s*SELECT\b/i.test(query) && !trimmedQuery.startsWith('SELECT json_build_object(')) {
    const { table: selTable, alias: selAlias } = extractTableAndAlias(query, 'FROM');
    if (selTable) {
      if (selTable === 'deal_messages') {
        const prefix = selAlias ? `"${selAlias}".` : '';
        const nextIdx = params.length + 1;
        params.push(jwtPayload.sub);
        const cond = `${prefix}"deal_id" IN (SELECT id FROM deals WHERE realtor_id = $${nextIdx})`;
        query = injectWhereCondition(query, cond);
      } else {
        const privateTables = new Set(['clients', 'deals', 'tasks', 'showings', 'selection_items', 'requests', 'matches']);
        if (privateTables.has(selTable)) {
          const prefix = selAlias ? `"${selAlias}".` : '';
          const nextIdx = params.length + 1;
          params.push(jwtPayload.sub);
          query = injectWhereCondition(query, `${prefix}"realtor_id" = $${nextIdx}`);
        }
      }
    }
  }

  return { query, params, error: null };
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

  // 2. Public Property mini-site details (строгий белый список безопасных публичных полей, без p.* и без произвольных выражений)
  if (/^SELECT\s+p\.id,\s*p\.title,\s*p\.price,\s*p\.address,\s*p\.city,\s*p\.rooms,\s*p\.area_total,\s*p\.floor,\s*p\.floors_total,\s*p\.property_type,\s*p\.building_type,\s*p\.description,\s*p\.images,\s*p\.cover_image,\s*json_build_object\('full_name',\s*prof\.full_name,\s*'phone',\s*prof\.phone,\s*'agency_name',\s*prof\.agency_name\)\s+as\s+profiles\s+FROM\s+"?properties"?\s+p\s+LEFT\s+JOIN\s+"?profiles"?\s+prof\s+ON\s+p\.\"?realtor_id\"?\s*=\s*prof\.id\s+WHERE\s+p\.id\s*=\s*\$1$/i.test(cleanQuery)) {
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

  // 5. Public Client matches fetching (строго безопасные поля без комментариев риелтора, без вложенных SQL-выражений)
  if (/^SELECT\s+m\.id,\s*m\.request_id,\s*m\.property_id,\s*m\.score,\s*m\.match_level,\s*m\.matched_params,\s*m\.mismatched_params,\s*m\.status,\s*json_build_object\((?:'[^']+',\s*pr\.(?:id|price|address|city|rooms|area_total|floor|floors_total|cover_image|property_type|images)(?:,\s*)?)+\)\s+as\s+properties\s+FROM\s+"?matches"?\s+m\s+JOIN\s+"?properties"?\s+pr\s+ON\s+m\.\"?property_id\"?\s*=\s*pr\.id\s+WHERE\s+m\.\"?request_id\"?\s*=\s*ANY\(\$1\)$/i.test(cleanQuery)) {
    return true;
  }

  // 6. Public Client updating match status (привязано к request_id)
  if (/^UPDATE\s+"?matches"?\s+SET\s+"?status"?\s*=\s*\$1,\s*"?updated_at"?\s*=\s*\$2\s+WHERE\s+id\s*=\s*\$3\s+AND\s+request_id\s*=\s*\$4$/i.test(cleanQuery)) {
    return true;
  }

  return false;
}

export async function executeWithRetry(sql, queryText, queryParams = [], maxRetries = 2) {
  let lastError;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await sql.query(queryText, queryParams);
    } catch (err) {
      lastError = err;
      const msg = String(err?.message || '');
      const code = String(err?.code || '');
      const isTransient =
        msg.includes('fetch failed') ||
        msg.includes('connecting to database') ||
        msg.includes('socket') ||
        msg.includes('ECONNRESET') ||
        msg.includes('ETIMEDOUT') ||
        msg.includes('ENOTFOUND') ||
        msg.includes('timeout') ||
        code === 'ECONNRESET' ||
        code === 'ETIMEDOUT' ||
        code === 'UND_ERR_CONNECT_TIMEOUT';

      if (!isTransient || attempt === maxRetries) {
        throw err;
      }
      console.warn(`[neon-query] Transient DB error (attempt ${attempt + 1}/${maxRetries + 1}): ${msg}. Retrying in ${(attempt + 1) * 350}ms...`);
      await new Promise(res => setTimeout(res, (attempt + 1) * 350));
    }
  }
  throw lastError;
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
    reportSecurityIncident({
      type: 'PASSWORD_HASH_ACCESS_ATTEMPT',
      details: 'Попытка запроса или модификации поля password_hash',
      query,
      userId,
      req
    });
    return res.status(403).json({ data: null, error: 'Access denied: cannot access password_hash' });
  }

  // ─── Защита profiles: создание профилей только через auth (P0-1) ───
  if (/\bINSERT\s+INTO\s+["']?profiles["']?\b/i.test(query)) {
    console.warn('[neon-query] Direct INSERT into profiles blocked');
    reportSecurityIncident({
      type: 'DIRECT_PROFILE_INSERT_ATTEMPT',
      details: 'Попытка прямого создания профиля в обход модуля авторизации',
      query,
      userId,
      req
    });
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
    let activeSessions;
    try {
      activeSessions = await executeWithRetry(
        sql,
        'SELECT id FROM user_sessions WHERE token_hash = $1 AND expires_at > NOW() LIMIT 1',
        [tokenHash]
      );
    } catch (dbErr) {
      console.error('[neon-query] Session check DB error:', dbErr.message);
      return res.status(503).json({
        data: null,
        error: {
          message: 'База данных временно недоступна. Пожалуйста, повторите попытку.',
          code: 'DB_UNAVAILABLE'
        }
      });
    }

    if (!activeSessions || activeSessions.length === 0) {
      return res.status(401).json({
        data: null,
        error: 'Сессия была отозвана или истекла. Пожалуйста, выполните вход снова.'
      });
    }

    // ─── Безопасность: userId в JWT должен совпадать с телом ─────
    if (userId && jwtPayload.sub !== userId) {
      console.warn('[neon-query] userId mismatch', { jwt: jwtPayload.sub, body: userId });
      reportSecurityIncident({
        type: 'USER_ID_SPOOFING_ATTEMPT',
        details: `Несовпадение userId: в теле указан ${userId}, в JWT сессии ${jwtPayload.sub}`,
        query,
        userId: jwtPayload.sub,
        req
      });
      return res.status(403).json({ data: null, error: 'Access denied: userId mismatch' });
    }

    // ─── Сквозная фильтрация и валидация запроса (P0-1 ... P0-6) ───
    const transformed = transformAndValidateQuery(query, params, jwtPayload);
    if (transformed.error) {
      console.warn('[neon-query] Security validation failed:', transformed.error);
      reportSecurityIncident({
        type: 'ISOLATION_VIOLATION_ATTEMPT',
        details: `Попытка нарушения изоляции данных: ${transformed.error}`,
        query,
        userId: jwtPayload.sub,
        req
      });
      return res.status(transformed.status || 403).json({ data: null, error: transformed.error });
    }
    query = transformed.query;
    params = transformed.params;
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
    reportSecurityIncident({
      type: 'NULL_BYTE_INJECTION',
      details: 'Обнаружен null-byte (\\0) в теле SQL-запроса',
      query,
      userId,
      req
    });
    return res.status(400).json({ data: null, error: 'Query not allowed: invalid characters' });
  }

  // 2. Блокировка SQL-комментариев (-- и /* */), исключающая обход фильтров
  if (/(--|\/\*|\*\/)/.test(query)) {
    console.warn('[neon-query] SQL comments blocked in query:', query.slice(0, 100));
    reportSecurityIncident({
      type: 'SQL_COMMENTS_INJECTION',
      details: 'Обнаружены SQL-комментарии (-- или /* */), возможная попытка обхода изоляции',
      query,
      userId,
      req
    });
    return res.status(403).json({ data: null, error: 'Query not allowed: SQL comments forbidden' });
  }

  // 3. Блокировка multi-statement инъекций (любая точка с запятой запрещена в параметризованных запросах)
  if (/;/.test(query.trim())) {
    console.warn('[neon-query] Semicolon detected, chained query blocked:', query.slice(0, 100));
    reportSecurityIncident({
      type: 'MULTI_STATEMENT_INJECTION',
      details: 'Обнаружена точка с запятой (;), попытка объединения нескольких SQL-команд',
      query,
      userId,
      req
    });
    return res.status(403).json({ data: null, error: 'Query not allowed: multiple statements forbidden' });
  }

  // 4. Блокировка DDL, системных каталогов PostgreSQL и процедур выполнения
  const dangerousPattern = /\b(DROP|TRUNCATE|ALTER|CREATE|GRANT|REVOKE|COPY|EXECUTE|PREPARE|DEALLOCATE|VACUUM|ANALYZE|REINDEX|information_schema|current_setting|set_config|lo_import|lo_export|lo_create|lo_unlink|dblink|crosstab)\b|\bpg_[a-zA-Z0-9_]+/i;
  if (dangerousPattern.test(query)) {
    console.warn('[neon-query] Dangerous query blocked:', query.slice(0, 100));
    reportSecurityIncident({
      type: 'FORBIDDEN_KEYWORD_OR_CATALOG_ACCESS',
      details: 'Запрос содержит запрещённые DDL-команды, обращение к системным функциям или каталогам PostgreSQL',
      query,
      userId,
      req
    });
    return res.status(403).json({ data: null, error: 'Query not allowed: forbidden keyword or catalog access' });
  }

  // 5. Валидация всех таблиц по whitelist ALLOWED_TABLES
  const tableMatches = [...query.matchAll(/(?:\bFROM|\bJOIN|\bINTO|\bTABLE|(?<!\bDO\s+)\bUPDATE)\s+(?:ONLY\s+)?["']?([a-zA-Z0-9_]+)["']?/gi)];
  for (const match of tableMatches) {
    const table = match[1]?.toLowerCase();
    if (table === 'set' || table === 'only' || table === 'select' || table === 'values') continue;
    if (table && !ALLOWED_TABLES.has(table)) {
      console.warn('[neon-query] Unauthorized table access attempted:', table);
      reportSecurityIncident({
        type: 'UNAUTHORIZED_TABLE_ACCESS',
        details: `Попытка несанкционированного доступа к таблице: ${table}`,
        query,
        userId,
        req
      });
      return res.status(403).json({ data: null, error: `Access denied to table: ${table}` });
    }
  }

  // ─── Выполнение запроса ───────────────────────────────────────
  try {
    const sql = neon(NEON_DATABASE_URL);
    const rows = await executeWithRetry(sql, query, params);
    const sanitizedRows = stripSensitiveFields(rows);
    return res.status(200).json({ data: sanitizedRows, error: null });

  } catch (err) {
    console.error('[neon-query] DB error:', err.message);
    const pgCode = err.code;
    let clientMessage = err.message;
    if (pgCode === '23505') clientMessage = 'Запись уже существует (дубликат)';
    else if (pgCode === '23503') clientMessage = `Связанный объект не найден (${err.detail || err.message})`;
    else if (pgCode === '42703') clientMessage = 'Колонка не найдена в базе данных';
    else if (String(err.message).includes('fetch failed')) {
      clientMessage = 'Не удалось подключиться к базе данных. Пожалуйста, повторите попытку.';
    }

    return res.status(500).json({
      data: null,
      error: { message: clientMessage, code: pgCode || 'DB_ERROR' }
    });
  }
}
