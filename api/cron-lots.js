/* global process, Buffer */
/**
 * api/cron-lots.js - Vercel Serverless Cron & Admin Sync Endpoint
 *
 * Плановая и ручная синхронизация кэша свободных лотов застройщиков (КССК, КСМ, КИНО) в Neon DB.
 *   GET/POST /api/cron-lots?provider=all|kssk|ksm|kino
 *
 * Авторизация:
 *   1) CRON_SECRET через `Authorization: Bearer <CRON_SECRET>`, заголовок `x-cron-secret`
 *      или query-параметр `?secret=<CRON_SECRET>` (constant-time сравнение).
 *   2) Либо действующая админ-сессия (JWT с `role === 'admin'`).
 */

import crypto from 'crypto';
import { neon } from '@neondatabase/serverless';
import { KSM_PROJECTS, syncKsmProject } from './_ksm-lots.js';
import { KSSK_PROJECTS, syncKsskProject } from './_kssk-lots.js';
import { KINO_PROJECTS, syncKinoProject } from './_kino-lots.js';
import { AVITEK_PROJECTS, syncAvitekProject } from './_avitek-lots.js';
import { ALTAI_PROJECTS, syncAltaiProject } from './_altai-lots.js';
import { STROYSOYUZ_PROJECTS, syncStroysoyuzProject } from './_stroysoyuz-lots.js';
import { PROFSTROY_PROJECTS, syncProfstroyProject } from './_profstroy-lots.js';
import { authenticateLotsRequest } from './_lots-shared.js';

export const config = {
  maxDuration: 60,
};

const VALID_PROVIDERS = ['kssk', 'ksm', 'kino', 'avitek', 'altai', 'stroysoyuz', 'profstroy'];

function normalizeSingleValue(value) {
  if (Array.isArray(value)) return value[0];
  return value;
}

function timingSafeCompare(candidate, expected) {
  if (typeof candidate !== 'string' || typeof expected !== 'string' || !candidate || !expected) {
    return false;
  }
  const candidateBuf = Buffer.from(candidate, 'utf8');
  const expectedBuf = Buffer.from(expected, 'utf8');
  if (candidateBuf.length !== expectedBuf.length) {
    return false;
  }
  return crypto.timingSafeEqual(candidateBuf, expectedBuf);
}

/**
 * Проверяет CRON_SECRET из Bearer-заголовка, x-cron-secret или query.secret.
 * @param {object} req
 * @returns {boolean}
 */
export function isAuthorizedCronRequest(req) {
  const cronSecret = process.env.CRON_SECRET;
  if (typeof cronSecret !== 'string' || !cronSecret) {
    return false;
  }

  const headers = req?.headers || {};
  const authHeader = normalizeSingleValue(headers.authorization || headers.Authorization);
  const bearerToken =
    typeof authHeader === 'string' && authHeader.startsWith('Bearer ')
      ? authHeader.slice(7).trim()
      : null;

  const headerSecret = normalizeSingleValue(headers['x-cron-secret'] || headers['X-Cron-Secret']);
  const querySecret = normalizeSingleValue(req?.query?.secret);

  return (
    timingSafeCompare(bearerToken, cronSecret) ||
    timingSafeCompare(typeof headerSecret === 'string' ? headerSecret : null, cronSecret) ||
    timingSafeCompare(typeof querySecret === 'string' ? querySecret : null, cronSecret)
  );
}

/**
 * Преобразует параметр provider ('all' | 'ksm' | 'kssk') в список провайдеров.
 * @param {string|string[]} [providerParam]
 * @returns {string[] | null}
 */
export function resolveProviders(providerParam) {
  if (Array.isArray(providerParam)) {
    const normalized = providerParam.map((p) => String(p || '').trim().toLowerCase()).filter(Boolean);
    if (normalized.length === 0) return [...VALID_PROVIDERS];
    if (normalized.includes('all')) return [...VALID_PROVIDERS];
    const invalid = normalized.some((p) => !VALID_PROVIDERS.includes(p));
    return invalid ? null : Array.from(new Set(normalized));
  }

  const raw = String(providerParam ?? 'all').trim().toLowerCase();
  if (!raw || raw === 'all') return [...VALID_PROVIDERS];
  if (VALID_PROVIDERS.includes(raw)) return [raw];
  return null;
}

function parseSlugsFilter(rawSlugs) {
  if (!rawSlugs) return null;
  if (Array.isArray(rawSlugs)) {
    const list = rawSlugs.map((s) => String(s || '').trim()).filter(Boolean);
    return list.length > 0 ? list : null;
  }
  if (typeof rawSlugs === 'string') {
    const list = rawSlugs.split(',').map((s) => s.trim()).filter(Boolean);
    return list.length > 0 ? list : null;
  }
  if (typeof rawSlugs === 'object') {
    return rawSlugs;
  }
  return null;
}

function selectProviderSlugs(projectsMap, slugsFilter, providerKey) {
  const allSlugs = Object.keys(projectsMap);
  if (!slugsFilter) return allSlugs;

  if (Array.isArray(slugsFilter)) {
    const allowed = new Set(slugsFilter);
    return allSlugs.filter((slug) => allowed.has(slug));
  }

  if (typeof slugsFilter === 'object' && Array.isArray(slugsFilter[providerKey])) {
    const allowed = new Set(slugsFilter[providerKey].map((s) => String(s || '').trim()));
    return allSlugs.filter((slug) => allowed.has(slug));
  }

  return allSlugs;
}

function buildSkippedSummary(reason) {
  return {
    syncedProjects: 0,
    failedProjects: 0,
    totalLots: 0,
    skipped: true,
    reason,
    results: [],
  };
}

async function syncProviderProjects({ sql, projectsMap, targetSlugs, syncFn }) {
  let syncedProjects = 0;
  let failedProjects = 0;
  let totalLots = 0;
  const results = [];

  for (const slug of targetSlugs) {
    const meta = projectsMap[slug];
    const projectName = typeof meta === 'string' ? meta : meta?.projectName || slug;

    try {
      const res = await syncFn(slug, sql);
      const count = Number(res?.syncedCount ?? res?.lots?.length ?? 0);
      const totalCount = Number(res?.totalCount ?? count);
      syncedProjects += 1;
      totalLots += Number.isFinite(count) ? count : 0;
      results.push({
        projectSlug: slug,
        projectName: res?.projectName || projectName,
        status: 'ok',
        syncedCount: Number.isFinite(count) ? count : 0,
        totalCount: Number.isFinite(totalCount) ? totalCount : 0,
        syncedAt: res?.syncedAt || new Date().toISOString(),
      });
    } catch (err) {
      failedProjects += 1;
      results.push({
        projectSlug: slug,
        projectName,
        status: 'error',
        syncedCount: 0,
        totalCount: 0,
        error: String(err?.message || 'Ошибка синхронизации проекта').slice(0, 300),
      });
    }
  }

  return {
    syncedProjects,
    failedProjects,
    totalLots,
    skipped: false,
    results,
  };
}

/**
 * Запускает плановую синхронизацию выбранных провайдеров и проектов с изоляцией ошибок.
 * @param {object} sql - клиент Neon DB
 * @param {object} [options]
 * @param {string[]|string} [options.providers=['kssk', 'ksm', 'kino']]
 * @param {string[]|object|null} [options.slugs]
 * @param {Function} [options.syncKssk]
 * @param {Function} [options.syncKsm]
 * @param {Function} [options.syncKino]
 */
export async function runScheduledLotsSync(
  sql,
  {
    providers = ['kssk', 'ksm', 'kino', 'avitek', 'altai', 'stroysoyuz', 'profstroy'],
    slugs,
    syncKssk = syncKsskProject,
    syncKsm = syncKsmProject,
    syncKino = syncKinoProject,
    syncAvitek = syncAvitekProject,
    syncAltai = syncAltaiProject,
    syncStroysoyuz = syncStroysoyuzProject,
    syncProfstroy = syncProfstroyProject,
  } = {}
) {
  const startedAt = Date.now();
  const normalizedProviders = resolveProviders(providers) || [];
  const providerSet = new Set(normalizedProviders);

  let kssk;
  if (providerSet.has('kssk')) {
    const ksskSlugs = selectProviderSlugs(KSSK_PROJECTS, slugs, 'kssk');
    kssk = await syncProviderProjects({
      sql,
      projectsMap: KSSK_PROJECTS,
      targetSlugs: ksskSlugs,
      syncFn: syncKssk,
    });
  } else {
    kssk = buildSkippedSummary('Provider not requested');
  }

  let ksm;
  if (!providerSet.has('ksm')) {
    ksm = buildSkippedSummary('Provider not requested');
  } else if (!process.env.KSM_PHONE || !process.env.KSM_PASSWORD) {
    ksm = buildSkippedSummary('KSM credentials not configured');
  } else {
    const ksmSlugs = selectProviderSlugs(KSM_PROJECTS, slugs, 'ksm');
    ksm = await syncProviderProjects({
      sql,
      projectsMap: KSM_PROJECTS,
      targetSlugs: ksmSlugs,
      syncFn: syncKsm,
    });
  }

  let kino;
  if (providerSet.has('kino')) {
    const kinoSlugs = selectProviderSlugs(KINO_PROJECTS, slugs, 'kino');
    kino = await syncProviderProjects({
      sql,
      projectsMap: KINO_PROJECTS,
      targetSlugs: kinoSlugs,
      syncFn: syncKino,
    });
  } else {
    kino = buildSkippedSummary('Provider not requested');
  }

  let avitek;
  if (providerSet.has('avitek')) {
    const avitekSlugs = selectProviderSlugs(AVITEK_PROJECTS, slugs, 'avitek');
    avitek = await syncProviderProjects({
      sql,
      projectsMap: AVITEK_PROJECTS,
      targetSlugs: avitekSlugs,
      syncFn: syncAvitek,
    });
  } else {
    avitek = buildSkippedSummary('Provider not requested');
  }

  let altai;
  if (providerSet.has('altai')) {
    const altaiSlugs = selectProviderSlugs(ALTAI_PROJECTS, slugs, 'altai');
    altai = await syncProviderProjects({
      sql,
      projectsMap: ALTAI_PROJECTS,
      targetSlugs: altaiSlugs,
      syncFn: syncAltai,
    });
  } else {
    altai = buildSkippedSummary('Provider not requested');
  }

  let stroysoyuz;
  if (providerSet.has('stroysoyuz')) {
    const stroysoyuzSlugs = selectProviderSlugs(STROYSOYUZ_PROJECTS, slugs, 'stroysoyuz');
    stroysoyuz = await syncProviderProjects({
      sql,
      projectsMap: STROYSOYUZ_PROJECTS,
      targetSlugs: stroysoyuzSlugs,
      syncFn: syncStroysoyuz,
    });
  } else {
    stroysoyuz = buildSkippedSummary('Provider not requested');
  }

  let profstroy;
  if (providerSet.has('profstroy')) {
    const profstroySlugs = selectProviderSlugs(PROFSTROY_PROJECTS, slugs, 'profstroy');
    profstroy = await syncProviderProjects({
      sql,
      projectsMap: PROFSTROY_PROJECTS,
      targetSlugs: profstroySlugs,
      syncFn: syncProfstroy,
    });
  } else {
    profstroy = buildSkippedSummary('Provider not requested');
  }

  return {
    syncedAt: new Date().toISOString(),
    durationMs: Date.now() - startedAt,
    kssk,
    ksm,
    kino,
    avitek,
    altai,
    stroysoyuz,
    profstroy,
  };
}

async function resolveCronAuth(req) {
  if (isAuthorizedCronRequest(req)) {
    const dbUrl = process.env.NEON_DATABASE_URL;
    if (!dbUrl) {
      return { status: 500, error: 'База данных не настроена' };
    }
    return { sql: neon(dbUrl), mode: 'cron_secret' };
  }

  const headers = req?.headers || {};
  const hasCronHeader = Boolean(normalizeSingleValue(headers['x-cron-secret'] || headers['X-Cron-Secret']));
  const hasCronQuery = Boolean(normalizeSingleValue(req?.query?.secret));
  const authHeader = normalizeSingleValue(headers.authorization || headers.Authorization);
  const hasBearer = typeof authHeader === 'string' && authHeader.startsWith('Bearer ');

  if ((hasCronHeader || hasCronQuery) && !hasBearer) {
    return { status: 401, error: 'Invalid cron secret' };
  }

  const auth = await authenticateLotsRequest(req, '[cron-lots]');
  if (auth.error) {
    return auth;
  }

  if (auth.user?.role !== 'admin') {
    return { status: 403, error: 'Admin role required' };
  }

  return { sql: auth.sql, user: auth.user, mode: 'admin_jwt' };
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Cron-Secret');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ data: null, error: 'Method Not Allowed' });
  }

  const auth = await resolveCronAuth(req);
  if (auth.error) {
    return res.status(auth.status).json({ data: null, error: auth.error });
  }

  const body = req.body && typeof req.body === 'object' ? req.body : {};
  const providerParam = normalizeSingleValue(req.query?.provider) ?? body.provider ?? 'all';
  const providers = resolveProviders(providerParam);

  if (!providers) {
    return res.status(400).json({
      data: null,
      error: 'Некорректный параметр provider. Допустимые значения: all, kssk, ksm, kino, avitek, altai, stroysoyuz',
    });
  }

  const slugs = parseSlugsFilter(body.slugs ?? req.query?.slugs);

  try {
    const summary = await runScheduledLotsSync(auth.sql, { providers, slugs });
    return res.status(200).json({ data: summary, error: null });
  } catch (err) {
    const safeMsg = String(err?.message || 'Ошибка плановой синхронизации лотов').slice(0, 300);
    console.error('[cron-lots] Sync error:', safeMsg);
    return res.status(500).json({ data: null, error: safeMsg });
  }
}
