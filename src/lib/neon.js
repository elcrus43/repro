/**
 * src/lib/neon.js — Клиент для работы с Neon через API-прокси
 *
 * Все запросы к БД идут через /api/neon-query (Vercel serverless).
 * JWT хранится в localStorage под ключом 'neon_session'.
 *
 * Экспортирует `neonDb` с методами:
 *   select(table, filters?)  — SELECT * FROM table WHERE ...
 *   insert(table, data)      — INSERT INTO table
 *   update(table, id, data)  — UPDATE table SET ... WHERE id = ...
 *   delete(table, id)        — DELETE FROM table WHERE id = ...
 *   upsert(table, data)      — INSERT ... ON CONFLICT DO UPDATE
 *   query(sql, params?)      — произвольный SQL запрос
 */

import { apiFetch } from './apiConfig';

const SESSION_KEY = 'neon_session';
const API_ENDPOINT = '/api/neon-query';

/* ─── Session helpers ───────────────────────────────────────── */

function getSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function getToken() {
  const session = getSession();
  return session?.access_token || null;
}

function getUserId() {
  const session = getSession();
  return session?.user?.id || null;
}

/* ─── Core request ──────────────────────────────────────────── */

async function request(sql, params = []) {
  const token  = getToken();
  const userId = getUserId();

  const controller = new AbortController();
  const fetchTimeout = setTimeout(() => controller.abort(), 12000);

  try {
    const headers = {
      'Content-Type': 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const res = await apiFetch(API_ENDPOINT, {
      method:  'POST',
      headers,
      body: JSON.stringify({ query: sql, params, userId }),
      signal: controller.signal,
    });

    if (res.status === 401) {
      // Токен истёк — очищаем сессию
      localStorage.removeItem(SESSION_KEY);
      window.dispatchEvent(new CustomEvent('neon:session-expired'));
      return { data: null, error: { message: 'Сессия истекла', code: 'SESSION_EXPIRED' } };
    }

    const json = await res.json();
    return json;

  } catch (err) {
    if (err.name === 'AbortError') {
      console.error('[neonDb] Request timed out after 12s');
      return { data: null, error: { message: 'Превышено время ожидания запроса (12с)', code: 'TIMEOUT' } };
    }
    console.error('[neonDb] Fetch error:', err.message);
    return { data: null, error: { message: 'Сетевая ошибка: ' + err.message, code: 'NETWORK' } };
  } finally {
    clearTimeout(fetchTimeout);
  }
}

/* ─── SQL Injection protection helpers ──────────────────────── */

const IDENTIFIER_REGEX = /^[a-zA-Z_][a-zA-Z0-9_]*$/;
const ORDER_BY_CLAUSE_REGEX = /^[a-zA-Z_][a-zA-Z0-9_]*(?:\.[a-zA-Z_][a-zA-Z0-9_]*)?(?:\s+(?:ASC|DESC))?(?:\s+NULLS\s+(?:FIRST|LAST))?$/i;
const ALLOWED_OPERATORS = new Set(['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'in', 'is', 'like', 'ilike']);

export function isValidIdentifier(name) {
  return typeof name === 'string' && IDENTIFIER_REGEX.test(name);
}

export function assertValidIdentifier(name, label = 'Identifier') {
  if (!isValidIdentifier(name)) {
    throw new Error(`[neonDb] Недопустимое или небезопасное имя (${label}): "${name}"`);
  }
}

export function sanitizeOrderBy(orderBy) {
  if (!orderBy || typeof orderBy !== 'string') return '';
  const clauses = orderBy.split(',').map(s => s.trim()).filter(Boolean);
  for (const clause of clauses) {
    if (!ORDER_BY_CLAUSE_REGEX.test(clause)) {
      throw new Error(`[neonDb] Недопустимое выражение ORDER BY: "${clause}"`);
    }
  }
  return clauses.join(', ');
}

/* ─── Query builder helpers ─────────────────────────────────── */

/**
 * Строит WHERE clause из объекта фильтров с строгой параметризацией.
 * Поддерживает: { column: value } — равенство
 * Специальные операторы через массив: { column: ['neq', value] }
 */
export function buildWhere(filters, startIdx = 1) {
  if (!filters || Object.keys(filters).length === 0) {
    return { clause: '', params: [] };
  }

  const conditions = [];
  const params = [];
  let idx = startIdx;

  for (const [key, value] of Object.entries(filters)) {
    assertValidIdentifier(key, 'column');

    if (Array.isArray(value)) {
      const [op, val] = value;
      const lowerOp = typeof op === 'string' ? op.toLowerCase() : 'eq';
      if (!ALLOWED_OPERATORS.has(lowerOp)) {
        throw new Error(`[neonDb] Недопустимый оператор фильтрации: "${op}"`);
      }

      switch (lowerOp) {
        case 'eq':   conditions.push(`"${key}" = $${idx}`);  params.push(val); idx++; break;
        case 'neq':  conditions.push(`"${key}" != $${idx}`); params.push(val); idx++; break;
        case 'gt':   conditions.push(`"${key}" > $${idx}`);  params.push(val); idx++; break;
        case 'gte':  conditions.push(`"${key}" >= $${idx}`); params.push(val); idx++; break;
        case 'lt':   conditions.push(`"${key}" < $${idx}`);  params.push(val); idx++; break;
        case 'lte':  conditions.push(`"${key}" <= $${idx}`); params.push(val); idx++; break;
        case 'in':   conditions.push(`"${key}" = ANY($${idx})`); params.push(val); idx++; break;
        case 'like': conditions.push(`"${key}" LIKE $${idx}`); params.push(val); idx++; break;
        case 'ilike':conditions.push(`"${key}" ILIKE $${idx}`); params.push(val); idx++; break;
        case 'is':   conditions.push(val === null ? `"${key}" IS NULL` : `"${key}" IS NOT NULL`); break;
      }
    } else if (value === null) {
      conditions.push(`"${key}" IS NULL`);
    } else {
      conditions.push(`"${key}" = $${idx}`);
      params.push(value);
      idx++;
    }
  }

  return {
    clause: conditions.length ? 'WHERE ' + conditions.join(' AND ') : '',
    params,
  };
}

/* ─── JSON serialization helper ─────────────────────────────── */

const JSON_COLUMNS = new Set([
  'deal_expenses', 'expenses', 'agency_contracts', 'additional_contacts',
  'passport_details', 'client_shares', 'context_data', 'input_params',
  'analogs_ids', 'result_details', 'condition_json', 'channels',
  'variables', 'raw_data'
]);

function normalizeJsonValues(data) {
  if (!data || typeof data !== 'object') return data;
  const result = { ...data };
  for (const key of Object.keys(result)) {
    if (JSON_COLUMNS.has(key)) {
      const val = result[key];
      if (val !== null && val !== undefined && typeof val !== 'string') {
        result[key] = JSON.stringify(val);
      }
    }
  }
  return result;
}

/* ─── neonDb public API ─────────────────────────────────────── */

export const neonDb = {
  /**
   * SELECT * FROM table WHERE filters
   * @param {string} table
   * @param {object} [filters]  — { column: value } | { column: [op, value] }
   * @param {object} [opts]     — { orderBy, limit, offset }
   */
  async select(table, filters = {}, opts = {}) {
    try {
      assertValidIdentifier(table, 'table');
      const { clause, params } = buildWhere(filters);
      let q = `SELECT * FROM "${table}" ${clause}`;
      if (opts.orderBy) {
        const safeOrderBy = sanitizeOrderBy(opts.orderBy);
        if (safeOrderBy) q += ` ORDER BY ${safeOrderBy}`;
      }
      if (opts.limit !== undefined && opts.limit !== null && opts.limit !== '') {
        const limitNum = parseInt(opts.limit, 10);
        if (!Number.isInteger(limitNum) || limitNum < 0) {
          return { data: null, error: { message: `Недопустимое значение limit: "${opts.limit}"`, code: 'SECURITY_ERROR' } };
        }
        q += ` LIMIT ${limitNum}`;
      }
      if (opts.offset !== undefined && opts.offset !== null && opts.offset !== '') {
        const offsetNum = parseInt(opts.offset, 10);
        if (!Number.isInteger(offsetNum) || offsetNum < 0) {
          return { data: null, error: { message: `Недопустимое значение offset: "${opts.offset}"`, code: 'SECURITY_ERROR' } };
        }
        q += ` OFFSET ${offsetNum}`;
      }
      return request(q, params);
    } catch (err) {
      console.error('[neonDb.select] Validation error:', err.message);
      return { data: null, error: { message: err.message, code: 'SECURITY_ERROR' } };
    }
  },

  /**
   * INSERT INTO table (cols) VALUES (...) RETURNING *
   */
  async insert(table, data) {
    try {
      assertValidIdentifier(table, 'table');
      const safeData = normalizeJsonValues(data);
      const keys   = Object.keys(safeData);
      keys.forEach(k => assertValidIdentifier(k, 'column'));
      const values = Object.values(safeData);
      const cols   = keys.map(k => `"${k}"`).join(', ');
      const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
      const q = `INSERT INTO "${table}" (${cols}) VALUES (${placeholders}) RETURNING *`;
      return request(q, values);
    } catch (err) {
      console.error('[neonDb.insert] Validation error:', err.message);
      return { data: null, error: { message: err.message, code: 'SECURITY_ERROR' } };
    }
  },

  /**
   * INSERT INTO table ... ON CONFLICT (id) DO UPDATE SET ... RETURNING *
   */
  async upsert(table, data) {
    try {
      assertValidIdentifier(table, 'table');
      const safeData = normalizeJsonValues(data);
      const keys   = Object.keys(safeData);
      keys.forEach(k => assertValidIdentifier(k, 'column'));
      const values = Object.values(safeData);
      const cols   = keys.map(k => `"${k}"`).join(', ');
      const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
      const updateSet = keys
        .filter(k => k !== 'id')
        .map(k => `"${k}" = EXCLUDED."${k}"`)
        .join(', ');
      const q = `
        INSERT INTO "${table}" (${cols}) VALUES (${placeholders})
        ON CONFLICT (id) DO UPDATE SET ${updateSet}
        RETURNING *
      `;
      return request(q, values);
    } catch (err) {
      console.error('[neonDb.upsert] Validation error:', err.message);
      return { data: null, error: { message: err.message, code: 'SECURITY_ERROR' } };
    }
  },

  /**
   * UPDATE table SET ... WHERE id = $1 RETURNING *
   */
  async update(table, id, data) {
    try {
      assertValidIdentifier(table, 'table');
      const safeData = normalizeJsonValues(data);
      const keys   = Object.keys(safeData);
      keys.forEach(k => assertValidIdentifier(k, 'column'));
      const values = Object.values(safeData);
      const setClause = keys.map((k, i) => `"${k}" = $${i + 2}`).join(', ');
      const q = `UPDATE "${table}" SET ${setClause} WHERE id = $1 RETURNING *`;
      return request(q, [id, ...values]);
    } catch (err) {
      console.error('[neonDb.update] Validation error:', err.message);
      return { data: null, error: { message: err.message, code: 'SECURITY_ERROR' } };
    }
  },

  /**
   * UPDATE table SET ... WHERE filters (для patch запросов)
   */
  async updateWhere(table, filters, data) {
    try {
      assertValidIdentifier(table, 'table');
      const safeData = normalizeJsonValues(data);
      const keys   = Object.keys(safeData);
      keys.forEach(k => assertValidIdentifier(k, 'column'));
      const values = Object.values(safeData);
      const setClause = keys.map((k, i) => `"${k}" = $${i + 1}`).join(', ');
      const { clause, params } = buildWhere(filters, keys.length + 1);
      const q = `UPDATE "${table}" SET ${setClause} ${clause} RETURNING *`;
      return request(q, [...values, ...params]);
    } catch (err) {
      console.error('[neonDb.updateWhere] Validation error:', err.message);
      return { data: null, error: { message: err.message, code: 'SECURITY_ERROR' } };
    }
  },

  /**
   * DELETE FROM table WHERE id = $1
   */
  async delete(table, id) {
    try {
      assertValidIdentifier(table, 'table');
      return request(`DELETE FROM "${table}" WHERE id = $1`, [id]);
    } catch (err) {
      console.error('[neonDb.delete] Validation error:', err.message);
      return { data: null, error: { message: err.message, code: 'SECURITY_ERROR' } };
    }
  },

  /**
   * DELETE FROM table WHERE filters
   */
  async deleteWhere(table, filters) {
    try {
      assertValidIdentifier(table, 'table');
      const { clause, params } = buildWhere(filters);
      if (!clause) return { data: null, error: { message: 'deleteWhere requires filters', code: 'SECURITY_ERROR' } };
      return request(`DELETE FROM "${table}" ${clause}`, params);
    } catch (err) {
      console.error('[neonDb.deleteWhere] Validation error:', err.message);
      return { data: null, error: { message: err.message, code: 'SECURITY_ERROR' } };
    }
  },

  /**
   * Произвольный SQL запрос с параметрами
   */
  async query(sql, params = []) {
    return request(sql, params);
  },
};

export default neonDb;
