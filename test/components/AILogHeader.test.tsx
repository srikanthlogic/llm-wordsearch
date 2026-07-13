import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { describe, it, expect, vi } from 'vitest';

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
    expect(screen.getByPlaceholderText('Search logs...')).toBeInTheDocument();
  });

  it('should call onSearchChange when typing in search', () => {
    const onSearchChange = vi.fn();
    render(<AILogHeader {...defaultProps} onSearchChange={onSearchChange} />);
    const input = screen.getByPlaceholderText('Search logs...');
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
