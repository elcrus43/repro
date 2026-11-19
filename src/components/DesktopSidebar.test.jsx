import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { DesktopSidebar } from './DesktopSidebar';

vi.mock('../context/AppContext', () => ({
  useApp: () => ({
    state: {
      currentUser: { id: 'u1', full_name: 'Александр', role: 'admin' },
      pendingUsers: []
    }
  })
}));

describe('DesktopSidebar', () => {
  it('renders "Подбор" and does not render "Подборки"', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <DesktopSidebar />
      </MemoryRouter>
    );

    // "Подбор" should be present in nav
    expect(screen.getByText('Подбор')).toBeInTheDocument();

    // "Подборки" should NOT be in nav
    expect(screen.queryByText('Подборки')).not.toBeInTheDocument();
  });
});
