import { render, screen, fireEvent, act } from '@testing-library/react';
import React from 'react';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';

import { GameDefinition, GameHistory } from '../../types';
import PlayerView from '../../views/PlayerView';

const statusBarMock = vi.fn();
const wordGridMock = vi.fn();
vi.mock('../../components/StatusBar', () => ({
  default: (props: any) => {
    statusBarMock(props);
    return <div data-testid="status-bar">{props.timeLeft}</div>;
  },
}));

vi.mock('../../components/WordSearchGrid', () => ({
  default: (props: any) => {
    wordGridMock(props);
    return <div data-testid="grid" />;
  },
}));
vi.mock('../../components/GameInfoPanel', () => ({ default: () => null }));
vi.mock('../../components/HistoryPanel', () => ({ default: () => null }));
vi.mock('../../components/AvailableGamesPanel', () => ({
  default: (props: { onPlay: (id: string) => void }) => (
    <button data-testid="play-game" onClick={() => props.onPlay('g1')}>play</button>
  ),
}));
vi.mock('../../components/PrintWorksheet', () => ({ default: () => null }));

vi.mock('../../hooks/useI18n', () => ({
  useI18n: () => ({ t: (key: string) => key }),
}));

const gameDefinition: GameDefinition = {
  id: 'g1',
  theme: 'Test Theme',
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

describe('PlayerView game timer (#23)', () => {
  let intervalSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.useFakeTimers();
    statusBarMock.mockClear();
    wordGridMock.mockClear();
    intervalSpy = vi.spyOn(global, 'setInterval');
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  const mountGame = (onGameEnd = (_r: Omit<GameHistory, 'date'>) => {}) => {
    const utils = render(
      <PlayerView
        availableGames={[gameDefinition]}
        history={[]}
        onDeleteGame={vi.fn()}
        onShareGame={vi.fn().mockResolvedValue({ copied: true })}
        onGameEnd={onGameEnd}
      />
    );
    act(() => {
      fireEvent.click(screen.getByTestId('play-game'));
    });
    return utils;
  };

  const lastTimeLeft = () => statusBarMock.mock.calls.at(-1)[0].timeLeft;

  it('starts the countdown from the level time limit', () => {
    mountGame();
    act(() => {
      vi.advanceTimersByTime(0);
    });
    expect(lastTimeLeft()).toBe(10);
  });

  it('uses a single interval — never recreated per tick (#23 regression)', () => {
    mountGame();
    const initialCalls = intervalSpy.mock.calls.length;
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(lastTimeLeft()).toBe(5);
    expect(intervalSpy.mock.calls.length).toBe(initialCalls);
  });

  it('tracks wall-clock deadline across irregular tick spacing', () => {
    mountGame();
    act(() => {
      vi.advanceTimersByTime(3700);
    });
    expect(lastTimeLeft()).toBe(Math.ceil((10_000 - 3_700) / 1000));
    act(() => {
      vi.advanceTimersByTime(4900);
    });
    expect(lastTimeLeft()).toBe(Math.ceil((10_000 - 8_600) / 1000));
  });

  it('ends the game when the deadline passes', () => {
    const onGameEnd = vi.fn();
    mountGame(onGameEnd);
    act(() => {
      vi.advanceTimersByTime(10_500);
    });
    expect(lastTimeLeft()).toBe(0);
    expect(wordGridMock.mock.calls.at(-1)[0].showAnswers).toBe(true);
  });
});
