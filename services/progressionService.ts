import { DomainProgress } from '../types';

// v2 reposition spec §5.1: level progression is device-local — the visitor
// resumes a domain where they left off. Levels are 1-based. The same caps
// discipline as saved games applies (one entry per domain, bounded domains).
const PROGRESS_KEY = 'wordkey.progress.state';
const MAX_DOMAINS = 50;

function loadRaw(): Record<string, DomainProgress> {
  try {
    const raw = window.localStorage.getItem(PROGRESS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return typeof parsed === 'object' && parsed !== null ? parsed : {};
  } catch (error) {
    console.warn('Progress could not be loaded; starting empty.', error);
    return {};
  }
}

export function loadProgress(): Record<string, DomainProgress> {
  return loadRaw();
}

export function recordLevelResult(
  slug: string,
  level: number,
  totalLevels: number,
  sequential: boolean,
  secondsTaken: number,
): { unlockedNext: boolean; completedAll: boolean } {
  const all = loadRaw();
  const current: DomainProgress = all[slug] ?? { unlockedLevel: 1, completedLevels: [], bestTimeSeconds: {} };

  if (!current.completedLevels.includes(level)) {
    current.completedLevels.push(level);
    current.completedLevels.sort((a, b) => a - b);
  }
  const completedAll = current.completedLevels.length >= totalLevels;

  let unlockedNext = false;
  if (sequential && level < totalLevels && current.unlockedLevel < level + 1) {
    current.unlockedLevel = level + 1;
    unlockedNext = true;
  }

  const best = current.bestTimeSeconds[level];
  if (typeof best !== 'number' || secondsTaken < best) {
    current.bestTimeSeconds[level] = secondsTaken;
  }

  // Keep the map bounded: drop the oldest domain when over cap.
  const slugs = Object.keys(all);
  if (!all[slug] && slugs.length >= MAX_DOMAINS) {
    delete all[slugs[0]];
  }
  all[slug] = current;

  try {
    window.localStorage.setItem(PROGRESS_KEY, JSON.stringify(all));
  } catch (error) {
    console.warn('Progress could not be saved.', error);
  }
  return { unlockedNext, completedAll };
}

export function firstUncompletedLevel(
  progress: Record<string, DomainProgress> | undefined,
  slug: string,
  totalLevels: number,
): number {
  const entry = progress?.[slug];
  if (!entry) return 1;
  const level = entry.completedLevels.reduce(
    (next, done) => (next <= done ? done + 1 : next),
    1,
  );
  return Math.min(level, totalLevels);
}

export function resetProgress(): void {
  try {
    window.localStorage.removeItem(PROGRESS_KEY);
  } catch (error) {
    console.warn('Progress could not be reset.', error);
  }
}
