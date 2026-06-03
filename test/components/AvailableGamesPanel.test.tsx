import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import AvailableGamesPanel from '../../components/AvailableGamesPanel';
import type { GameDefinition } from '../../types';

vi.mock('../../hooks/useI18n', () => ({
  useI18n: () => ({
    t: (key: string) => {
      const map: Record<string, string> = {
        'player.available.title': 'Available Games',
        'player.available.noGames': 'No games available',
        'player.available.copied': 'Copied!',
        'player.available.copyFailed': 'Failed to copy',
        'player.available.playAria': 'Play game',
        'player.available.downloadAria': 'Download worksheet',
        'player.available.shareAria': 'Share game',
        'player.available.deleteAria': 'Delete game',
      };
      return map[key] || key;
    },
  }),
}));

const sampleGame: GameDefinition = {
  id: 'game-1',
  theme: 'Animals',
  language: 'en',
  levels: [
    {
      level: 1,
      gridSize: 10,
      timeLimitSeconds: 120,
      words: [
        { word: 'CAT', hint: 'Furry pet' },
        { word: 'DOG', hint: 'Loyal friend' },
      ],
    },
  ],
};

describe('AvailableGamesPanel', () => {
  const defaultProps = {
    games: [],
    onPlay: vi.fn(),
    onDelete: vi.fn(),
    onShare: vi.fn().mockResolvedValue({ copied: true }),
    onPrepareWorksheet: vi.fn(),
  };

  it('should show empty state when no games', () => {
    render(<AvailableGamesPanel {...defaultProps} />);
    expect(screen.getByText('No games available')).toBeInTheDocument();
  });

  it('should render game cards', () => {
    render(<AvailableGamesPanel {...defaultProps} games={[sampleGame]} />);
    expect(screen.getByText('Animals')).toBeInTheDocument();
    expect(screen.getByText('1 level')).toBeInTheDocument();
    expect(screen.getByText('en')).toBeInTheDocument();
  });

  it('should show game count', () => {
    render(<AvailableGamesPanel {...defaultProps} games={[sampleGame]} />);
    expect(screen.getByText('1')).toBeInTheDocument();
  });

  it('should call onPlay when play button clicked', () => {
    const onPlay = vi.fn();
    render(<AvailableGamesPanel {...defaultProps} games={[sampleGame]} onPlay={onPlay} />);
    fireEvent.click(screen.getByTitle('Play game'));
    expect(onPlay).toHaveBeenCalledWith('game-1');
  });

  it('should call onDelete when delete button clicked', () => {
    const onDelete = vi.fn();
    render(<AvailableGamesPanel {...defaultProps} games={[sampleGame]} onDelete={onDelete} />);
    fireEvent.click(screen.getByTitle('Delete game'));
    expect(onDelete).toHaveBeenCalledWith('game-1');
  });

  it('should call onPrepareWorksheet when download button clicked', () => {
    const onPrepareWorksheet = vi.fn();
    render(<AvailableGamesPanel {...defaultProps} games={[sampleGame]} onPrepareWorksheet={onPrepareWorksheet} />);
    fireEvent.click(screen.getByTitle('Download worksheet'));
    expect(onPrepareWorksheet).toHaveBeenCalledWith('game-1');
  });

  it('should show copied tooltip after share', async () => {
    const onShare = vi.fn().mockResolvedValue({ copied: true });
    render(<AvailableGamesPanel {...defaultProps} games={[sampleGame]} onShare={onShare} />);
    fireEvent.click(screen.getByTitle('Share game'));
    await waitFor(() => {
      expect(screen.getByText('Copied!')).toBeInTheDocument();
    });
  });

  it('should handle multi-level games', () => {
    const multiGame: GameDefinition = {
      ...sampleGame,
      id: 'game-2',
      levels: [
        { ...sampleGame.levels[0] },
        { level: 2, gridSize: 15, timeLimitSeconds: 180, words: [{ word: 'ELEPHANT', hint: 'Big animal' }] },
      ],
    };
    render(<AvailableGamesPanel {...defaultProps} games={[multiGame]} />);
    expect(screen.getByText('2 levels')).toBeInTheDocument();
  });
});
