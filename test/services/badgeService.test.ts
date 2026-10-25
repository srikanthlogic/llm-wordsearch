import { beforeEach, describe, expect, it } from 'vitest';

import {
  BADGE_CATALOG,
  applyGameEvent,
  badgeTitle,
  loadBadgeState,
  maybeAwardCompletionist,
  resetBadges,
  saveBadgeState,
} from '../../services/badgeService';
import { BadgeState } from '../../types';

const baseEvent = {
  domainSlug: 'payments',
  level: 1,
  isLastLevel: false,
  wonLevel: true,
  lostLevel: false,
  secondsLeft: 10,
  timeLimitSeconds: 300,
  wrongSelections: 1,
  wordsFoundInLevel: 4,
  locale: 'en',
};

const emptyState = (): BadgeState => ({
  earned: {},
  counters: { wordsFound: 0, lostLevels: 0, localesPlayed: [], domainsMastered: [] },
  streak: { current: 0, best: 0 },
});

describe('applyGameEvent — badge triggers', () => {
  it('awards first-find on the very first word found', () => {
    const { state, newlyEarned } = applyGameEvent(emptyState(), baseEvent);
    expect(state.counters.wordsFound).toBe(4);
    expect(newlyEarned.map(b => b.id)).toContain('first-find');
  });

  it('awards word-hunter-50 when the cumulative counter crosses 50', () => {
    let state = emptyState();
    state.counters.wordsFound = 47;
    const { state: next, newlyEarned } = applyGameEvent(state, baseEvent);
    expect(next.counters.wordsFound).toBe(51);
    expect(newlyEarned.map(b => b.id)).toContain('word-hunter-50');
  });

  it('awards flawless-level on a win with zero wrong selections', () => {
    const { newlyEarned } = applyGameEvent(emptyState(), { ...baseEvent, wrongSelections: 0 });
    expect(newlyEarned.map(b => b.id)).toContain('flawless-level');
  });

  it('awards speed-solver when more than half the time remained', () => {
    const { newlyEarned } = applyGameEvent(emptyState(), { ...baseEvent, wrongSelections: 0, secondsLeft: 151 });
    expect(newlyEarned.map(b => b.id)).toContain('speed-solver');
  });

  it('does not award speed-solver at exactly half the time', () => {
    const { newlyEarned } = applyGameEvent(emptyState(), { ...baseEvent, wrongSelections: 0, secondsLeft: 150 });
    expect(newlyEarned.map(b => b.id)).not.toContain('speed-solver');
  });

  it('awards comeback when a level is won after a previously lost level', () => {
    const afterLoss = applyGameEvent(emptyState(), { ...baseEvent, wonLevel: false, lostLevel: true }).state;
    const { newlyEarned } = applyGameEvent(afterLoss, { ...baseEvent, level: 2 });
    expect(afterLoss.counters.lostLevels).toBe(1);
    expect(newlyEarned.map(b => b.id)).toContain('comeback');
  });

  it('awards polyglot when a second locale is played', () => {
    const first = applyGameEvent(emptyState(), baseEvent);
    expect(first.state.counters.localesPlayed).toEqual(['en']);
    const second = applyGameEvent(first.state, { ...baseEvent, locale: 'ta' });
    expect(second.state.counters.localesPlayed).toEqual(['en', 'ta']);
    expect(second.newlyEarned.map(b => b.id)).toContain('polyglot');
  });

  it('awards a synthesized domain-master badge on finishing the last level', () => {
    const { newlyEarned } = applyGameEvent(emptyState(), { ...baseEvent, isLastLevel: true });
    const def = newlyEarned.find(b => b.id === 'domain-master-payments');
    expect(def).toBeDefined();
    expect(def?.titleKey).toBe('badge.domainMaster.title');
  });

  it('is idempotent — replaying the same triggers earns nothing new', () => {
    let { state, newlyEarned } = applyGameEvent(emptyState(), { ...baseEvent, wrongSelections: 0, secondsLeft: 200, isLastLevel: true });
    const firstCount = newlyEarned.length;
    expect(firstCount).toBeGreaterThan(0);
    ({ newlyEarned } = applyGameEvent(state, { ...baseEvent, wrongSelections: 0, secondsLeft: 200, isLastLevel: true }));
    expect(newlyEarned).toHaveLength(0);
  });
});

describe('streaks (calendar-day bucketing per #59)', () => {
  function daysAgoDate(daysAgo: number): string {
    const d = new Date();
    d.setDate(d.getDate() - daysAgo);
    return d.toDateString();
  }

  it('starts a streak on first play and does not double-count the same day', () => {
    let { state, newlyEarned } = applyGameEvent(emptyState(), baseEvent);
    expect(state.streak.current).toBe(1);
    ({ state, newlyEarned } = applyGameEvent(state, baseEvent));
    expect(state.streak.current).toBe(1);
    expect(newlyEarned).toHaveLength(0);
  });

  it('increments on a consecutive day and resets after a gap', () => {
    let result = applyGameEvent(emptyState(), { ...baseEvent, playedDate: daysAgoDate(1) });
    expect(result.state.streak.current).toBe(1);
    result = applyGameEvent(result.state, { ...baseEvent, playedDate: daysAgoDate(0) });
    expect(result.state.streak.current).toBe(2);
    result = applyGameEvent(result.state, { ...baseEvent, playedDate: daysAgoDate(5) });
    expect(result.state.streak.current).toBe(1);
  });

  it('awards streak-3 at three consecutive days', () => {
    let result = applyGameEvent(emptyState(), { ...baseEvent, playedDate: daysAgoDate(2) });
    result = applyGameEvent(result.state, { ...baseEvent, playedDate: daysAgoDate(1) });
    expect(result.state.streak.current).toBe(2);
    result = applyGameEvent(result.state, { ...baseEvent, playedDate: daysAgoDate(0) });
    expect(result.state.streak.current).toBe(3);
    expect(result.newlyEarned.map(b => b.id)).toContain('streak-3');
  });
});

describe('maybeAwardCompletionist', () => {
  it('awards completionist when every domain is mastered', () => {
    let state = emptyState();
    state = applyGameEvent(state, { ...baseEvent, isLastLevel: true }).state;
    const { newlyEarned } = maybeAwardCompletionist(state, 1);
    expect(newlyEarned.map(b => b.id)).toContain('completionist');
  });

  it('does not award completionist while domains remain', () => {
    let state = emptyState();
    state = applyGameEvent(state, { ...baseEvent, isLastLevel: true }).state;
    const { newlyEarned } = maybeAwardCompletionist(state, 3);
    expect(newlyEarned.map(b => b.id)).not.toContain('completionist');
  });
});

describe('persistence', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('round-trips badge state through localStorage', () => {
    const { state } = applyGameEvent(emptyState(), baseEvent);
    saveBadgeState(state);
    expect(loadBadgeState().counters.wordsFound).toBe(4);
    resetBadges();
    expect(loadBadgeState().counters.wordsFound).toBe(0);
  });

  it('survives corrupt localStorage', () => {
    window.localStorage.setItem('wordkey.badges.state', '{broken');
    expect(loadBadgeState().counters.wordsFound).toBe(0);
  });

  it('exposes the fixed catalog', () => {
    expect(BADGE_CATALOG.length).toBeGreaterThanOrEqual(9);
  });
});

// #140: the earn toast rendered the raw "Domain Master: {{domain}}" template
// because only the trophy shelf interpolated the placeholder.
describe('badgeTitle (#140)', () => {
  const t = (key: string, replacements?: Record<string, string | number>): string =>
    replacements ? `${key}:${JSON.stringify(replacements)}` : key;

  it('interpolates the domain slug for domain-master badges', () => {
    const def = { id: 'domain-master-ai-basics', icon: '👑', titleKey: 'badge.domainMaster.title', descriptionKey: 'badge.domainMaster.description' };
    expect(badgeTitle(def, t)).toBe('badge.domainMaster.title:{"domain":"ai-basics"}');
  });

  it('passes plain badges through without replacements', () => {
    const def = BADGE_CATALOG.find(b => b.id === 'first-find')!;
    expect(badgeTitle(def, t)).toBe('badge.firstFind.title');
  });
});
