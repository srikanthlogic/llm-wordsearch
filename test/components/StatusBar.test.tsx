import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { describe, it, expect, vi } from 'vitest';

import StatusBar from '../../components/StatusBar';

vi.mock('../../hooks/useI18n', () => ({
  useI18n: () => ({
    t: (key: string) => key === 'statusbar.wordsFound' ? 'words found' : key,
  }),
}));

describe('StatusBar', () => {
  const defaultProps = {
    timeLeft: 125,
    wordsFound: 3,
    totalWords: 10,
    onClick: vi.fn(),
    isSidebarCollapsed: false,
  };

  it('should render formatted time', () => {
    render(<StatusBar {...defaultProps} />);
    expect(screen.getByText('02:05')).toBeInTheDocument();
  });

  it('should render words found count', () => {
    render(<StatusBar {...defaultProps} />);
    expect(screen.getByText('3 / 10')).toBeInTheDocument();
  });

  it('should render words found label', () => {
    render(<StatusBar {...defaultProps} />);
    expect(screen.getByText('words found')).toBeInTheDocument();
  });

  it('should show red color when time < 60', () => {
    render(<StatusBar {...defaultProps} timeLeft={30} />);
    const timeEl = screen.getByText('00:30');
    expect(timeEl).toHaveClass('text-red-500');
  });

  it('should show normal color when time >= 60', () => {
    render(<StatusBar {...defaultProps} timeLeft={120} />);
    const timeEl = screen.getByText('02:00');
    expect(timeEl).not.toHaveClass('text-red-500');
  });

  it('should call onClick when clicked', () => {
    const onClick = vi.fn();
    render(<StatusBar {...defaultProps} onClick={onClick} />);
    fireEvent.click(screen.getByLabelText('Open status bar'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('should call onClick when Enter is pressed', () => {
    const onClick = vi.fn();
    render(<StatusBar {...defaultProps} onClick={onClick} />);
    const el = screen.getByLabelText('Open status bar');
    fireEvent.keyDown(el, { key: 'Enter' });
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('should call onClick when Space is pressed', () => {
    const onClick = vi.fn();
    render(<StatusBar {...defaultProps} onClick={onClick} />);
    const el = screen.getByLabelText('Open status bar');
    fireEvent.keyDown(el, { key: ' ' });
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('should handle zero words found', () => {
    render(<StatusBar {...defaultProps} wordsFound={0} />);
    expect(screen.getByText('0 / 10')).toBeInTheDocument();
  });

  it('should handle zero time left', () => {
    render(<StatusBar {...defaultProps} timeLeft={0} />);
    expect(screen.getByText('00:00')).toBeInTheDocument();
  });
});
