import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useUxScenario } from './useUxScenario.js';
import { getMetricsSummary, resetTracker } from '../utils/uxTracker.js';

describe('useUxScenario hook', () => {
  beforeEach(() => {
    resetTracker();
  });

  it('automatically tracks completion when completeScenario is called', () => {
    const { result, unmount } = renderHook(() => useUxScenario('test_scenario'));

    act(() => {
      result.current.trackStep('step_1');
      result.current.trackError('phone', 'Некорректный номер');
      result.current.completeScenario();
    });

    unmount();

    const summary = getMetricsSummary();
    expect(summary.totalScenarios).toBe(1);
    expect(summary.completedScenarios).toBe(1);
    expect(summary.completionRate).toBe(100);
    expect(summary.totalErrors).toBe(1);
  });

  it('automatically marks scenario as abandoned (drop-off) on unmount without completion', () => {
    const { unmount } = renderHook(() => useUxScenario('abandon_scenario'));

    // Размонтируем без completeScenario
    unmount();

    const summary = getMetricsSummary();
    expect(summary.totalScenarios).toBe(1);
    expect(summary.abandonedScenarios).toBe(1);
    expect(summary.dropOffRate).toBe(100);
  });

  it('submits CES feedback through hook', () => {
    const { result } = renderHook(() => useUxScenario('feedback_scenario'));

    act(() => {
      result.current.submitFeedback({ score: 7, metricType: 'CES', comment: 'Очень удобно' });
    });

    const summary = getMetricsSummary();
    expect(summary.totalFeedbacksCount).toBe(1);
    expect(summary.avgCES).toBe(7);
  });
});
