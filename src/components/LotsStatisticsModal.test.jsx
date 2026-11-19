import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { LotsStatisticsModal } from './LotsStatisticsModal';

describe('LotsStatisticsModal Component', () => {
  beforeEach(() => {
    localStorage.clear();
    // Mock navigator.clipboard
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    });
  });

  it('renders modal with title and KPI metrics when isOpen is true', () => {
    render(<LotsStatisticsModal isOpen={true} onClose={() => {}} />);

    expect(screen.getByText('Динамика квартир застройщиков')).toBeInTheDocument();
    expect(screen.getByText('В наличии сейчас')).toBeInTheDocument();
    expect(screen.getByText('Добавлено новых')).toBeInTheDocument();
    expect(screen.getByText('Продано / снято')).toBeInTheDocument();
    expect(screen.getByText('Баланс рынка (Net)')).toBeInTheDocument();
  });

  it('does not render anything when isOpen is false', () => {
    const { container } = render(<LotsStatisticsModal isOpen={false} onClose={() => {}} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('allows switching period presets (e.g. 7 дней, Все время)', () => {
    render(<LotsStatisticsModal isOpen={true} onClose={() => {}} />);

    const weekBtn = screen.getByText('7 дней');
    fireEvent.click(weekBtn);
    expect(weekBtn).toHaveClass('active');

    const allBtn = screen.getByText('Все время');
    fireEvent.click(allBtn);
    expect(allBtn).toHaveClass('active');
  });

  it('switches between view tabs (Projects, Developers, Events)', () => {
    render(<LotsStatisticsModal isOpen={true} onClose={() => {}} />);

    // Click on Developers tab
    const devsTab = screen.getByRole('button', { name: /По застройщикам/i });
    fireEvent.click(devsTab);
    expect(devsTab).toHaveClass('active');

    // Click on Events change log tab
    const eventsTab = screen.getByRole('button', { name: /Журнал движения квартир/i });
    fireEvent.click(eventsTab);
    expect(eventsTab).toHaveClass('active');
  });

  it('copies statistics summary to clipboard on button click', async () => {
    render(<LotsStatisticsModal isOpen={true} onClose={() => {}} />);

    const copyBtn = screen.getByText('Скопировать сводку');
    fireEvent.click(copyBtn);

    expect(navigator.clipboard.writeText).toHaveBeenCalledTimes(1);
    const calledText = navigator.clipboard.writeText.mock.calls[0][0];
    expect(calledText).toContain('Статистика динамики лотов новостроек Кирова');
  });

  it('calls onClose when close button is clicked or Escape key is pressed', () => {
    const onClose = vi.fn();
    render(<LotsStatisticsModal isOpen={true} onClose={onClose} />);

    const closeBtn = screen.getByLabelText('Закрыть статистику');
    fireEvent.click(closeBtn);
    expect(onClose).toHaveBeenCalledTimes(1);

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(2);
  });
});
