import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import HistoryPanel from '../../components/HistoryPanel';
import { GameHistory } from '../../types';

// Mock the useI18n hook
vi.mock('../../hooks/useI18n', () => ({
  useI18n: () => ({
    t: (key: string, params?: any) => {
      if (key === 'player.history.levels') {
        return `${params.completed}/${params.total} Levels`;
      }
      if (key === 'player.history.won') return 'Won';
      if (key === 'player.history.lost') return 'Lost';
      if (key === 'player.history.title') return 'Game History';
      if (key === 'player.history.noGames') return 'No games played yet.';
      return key;
    },
    language: 'en',
    setLanguage: () => {},
  }),
}));

describe('HistoryPanel', () => {
  it('should render a message when there is no history', () => {
    render(<HistoryPanel history={[]} />);
    expect(screen.getByText('No games played yet.')).toBeInTheDocument();
  });

  it('should render a list of history items', () => {
    const history: GameHistory[] = [
      { theme: 'Animals', language: 'en', levelsCompleted: 2, totalLevels: 3, date: '2024-01-01T12:00:00Z', won: false },
      { theme: 'Food', language: 'es', levelsCompleted: 5, totalLevels: 5, date: '2024-01-02T12:00:00Z', won: true },
    ];
    render(<HistoryPanel history={history} />);

    expect(screen.getByText('Animals')).toBeInTheDocument();
    expect(screen.getByText('Food')).toBeInTheDocument();
    expect(screen.getByText('2/3 Levels')).toBeInTheDocument();
    expect(screen.getByText('5/5 Levels')).toBeInTheDocument();
  });

  it('should sort history items by date in descending order', () => {
    const history: GameHistory[] = [
      { theme: 'Animals', language: 'en', levelsCompleted: 2, totalLevels: 3, date: '2024-01-01T12:00:00Z', won: false },
      { theme: 'Food', language: 'es', levelsCompleted: 5, totalLevels: 5, date: '2024-01-02T12:00:00Z', won: true },
    ];
    render(<HistoryPanel history={history} />);

    const items = screen.getAllByRole('listitem');
    expect(items[0]).toHaveTextContent('Food');
    expect(items[1]).toHaveTextContent('Animals');
  });

  it('should display "Won" for won games and "Lost" for lost games', () => {
    const history: GameHistory[] = [
      { theme: 'Animals', language: 'en', levelsCompleted: 2, totalLevels: 3, date: '2024-01-01T12:00:00Z', won: false },
      { theme: 'Food', language: 'es', levelsCompleted: 5, totalLevels: 5, date: '2024-01-02T12:00:00Z', won: true },
    ];
    render(<HistoryPanel history={history} />);

    expect(screen.getByText('Won')).toBeInTheDocument();
    expect(screen.getByText('Lost')).toBeInTheDocument();
  });

  it('should format the date correctly', () => {
    const history: GameHistory[] = [
      { theme: 'Animals', language: 'en', levelsCompleted: 2, totalLevels: 3, date: '2024-01-01T12:00:00Z', won: false },
    ];
    render(<HistoryPanel history={history} />);
    // Note: The exact date format depends on the test environment's locale.
    // We'll check for the presence of the year, month, and day.
    expect(screen.getByText(/January 1, 2024/i)).toBeInTheDocument();
  });
});
