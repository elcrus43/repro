import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { DetailsPage } from './DetailsPage';

vi.mock('../../components/Toast', () => ({
  useToastContext: () => ({
    toast: {
      success: vi.fn(),
      error: vi.fn(),
      info: vi.fn(),
    },
  }),
}));

vi.mock('../../hooks/useDevelopmentsCatalog', () => ({
  useDevelopmentsCatalog: () => ({
    developments: [],
    ksmLots: [],
    ksskLots: [],
    ksmProjects: [],
    ksskProjects: [],
  }),
}));

vi.mock('../../components/ClientSearchPanel', () => ({
  ClientSearchPanel: () => <div data-testid="client-search-panel" />,
}));

vi.mock('../../components/RequestDevelopmentsSection', () => ({
  RequestDevelopmentsSection: () => <div data-testid="request-devs-section" />,
}));

const mockDispatch = vi.fn();

const mockState = {
  currentUser: { id: 'u1', full_name: 'Александр', role: 'admin' },
  clients: [
    {
      id: 'c1',
      full_name: 'Иван Покупатель',
      phone: '+79001234567',
      client_types: ['buyer'],
      status: 'active',
    },
  ],
  properties: [],
  requests: [
    {
      id: 'r1',
      client_id: 'c1',
      client_ids: ['c1'],
      status: 'active',
      property_types: ['apartment'],
      budget_max: 6000000,
      rooms: [2],
      city: 'Киров',
    },
  ],
  matches: [],
  deals: [],
  tasks: [],
  showings: [],
  selectionItems: [
    {
      id: 'sel-avito-1',
      client_id: 'c1',
      client_ids: ['c1'],
      address: 'ул. Воровского, 102',
      price: 4950000,
      rooms: 2,
      area_total: 52.4,
      floor: 5,
      floors_total: 9,
      property_type: 'apartment',
      link: 'https://www.avito.ru/kirovskaya_oblast_kirov/kvartiry/2-k._kvartira_123456',
      notes: 'Источник: Авито',
    },
    {
      id: 'sel-other-client',
      client_id: 'c2',
      client_ids: ['c2'],
      address: 'ул. Чужая, 99',
      price: 3000000,
      rooms: 1,
      property_type: 'apartment',
      link: 'https://www.avito.ru/kirovskaya_oblast_kirov/kvartiry/999',
    },
  ],
};

vi.mock('../../context/AppContext', () => ({
  useApp: () => ({
    state: mockState,
    dispatch: mockDispatch,
  }),
}));

describe('Requests DetailsPage - client selection items', () => {
  it('renders added Avito selection item for the request client and hides other clients items', () => {
    render(
      <MemoryRouter initialEntries={['/requests/r1']}>
        <Routes>
          <Route path="/requests/:id" element={<DetailsPage />} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText('Объекты в подборе')).toBeTruthy();
    expect(screen.getByText(/ул\. Воровского, 102/)).toBeTruthy();
    expect(screen.getByText('Авито')).toBeTruthy();
    expect(screen.queryByText(/ул\. Чужая, 99/)).toBeNull();
  });
});
