import { describe, it, expect, beforeEach } from 'vitest';
import {
  recordLotsSyncDiff,
  getLotsStatistics,
  buildLotsStatisticsReportText,
  getTodayDateString,
  DEVELOPER_LABELS,
} from './lotsStatistics';

describe('lotsStatistics module', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('correctly calculates added and removed lots between sync runs', () => {
    const previousLots = [
      { id: 'lot-1', title: '1к 35м²', flat_number: '10', price: 3500000 },
      { id: 'lot-2', title: '2к 55м²', flat_number: '11', price: 5200000 },
      { id: 'lot-3', title: 'Студия 25м²', flat_number: '12', price: 2900000 },
    ];

    const nextLots = [
      { id: 'lot-1', title: '1к 35м²', flat_number: '10', price: 3500000 }, // stayed
      // lot-2 removed/sold!
      // lot-3 removed/sold!
      { id: 'lot-4', title: '3к 78м²', flat_number: '25', price: 7800000 }, // added!
      { id: 'lot-5', title: 'Студия 27м²', flat_number: '26', price: 3100000 }, // added!
    ];

    const diff = recordLotsSyncDiff({
      provider: 'ksm',
      projectSlug: 'siti-park',
      projectName: 'Сити Парк',
      previousLots,
      nextLots,
    });

    expect(diff.addedCount).toBe(2);
    expect(diff.removedCount).toBe(2);

    const stats = getLotsStatistics({ provider: 'ksm', projectSlug: 'siti-park' });
    const targetProject = stats.projectSummaries.find((p) => p.projectSlug === 'siti-park');
    expect(targetProject).toBeDefined();
    expect(targetProject.addedCount).toBeGreaterThanOrEqual(2);
    expect(targetProject.removedCount).toBeGreaterThanOrEqual(2);
  });

  it('aggregates statistics across multiple developers and projects', () => {
    const today = getTodayDateString();
    const stats = getLotsStatistics({ dateFrom: today, dateTo: today });

    expect(stats.totalCurrent).toBeGreaterThan(0);
    expect(stats.providerSummaries.length).toBeGreaterThan(0);
    expect(stats.projectSummaries.length).toBeGreaterThan(0);

    const hasKsm = stats.providerSummaries.some((p) => p.provider === 'ksm');
    expect(hasKsm).toBe(true);
  });

  it('builds a clean text report with strictly hyphens and no em-dashes', () => {
    const today = getTodayDateString();
    const report = buildLotsStatisticsReportText({ dateFrom: today, dateTo: today });

    expect(report).toContain('Статистика динамики лотов новостроек Кирова');
    expect(report).toContain('Всего квартир в наличии:');
    expect(report).toContain('Добавлено новых квартир:');
    expect(report).toContain('Продано / снято с продажи:');
    // Typography rule: strictly hyphen -, no em-dash —
    expect(report).not.toContain('—');
  });
});
