import { BadgeDef, BadgeState, GameBadgeEvent } from '../types';

// v2 reposition spec §5.1: a FIXED badge catalog that ships with the app and
// works on every instance (owner-custom badges are a v2.1 option). All state
// is device-local; the reducer here is pure so triggers are unit-testable.
const BADGES_KEY = 'wordkey.badges.state';
const STREAK_STORE_KEY = 'wordkey.streak.state';
const WORD_HUNTER_TARGET = 50;

export const BADGE_CATALOG: BadgeDef[] = [
  { id: 'first-find', icon: '🔍', titleKey: 'badge.firstFind.title', descriptionKey: 'badge.firstFind.description' },
  { id: 'word-hunter-50', icon: '🏹', titleKey: 'badge.wordHunter.title', descriptionKey: 'badge.wordHunter.description' },
  { id: 'flawless-level', icon: '💎', titleKey: 'badge.flawless.title', descriptionKey: 'badge.flawless.description' },
  { id: 'speed-solver', icon: '⚡', titleKey: 'badge.speedSolver.title', descriptionKey: 'badge.speedSolver.description' },
  { id: 'comeback', icon: '🌅', titleKey: 'badge.comeback.title', descriptionKey: 'badge.comeback.description' },
  { id: 'streak-3', icon: '🔥', titleKey: 'badge.streak3.title', descriptionKey: 'badge.streak3.description' },
  { id: 'streak-7', icon: '🔥', titleKey: 'badge.streak7.title', descriptionKey: 'badge.streak7.description' },
  { id: 'streak-30', icon: '🔥', titleKey: 'badge.streak30.title', descriptionKey: 'badge.streak30.description' },
  { id: 'polyglot', icon: '🌍', titleKey: 'badge.polyglot.title', descriptionKey: 'badge.polyglot.description' },
  { id: 'completionist', icon: '🏆', titleKey: 'badge.completionist.title', descriptionKey: 'badge.completionist.description' },
];

function domainMasterDef(slug: string): BadgeDef {
  return {
    id: `domain-master-${slug}`,
    icon: '👑',
    titleKey: 'badge.domainMaster.title',
    descriptionKey: 'badge.domainMaster.description',
  };
}

function emptyState(): BadgeState {
  return {
    earned: {},
    counters: { wordsFound: 0, lostLevels: 0, localesPlayed: [], domainsMastered: [] },
    streak: { current: 0, best: 0 },
  };
}

export function loadBadgeState(): BadgeState {
  try {
    const raw = window.localStorage.getItem(BADGES_KEY);
    if (!raw) return emptyState();
    const parsed = JSON.parse(raw) as BadgeState;
    if (typeof parsed !== 'object' || parsed === null || typeof parsed.earned !== 'object') {
      return emptyState();
    }
    const streakRaw = window.localStorage.getItem(STREAK_STORE_KEY);
    if (streakRaw) {
      parsed.streak = JSON.parse(streakRaw);
    }
    return parsed;
  } catch (error) {
    console.warn('Badge state could not be loaded; starting empty.', error);
    return emptyState();
  }
}

export function saveBadgeState(state: BadgeState): void {
  try {
    window.localStorage.setItem(BADGES_KEY, JSON.stringify(state));
    window.localStorage.setItem(STREAK_STORE_KEY, JSON.stringify(state.streak));
  } catch (error) {
    console.warn('Badge state could not be saved.', error);
  }
}

export function resetBadges(): void {
  try {
    window.localStorage.removeItem(BADGES_KEY);
    window.localStorage.removeItem(STREAK_STORE_KEY);
  } catch (error) {
    console.warn('Badge state could not be reset.', error);
  }
}

function earn(state: BadgeState, def: BadgeDef, newlyEarned: BadgeDef[]): void {
  if (state.earned[def.id]) return;
  state.earned[def.id] = Date.now();
  newlyEarned.push(def);
}

// Calendar-day bucketing (local midnight), the #59 pattern — never
// elapsed-ms rounding, which made "consecutive day" unreachable.
function advanceStreak(state: BadgeState, playedDate?: string, newlyEarned?: BadgeDef[]): void {
  const today = playedDate ?? new Date().toDateString();
  const last = state.streak.lastPlayedDate;
  if (last === today) return;

  const eventDay = new Date(today);
  const previousDay = new Date(eventDay);
  previousDay.setDate(previousDay.getDate() - 1);
  state.streak.current = last === previousDay.toDateString() ? state.streak.current + 1 : 1;
  state.streak.lastPlayedDate = today;
  state.streak.best = Math.max(state.streak.best, state.streak.current);
  if (newlyEarned) {
    for (const [threshold, id] of [[3, 'streak-3'], [7, 'streak-7'], [30, 'streak-30']] as const) {
      if (state.streak.current >= threshold) {
        earn(state, BADGE_CATALOG.find(b => b.id === id)!, newlyEarned);
      }
    }
  }
}

export function applyGameEvent(
  previous: BadgeState,
  event: GameBadgeEvent,
): { state: BadgeState; newlyEarned: BadgeDef[] } {
  // Deep-copy so callers can keep the prior state untouched.
  const state: BadgeState = JSON.parse(JSON.stringify(previous));
  const newlyEarned: BadgeDef[] = [];

  advanceStreak(state, event.playedDate, newlyEarned);

  if (!state.counters.localesPlayed.includes(event.locale)) {
    state.counters.localesPlayed.push(event.locale);
    if (state.counters.localesPlayed.length >= 2) {
      earn(state, BADGE_CATALOG.find(b => b.id === 'polyglot')!, newlyEarned);
    }
  }

  if (event.wordsFoundInLevel > 0) {
    const before = state.counters.wordsFound;
    state.counters.wordsFound += event.wordsFoundInLevel;
    if (before === 0) earn(state, BADGE_CATALOG.find(b => b.id === 'first-find')!, newlyEarned);
    if (before < WORD_HUNTER_TARGET && state.counters.wordsFound >= WORD_HUNTER_TARGET) {
      earn(state, BADGE_CATALOG.find(b => b.id === 'word-hunter-50')!, newlyEarned);
    }
  }

  if (event.wonLevel) {
    if (event.wrongSelections === 0) {
      earn(state, BADGE_CATALOG.find(b => b.id === 'flawless-level')!, newlyEarned);
    }
    if (event.secondsLeft > event.timeLimitSeconds / 2) {
      earn(state, BADGE_CATALOG.find(b => b.id === 'speed-solver')!, newlyEarned);
    }
    if (state.counters.lostLevels > 0) {
      earn(state, BADGE_CATALOG.find(b => b.id === 'comeback')!, newlyEarned);
    }
    if (event.isLastLevel && event.domainSlug) {
      if (!state.counters.domainsMastered.includes(event.domainSlug)) {
        state.counters.domainsMastered.push(event.domainSlug);
        earn(state, domainMasterDef(event.domainSlug), newlyEarned);
      }
    }
  }

  if (event.lostLevel) {
    state.counters.lostLevels += 1;
  }

  saveBadgeState(state);
  return { state, newlyEarned };
}

export function maybeAwardCompletionist(
  state: BadgeState,
  totalDomains: number,
): { state: BadgeState; newlyEarned: BadgeDef[] } {
  const next: BadgeState = JSON.parse(JSON.stringify(state));
  const newlyEarned: BadgeDef[] = [];
  if (totalDomains > 0 && next.counters.domainsMastered.length >= totalDomains) {
    earn(next, BADGE_CATALOG.find(b => b.id === 'completionist')!, newlyEarned);
  }
  if (newlyEarned.length) saveBadgeState(next);
  return { state: next, newlyEarned };
}
