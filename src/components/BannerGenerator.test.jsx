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
});
