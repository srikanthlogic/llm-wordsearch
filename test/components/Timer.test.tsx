import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import Timer from '../../components/Timer';

// Mock the useI18n hook to provide translations for testing
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

/**
 * Test suite for Timer component
 * This suite verifies the Timer component's core functionality including:
 * - Proper rendering of time display with correct formatting
 * - Color changes based on time remaining (red for <60s, normal otherwise)
 * - CSS styling and component structure
 * - Edge cases like zero and large time values
 * - Internationalization support through mocked useI18n hook
 */
describe('Timer', () => {
  /**
   * Test basic rendering functionality
   * Ensures the component displays the title and formatted time correctly
   */
  it('should render timer with formatted time', () => {
    render(<Timer seconds={125} />);

    expect(screen.getByText('Time')).toBeInTheDocument();
    expect(screen.getByText('02:05')).toBeInTheDocument();
  });

  /**
   * Test color logic for time above 60 seconds
   * Verifies normal color classes are applied when time is sufficient
   */
  it('should display time in normal color when above 60 seconds', () => {
    render(<Timer seconds={120} />);

    const timeElement = screen.getByText('02:00');
    expect(timeElement).toHaveClass('text-slate-900', 'dark:text-slate-100');
    expect(timeElement).not.toHaveClass('text-red-500');
  });

  /**
   * Test color logic for time below 60 seconds
   * Verifies red color is applied when time is running low
   */
  it('should display time in red when below 60 seconds', () => {
    render(<Timer seconds={30} />);

    const timeElement = screen.getByText('00:30');
    expect(timeElement).toHaveClass('text-red-500');
  });

  /**
   * Test boundary condition at exactly 59 seconds
   * Ensures red color triggers at the correct threshold
   */
  it('should display time in red when exactly 59 seconds', () => {
    render(<Timer seconds={59} />);

    const timeElement = screen.getByText('00:59');
    expect(timeElement).toHaveClass('text-red-500');
  });

  /**
   * Test boundary condition at exactly 60 seconds
   * Ensures normal color is maintained at the threshold
   */
  it('should display time in normal color when exactly 60 seconds', () => {
    render(<Timer seconds={60} />);

    const timeElement = screen.getByText('01:00');
    expect(timeElement).toHaveClass('text-slate-900', 'dark:text-slate-100');
    expect(timeElement).not.toHaveClass('text-red-500');
  });

  /**
   * Test edge case with zero seconds
   * Verifies component handles minimum time value correctly
   */
  it('should handle zero seconds', () => {
    render(<Timer seconds={0} />);

    const timeElement = screen.getByText('00:00');
    expect(timeElement).toHaveClass('text-red-500');
  });

  /**
   * Test with large time values
   * Ensures formatting works correctly for extended durations
   */
  it('should handle large time values correctly', () => {
    render(<Timer seconds={7265} />); // 2 hours, 1 minute, 5 seconds

    expect(screen.getByText('02:01:05')).toBeInTheDocument();
    const timeElement = screen.getByText('02:01:05');
    expect(timeElement).toHaveClass('text-slate-900', 'dark:text-slate-100');
  });

  /**
   * Test CSS styling classes
   * Verifies all required styling classes are present for proper appearance
   */
  it('should have correct CSS classes for styling', () => {
    render(<Timer seconds={125} />);

    const timeElement = screen.getByText('02:05');
    expect(timeElement).toHaveClass('text-4xl', 'font-mono', 'font-bold');
  });

  /**
   * Test component structure and layout
   * Ensures proper DOM structure with correct container and element classes
   */
  it('should have correct structure', () => {
    render(<Timer seconds={125} />);

    const container = screen.getByText('Time').parentElement;
    expect(container).toHaveClass('text-center');

    const titleElement = screen.getByText('Time');
    expect(titleElement).toHaveClass('text-slate-600', 'dark:text-slate-400', 'text-sm');
  });
});