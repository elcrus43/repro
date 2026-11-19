import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useClientSearch, getSourceLabel, getSourceColor } from './useClientSearch';
import * as apiConfig from '../lib/apiConfig';

describe('useClientSearch', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('getSourceLabel возвращает правильные названия площадок', () => {
    expect(getSourceLabel('avito')).toBe('Авито');
    expect(getSourceLabel('cian')).toBe('ЦИАН');
    expect(getSourceLabel('domclick')).toBe('ДомКлик');
    expect(getSourceLabel('yandex')).toBe('Яндекс');
    expect(getSourceLabel('custom')).toBe('custom');
  });

  it('getSourceColor возвращает правильные фирменные цвета', () => {
    expect(getSourceColor('avito')).toBe('#00aaff');
    expect(getSourceColor('cian')).toBe('#e34234');
    expect(getSourceColor('domclick')).toBe('#10b981');
  });

  it('search корректно вызывает /api/search-listings и сохраняет результаты', async () => {
    const mockResults = [
      { id: '1', source: 'avito', title: '1-к квартира', price: 3500000 },
      { id: '2', source: 'domclick', title: '2-к квартира', price: 4800000 },
    ];
    const mockSources = { avito: 1, domclick: 1 };

    vi.spyOn(apiConfig, 'apiFetch').mockResolvedValueOnce({
      ok: true,
      json: async () => ({ results: mockResults, sources: mockSources }),
    });

    const sampleRequest = {
      id: 'req1',
      city: 'Киров',
      rooms: [1, 2],
      budget_max: 5000000,
    };

    const { result } = renderHook(() => useClientSearch(sampleRequest));

    await act(async () => {
      await result.current.search();
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.results).toHaveLength(2);
    expect(result.current.sources).toEqual(mockSources);
    expect(result.current.lastSearched).not.toBeNull();
  });

  it('sendTelegramAlert отправляет флаг notify_telegram', async () => {
    vi.spyOn(apiConfig, 'apiFetch').mockResolvedValueOnce({
      ok: true,
      json: async () => ({ telegram_sent: true }),
    });

    const sampleRequest = {
      id: 'req2',
      city: 'Киров',
      rooms: [2],
      budget_max: 6000000,
      client_name: 'Иван Иванов',
    };

    const { result } = renderHook(() => useClientSearch(sampleRequest));

    let sent = false;
    await act(async () => {
      sent = await result.current.sendTelegramAlert({
        clientName: 'Иван Иванов',
        querySummary: '2-к., до 6 000 000 ₽',
      });
    });

    expect(sent).toBe(true);
    expect(apiConfig.apiFetch).toHaveBeenCalledWith(
      '/api/search-listings',
      expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('"notify_telegram":true'),
      })
    );
  });

  it('clear очищает результаты и ошибки', async () => {
    const sampleRequest = { city: 'Киров' };
    const { result } = renderHook(() => useClientSearch(sampleRequest));

    act(() => {
      result.current.clear();
    });

    expect(result.current.results).toEqual([]);
    expect(result.current.sources).toEqual({});
    expect(result.current.lastSearched).toBeNull();
  });
});
