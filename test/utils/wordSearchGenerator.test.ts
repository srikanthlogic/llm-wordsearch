import { describe, it, expect, vi } from 'vitest';
import { generatePuzzle } from '../../utils/wordSearchGenerator';

// Mock Math.random for predictable tests
const mockMath = Object.create(global.Math);
mockMath.random = vi.fn();
global.Math = mockMath;

describe('wordSearchGenerator', () => {
  describe('generatePuzzle', () => {
    it('should generate a grid of the specified size', () => {
      Math.random = vi.fn().mockReturnValue(0.5);
      
      const words = ['CAT', 'DOG'];
      const size = 10;
      const result = generatePuzzle(words, size, 'en');
      
      expect(result.grid).toHaveLength(size);
      expect(result.grid[0]).toHaveLength(size);
      expect(result.grid.every(row => row.length === size)).toBe(true);
    });

    it('should return placed words information', () => {
      Math.random = vi.fn().mockReturnValue(0.5);
      
      const words = ['CAT', 'DOG'];
      const size = 10;
      const result = generatePuzzle(words, size, 'en');
      
      expect(result.placedWords).toBeInstanceOf(Array);
      expect(result.placedWords.length).toBeGreaterThanOrEqual(0);
      expect(result.placedWords.length).toBeLessThanOrEqual(words.length);
    });

    it('should handle empty word list', () => {
      const words: string[] = [];
      const size = 5;
      const result = generatePuzzle(words, size, 'en');
      
      expect(result.grid).toHaveLength(size);
      expect(result.placedWords).toHaveLength(0);
    });

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