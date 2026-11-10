import { describe, it, expect, beforeEach } from 'vitest';
import {
  startScenario,
  recordStep,
  recordClick,
  recordError,
  finishScenario,
  cancelScenario,
  recordFeedback,
  getMetricsSummary,
  resetTracker,
  isThumbZone,
  sanitizeSelector,
} from './uxTracker.js';

describe('uxTracker module', () => {
  beforeEach(() => {
    resetTracker();
  });

  it('correctly tracks a full scenario lifecycle (start -> step -> finish)', () => {
    const scenario = startScenario('create_property', { source: 'mobile_nav' });
    expect(scenario.name).toBe('create_property');
    expect(scenario.status).toBe('in_progress');

    const step = recordStep('address_filled');
    expect(step.name).toBe('address_filled');
    expect(step.stepDurationMs).toBeGreaterThanOrEqual(0);

    const clickResult = recordClick('button.submit-btn', 150, 600);
    expect(clickResult.isRageClick).toBe(false);

    const errorResult = recordError('price', 'Цена не может быть отрицательной');
    expect(errorResult.field).toBe('price');

    const finished = finishScenario();
    expect(finished.status).toBe('completed');
    expect(finished.clickCount).toBe(1);
    expect(finished.errors).toHaveLength(1);
    expect(finished.totalDurationMs).toBeGreaterThanOrEqual(0);

    const summary = getMetricsSummary();
    expect(summary.totalScenarios).toBe(1);
    expect(summary.completedScenarios).toBe(1);
    expect(summary.completionRate).toBe(100);
    expect(summary.totalErrors).toBe(1);
  });

  it('detects drop-off when scenario is cancelled or abandoned', () => {
    startScenario('create_request');
    const cancelled = cancelScenario('closed_tab');
    expect(cancelled.status).toBe('abandoned');
    expect(cancelled.abandonReason).toBe('closed_tab');

    const summary = getMetricsSummary();
    expect(summary.totalScenarios).toBe(1);
    expect(summary.abandonedScenarios).toBe(1);
    expect(summary.completionRate).toBe(0);
    expect(summary.dropOffRate).toBe(100);
  });

  it('detects rage clicks when user rapidly clicks 3+ times', () => {
    startScenario('fast_matching');
    recordClick('button.match-apply', 100, 200);
    recordClick('button.match-apply', 102, 201);
    const third = recordClick('button.match-apply', 101, 202);

    expect(third.isRageClick).toBe(true);
    const summary = getMetricsSummary();
    expect(summary.totalRageClicks).toBe(1);
  });

  it('evaluates thumb zone correctly on mobile viewport', () => {
    const screenHeight = 800;
    // Top area (100px) - unreachable for one thumb
    expect(isThumbZone(100, screenHeight)).toBe(false);
    // Middle-bottom area (550px) - thumb friendly
    expect(isThumbZone(550, screenHeight)).toBe(true);
  });

  it('sanitizes selectors to prevent sensitive data leakage', () => {
    const dirty = 'input#password=mysecrettoken&submit';
    const clean = sanitizeSelector(dirty);
    expect(clean).toContain('[REDACTED]');
    expect(clean).not.toContain('mysecrettoken');
  });

  it('records CES and CSAT customer feedback', () => {
    recordFeedback('create_property', { score: 6, metricType: 'CES', comment: 'Быстро заполнил' });
    recordFeedback('create_property', { score: 4, metricType: 'CES', comment: 'Долго искал улицу' });

    const summary = getMetricsSummary();
    expect(summary.totalFeedbacksCount).toBe(2);
    expect(summary.avgCES).toBe(5);
  });
});
