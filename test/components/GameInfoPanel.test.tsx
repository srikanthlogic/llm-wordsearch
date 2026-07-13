import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { describe, it, expect, vi } from 'vitest';

import GameInfoPanel from '../../components/GameInfoPanel';
import type { PlacedWord } from '../../types';

vi.mock('../../hooks/useI18n', () => ({
  useI18n: () => ({
    t: (key: string) => {
      const map: Record<string, string> = {
        'gameInfo.title': 'Game Info',
        'gameInfo.newGameAria': 'New game',
        'gameInfo.showAnswersAria': 'Show answers',
        'gameInfo.closeAria': 'Close',
        'wordlist.title': 'Words',
        'wordlist.toggle': 'Show words',
        'wordlist.toggleAriaLabel': 'Toggle',
      };
      return map[key] || key;
    },
  }),
}));

const sampleWords: PlacedWord[] = [
  { text: 'CAT', hint: 'Furry pet', found: false, positions: [{ x: 0, y: 0 }], color: '#ef4444' },
  { text: 'DOG', hint: 'Loyal friend', found: true, positions: [{ x: 1, y: 0 }], color: '#22c55e' },
];

describe('GameInfoPanel', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    words: sampleWords,
    timeLeft: 90,
    onNewGame: vi.fn(),
    onShowAnswers: vi.fn(),
    canShowAnswers: true,
    isSidebarCollapsed: false,
  };

  it('should render panel title', () => {
    render(<GameInfoPanel {...defaultProps} />);
    expect(screen.getByText('Game Info')).toBeInTheDocument();
  });

  it('should render timer with correct time', () => {
    render(<GameInfoPanel {...defaultProps} />);
    expect(screen.getByText('01:30')).toBeInTheDocument();
  });

  it('should call onClose when backdrop clicked', () => {
    const onClose = vi.fn();
    render(<GameInfoPanel {...defaultProps} onClose={onClose} />);
    // The backdrop div has aria-hidden="true" — click the fixed backdrop
    const backdrop = document.querySelector('[aria-hidden="true"]');
    if (backdrop) fireEvent.click(backdrop);
    expect(onClose).toHaveBeenCalled();
  });

  it('should call onNewGame when button clicked', () => {
    const onNewGame = vi.fn();
    render(<GameInfoPanel {...defaultProps} onNewGame={onNewGame} />);
    fireEvent.click(screen.getByTitle('New game'));
    expect(onNewGame).toHaveBeenCalled();
  });

  it('should call onShowAnswers when button clicked', () => {
    const onShowAnswers = vi.fn();
    render(<GameInfoPanel {...defaultProps} onShowAnswers={onShowAnswers} />);
    fireEvent.click(screen.getByTitle('Show answers'));
    expect(onShowAnswers).toHaveBeenCalled();
  });

  it('should hide show answers button when canShowAnswers is false', () => {
    render(<GameInfoPanel {...defaultProps} canShowAnswers={false} />);
    expect(screen.queryByTitle('Show answers')).not.toBeInTheDocument();
  });

  it('should call onClose when close button clicked', () => {
    const onClose = vi.fn();
    render(<GameInfoPanel {...defaultProps} onClose={onClose} />);
    fireEvent.click(screen.getByTitle('Close'));
    expect(onClose).toHaveBeenCalled();
  });

  it('should render word list', () => {
    render(<GameInfoPanel {...defaultProps} />);
    expect(screen.getByText('Furry pet')).toBeInTheDocument();
    expect(screen.getByText('Loyal friend')).toBeInTheDocument();
  });

  it('should have dialog role when open', () => {
    render(<GameInfoPanel {...defaultProps} isOpen={true} />);
    const aside = screen.getByRole('dialog');
    expect(aside).toHaveAttribute('aria-modal', 'true');
  });
});
