import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { FormPage } from './FormPage';

const mockDispatch = vi.fn().mockResolvedValue(true);
const mockNavigate = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock('../../components/Toast', () => ({
  useToastContext: () => ({
    toast: {
      success: vi.fn(),
      error: vi.fn(),
      info: vi.fn(),
    },
  }),
}));

vi.mock('../../components/AddressAutocomplete', () => ({
  AddressAutocomplete: ({ value, onChange, placeholder }) => (
    <input
      aria-label="Адрес"
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
    />
  ),
}));

vi.mock('../../components/MultiClientSelector', () => ({
  MultiClientSelector: () => <div data-testid="multi-client-selector" />,
}));

const mockState = {
  currentUser: { id: 'u1', full_name: 'Александр', role: 'admin' },
  clients: [
    {
      id: 'c1',
      full_name: 'Иван Петров',
      phone: '79091304090',
      client_types: ['seller'],
    },
    {
      id: 'c2',
      full_name: 'Мария Сидорова',
      phone: '79128887766',
      client_types: ['agent'],
    },
  ],
  selectionItems: [],
};

vi.mock('../../context/AppContext', () => ({
  useApp: () => ({
    state: mockState,
    dispatch: mockDispatch,
  }),
}));

describe('Selection FormPage - ad link and contact cross-search', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('allows entering ad link and searching contacts by name or phone', () => {
    render(
      <MemoryRouter initialEntries={['/selection/new']}>
        <Routes>
          <Route path="/selection/new" element={<FormPage />} />
        </Routes>
      </MemoryRouter>
    );

    const linkInput = screen.getByPlaceholderText(/avito\.ru/i);
    fireEvent.change(linkInput, { target: { value: 'https://www.avito.ru/kirov/kvartiry/123' } });
    expect(screen.getByText('Открыть').getAttribute('href')).toBe('https://www.avito.ru/kirov/kvartiry/123');

    const contactSearchInput = screen.getByPlaceholderText(/Введите имя или цифры телефона/i);
    fireEvent.change(contactSearchInput, { target: { value: 'Иван' } });
    expect(screen.getByText('Иван Петров')).toBeTruthy();

    fireEvent.change(contactSearchInput, { target: { value: '88877' } });
    expect(screen.getByText('Мария Сидорова')).toBeTruthy();

    fireEvent.click(screen.getByText('Мария Сидорова'));
    const nameInput = screen.getByPlaceholderText(/ФИО собственника или агента/i);
    expect(nameInput.value).toBe('Мария Сидорова');
  });
});
