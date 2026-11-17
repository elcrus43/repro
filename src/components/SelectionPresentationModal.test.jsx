import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { SelectionPresentationModal } from './SelectionPresentationModal';

// Mock Toast context
vi.mock('./Toast', () => ({
  useToastContext: () => ({
    toast: {
      success: vi.fn(),
      warning: vi.fn(),
      error: vi.fn()
    }
  })
}));

describe('SelectionPresentationModal', () => {
  const mockItems = [
    {
      id: 'sel-1',
      address: 'ул. Ленина, 10',
      price: 5000000,
      area_total: 45,
      rooms: 1,
      residential_complex: 'ЖК Центр',
      developer: 'Застройщик 1'
    },
    {
      id: 'sel-2',
      address: 'ул. Свободы, 28',
      price: 12000000,
      area_total: 75,
      rooms: 2,
      residential_complex: 'Дом Булычев',
      developer: 'Железно'
    }
  ];

  const mockClient = {
    id: 'c-1',
    full_name: 'Иван Иванов',
    phone: '+79001234567'
  };

  const mockUser = {
    id: 'u-1',
    full_name: 'Риелтор Петров',
    phone: '+79998887766'
  };

  it('does not render when isOpen is false', () => {
    const { container } = render(
      <SelectionPresentationModal isOpen={false} items={mockItems} client={mockClient} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders modal with client name and property cards when isOpen is true', () => {
    render(
      <SelectionPresentationModal
        isOpen={true}
        items={mockItems}
        client={mockClient}
        currentUser={mockUser}
      />
    );

    expect(screen.getByText('Презентация подборки объектов')).toBeInTheDocument();
    expect(screen.getAllByText('Иван Иванов').length).toBeGreaterThan(0);
    expect(screen.getAllByText(/ул\. Ленина, 10/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/ул\. Свободы, 28/).length).toBeGreaterThan(0);
    expect(screen.getByText('Риелтор Петров')).toBeInTheDocument();
  });

  it('allows toggling items in presentation checklist', () => {
    render(
      <SelectionPresentationModal
        isOpen={true}
        items={mockItems}
        client={mockClient}
      />
    );

    expect(screen.getByText(/Выбрано:/)).toHaveTextContent('Выбрано: 2 из 2 объектов');
    const chipButtons = screen.getAllByRole('button');
    const chip = chipButtons.find(b => b.textContent?.includes('ЖК Центр'));
    expect(chip).toBeDefined();

    act(() => {
      fireEvent.click(chip);
    });

    expect(screen.getByText(/Выбрано:/)).toHaveTextContent('Выбрано: 1 из 2 объектов');
  });

  it('copies text presentation to clipboard', async () => {
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined)
      }
    });

    render(
      <SelectionPresentationModal
        isOpen={true}
        items={mockItems}
        client={mockClient}
        currentUser={mockUser}
      />
    );

    const copyBtn = screen.getByText('Копировать');
    await act(async () => {
      fireEvent.click(copyBtn);
    });

    expect(navigator.clipboard.writeText).toHaveBeenCalled();
  });
});
