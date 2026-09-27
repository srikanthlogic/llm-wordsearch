import { render, screen, fireEvent, act } from '@testing-library/react';
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { FeedbackProvider } from '../../components/Feedback';
import { loadBadgeState } from '../../services/badgeService';
import { loadProgress } from '../../services/progressionService';
import { GameDefinition } from '../../types';
import PlayerView from '../../views/PlayerView';

vi.mock('../../hooks/useI18n', () => ({
  useI18n: () => ({
    t: (key: string, replacements?: Record<string, string | number>) =>
      replacements && 'badge' in replacements ? `${key}:${replacements.badge}` : key,
  }),
}));

// Author mode keeps the v1 library chrome so the mocked play-game button
// works; the gamification engine keys off the corpus game id, not the mode.
vi.mock('../../hooks/useInstanceConfig', () => ({
  useInstanceConfig: () => ({
    config: {
      mode: 'author', title: '', owner: '', blurb: '', locale: 'en', links: [],
      levels: { perDomain: 3, wordsPerLevel: 8 },
      progression: { sequentialLevels: true },
    },
    loading: false,
  }),
}));

const statusBarMock = vi.fn();
vi.mock('../../components/StatusBar', () => ({
  default: (props: any) => {
    statusBarMock(props);
    return (
      <div data-testid="status-bar">
        <button data-testid="open-info" onClick={props.onClick}>info</button>
        {props.timeLeft}
      </div>
    );
  },
}));

vi.mock('../../components/WordSearchGrid', () => ({
  default: (props: any) => (
    <div data-testid="grid">
      <button
        data-testid="find-word"
        onClick={() => {
          const next = props.placedWords?.find((w: any) => !w.found);
          if (next) props.onWordFound(next.text);
        }}
      >
        find
      </button>
    </div>
  ),
}));

vi.mock('../../components/GameInfoPanel', () => ({ default: () => null }));
vi.mock('../../components/HistoryPanel', () => ({ default: () => null }));
vi.mock('../../components/AvailableGamesPanel', () => ({
  default: (props: any) => (
    <button data-testid="play-game" onClick={() => props.onPlay('corpus-testdomain')}>play</button>
  ),
}));
vi.mock('../../components/PrintWorksheet', () => ({ default: () => null }));

const corpusGame: GameDefinition = {
  id: 'corpus-testdomain',
  theme: 'Test Domain',
  language: 'en',
  levels: [
    {
      level: 1,
      gridSize: 6,
      timeLimitSeconds: 10,
      words: [
        { word: 'CAT', hint: 'Furry pet' },
        { word: 'DOG', hint: 'Loyal friend' },
      ],
    },
  ],
};

describe('PlayerView gamification wiring (#109)', () => {
  beforeEach(() => {
    window.localStorage.clear();
    statusBarMock.mockClear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const mountAndWin = () => {
    const onGameEnd = vi.fn();
    render(
      <FeedbackProvider>
        <PlayerView
          availableGames={[corpusGame]}
          history={[]}
          onDeleteGame={vi.fn()}
          onShareGame={vi.fn().mockResolvedValue({ copied: true })}
          onGameEnd={onGameEnd}
        />
      </FeedbackProvider>,
    );
    act(() => {
      fireEvent.click(screen.getByTestId('play-game'));
    });
    act(() => { fireEvent.click(screen.getByTestId('find-word')); });
    act(() => { fireEvent.click(screen.getByTestId('find-word')); });
    return { onGameEnd };
  };

  it('awards badges and records progress when a corpus level is won', () => {
    mountAndWin();
    const badges = loadBadgeState();
    expect(badges.earned['first-find']).toBeTruthy();
    expect(badges.earned['flawless-level']).toBeTruthy();
    expect(badges.earned['speed-solver']).toBeTruthy();
    expect(badges.earned['domain-master-testdomain']).toBeTruthy();
    const progress = loadProgress();
    expect(progress['testdomain'].completedLevels).toEqual([1]);
  });

  it('counts a timed-out level as a lost level (comeback fuel)', () => {
    vi.useFakeTimers();
    try {
      render(
        <FeedbackProvider>
          <PlayerView
            availableGames={[corpusGame]}
            history={[]}
            onDeleteGame={vi.fn()}
            onShareGame={vi.fn().mockResolvedValue({ copied: true })}
            onGameEnd={vi.fn()}
          />
        </FeedbackProvider>,
      );
      act(() => {
        fireEvent.click(screen.getByTestId('play-game'));
      });
      act(() => {
        vi.advanceTimersByTime(11_000);
      });
      expect(loadBadgeState().counters.lostLevels).toBe(1);
    } finally {
      vi.useRealTimers();
    }
  });
});
