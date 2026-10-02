import { beforeEach, describe, expect, it } from 'vitest';

import {
  firstUncompletedLevel,
  loadProgress,
  recordLevelResult,
} from '../../services/progressionService';

describe('progressionService', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('records a completed level and unlocks the next when sequential', () => {
    const result = recordLevelResult('payments', 1, 3, true, 120);
    expect(result.unlockedNext).toBe(true);
    const progress = loadProgress();
    expect(progress['payments']).toEqual({
      unlockedLevel: 2,
      completedLevels: [1],
      bestTimeSeconds: { 1: 120 },
    });
  });

  it('does not unlock past the last level, but flags completedAll', () => {
    recordLevelResult('payments', 1, 2, true, 100);
    const result = recordLevelResult('payments', 2, 2, true, 90);
    expect(result.unlockedNext).toBe(false);
    expect(result.completedAll).toBe(true);
  });

  it('merges best times (keeps the minimum)', () => {
    recordLevelResult('payments', 1, 3, true, 120);
    recordLevelResult('payments', 1, 3, true, 95);
    expect(loadProgress()['payments'].bestTimeSeconds[1]).toBe(95);
  });

  it('is idempotent on completedLevels', () => {
    recordLevelResult('payments', 1, 3, true, 120);
    recordLevelResult('payments', 1, 3, true, 120);
    expect(loadProgress()['payments'].completedLevels).toEqual([1]);
  });

  it('firstUncompletedLevel finds the smallest missing level', () => {
    recordLevelResult('payments', 1, 3, true, 100);
    recordLevelResult('payments', 2, 3, true, 100);
    expect(firstUncompletedLevel(loadProgress(), 'payments', 3)).toBe(3);
    expect(firstUncompletedLevel(loadProgress(), 'unknown', 3)).toBe(1);
  });

  it('does not unlock levels out of order when a later level is recorded first', () => {
    // Non-sequential or resumed play can complete a later level; the unlock
    // counter never skips ahead of actual completion order.
    recordLevelResult('payments', 3, 3, true, 100);
    expect(loadProgress()['payments'].unlockedLevel).toBe(1);
  });
});
