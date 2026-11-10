import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useFormDraft } from './useFormDraft.js';

describe('useFormDraft hook', () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.useFakeTimers();
  });

  it('detects existing draft in localStorage on mount', () => {
    const existingData = { title: '2-к квартира', price: 4500000 };
    window.localStorage.setItem(
      'draft_test_prop',
      JSON.stringify({ savedAt: Date.now(), data: existingData })
    );

    const { result } = renderHook(() =>
      useFormDraft('draft_test_prop', { title: '' }, { debounceMs: 100 })
    );

    expect(result.current.hasDraft).toBe(true);
    expect(result.current.draftData).toEqual(existingData);

    let restored;
    act(() => {
      restored = result.current.restoreDraft();
    });

    expect(restored).toEqual(existingData);
    expect(result.current.hasDraft).toBe(false);
  });

  it('auto-saves form data to localStorage after debounce', () => {
    const initialData = { address: 'ул. Ленина, 10' };
    const { rerender } = renderHook(
      ({ data }) => useFormDraft('draft_auto_save', data, { debounceMs: 200 }),
      { initialProps: { data: initialData } }
    );

    const updatedData = { address: 'ул. Ленина, 15', price: 5000000 };
    rerender({ data: updatedData });

    // До истечения таймера в хранилище ничего нет
    expect(window.localStorage.getItem('draft_auto_save')).toBeNull();

    // Перематываем время
    act(() => {
      vi.advanceTimersByTime(250);
    });

    const savedRaw = window.localStorage.getItem('draft_auto_save');
    expect(savedRaw).not.toBeNull();
    const parsed = JSON.parse(savedRaw);
    expect(parsed.data).toEqual(updatedData);
  });

  it('clears draft from localStorage on clearDraft()', () => {
    window.localStorage.setItem(
      'draft_clear_test',
      JSON.stringify({ data: { test: true } })
    );

    const { result } = renderHook(() =>
      useFormDraft('draft_clear_test', {}, { debounceMs: 100 })
    );

    expect(result.current.hasDraft).toBe(true);

    act(() => {
      result.current.clearDraft();
    });

    expect(result.current.hasDraft).toBe(false);
    expect(result.current.draftData).toBeNull();
    expect(window.localStorage.getItem('draft_clear_test')).toBeNull();
  });
});
