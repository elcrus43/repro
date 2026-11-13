/* global process */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  config,
  isAuthorizedCronRequest,
  resolveProviders,
  runScheduledLotsSync,
} from '../../api/cron-lots.js';
import { KSM_PROJECTS } from '../../api/ksm-lots.js';
import { KSSK_PROJECTS } from '../../api/kssk-lots.js';
import { KINO_PROJECTS } from '../../api/kino-lots.js';

describe('cron-lots config and helpers', () => {
  it('exports maxDuration 60', () => {
    expect(config).toEqual({ maxDuration: 60 });
  });

  it('resolves valid provider arguments', () => {
    expect(resolveProviders()).toEqual(['kssk', 'ksm', 'kino', 'avitek', 'altai', 'stroysoyuz']);
    expect(resolveProviders('all')).toEqual(['kssk', 'ksm', 'kino', 'avitek', 'altai', 'stroysoyuz']);
    expect(resolveProviders('kssk')).toEqual(['kssk']);
    expect(resolveProviders('KSM')).toEqual(['ksm']);
    expect(resolveProviders('kino')).toEqual(['kino']);
    expect(resolveProviders('avitek')).toEqual(['avitek']);
    expect(resolveProviders('altai')).toEqual(['altai']);
    expect(resolveProviders('stroysoyuz')).toEqual(['stroysoyuz']);
    expect(resolveProviders('unknown')).toBeNull();
  });
});

describe('isAuthorizedCronRequest', () => {
  const originalCronSecret = process.env.CRON_SECRET;

  beforeEach(() => {
    process.env.CRON_SECRET = 'super-secret-cron-token-123';
  });

  afterEach(() => {
    if (originalCronSecret === undefined) {
      delete process.env.CRON_SECRET;
    } else {
      process.env.CRON_SECRET = originalCronSecret;
    }
  });

  it('accepts valid Bearer token', () => {
    const req = {
      headers: {
        authorization: 'Bearer super-secret-cron-token-123',
      },
      query: {},
    };
    expect(isAuthorizedCronRequest(req)).toBe(true);
  });

  it('accepts valid x-cron-secret header and query secret', () => {
    expect(
      isAuthorizedCronRequest({
        headers: { 'x-cron-secret': 'super-secret-cron-token-123' },
        query: {},
      })
    ).toBe(true);

    expect(
      isAuthorizedCronRequest({
        headers: {},
        query: { secret: 'super-secret-cron-token-123' },
      })
    ).toBe(true);
  });

  it('rejects invalid secret (same length and different length)', () => {
    expect(
      isAuthorizedCronRequest({
        headers: { authorization: 'Bearer wrong-secret-cron-token-123' },
        query: {},
      })
    ).toBe(false);

    expect(
      isAuthorizedCronRequest({
        headers: { 'x-cron-secret': 'short' },
        query: {},
      })
    ).toBe(false);

    expect(
      isAuthorizedCronRequest({
        headers: {},
        query: { secret: 'wrong' },
      })
    ).toBe(false);
  });

  it('rejects when secret header/query is missing or CRON_SECRET is not configured', () => {
    expect(isAuthorizedCronRequest({ headers: {}, query: {} })).toBe(false);

    delete process.env.CRON_SECRET;
    expect(
      isAuthorizedCronRequest({
        headers: { authorization: 'Bearer super-secret-cron-token-123' },
        query: {},
      })
    ).toBe(false);
  });
});

describe('runScheduledLotsSync', () => {
  const originalKsmPhone = process.env.KSM_PHONE;
  const originalKsmPassword = process.env.KSM_PASSWORD;

  afterEach(() => {
    if (originalKsmPhone === undefined) {
      delete process.env.KSM_PHONE;
    } else {
      process.env.KSM_PHONE = originalKsmPhone;
    }
    if (originalKsmPassword === undefined) {
      delete process.env.KSM_PASSWORD;
    } else {
      process.env.KSM_PASSWORD = originalKsmPassword;
    }
  });

  it('runs KSSK projects with isolated error handling and skips KSM when credentials are absent', async () => {
    delete process.env.KSM_PHONE;
    delete process.env.KSM_PASSWORD;

    const fakeSql = { query: vi.fn() };
    const syncKssk = vi.fn(async (slug) => {
      if (slug === 'zhk-metro') {
        throw new Error('Upstream timeout');
      }
      return {
        projectSlug: slug,
        projectName: KSSK_PROJECTS[slug].projectName,
        totalCount: 10,
        syncedCount: 10,
        syncedAt: '2026-11-11T08:00:00.000Z',
        lots: [],
      };
    });
    const syncKsm = vi.fn();

    const summary = await runScheduledLotsSync(fakeSql, {
      providers: ['kssk', 'ksm'],
      syncKssk,
      syncKsm,
    });

    const totalKsskProjects = Object.keys(KSSK_PROJECTS).length;
    expect(syncKssk).toHaveBeenCalledTimes(totalKsskProjects);
    expect(syncKsm).not.toHaveBeenCalled();

    expect(typeof summary.syncedAt).toBe('string');
    expect(typeof summary.durationMs).toBe('number');
    expect(summary.kssk.syncedProjects).toBe(totalKsskProjects - 1);
    expect(summary.kssk.failedProjects).toBe(1);
    expect(summary.kssk.totalLots).toBe((totalKsskProjects - 1) * 10);
    expect(summary.kssk.skipped).toBe(false);
    expect(summary.kssk.results).toHaveLength(totalKsskProjects);
    expect(summary.kssk.results.find((r) => r.projectSlug === 'zhk-metro')).toMatchObject({
      projectSlug: 'zhk-metro',
      status: 'error',
      error: 'Upstream timeout',
      syncedCount: 0,
    });

    expect(summary.ksm).toEqual({
      syncedProjects: 0,
      failedProjects: 0,
      totalLots: 0,
      skipped: true,
      reason: 'KSM credentials not configured',
      results: [],
    });
  });

  it('syncs KSM projects when credentials are configured and respects slugs filter', async () => {
    process.env.KSM_PHONE = '79000000000';
    process.env.KSM_PASSWORD = 'demo-password';

    const fakeSql = { query: vi.fn() };
    const syncKssk = vi.fn();
    const syncKsm = vi.fn(async (slug) => ({
      projectSlug: slug,
      projectName: KSM_PROJECTS[slug],
      totalCount: 7,
      syncedCount: 7,
      syncedAt: '2026-11-11T08:00:00.000Z',
      lots: [],
    }));

    const summary = await runScheduledLotsSync(fakeSql, {
      providers: ['ksm'],
      slugs: ['siti-park', 'vidnyy'],
      syncKssk,
      syncKsm,
    });

    expect(syncKssk).not.toHaveBeenCalled();
    expect(syncKsm).toHaveBeenCalledTimes(2);
    expect(summary.kssk).toMatchObject({
      skipped: true,
      reason: 'Provider not requested',
      syncedProjects: 0,
    });
    expect(summary.ksm.skipped).toBe(false);
    expect(summary.ksm.syncedProjects).toBe(2);
    expect(summary.ksm.failedProjects).toBe(0);
    expect(summary.ksm.totalLots).toBe(14);
    expect(summary.kino).toMatchObject({
      skipped: true,
      reason: 'Provider not requested',
      syncedProjects: 0,
    });
  });

  it('syncs KINO projects with isolated error handling', async () => {
    const fakeSql = { query: vi.fn() };
    const syncKssk = vi.fn();
    const syncKsm = vi.fn();
    const syncKino = vi.fn(async (slug) => {
      if (slug === 'iuterra') {
        throw new Error('API down');
      }
      return {
        projectSlug: slug,
        projectName: KINO_PROJECTS[slug].projectName,
        totalCount: 50,
        syncedCount: 50,
        syncedAt: '2026-11-13T08:00:00.000Z',
        lots: [],
      };
    });

    const summary = await runScheduledLotsSync(fakeSql, {
      providers: ['kino'],
      syncKssk,
      syncKsm,
      syncKino,
    });

    expect(syncKssk).not.toHaveBeenCalled();
    expect(syncKsm).not.toHaveBeenCalled();
    expect(syncKino).toHaveBeenCalledTimes(Object.keys(KINO_PROJECTS).length);

    expect(summary.kino.syncedProjects).toBe(Object.keys(KINO_PROJECTS).length - 1);
    expect(summary.kino.failedProjects).toBe(1);
    expect(summary.kino.skipped).toBe(false);
    expect(summary.kino.results.find((r) => r.projectSlug === 'iuterra')).toMatchObject({
      projectSlug: 'iuterra',
      status: 'error',
      error: 'API down',
    });
  });
});
