import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { BannerGenerator } from './BannerGenerator';

// Mock AppContext
vi.mock('../context/AppContext', () => ({
  useApp: () => ({
    state: {
      clients: [
        { id: 'agent-1', full_name: 'Ефим Этажи', phone: '+79086973130', client_types: ['agent'] },
        { id: 'agent-2', full_name: 'Наталья Махиня', phone: '79539467064', client_types: ['agent'] }
      ]
    }
  })
}));

describe('BannerGenerator phone resolution', () => {
  beforeEach(() => {
    HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue({
      measureText: vi.fn().mockReturnValue({ width: 100 }),
      fillText: vi.fn(),
      fillRect: vi.fn(),
      drawImage: vi.fn(),
      save: vi.fn(),
      restore: vi.fn(),
      beginPath: vi.fn(),
      rect: vi.fn(),
      roundRect: vi.fn(),
      clip: vi.fn(),
      fill: vi.fn(),
      strokeRect: vi.fn(),
      createLinearGradient: vi.fn().mockReturnValue({
        addColorStop: vi.fn()
      })
    });
  });

  it('uses assigned agent phone by default when agent is passed as prop', () => {
    const property = { id: 'p1', address: 'ул. Ленина 10', price: 3000000 };
    const agent = { id: 'agent-1', full_name: 'Ефим Этажи', phone: '+79086973130' };
    const currentUser = { id: 'u1', full_name: 'Admin', phone: '' };

    render(
      <BannerGenerator
        property={property}
        agent={agent}
        currentUser={currentUser}
        onClose={() => {}}
      />
    );

    const input = screen.getByPlaceholderText('+7 (___) ___-__-__');
    expect(input.value).toBe('+7 (908) 697-31-30');
  });

  it('resolves agent phone from state.clients using property.agent_id if agent prop is not provided', () => {
    const property = { id: 'p2', agent_id: 'agent-2', address: 'ул. Мира 5', price: 5000000 };
    const currentUser = { id: 'u1', full_name: 'Admin', phone: '' };

    render(
      <BannerGenerator
        property={property}
        currentUser={currentUser}
        onClose={() => {}}
      />
    );

    const input = screen.getByPlaceholderText('+7 (___) ___-__-__');
    expect(input.value).toBe('+7 (953) 946-70-64');
  });

  it('allows user to manually edit the phone number', () => {
    const property = { id: 'p1', address: 'ул. Ленина 10', price: 3000000 };
    const agent = { id: 'agent-1', full_name: 'Ефим Этажи', phone: '+79086973130' };

    render(
      <BannerGenerator
        property={property}
        agent={agent}
        onClose={() => {}}
      />
    );

    const input = screen.getByPlaceholderText('+7 (___) ___-__-__');
    fireEvent.change(input, { target: { value: '+79123456789' } });
    expect(input.value).toBe('+7 (912) 345-67-89');
  });

  it('shows prompt to connect social networks in profile when none are enabled', () => {
    const property = { id: 'p1', address: 'ул. Ленина 10', price: 3000000 };
    const currentUser = { id: 'u1', full_name: 'Agent', passport_details: {} };
    const onOpenProfile = vi.fn();

    render(
      <BannerGenerator
        property={property}
        currentUser={currentUser}
        onClose={() => {}}
        onOpenProfile={onOpenProfile}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /В мои соцсети/i }));
    const connectBtn = screen.getByRole('button', { name: /Подключить в профиле/i });
    expect(connectBtn).toBeInTheDocument();

    fireEvent.click(connectBtn);
    expect(onOpenProfile).toHaveBeenCalledTimes(1);
  });

  it('shows only connected story buttons (VK, OK, TG, Instagram, WhatsApp) and shares banner', async () => {
    HTMLCanvasElement.prototype.toDataURL = vi.fn().mockReturnValue(
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
    );
    const shareToStory = vi.fn().mockResolvedValue({ ok: true, method: 'instagram_story' });
    window.Capacitor = {
      getPlatform: () => 'android',
      Plugins: { SocialSharePlugin: { shareToStory } },
    };

    const property = { id: 'p1', address: 'ул. Ленина 10', price: 3000000 };
    const currentUser = {
      id: 'u1',
      full_name: 'Agent',
      passport_details: {
        social_accounts: {
          vk: { enabled: true, handle: 'vk.com/agent', publishMode: 'share' },
          ok: { enabled: false, handle: '' },
          tg: { enabled: true, handle: '@agent_tg', publishMode: 'share' },
          instagram: { enabled: true, handle: '@agent_ig', publishMode: 'share' },
          whatsapp: { enabled: true, handle: '+79123456789', publishMode: 'share' },
        },
      },
    };

    render(
      <BannerGenerator
        property={property}
        currentUser={currentUser}
        onClose={() => {}}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /В мои соцсети \(4\)/i }));

    expect(screen.getByRole('button', { name: /Сторис VK/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Сторис OK/i })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Сторис ТГ/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Сторис Instagram/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Сторис WhatsApp/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Сторис Instagram/i }));
    await screen.findByRole('status');
    expect(shareToStory).toHaveBeenCalledWith(
      expect.objectContaining({ network: 'instagram', fileName: 'banner-p1-story.png' })
    );

    delete window.Capacitor;
  });
});
