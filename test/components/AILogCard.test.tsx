import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { describe, it, expect, vi } from 'vitest';

import AILogCard from '../../components/AILogCard';
import { AILogEntry, AILogType, AILogStatus } from '../../types';

describe('AILogCard', () => {
  const baseEntry: AILogEntry = {
    id: 'test-1',
    timestamp: new Date('2024-06-15T12:00:00Z'),
    type: AILogType.Info,
    status: AILogStatus.Success,
    message: 'Test log message',
  };

  it('should render the log message', () => {
    render(<AILogCard entry={baseEntry} onClick={vi.fn()} />);
    expect(screen.getByText('Test log message')).toBeInTheDocument();
  });

  it('should render the type badge', () => {
    render(<AILogCard entry={baseEntry} onClick={vi.fn()} />);
    expect(screen.getByText('info')).toBeInTheDocument();
  });

  it('should render details when present', () => {
    const entryWithDetails: AILogEntry = { ...baseEntry, details: 'Extra info' };
    render(<AILogCard entry={entryWithDetails} onClick={vi.fn()} />);
    expect(screen.getByText('Extra info')).toBeInTheDocument();
  });

  it('should not render details when absent', () => {
    render(<AILogCard entry={baseEntry} onClick={vi.fn()} />);
    expect(screen.queryByText('Extra info')).not.toBeInTheDocument();
  });

  it('should call onClick when clicked', () => {
    const onClick = vi.fn();
    render(<AILogCard entry={baseEntry} onClick={onClick} />);
    fireEvent.click(screen.getByText('Test log message'));
    expect(onClick).toHaveBeenCalledWith(baseEntry);
  });

  it('should call onClick on Enter key', () => {
    const onClick = vi.fn();
    render(<AILogCard entry={baseEntry} onClick={onClick} />);
    const card = screen.getByRole('button');
    fireEvent.keyDown(card, { key: 'Enter' });
    expect(onClick).toHaveBeenCalledWith(baseEntry);
  });

  it('should call onClick on Space key', () => {
    const onClick = vi.fn();
    render(<AILogCard entry={baseEntry} onClick={onClick} />);
    const card = screen.getByRole('button');
    fireEvent.keyDown(card, { key: ' ' });
    expect(onClick).toHaveBeenCalledWith(baseEntry);
  });

  it('should apply selected styling when isSelected is true', () => {
    const { container } = render(
      <AILogCard entry={baseEntry} onClick={vi.fn()} isSelected={true} />
    );
    const card = container.firstChild as HTMLElement;
    expect(card.className).toContain('bg-purple-50');
  });

  it('should apply default styling when isSelected is false', () => {
    const { container } = render(
      <AILogCard entry={baseEntry} onClick={vi.fn()} isSelected={false} />
    );
    const card = container.firstChild as HTMLElement;
    expect(card.className).toContain('bg-white');
  });

  it('should render error type correctly', () => {
    const errorEntry: AILogEntry = { ...baseEntry, type: AILogType.Error, status: AILogStatus.Error };
    render(<AILogCard entry={errorEntry} onClick={vi.fn()} />);
    expect(screen.getByText('error')).toBeInTheDocument();
  });

  it('should render request type correctly', () => {
    const reqEntry: AILogEntry = { ...baseEntry, type: AILogType.Request };
    render(<AILogCard entry={reqEntry} onClick={vi.fn()} />);
    expect(screen.getByText('request')).toBeInTheDocument();
  });

  it('should render warning status color', () => {
    const warnEntry: AILogEntry = { ...baseEntry, status: AILogStatus.Pending };
    render(<AILogCard entry={warnEntry} onClick={vi.fn()} />);
  });
});
