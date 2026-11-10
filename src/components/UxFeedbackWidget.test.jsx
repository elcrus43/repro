import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { UxFeedbackWidget } from './UxFeedbackWidget.jsx';
import { getMetricsSummary, resetTracker } from '../utils/uxTracker.js';

describe('UxFeedbackWidget component', () => {
  beforeEach(() => {
    resetTracker();
  });

  it('renders correctly and submits CES rating on star click', () => {
    const handleClose = vi.fn();
    render(
      <UxFeedbackWidget
        scenario="property_creation"
        question="Насколько легко было сохранить объект?"
        onClose={handleClose}
      />
    );

    expect(screen.getByText('Насколько легко было сохранить объект?')).toBeDefined();

    // Нажимаем на 5-ю звезду (кнопка с текстом '5')
    const starButton = screen.getByText('5').closest('button');
    fireEvent.click(starButton);

    const summary = getMetricsSummary();
    expect(summary.totalFeedbacksCount).toBe(1);
    expect(summary.avgCES).toBe(5);

    // Должно отобразиться сообщение об успешной отправке
    expect(screen.getByText(/Спасибо! Ваш отзыв поможет сделать CRM удобнее/)).toBeDefined();
  });

  it('calls onClose when close icon is clicked', () => {
    const handleClose = vi.fn();
    render(<UxFeedbackWidget onClose={handleClose} />);

    const closeBtn = screen.getByLabelText('Закрыть');
    fireEvent.click(closeBtn);

    expect(handleClose).toHaveBeenCalledTimes(1);
  });
});
