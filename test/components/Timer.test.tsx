import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import Timer from '../../components/Timer';

// Mock the useI18n hook
vi.mock('../../hooks/useI18n', () => ({
  useI18n: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'timer.title': 'Time'
      };
      return translations[key] || key;
    }
  })
}));

describe('Timer', () => {
  it('should render timer with formatted time', () => {
    render(<Timer seconds={125} />);
    
    expect(screen.getByText('Time')).toBeInTheDocument();
    expect(screen.getByText('02:05')).toBeInTheDocument();
  });

  it('should display time in normal color when above 60 seconds', () => {
    render(<Timer seconds={120} />);
    
    const timeElement = screen.getByText('02:00');
    expect(timeElement).toHaveClass('text-slate-900', 'dark:text-slate-100');
    expect(timeElement).not.toHaveClass('text-red-500');
  });

  it('should display time in red when below 60 seconds', () => {
    render(<Timer seconds={30} />);
    
    const timeElement = screen.getByText('00:30');
    expect(timeElement).toHaveClass('text-red-500');
  });

  it('should display time in red when exactly 59 seconds', () => {
    render(<Timer seconds={59} />);
    
    const timeElement = screen.getByText('00:59');
    expect(timeElement).toHaveClass('text-red-500');
  });

  it('should display time in normal color when exactly 60 seconds', () => {
    render(<Timer seconds={60} />);
    
    const timeElement = screen.getByText('01:00');
    expect(timeElement).toHaveClass('text-slate-900', 'dark:text-slate-100');
    expect(timeElement).not.toHaveClass('text-red-500');
  });

  it('should handle zero seconds', () => {
    render(<Timer seconds={0} />);
    
    const timeElement = screen.getByText('00:00');
    expect(timeElement).toHaveClass('text-red-500');
  });

  it('should have correct CSS classes for styling', () => {
    render(<Timer seconds={125} />);
    
    const timeElement = screen.getByText('02:05');
    expect(timeElement).toHaveClass('text-4xl', 'font-mono', 'font-bold');
  });

  it('should have correct structure', () => {
    render(<Timer seconds={125} />);
    
    const container = screen.getByText('Time').parentElement;
    expect(container).toHaveClass('text-center');
    
    const titleElement = screen.getByText('Time');
    expect(titleElement).toHaveClass('text-slate-600', 'dark:text-slate-400', 'text-sm');
  });
});