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

const SESSION_KEY = 'neon_session';
const API_URL     = '/api/neon-query';

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

  try {
    const headers = {
      'Content-Type': 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const res = await fetch(API_URL, {
      method:  'POST',
      headers,
      body: JSON.stringify({ query: sql, params, userId }),
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
    console.error('[neonDb] Fetch error:', err.message);
    return { data: null, error: { message: 'Сетевая ошибка: ' + err.message, code: 'NETWORK' } };
  }
}

/* ─── Query builder helpers ─────────────────────────────────── */

/**
 * Строит WHERE clause из объекта фильтров.
 * Поддерживает: { column: value } — равенство
 * Специальные операторы через массив: { column: ['neq', value] }
 */
function buildWhere(filters, startIdx = 1) {
  if (!filters || Object.keys(filters).length === 0) {
    return { clause: '', params: [] };
  }

  const conditions = [];
  const params = [];
  let idx = startIdx;

  for (const [key, value] of Object.entries(filters)) {
    if (Array.isArray(value)) {
      const [op, val] = value;
      switch (op) {
        case 'neq':  conditions.push(`"${key}" != $${idx}`); params.push(val); idx++; break;
        case 'gt':   conditions.push(`"${key}" > $${idx}`);  params.push(val); idx++; break;
        case 'gte':  conditions.push(`"${key}" >= $${idx}`); params.push(val); idx++; break;
        case 'lt':   conditions.push(`"${key}" < $${idx}`);  params.push(val); idx++; break;
        case 'lte':  conditions.push(`"${key}" <= $${idx}`); params.push(val); idx++; break;
        case 'in':   conditions.push(`"${key}" = ANY($${idx})`); params.push(val); idx++; break;
        case 'is':   conditions.push(val === null ? `"${key}" IS NULL` : `"${key}" IS NOT NULL`); break;
        case 'or': {
          // { field: ['or', `prop1.eq.val1,prop2.eq.val2`] }
          // Упрощённый вариант — передаём raw OR
          conditions.push(`(${val})`);
          break;
        }
        default: conditions.push(`"${key}" = $${idx}`); params.push(value[1] ?? value[0]); idx++;
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

/* ─── neonDb public API ─────────────────────────────────────── */

export const neonDb = {
  /**
   * SELECT * FROM table WHERE filters
   * @param {string} table
   * @param {object} [filters]  — { column: value } | { column: [op, value] }
   * @param {object} [opts]     — { orderBy, limit }
   */
  async select(table, filters = {}, opts = {}) {
    const { clause, params } = buildWhere(filters);
    let q = `SELECT * FROM "${table}" ${clause}`;
    if (opts.orderBy) q += ` ORDER BY ${opts.orderBy}`;
    if (opts.limit)   q += ` LIMIT ${parseInt(opts.limit, 10)}`;
    return request(q, params);
  },

  /**
   * INSERT INTO table (cols) VALUES (...) RETURNING *
   */
  async insert(table, data) {
    const keys   = Object.keys(data);
    const values = Object.values(data);
    const cols   = keys.map(k => `"${k}"`).join(', ');
    const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
    const q = `INSERT INTO "${table}" (${cols}) VALUES (${placeholders}) RETURNING *`;
    return request(q, values);
  },

  /**
   * INSERT INTO table ... ON CONFLICT (id) DO UPDATE SET ... RETURNING *
   */
  async upsert(table, data) {
    const keys   = Object.keys(data);
    const values = Object.values(data);
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
  },

  /**
   * UPDATE table SET ... WHERE id = $1 RETURNING *
   */
  async update(table, id, data) {
    const keys   = Object.keys(data);
    const values = Object.values(data);
    const setClause = keys.map((k, i) => `"${k}" = $${i + 2}`).join(', ');
    const q = `UPDATE "${table}" SET ${setClause} WHERE id = $1 RETURNING *`;
    return request(q, [id, ...values]);
  },

  /**
   * UPDATE table SET ... WHERE filters (для patch запросов)
   */
  async updateWhere(table, filters, data) {
    const keys   = Object.keys(data);
    const values = Object.values(data);
    const setClause = keys.map((k, i) => `"${k}" = $${i + 1}`).join(', ');
    const { clause, params } = buildWhere(filters, keys.length + 1);
    const q = `UPDATE "${table}" SET ${setClause} ${clause} RETURNING *`;
    return request(q, [...values, ...params]);
  },

  /**
   * DELETE FROM table WHERE id = $1
   */
  async delete(table, id) {
    return request(`DELETE FROM "${table}" WHERE id = $1`, [id]);
  },

  /**
   * DELETE FROM table WHERE filters
   */
  async deleteWhere(table, filters) {
    const { clause, params } = buildWhere(filters);
    if (!clause) return { data: null, error: { message: 'deleteWhere requires filters' } };
    return request(`DELETE FROM "${table}" ${clause}`, params);
  },

  /**
   * Произвольный SQL запрос с параметрами
   */
  async query(sql, params = []) {
    return request(sql, params);
  },
};

export default neonDb;
