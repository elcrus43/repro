import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { PriceInput } from './PriceInput';

describe('PriceInput', () => {
  it('formats numeric value with thousands space separator', () => {
    render(<PriceInput value={3500000} placeholder="0" />);
    const input = screen.getByPlaceholderText('0');
    expect(input.value).toBe('3 500 000');
  });

  it('renders empty string for null, undefined, or empty string', () => {
    const { rerender } = render(<PriceInput value="" placeholder="0" />);
    let input = screen.getByPlaceholderText('0');
    expect(input.value).toBe('');

    rerender(<PriceInput value={null} placeholder="0" />);
    input = screen.getByPlaceholderText('0');
    expect(input.value).toBe('');

    rerender(<PriceInput value={undefined} placeholder="0" />);
    input = screen.getByPlaceholderText('0');
    expect(input.value).toBe('');
  });

  it('calls onChange with clean number and formatted string', () => {
    const handleChange = vi.fn();
    render(<PriceInput value="" onChange={handleChange} placeholder="0" />);
    const input = screen.getByPlaceholderText('0');

    fireEvent.change(input, { target: { value: '12500000' } });
    expect(handleChange).toHaveBeenCalledWith(12500000, '12 500 000', expect.any(Object));
  });

  it('strips non-digits on input', () => {
    const handleChange = vi.fn();
    render(<PriceInput value="" onChange={handleChange} placeholder="0" />);
    const input = screen.getByPlaceholderText('0');

    fireEvent.change(input, { target: { value: '5 400 000 ₽' } });
    expect(handleChange).toHaveBeenCalledWith(5400000, '5 400 000', expect.any(Object));
  });

  it('renders suffix when provided', () => {
    render(<PriceInput value={150000} suffix="₽" placeholder="0" />);
    expect(screen.getByText('₽')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('0').value).toBe('150 000');
  });
});
