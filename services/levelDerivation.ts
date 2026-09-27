import { CorpusDomain, GameDefinition, GameLevel, WordKeyConfig, Word } from '../types';

// v2 reposition spec §3.3: serve-mode levels are DERIVED, not stored — the
// same corpus yields the same game for every visitor, deterministically, with
// no LLM and no network. Entries are sorted for stable chunking; levels get
// an even split (a small trailing remainder is fine — no padded duplicates).
function gridSizeFor(wordCount: number): number {
  return Math.max(8, Math.min(15, wordCount + 4));
}

function splitEvenly(total: number, groups: number): number[] {
  const base = Math.floor(total / groups);
  const remainder = total % groups;
  return Array.from({ length: groups }, (_, i) => base + (i < remainder ? 1 : 0));
}

function toWord(entry: { term: string; gloss: string; context: string; usage: string }): Word {
  return { word: entry.term, hint: entry.gloss, context: entry.context, usage: entry.usage };
}

export function deriveLevels(domain: CorpusDomain, levelsPerDomain: number, wordsPerLevel: number): GameLevel[] {
  const levelCount = Math.max(
    1,
    Math.min(levelsPerDomain, Math.ceil(domain.entries.length / Math.max(1, wordsPerLevel))),
  );
  const sorted = [...domain.entries].sort((a, b) => a.term.localeCompare(b.term));
  const sizes = splitEvenly(sorted.length, levelCount);

  let cursor = 0;
  return sizes.map((size, index) => {
    const words = sorted.slice(cursor, cursor + size).map(toWord);
    cursor += size;
    return {
      level: index + 1,
      gridSize: gridSizeFor(words.length),
      timeLimitSeconds: 300,
      words,
    };
  });
}

export function deriveGameDefinition(domain: CorpusDomain, config: WordKeyConfig): GameDefinition {
  return {
    id: `corpus-${domain.domain}`,
    theme: domain.title,
    language: domain.locale,
    levels: deriveLevels(domain, config.levels.perDomain, config.levels.wordsPerLevel),
  };
}
