import type { Grid, GridCell, PlacedWord, Word, Position } from '../types';

const directions = [
  { x: 1, y: 0 },   // Horizontal
  { x: -1, y: 0 },  // Horizontal Reverse
  { x: 0, y: 1 },   // Vertical
  { x: 0, y: -1 },  // Vertical Reverse
  { x: 1, y: 1 },   // Diagonal Down-Right
  { x: -1, y: -1 }, // Diagonal Up-Left
  { x: 1, y: -1 },  // Diagonal Up-Right
  { x: -1, y: 1 },  // Diagonal Down-Left
];

export function generatePuzzle(words: string[], size: number, language: string): { grid: Grid; placedWords: Omit<PlacedWord, 'hint' | 'found' | 'color'>[] } {
  const grid: (string | null)[][] = Array(size).fill(null).map(() => Array(size).fill(null));
  const placedWords: Omit<PlacedWord, 'hint' | 'found' | 'color'>[] = [];
  
  // Use Intl.Segmenter if available to correctly handle graphemes in all languages, with a fallback for older environments.
  const segmentWord = (word: string): string[] => {
    if (Intl && (Intl as any).Segmenter) {
      const segmenter = new (Intl as any).Segmenter(language, { granularity: 'grapheme' });
      return Array.from(segmenter.segment(word), ({ segment }: { segment: string }) => segment);
    }
    // Fallback for environments without Intl.Segmenter.
    // Array.from handles many Unicode characters better than split('').
    return Array.from(word);
  };

  // Create a character pool from the actual words to fill empty grid cells
  const allSegments = words.flatMap(segmentWord);
  const characterPool = Array.from(new Set(allSegments));
  const getRandomLetter = () => characterPool.length > 0
    ? characterPool[Math.floor(Math.random() * characterPool.length)]
    : ' ';

  const segmentedWords = words.map(word => ({
      text: word,
      segments: segmentWord(word)
  }));

  // Sort words by the number of graphemes (user-perceived characters)
  const sortedWords = segmentedWords.sort((a, b) => b.segments.length - a.segments.length);

  for (const wordInfo of sortedWords) {
    const wordUpper = wordInfo.text.toUpperCase();
    let placed = false;
    const shuffledDirections = [...directions].sort(() => Math.random() - 0.5);

    for (const direction of shuffledDirections) {
      const startPositions: Position[] = [];
      for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
          startPositions.push({ y: r, x: c });
        }
      }
      const shuffledStarts = startPositions.sort(() => Math.random() - 0.5);

      for (const start of shuffledStarts) {
        if (canPlaceWord(wordInfo.segments, grid, start, direction, size)) {
          const positions = placeWord(wordInfo.segments, grid, start, direction);
          // Store the original, non-segmented, uppercase word text
          placedWords.push({ text: wordUpper, positions });
          placed = true;
          break;
        }
      }
      if (placed) break;
    }
  }

  const finalGrid: Grid = grid.map(row => 
    row.map(cell => ({
      letter: cell || getRandomLetter(),
    }))
  );

  return { grid: finalGrid, placedWords };
}

function canPlaceWord(wordSegments: string[], grid: (string | null)[][], start: Position, direction: Position, size: number): boolean {
  let { x, y } = start;
  for (let i = 0; i < wordSegments.length; i++) {
    const newX = x + i * direction.x;
    const newY = y + i * direction.y;

    if (newX < 0 || newX >= size || newY < 0 || newY >= size) {
      return false; // Out of bounds
    }
    const gridChar = grid[newY][newX];
    if (gridChar !== null && gridChar.toUpperCase() !== wordSegments[i].toUpperCase()) {
      return false; // Collision with a different letter
    }
  }
  return true;
}

function placeWord(wordSegments: string[], grid: (string | null)[][], start: Position, direction: Position): Position[] {
  const positions: Position[] = [];
  let { x, y } = start;
  for (let i = 0; i < wordSegments.length; i++) {
    const newX = x + i * direction.x;
    const newY = y + i * direction.y;
    grid[newY][newX] = wordSegments[i];
    positions.push({ x: newX, y: newY });
  }
  return positions;
}
