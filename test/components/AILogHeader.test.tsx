import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { describe, it, expect, vi } from 'vitest';

vi.mock('../../hooks/useI18n', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../hooks/useI18n')>();
  return {
    ...actual,
    useI18n: () => ({
      language: 'en',
      setLanguage: vi.fn(),
      t: (key: string) => key,
    }),
  };
});


import AILogHeader from '../../components/AILogHeader';

describe('AILogHeader', () => {
  const defaultProps = {
    searchQuery: '',
    onSearchChange: vi.fn(),
    typeFilter: 'all' as const,
    onTypeFilterChange: vi.fn(),
    statusFilter: 'all' as const,
    onStatusFilterChange: vi.fn(),
  };

  it('should render search input', () => {
    render(<AILogHeader {...defaultProps} />);
    expect(screen.getByLabelText('ailog.search')).toBeInTheDocument();
  });

  it('should call onSearchChange when typing in search', () => {
    const onSearchChange = vi.fn();
    render(<AILogHeader {...defaultProps} onSearchChange={onSearchChange} />);
    const input = screen.getByLabelText('ailog.search');
    fireEvent.change(input, { target: { value: 'test query' } });
    expect(onSearchChange).toHaveBeenCalledWith('test query');
  });

  it('should display current search value', () => {
    render(<AILogHeader {...defaultProps} searchQuery="hello" />);
    expect(screen.getByDisplayValue('hello')).toBeInTheDocument();
  });

  it('should render type filter buttons', () => {
    render(<AILogHeader {...defaultProps} />);
    expect(screen.getByText('All Types')).toBeInTheDocument();
  });

  it('should render status filter buttons', () => {
    render(<AILogHeader {...defaultProps} />);
    expect(screen.getByText('All Status')).toBeInTheDocument();
  });
});
