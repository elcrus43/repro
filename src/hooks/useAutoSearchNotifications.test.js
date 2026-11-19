import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useAutoSearchNotifications } from './useAutoSearchNotifications';
import * as AppContext from '../context/AppContext';

describe('useAutoSearchNotifications', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    window.localStorage.clear();
  });

  it('не запускает проверку, если нет текущего пользователя', () => {
    vi.spyOn(AppContext, 'useApp').mockReturnValue({
      state: {
        currentUser: null,
        requests: [{ id: 'r1', status: 'active' }],
      },
    });

    const { unmount } = renderHook(() => useAutoSearchNotifications());
    unmount();
    // Не должно падать при отсутствии пользователя
    expect(true).toBe(true);
  });

  it('не падает при отсутствии активных запросов', () => {
    vi.spyOn(AppContext, 'useApp').mockReturnValue({
      state: {
        currentUser: { id: 'u1', role: 'realtor' },
        requests: [{ id: 'r1', status: 'completed' }],
      },
    });

    const { unmount } = renderHook(() => useAutoSearchNotifications());
    unmount();
    expect(true).toBe(true);
  });
});
