import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { DetailsPage } from './DetailsPage';

// Mock contexts and hooks
vi.mock('../../components/Toast', () => ({
  useToastContext: () => ({
    toast: {
      success: vi.fn(),
      error: vi.fn(),
      info: vi.fn()
    }
  })
}));

vi.mock('../../hooks/useDevelopmentsCatalog', () => ({
  useDevelopmentsCatalog: () => ({ developments: [] })
}));

vi.mock('../../lib/contactsSync', () => ({
  saveClientToDevice: vi.fn()
}));

const mockDispatch = vi.fn();

const mockState = {
  currentUser: { id: 'u1', full_name: 'Александр', role: 'admin' },
  clients: [
    {
      id: 'c1',
      full_name: 'Тестовый Клиент',
      phone: '+79001234567',
      client_types: ['buyer'],
      status: 'active'
    }
  ],
  properties: [],
  requests: [
    {
      id: 'r1',
      client_id: 'c1',
      client_ids: ['c1'],
      status: 'active',
      property_types: ['apartment'],
      budget_max: 6000000
    }
  ],
  matches: [],
  deals: [],
  tasks: [],
  showings: [],
  selectionItems: [
    {
      id: 's1',
      client_id: 'c1',
      client_ids: ['c1'],
      address: 'ул. Ленина, 45',
      price: 5200000,
      rooms: 2,
      area_total: 54,
      floor: 5,
      floors_total: 9,
      property_type: 'apartment',
      contact_name: 'Анна',
      contact_phone: '+79991112233'
    }
  ]
};

vi.mock('../../context/AppContext', () => ({
  useApp: () => ({
    state: mockState,
    dispatch: mockDispatch
  })
}));

describe('Client DetailsPage - Selection (Подбор)', () => {
  it('renders "Подбор" block with client selection items and presentation button', () => {
    render(
      <MemoryRouter initialEntries={['/clients/c1']}>
        <Routes>
          <Route path="/clients/:id" element={<DetailsPage />} />
        </Routes>
      </MemoryRouter>
    );

    // Section title
    expect(screen.getAllByText('Подбор').length).toBeGreaterThan(0);

    // Object address & price
    expect(screen.getByText(/ул\. Ленина, 45/)).toBeInTheDocument();
    expect(screen.getByText(/5 200 000 ₽/)).toBeInTheDocument();

    // Presentation button
    const presButton = screen.getByText('Презентация');
    expect(presButton).toBeInTheDocument();

    // Clicking presentation opens modal
    fireEvent.click(presButton);
    expect(screen.getByText('Презентация подборки объектов')).toBeInTheDocument();
  });
});
