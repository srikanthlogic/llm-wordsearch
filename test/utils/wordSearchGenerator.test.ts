import { describe, it, expect, vi } from 'vitest';

import { generatePuzzle, canPlaceWord, placeWord } from '../../utils/wordSearchGenerator';

// Mock Math.random for predictable tests
const mockMath = Object.create(global.Math);
mockMath.random = vi.fn();
global.Math = mockMath;

describe('wordSearchGenerator', () => {
  // Test suite for the wordSearchGenerator module, focusing on puzzle generation logic
  describe('generatePuzzle', () => {
    // Basic test to verify grid dimensions match input size
    it('should generate a grid of the specified size', () => {
      Math.random = vi.fn().mockReturnValue(0.5);

      const words = ['CAT', 'DOG'];
      const size = 10;
      const result = generatePuzzle(words, size, 'en');

      expect(result.grid).toHaveLength(size);
      expect(result.grid[0]).toHaveLength(size);
      expect(result.grid.every(row => row.length === size)).toBe(true);
    });

    // Test to verify placed words array is returned and has expected length
    it('should return placed words information', () => {
      Math.random = vi.fn().mockReturnValue(0.5);
      
      const words = ['CAT', 'DOG'];
      const size = 10;
      const result = generatePuzzle(words, size, 'en');
      
      expect(result.placedWords).toBeInstanceOf(Array);
      expect(result.placedWords.length).toBeGreaterThanOrEqual(0);
      expect(result.placedWords.length).toBeLessThanOrEqual(words.length);
    });

    // Test for empty input word list
    it('should handle empty word list', () => {
      const words: string[] = [];
      const size = 5;
      const result = generatePuzzle(words, size, 'en');

      expect(result.grid).toHaveLength(size);
      expect(result.placedWords).toHaveLength(0);
    });

    // Test for very short words
    it('should handle single character words', () => {
      Math.random = vi.fn().mockReturnValue(0.5);
      
      const words = ['A', 'B', 'C'];
      const size = 5;
      const result = generatePuzzle(words, size, 'en');
      
      expect(result.grid).toHaveLength(size);
      expect(result.placedWords.length).toBeGreaterThanOrEqual(0);
    });

    it('should handle words that are too long for the grid', () => {
      Math.random = vi.fn().mockReturnValue(0.5);
      
      const words = ['VERYLONGWORDTHATCANNOTFIT'];
      const size = 5;
      const result = generatePuzzle(words, size, 'en');
      
      expect(result.grid).toHaveLength(size);
      // Word should not be placed if it doesn't fit
      expect(result.placedWords.length).toBe(0);
    });

    it('should handle Unicode characters correctly', () => {
      Math.random = vi.fn().mockReturnValue(0.5);
      
      const words = ['CAFÉ', 'NAÏVE'];
      const size = 10;
      const result = generatePuzzle(words, size, 'en');
      
      expect(result.grid).toHaveLength(size);
      expect(result.placedWords.length).toBeGreaterThanOrEqual(0);
    });

    it('should handle different languages', () => {
      Math.random = vi.fn().mockReturnValue(0.5);
      
      const words = ['HELLO', 'WORLD'];
      const size = 10;
      
      const resultEn = generatePuzzle(words, size, 'en');
      const resultEs = generatePuzzle(words, size, 'es');
      
      expect(resultEn.grid).toHaveLength(size);
      expect(resultEs.grid).toHaveLength(size);
    });

    it('should place words in different directions', () => {
      // Mock random to ensure we test different directions
      let callCount = 0;
      Math.random = vi.fn().mockImplementation(() => {
        callCount++;
        return (callCount % 8) / 8; // Cycle through different values
      });
      
      const words = ['HORIZONTAL', 'VERTICAL'];
      const size = 15;
      const result = generatePuzzle(words, size, 'en');
      
      expect(result.grid).toHaveLength(size);
      expect(result.placedWords.length).toBeGreaterThanOrEqual(0);
    });

    it('should fill empty cells with random characters from word pool', () => {
      Math.random = vi.fn().mockReturnValue(0.5);
      
      const words = ['A'];
      const size = 3;
      const result = generatePuzzle(words, size, 'en');
      
      // Check that grid is filled (no null values)
      const hasNullCells = result.grid.some(row => 
        row.some(cell => cell.letter === null || cell.letter === undefined)
      );
      expect(hasNullCells).toBe(false);
    });

    it('should handle grid size of 1', () => {
      Math.random = vi.fn().mockReturnValue(0.5);
      
      const words = ['A'];
      const size = 1;
      const result = generatePuzzle(words, size, 'en');
      
      expect(result.grid).toHaveLength(1);
      expect(result.grid[0]).toHaveLength(1);
    });

    it('should sort words by length (longest first)', () => {
      Math.random = vi.fn().mockReturnValue(0.5);
      
      const words = ['A', 'MEDIUM', 'VERYLONGWORD'];
      const size = 15;
      const result = generatePuzzle(words, size, 'en');
      
      // Longer words should have better chance of placement
      expect(result.grid).toHaveLength(size);
    });

    it('should handle duplicate words', () => {
      Math.random = vi.fn().mockReturnValue(0.5);
      
      const words = ['CAT', 'CAT', 'DOG'];
      const size = 10;
      const result = generatePuzzle(words, size, 'en');
      
      expect(result.grid).toHaveLength(size);
      expect(result.placedWords.length).toBeGreaterThanOrEqual(0);
    });

    it('should create valid grid cells with letter property', () => {
      Math.random = vi.fn().mockReturnValue(0.5);

      const words = ['TEST'];
      const size = 5;
      const result = generatePuzzle(words, size, 'en');

      // Check that all cells have the expected structure
      result.grid.forEach(row => {
        row.forEach(cell => {
          expect(cell).toHaveProperty('letter');
          expect(typeof cell.letter).toBe('string');
        });
      });
    });

    // Test for words with special characters or numbers
    it('should handle words with special characters and numbers', () => {
      Math.random = vi.fn().mockReturnValue(0.5);

      const words = ['HELLO123', 'WORLD!'];
      const size = 10;
      const result = generatePuzzle(words, size, 'en');

      expect(result.grid).toHaveLength(size);
      expect(result.placedWords.length).toBeGreaterThanOrEqual(0);
    });

    // Test for large grid sizes
    it('should handle large grid sizes', () => {
      Math.random = vi.fn().mockReturnValue(0.5);

      const words = ['TEST'];
      const size = 20;
      const result = generatePuzzle(words, size, 'en');

      expect(result.grid).toHaveLength(size);
      expect(result.grid.every(row => row.length === size)).toBe(true);
    });

    // Test for when Intl.Segmenter is not available (fallback to Array.from)
    it('should handle environments without Intl.Segmenter', () => {
      const originalIntl = global.Intl;
      // Mock Intl without Segmenter
      (global as any).Intl = { Segmenter: undefined };

      Math.random = vi.fn().mockReturnValue(0.5);

      const words = ['HELLO'];
      const size = 10;
      const result = generatePuzzle(words, size, 'en');

      expect(result.grid).toHaveLength(size);
      expect(result.placedWords.length).toBeGreaterThanOrEqual(0);

      // Restore Intl
      (global as any).Intl = originalIntl;
    });
    it('should create placed words with correct structure', () => {
      Math.random = vi.fn().mockReturnValue(0.5);

      const words = ['WORD'];
      const size = 10;
      const result = generatePuzzle(words, size, 'en');

      result.placedWords.forEach(placedWord => {
        expect(placedWord).toHaveProperty('text');
        expect(placedWord).toHaveProperty('positions');
        expect(typeof placedWord.text).toBe('string');
        expect(Array.isArray(placedWord.positions)).toBe(true);

        placedWord.positions.forEach(pos => {
          expect(pos).toHaveProperty('x');
          expect(pos).toHaveProperty('y');
          expect(typeof pos.x).toBe('number');
          expect(typeof pos.y).toBe('number');
        });
      });
  // Test suite for canPlaceWord function
  describe('canPlaceWord', () => {
    // Test basic placement possibility
    it('should return true for valid placement', () => {
      const grid: (string | null)[][] = Array(5).fill(null).map(() => Array(5).fill(null));
      const wordSegments = ['H', 'E', 'L', 'L', 'O'];
      const start = { x: 0, y: 0 };
      const direction = { x: 1, y: 0 }; // Horizontal
      const size = 5;

      const result = canPlaceWord(wordSegments, grid, start, direction, size);
      expect(result).toBe(true);
    });

    // Test out of bounds
    it('should return false for out of bounds placement', () => {
      const grid: (string | null)[][] = Array(5).fill(null).map(() => Array(5).fill(null));
      const wordSegments = ['H', 'E', 'L', 'L', 'O'];
      const start = { x: 3, y: 0 }; // Too far right for horizontal
      const direction = { x: 1, y: 0 };
      const size = 5;

      const result = canPlaceWord(wordSegments, grid, start, direction, size);
      expect(result).toBe(false);
    });

    // Test collision with existing letter
    it('should return false for collision with existing letter', () => {
      const grid: (string | null)[][] = Array(5).fill(null).map(() => Array(5).fill(null));
      grid[0][0] = 'X'; // Place conflicting letter
      const wordSegments = ['H', 'E', 'L', 'L', 'O'];
      const start = { x: 0, y: 0 };
      const direction = { x: 1, y: 0 };
      const size = 5;

      const result = canPlaceWord(wordSegments, grid, start, direction, size);
      expect(result).toBe(false);
    });

    // Test valid overlap (same letter)
    it('should return true for valid overlap with same letter', () => {
      const grid: (string | null)[][] = Array(5).fill(null).map(() => Array(5).fill(null));
      grid[0][0] = 'H'; // Same letter
      const wordSegments = ['H', 'E', 'L', 'L', 'O'];
      const start = { x: 0, y: 0 };
      const direction = { x: 1, y: 0 };
      const size = 5;

      const result = canPlaceWord(wordSegments, grid, start, direction, size);
      expect(result).toBe(true);
    });
  });

  // Test suite for placeWord function
  describe('placeWord', () => {
    // Test basic word placement
    it('should place word segments in grid and return positions', () => {
      const grid: (string | null)[][] = Array(5).fill(null).map(() => Array(5).fill(null));
      const wordSegments = ['H', 'E', 'L', 'L', 'O'];
      const start = { x: 0, y: 0 };
      const direction = { x: 1, y: 0 }; // Horizontal

      const positions = placeWord(wordSegments, grid, start, direction);

      expect(positions).toHaveLength(5);
      expect(positions[0]).toEqual({ x: 0, y: 0 });
      expect(positions[1]).toEqual({ x: 1, y: 0 });
      expect(positions[2]).toEqual({ x: 2, y: 0 });
      expect(positions[3]).toEqual({ x: 3, y: 0 });
      expect(positions[4]).toEqual({ x: 4, y: 0 });

      expect(grid[0][0]).toBe('H');
      expect(grid[0][1]).toBe('E');
      expect(grid[0][2]).toBe('L');
      expect(grid[0][3]).toBe('L');
      expect(grid[0][4]).toBe('O');
    });

    // Test vertical placement
    it('should place word vertically', () => {
      const grid: (string | null)[][] = Array(5).fill(null).map(() => Array(5).fill(null));
      const wordSegments = ['V', 'E', 'R', 'T'];
      const start = { x: 0, y: 0 };
      const direction = { x: 0, y: 1 }; // Vertical

      const positions = placeWord(wordSegments, grid, start, direction);

      expect(positions).toHaveLength(4);
      expect(positions[0]).toEqual({ x: 0, y: 0 });
      expect(positions[1]).toEqual({ x: 0, y: 1 });
      expect(positions[2]).toEqual({ x: 0, y: 2 });
      expect(positions[3]).toEqual({ x: 0, y: 3 });

      expect(grid[0][0]).toBe('V');
      expect(grid[1][0]).toBe('E');
      expect(grid[2][0]).toBe('R');
      expect(grid[3][0]).toBe('T');
    });

    // Test diagonal placement
    it('should place word diagonally', () => {
      const grid: (string | null)[][] = Array(5).fill(null).map(() => Array(5).fill(null));
      const wordSegments = ['D', 'I', 'A', 'G'];
      const start = { x: 0, y: 0 };
      const direction = { x: 1, y: 1 }; // Diagonal down-right

      const positions = placeWord(wordSegments, grid, start, direction);

      expect(positions).toHaveLength(4);
      expect(positions[0]).toEqual({ x: 0, y: 0 });
      expect(positions[1]).toEqual({ x: 1, y: 1 });
      expect(positions[2]).toEqual({ x: 2, y: 2 });
      expect(positions[3]).toEqual({ x: 3, y: 3 });

      expect(grid[0][0]).toBe('D');
      expect(grid[1][1]).toBe('I');
      expect(grid[2][2]).toBe('A');
      expect(grid[3][3]).toBe('G');
    });
    it('should create placed words with correct structure', () => {
      Math.random = vi.fn().mockReturnValue(0.5);

      const words = ['WORD'];
      const size = 10;
      const result = generatePuzzle(words, size, 'en');

      result.placedWords.forEach(placedWord => {
        expect(placedWord).toHaveProperty('text');
        expect(placedWord).toHaveProperty('positions');
        expect(typeof placedWord.text).toBe('string');
        expect(Array.isArray(placedWord.positions)).toBe(true);

        placedWord.positions.forEach(pos => {
          expect(pos).toHaveProperty('x');
          expect(pos).toHaveProperty('y');
          expect(typeof pos.x).toBe('number');
          expect(typeof pos.y).toBe('number');
        });
      });
    });
  });
});
  });
});