/* global process */
/**
 * api/_lots-shared.js - Общие утилиты парсеров, авторизации и Neon DB-репозитория лотов.
 * Файл с префиксом '_' не публикуется как отдельный serverless endpoint на Vercel.
 */

import { neon } from '@neondatabase/serverless';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

const ALLOWED_TABLES = {
  ksm: { lotsTable: 'ksm_lots', metaTable: 'ksm_sync_meta', indexName: 'idx_ksm_lots_project_slug' },
  kssk: { lotsTable: 'kssk_lots', metaTable: 'kssk_sync_meta', indexName: 'idx_kssk_lots_project_slug' },
  kino: { lotsTable: 'kino_lots', metaTable: 'kino_sync_meta', indexName: 'idx_kino_lots_project_slug' },
  avitek: { lotsTable: 'avitek_lots', metaTable: 'avitek_sync_meta', indexName: 'idx_avitek_lots_project_slug' },
  altai: { lotsTable: 'altai_lots', metaTable: 'altai_sync_meta', indexName: 'idx_altai_lots_project_slug' },
  stroysoyuz: { lotsTable: 'stroysoyuz_lots', metaTable: 'stroysoyuz_sync_meta', indexName: 'idx_stroysoyuz_lots_project_slug' },
};

export function decodeHtmlEntities(str) {
  return String(str || '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&sup2;/gi, '²')
    .replace(/&quot;/gi, '"')
    .replace(/&#0*39;|&apos;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&amp;/gi, '&')
    .replace(/&#(\d+);/g, (_m, dec) => String.fromCharCode(Number(dec)))
    .replace(/&#x([0-9a-f]+);/gi, (_m, hex) => String.fromCharCode(parseInt(hex, 16)));
}

export function cleanText(raw) {
  return decodeHtmlEntities(String(raw || '').replace(/<[^>]*>/g, ' '))
    .replace(/[\u00a0\u202f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function escapeRegExp(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function extractAttrFromTag(tagHtml, attrName) {
  const re = new RegExp(`\\b${escapeRegExp(attrName)}\\s*=\\s*(?:"([^"]*)"|'([^']*)')`, 'i');
  const match = tagHtml.match(re);
  return match ? decodeHtmlEntities(match[1] ?? match[2] ?? '') : null;
}

/**
 * Нормализует описание комнатности в канонический ключ фильтра.
 * @param {string} text
 * @returns {'studio' | '1k' | '2k' | '3k' | '4k' | null}
 */
export function normalizeRoomsType(text) {
  const s = cleanText(text).toLowerCase();
  if (!s) return null;
  if (/студи/i.test(s) || /studio/i.test(s) || s === 'с' || s === 'ст') return 'studio';

  const digitMatch =
    s.match(/(?:евро[-\s]*)?(\d+)\s*[-\s]*(?:комнатн[а-яё]*|комн|к|k)(?![а-яёa-z0-9])/i) ||
    s.match(/евро[-\s]*(\d+)/i);
  if (digitMatch) {
    const num = parseInt(digitMatch[1], 10);
    if (num === 1) return '1k';
    if (num === 2) return '2k';
    if (num === 3) return '3k';
    if (num >= 4) return '4k';
  }

  if (/однокомнат/.test(s)) return '1k';
  if (/двухкомнат/.test(s)) return '2k';
  if (/тр[её]хкомнат/.test(s)) return '3k';
  if (/четыр[её]хкомнат|многокомнат/.test(s)) return '4k';
  if (/^\d+$/.test(s)) {
    const num = parseInt(s, 10);
    if (num === 1) return '1k';
    if (num === 2) return '2k';
    if (num === 3) return '3k';
    if (num >= 4) return '4k';
  }
  return null;
}

export function formatRoomsLabel(roomsType) {
  if (roomsType === 'studio') return 'Студия';
  if (roomsType === '1k') return '1-комнатная';
  if (roomsType === '2k') return '2-комнатная';
  if (roomsType === '3k') return '3-комнатная';
  if (roomsType === '4k') return '4-комнатная';
  return 'Квартира';
}

export function formatLotRow(row) {
  return {
    id: row.id,
    project_slug: row.project_slug,
    project_name: row.project_name,
    title: row.title,
    rooms_label: row.rooms_label ?? null,
    rooms_type: row.rooms_type ?? null,
    area: row.area !== null && row.area !== undefined ? Number(row.area) : null,
    floor: row.floor !== null && row.floor !== undefined ? Number(row.floor) : null,
    flat_number: row.flat_number ?? null,
    address: row.address ?? null,
    finishing: row.finishing ?? null,
    price: row.price !== null && row.price !== undefined ? Number(row.price) : null,
    price_sqm: row.price_sqm !== null && row.price_sqm !== undefined ? Number(row.price_sqm) : null,
    plan_image: row.plan_image ?? null,
    lot_url: row.lot_url ?? null,
    is_available: row.is_available !== false,
    synced_at: row.synced_at || null,
  };
}

export async function authenticateLotsRequest(req, logPrefix = '[lots]') {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    return { status: 401, error: 'Authorization token required' };
  }

  const jwtSecret = process.env.NEON_JWT_SECRET;
  if (!jwtSecret) {
    console.error(`${logPrefix} NEON_JWT_SECRET not configured`);
    return { status: 500, error: 'Server authentication misconfigured' };
  }

  let jwtPayload;
  try {
    jwtPayload = jwt.verify(token, jwtSecret);
  } catch (err) {
    const isExpired = err.name === 'TokenExpiredError';
    return {
      status: 401,
      error: isExpired ? 'Token expired' : 'Invalid authorization token',
    };
  }

  if (jwtPayload.status === 'pending' || jwtPayload.status === 'rejected') {
    return { status: 403, error: 'Account pending approval or disabled' };
  }

  const dbUrl = process.env.NEON_DATABASE_URL;
  if (!dbUrl) {
    return { status: 500, error: 'База данных не настроена' };
  }

  const sql = neon(dbUrl);
  try {
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const activeSessions = await sql.query(
      'SELECT id FROM user_sessions WHERE token_hash = $1 AND expires_at > NOW() LIMIT 1',
      [tokenHash]
    );
    if (!activeSessions || activeSessions.length === 0) {
      return { status: 401, error: 'Сессия была отозвана или истекла' };
    }
  } catch (err) {
    console.error(`${logPrefix} Session verification error:`, err.message);
    return { status: 500, error: 'Сервис авторизации временно недоступен' };
  }

  return { sql, user: jwtPayload };
}

/**
 * Создает изолированный Neon DB-репозиторий для таблиц конкретного застройщика.
 */
export function createLotsRepository(providerKey, projectsMap) {
  const tableSpec = ALLOWED_TABLES[providerKey];
  if (!tableSpec) {
    throw new Error(`Unsupported lots provider: ${providerKey}`);
  }
  const { lotsTable, metaTable, indexName } = tableSpec;
  let tablesReadyPromise = null;

  async function ensureTables(sql) {
    if (!tablesReadyPromise) {
      tablesReadyPromise = (async () => {
        await sql.query(`
          CREATE TABLE IF NOT EXISTS ${lotsTable} (
            id TEXT PRIMARY KEY,
            project_slug TEXT NOT NULL,
            project_name TEXT NOT NULL,
            title TEXT NOT NULL,
            rooms_label TEXT,
            rooms_type TEXT,
            area NUMERIC(8,2),
            floor INTEGER,
            flat_number TEXT,
            address TEXT,
            finishing TEXT,
            price BIGINT,
            price_sqm INTEGER,
            plan_image TEXT,
            lot_url TEXT,
            is_available BOOLEAN DEFAULT TRUE,
            synced_at TIMESTAMPTZ DEFAULT NOW()
          )
        `);
        await sql.query(`
          CREATE INDEX IF NOT EXISTS ${indexName}
          ON ${lotsTable} (project_slug)
        `);
        await sql.query(`
          CREATE TABLE IF NOT EXISTS ${metaTable} (
            project_slug TEXT PRIMARY KEY,
            project_name TEXT NOT NULL,
            total_count INTEGER DEFAULT 0,
            synced_count INTEGER DEFAULT 0,
            last_synced_at TIMESTAMPTZ DEFAULT NOW(),
            status TEXT DEFAULT 'ok',
            error_message TEXT
          )
        `);
      })().catch((err) => {
        tablesReadyPromise = null;
        throw err;
      });
    }
    await tablesReadyPromise;
  }

  async function saveProjectLots(sql, { projectSlug, projectName, totalCount, lots }) {
    await ensureTables(sql);

    if (lots.length > 0) {
      await sql.query(
        `INSERT INTO ${lotsTable} (
           id, project_slug, project_name, title, rooms_label, rooms_type,
           area, floor, flat_number, address, finishing, price, price_sqm,
           plan_image, lot_url, is_available, synced_at
         )
         SELECT
           t.id, t.project_slug, t.project_name, t.title, t.rooms_label, t.rooms_type,
           t.area, t.floor, t.flat_number, t.address, t.finishing, t.price, t.price_sqm,
           t.plan_image, t.lot_url, TRUE, NOW()
         FROM UNNEST(
           $1::text[], $2::text[], $3::text[], $4::text[], $5::text[], $6::text[],
           $7::numeric[], $8::integer[], $9::text[], $10::text[], $11::text[], $12::bigint[], $13::integer[],
           $14::text[], $15::text[]
         ) AS t(
           id, project_slug, project_name, title, rooms_label, rooms_type,
           area, floor, flat_number, address, finishing, price, price_sqm,
           plan_image, lot_url
         )
         ON CONFLICT (id) DO UPDATE SET
           project_slug = EXCLUDED.project_slug,
           project_name = EXCLUDED.project_name,
           title = EXCLUDED.title,
           rooms_label = EXCLUDED.rooms_label,
           rooms_type = EXCLUDED.rooms_type,
           area = EXCLUDED.area,
           floor = EXCLUDED.floor,
           flat_number = EXCLUDED.flat_number,
           address = EXCLUDED.address,
           finishing = EXCLUDED.finishing,
           price = EXCLUDED.price,
           price_sqm = EXCLUDED.price_sqm,
           plan_image = EXCLUDED.plan_image,
           lot_url = EXCLUDED.lot_url,
           is_available = TRUE,
           synced_at = NOW()`,
        [
          lots.map((l) => l.id),
          lots.map((l) => l.project_slug),
          lots.map((l) => l.project_name),
          lots.map((l) => l.title),
          lots.map((l) => l.rooms_label),
          lots.map((l) => l.rooms_type),
          lots.map((l) => l.area),
          lots.map((l) => l.floor),
          lots.map((l) => l.flat_number),
          lots.map((l) => l.address),
          lots.map((l) => l.finishing),
          lots.map((l) => l.price),
          lots.map((l) => l.price_sqm),
          lots.map((l) => l.plan_image),
          lots.map((l) => l.lot_url),
        ]
      );

      await sql.query(
        `DELETE FROM ${lotsTable} WHERE project_slug = $1 AND id != ALL($2::text[])`,
        [projectSlug, lots.map((l) => l.id)]
      );
    } else {
      await sql.query(`DELETE FROM ${lotsTable} WHERE project_slug = $1`, [projectSlug]);
    }

    const effectiveTotal = totalCount !== null && totalCount !== undefined ? totalCount : lots.length;
    const metaRows = await sql.query(
      `INSERT INTO ${metaTable} (
         project_slug, project_name, total_count, synced_count, last_synced_at, status, error_message
       ) VALUES ($1, $2, $3, $4, NOW(), 'ok', NULL)
       ON CONFLICT (project_slug) DO UPDATE SET
         project_name = EXCLUDED.project_name,
         total_count = EXCLUDED.total_count,
         synced_count = EXCLUDED.synced_count,
         last_synced_at = NOW(),
         status = 'ok',
         error_message = NULL
       RETURNING last_synced_at`,
      [projectSlug, projectName, effectiveTotal, lots.length]
    );

    const syncedAt = metaRows?.[0]?.last_synced_at || new Date().toISOString();
    const savedRows = await sql.query(
      `SELECT * FROM ${lotsTable} WHERE project_slug = $1 ORDER BY price ASC NULLS LAST, id ASC`,
      [projectSlug]
    );

    return {
      projectSlug,
      projectName,
      totalCount: effectiveTotal,
      syncedCount: lots.length,
      syncedAt,
      lots: (savedRows || []).map(formatLotRow),
    };
  }

  async function recordSyncError(sql, projectSlug, projectName, errorMessage) {
    await ensureTables(sql);
    await sql.query(
      `INSERT INTO ${metaTable} (
         project_slug, project_name, total_count, synced_count, last_synced_at, status, error_message
       ) VALUES ($1, $2, 0, 0, NOW(), 'error', $3)
       ON CONFLICT (project_slug) DO UPDATE SET
         project_name = EXCLUDED.project_name,
         last_synced_at = NOW(),
         status = 'error',
         error_message = EXCLUDED.error_message`,
      [projectSlug, projectName, errorMessage]
    );
  }

  async function listCachedLots(sql, projectSlug, configured = true) {
    await ensureTables(sql);

    const metaRows = await sql.query(
      `SELECT project_slug, project_name, total_count, synced_count, last_synced_at, status, error_message
       FROM ${metaTable}`
    );
    const metaBySlug = new Map((metaRows || []).map((row) => [row.project_slug, row]));

    const projects = Object.entries(projectsMap).map(([slug, metaVal]) => {
      const name = typeof metaVal === 'string' ? metaVal : metaVal.projectName;
      const meta = metaBySlug.get(slug);
      return {
        projectSlug: slug,
        projectName: name,
        totalCount: meta ? Number(meta.total_count) || 0 : 0,
        syncedCount: meta ? Number(meta.synced_count) || 0 : 0,
        lastSyncedAt: meta?.last_synced_at || null,
        status: meta?.status || 'idle',
        errorMessage: meta?.error_message || null,
      };
    });

    const lotRows = projectSlug
      ? await sql.query(
          `SELECT * FROM ${lotsTable} WHERE project_slug = $1 ORDER BY price ASC NULLS LAST, id ASC`,
          [projectSlug]
        )
      : await sql.query(
          `SELECT * FROM ${lotsTable} ORDER BY project_slug ASC, price ASC NULLS LAST, id ASC`
        );

    return {
      projects,
      lots: (lotRows || []).map(formatLotRow),
      configured,
    };
  }

  return {
    ensureTables,
    saveProjectLots,
    recordSyncError,
    listCachedLots,
  };
}
