import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import NewsPage from './NewsPage';

const mockShowToast = vi.fn();
const mockApiFetch = vi.fn();

vi.mock('../../context/AppContext', () => ({
  useApp: () => ({
    state: {
      currentUser: {
        id: 'u1',
        full_name: 'Александр Ельчугин',
        phone: '89091304090',
        social_accounts: {},
      },
    },
  }),
}));

vi.mock('../../components/Toast', () => ({
  useToastContext: () => ({ showToast: mockShowToast }),
}));

vi.mock('../../lib/apiConfig', () => ({
  apiFetch: (...args) => mockApiFetch(...args),
}));

vi.mock('../../lib/neon', () => ({
  getToken: () => 'test-jwt',
}));

describe('NewsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    mockApiFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        sourceMode: 'tg+rss',
        items: [
          {
            id: 'n1',
            title: 'Семейная ипотека: главные изменения',
            summary: 'Банки обновили условия выдачи.',
            category: 'official',
            source: 'Домклик',
            publishedAt: '2026-11-26T09:00:00.000Z',
            url: 'https://t.me/domclick/9769',
            imageUrl: 'https://cdn4.telesco.pe/file/test.jpg',
            storyPreset: {
              badge: 'ОФИЦИАЛЬНО',
              headline: 'Семейная ипотека: главные изменения',
              summary: 'Банки обновили условия выдачи.',
              bullets: ['Что изменилось', 'Кому подходит'],
              cta: 'Напишите в ЛС',
            },
          },
        ],
      }),
    });
  });

  it('loads news on mount and opens story designer modal', async () => {
    render(<NewsPage />);

    expect(screen.getByText('Новости недвижимости')).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText('Семейная ипотека: главные изменения')).toBeInTheDocument();
    });

    const sourceLink = screen.getByRole('link', { name: /Источник/i });
    expect(sourceLink).toHaveAttribute('href', 'https://t.me/domclick/9769');

    const storyBtn = screen.getByRole('button', { name: /Оформить в сторис/i });
    fireEvent.click(storyBtn);

    expect(screen.getByRole('dialog', { name: /Оформление новости в сторис/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Скачать PNG/i })).toBeInTheDocument();
  });

  it('triggers search with query and category', async () => {
    render(<NewsPage />);
    await waitFor(() => expect(mockApiFetch).toHaveBeenCalledTimes(1));

    const memesTab = screen.getByRole('button', { name: /Мемы и юмор/i });
    fireEvent.click(memesTab);

    await waitFor(() => expect(mockApiFetch).toHaveBeenCalledTimes(2));
    const [endpoint, reqInit] = mockApiFetch.mock.calls[1];
    expect(endpoint).toBe('/api/ai-proxy');
    const lastBody = JSON.parse(reqInit.body);
    expect(lastBody.action).toBe('searchNews');
    expect(lastBody.category).toBe('memes');
  });
});
