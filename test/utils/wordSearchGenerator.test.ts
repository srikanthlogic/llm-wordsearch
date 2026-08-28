import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { generatePuzzle, shuffled } from '../../utils/wordSearchGenerator';

describe('generatePuzzle', () => {
  let originalRandom: () => number;

  beforeEach(() => {
    originalRandom = Math.random;
  });

  afterEach(() => {
    Math.random = originalRandom;
  });

  it('produces a square grid of the requested size', () => {
    Math.random = vi.fn().mockReturnValue(0.5);

    const result = generatePuzzle(['CAT', 'DOG'], 10, 'en');

    expect(result.grid).toHaveLength(10);
    result.grid.forEach(row => expect(row).toHaveLength(10));
  });

  it('returns a placedWords array bounded by the word list size', () => {
    Math.random = vi.fn().mockReturnValue(0.5);

    const words = ['CAT', 'DOG'];
    const result = generatePuzzle(words, 10, 'en');

    expect(Array.isArray(result.placedWords)).toBe(true);
    expect(result.placedWords.length).toBeGreaterThanOrEqual(0);
    expect(result.placedWords.length).toBeLessThanOrEqual(words.length);
  });

  it('handles an empty word list', () => {
    const result = generatePuzzle([], 5, 'en');

    expect(result.grid).toHaveLength(5);
    expect(result.placedWords).toHaveLength(0);
  });

  it('handles single-character words', () => {
    Math.random = vi.fn().mockReturnValue(0.5);

    const result = generatePuzzle(['A', 'B', 'C'], 5, 'en');

    expect(result.grid).toHaveLength(5);
    expect(result.placedWords.length).toBeGreaterThanOrEqual(0);
  });

  it('skips words that are too long for the grid', () => {
    Math.random = vi.fn().mockReturnValue(0.5);

    const result = generatePuzzle(['VERYLONGWORDTHATCANNOTFIT'], 5, 'en');

    expect(result.grid).toHaveLength(5);
    expect(result.placedWords).toHaveLength(0);
  });

  it('handles Unicode characters without throwing', () => {
    Math.random = vi.fn().mockReturnValue(0.5);

    const result = generatePuzzle(['CAFÉ', 'NAÏVE'], 10, 'en');

    expect(result.grid).toHaveLength(10);
    expect(result.placedWords.length).toBeGreaterThanOrEqual(0);
  });

  it('produces valid grids across multiple languages', () => {
    Math.random = vi.fn().mockReturnValue(0.5);

    const words = ['HELLO', 'WORLD'];
    const resultEn = generatePuzzle(words, 10, 'en');
    const resultEs = generatePuzzle(words, 10, 'es');

    expect(resultEn.grid).toHaveLength(10);
    expect(resultEs.grid).toHaveLength(10);
  });

  it('fills empty cells with a letter drawn from the word pool', () => {
    Math.random = vi.fn().mockReturnValue(0.5);

    const result = generatePuzzle(['A'], 3, 'en');

    const hasUnfilled = result.grid.some(row =>
      row.some(cell => cell.letter === null || cell.letter === undefined || cell.letter === '')
    );
    expect(hasUnfilled).toBe(false);
  });

  it('handles a grid size of 1', () => {
    Math.random = vi.fn().mockReturnValue(0.5);

    const result = generatePuzzle(['A'], 1, 'en');

    expect(result.grid).toHaveLength(1);
    expect(result.grid[0]).toHaveLength(1);
  });

  describe('unplaced words (#20)', () => {
    it('returns unplacedWords: [] when every input word fits', () => {
      Math.random = vi.fn().mockReturnValue(0.5);

      const result = generatePuzzle(['CAT', 'DOG', 'BIRD'], 12, 'en');

      expect(result.placedWords.map(pw => pw.text).sort()).toEqual(['BIRD', 'CAT', 'DOG']);
      expect(result.unplacedWords).toEqual([]);
    });

    it('returns the word in unplacedWords when it is too long for the grid', () => {
      Math.random = vi.fn().mockReturnValue(0.5);

      const result = generatePuzzle(['VERYLONGWORDTHATCANNOTFIT'], 5, 'en');

      expect(result.placedWords).toHaveLength(0);
      expect(result.unplacedWords).toEqual(['VERYLONGWORDTHATCANNOTFIT']);
    });

    it('returns unplacedWords for every word that cannot fit while still placing the rest', () => {
      Math.random = vi.fn().mockReturnValue(0.5);

      const oversized = 'X'.repeat(50);
      const result = generatePuzzle([oversized, 'CAT', 'DOG'], 8, 'en');

      expect(result.placedWords.map(pw => pw.text).sort()).toEqual(['CAT', 'DOG']);
      expect(result.unplacedWords).toEqual([oversized]);
    });
  });

  it('handles duplicate words in the input list', () => {
    Math.random = vi.fn().mockReturnValue(0.5);

    const result = generatePuzzle(['CAT', 'CAT', 'DOG'], 10, 'en');

    expect(result.grid).toHaveLength(10);
    expect(result.placedWords.length).toBeGreaterThanOrEqual(0);
  });

  it('produces a grid where every cell has a string letter', () => {
    Math.random = vi.fn().mockReturnValue(0.5);

    const result = generatePuzzle(['CAT', 'DOG', 'BIRD'], 10, 'en');

    result.grid.forEach(row => {
      row.forEach(cell => {
        expect(typeof cell.letter).toBe('string');
        expect(cell.letter.length).toBeGreaterThan(0);
      });
    });
  });
});

describe('shuffled (#25)', () => {
  it('applies a deterministic permutation for a given random source', () => {
    // rng always returning 0 picks index 0 at every step
    const zeroRng = () => 0;
    expect(shuffled([1, 2, 3, 4, 5], zeroRng)).toEqual([2, 3, 4, 5, 1]);
  });

  it('does not mutate the input array', () => {
    const input = [1, 2, 3, 4, 5];
    shuffled(input);
    expect(input).toEqual([1, 2, 3, 4, 5]);
  });

  it('returns a permutation containing exactly the original elements', () => {
    for (let i = 0; i < 20; i++) {
      const out = shuffled(['A', 'B', 'C', 'D']);
      expect([...out].sort()).toEqual(['A', 'B', 'C', 'D'].sort());
    }
  });

  it('produces varied orderings across many runs (not sort-bias)', () => {
    const seen = new Set<string>();
    for (let i = 0; i < 100; i++) {
      seen.add(shuffled([1, 2, 3]).join(','));
    }
    // 6 permutations exist; biased sort-shuffle collapses to ~3-4
    expect(seen.size).toBeGreaterThanOrEqual(5);
  });
});

describe('generatePuzzle with injected random (#25)', () => {
  it('accepts a custom random source and still yields a valid puzzle', () => {
    let calls = 0;
    const seqRandom = () => {
      calls++;
      return ((calls * 2654435761) % 4294967296) / 4294967296; // Knuth hash sequence
    };
    const result = generatePuzzle(['CAT', 'DOG', 'BIRD'], 10, 'en', seqRandom);
    expect(calls).toBeGreaterThan(0);
    expect(result.placedWords.map(w => w.text).sort()).toEqual(['BIRD', 'CAT', 'DOG']);
  });
});

describe('generatePuzzle deterministic filler (#48)', () => {
  it('replays the ENTIRE grid identically with the same seeded random', () => {
    const makeRng = () => {
      let state = 42;
      return () => {
        state = (state * 1664525 + 1013904223) % 4294967296;
        return state / 4294967296;
      };
    };
    const a = generatePuzzle(['CAT', 'DOG', 'BIRD'], 10, 'en', makeRng());
    const b = generatePuzzle(['CAT', 'DOG', 'BIRD'], 10, 'en', makeRng());
    expect(a.grid.map(r => r.map(c => c.letter).join(''))).toEqual(
      b.grid.map(r => r.map(c => c.letter).join(''))
    );
  });

  it('different seeds yield different filler letters somewhere in the grid', () => {
    const makeRng = (seed: number) => {
      let state = seed;
      return () => {
        state = (state * 1664525 + 1013904223) % 4294967296;
        return state / 4294967296;
      };
    };
    const a = generatePuzzle(['CAT', 'DOG', 'BIRD'], 12, 'en', makeRng(7));
    const b = generatePuzzle(['CAT', 'DOG', 'BIRD'], 12, 'en', makeRng(99));
    expect(a.grid.map(r => r.map(c => c.letter).join(''))).not.toEqual(
      b.grid.map(r => r.map(c => c.letter).join(''))
    );
  });
});
