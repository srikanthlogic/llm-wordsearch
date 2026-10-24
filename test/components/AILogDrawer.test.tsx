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


import AILogDrawer from '../../components/AILogDrawer';
import { AILogEntry, AILogType, AILogStatus } from '../../types';

describe('AILogDrawer', () => {
  const sampleEntry: AILogEntry = {
    id: 'test-1',
    timestamp: new Date('2024-06-15T12:00:00Z'),
    type: AILogType.Info,
    status: AILogStatus.Success,
    message: 'Test log message',
    details: 'Detailed info here',
  };

  it('should not render when closed', () => {
    const { container } = render(
      <AILogDrawer entry={sampleEntry} isOpen={false} onClose={vi.fn()} />
    );
    expect(container.innerHTML).toBe('');
  });

  it('should not render when entry is null', () => {
    const { container } = render(
      <AILogDrawer entry={null} isOpen={true} onClose={vi.fn()} />
    );
    expect(container.innerHTML).toBe('');
  });

  it('should render when open with entry', () => {
    render(<AILogDrawer entry={sampleEntry} isOpen={true} onClose={vi.fn()} />);
    expect(screen.getByText('Test log message')).toBeInTheDocument();
    expect(screen.getByText('Detailed info here')).toBeInTheDocument();
    expect(screen.getByText('ailog.logDetails')).toBeInTheDocument();
  });

  it('should display entry type and status', () => {
    render(<AILogDrawer entry={sampleEntry} isOpen={true} onClose={vi.fn()} />);
    expect(screen.getByText('info')).toBeInTheDocument();
    expect(screen.getByText('success')).toBeInTheDocument();
  });

  it('should call onClose when backdrop is clicked', () => {
    const onClose = vi.fn();
    render(<AILogDrawer entry={sampleEntry} isOpen={true} onClose={onClose} />);
    // Two controls share the close label (backdrop div + X button);
    // the backdrop is the non-<button> one.
    const backdrop = screen
      .getAllByLabelText('ailog.closeDrawer')
      .find(el => el.tagName !== 'BUTTON')!;
    fireEvent.click(backdrop);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('should call onClose when X button is clicked', () => {
    const onClose = vi.fn();
    render(<AILogDrawer entry={sampleEntry} isOpen={true} onClose={onClose} />);
    // The X button is the <button> carrying the close label (the backdrop
    // is a div[role=button] with the same name).
    const xButton = screen
      .getAllByLabelText('ailog.closeDrawer')
      .find(el => el.tagName === 'BUTTON')!;
    expect(xButton).toBeTruthy();
    if (xButton) fireEvent.click(xButton);
    expect(onClose).toHaveBeenCalled();
  });

  it('should handle entry without details', () => {
    const entryNoDetails: AILogEntry = { ...sampleEntry, details: undefined };
    render(<AILogDrawer entry={entryNoDetails} isOpen={true} onClose={vi.fn()} />);
    expect(screen.getByText('Test log message')).toBeInTheDocument();
    expect(screen.queryByText('Details')).not.toBeInTheDocument();
  });

  it('should display log ID', () => {
    render(<AILogDrawer entry={sampleEntry} isOpen={true} onClose={vi.fn()} />);
    expect(screen.getByText('test-1')).toBeInTheDocument();
  });

  it('should handle entry with metadata', () => {
    const entryWithMeta: AILogEntry = {
      ...sampleEntry,
      metadata: { model: 'gemini', tokens: 100 },
    };
    render(<AILogDrawer entry={entryWithMeta} isOpen={true} onClose={vi.fn()} />);
    expect(screen.getByText(/"model": "gemini"/)).toBeInTheDocument();
  });

  it('should handle error type entries', () => {
    const errorEntry: AILogEntry = {
      ...sampleEntry,
      type: AILogType.Error,
      status: AILogStatus.Error,
    };
    render(<AILogDrawer entry={errorEntry} isOpen={true} onClose={vi.fn()} />);
    expect(screen.getAllByText('error').length).toBe(2);
  });
});
