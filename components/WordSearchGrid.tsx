import React, { useState, useEffect, useCallback, useMemo } from 'react';
import type { Grid, PlacedWord, Position } from '../types';

interface WordSearchGridProps {
  grid: Grid;
  words: string[];
  onWordFound: (word: string) => void;
  showAnswers: boolean;
  placedWords: PlacedWord[];
  language: string;
}

const COMPLEX_SCRIPT_LANGS = ['ta', 'hi', 'bn'];

const WordSearchGrid: React.FC<WordSearchGridProps> = ({ grid, words, onWordFound, showAnswers, placedWords, language }) => {
  const [isSelecting, setIsSelecting] = useState(false);
  const [selection, setSelection] = useState<Position[]>([]);
  
  const gridSize = grid.length;
  
  const getPositionKey = (pos: Position) => `${pos.y}-${pos.x}`;

  const positionToWordMap = useMemo(() => {
    const map = new Map<string, PlacedWord>();
    // For intersections, the last word in the list wins, which is acceptable.
    placedWords.forEach(word => {
        word.positions.forEach(pos => map.set(getPositionKey(pos), word));
    });
    return map;
  }, [placedWords]);

  const selectionSet = useMemo(() => new Set(selection.map(getPositionKey)), [selection]);
  
  const handleMouseDown = (pos: Position) => {
    setIsSelecting(true);
    setSelection([pos]);
  };

  const handleMouseEnter = (pos: Position) => {
    if (!isSelecting) return;
    
    if (selection.length > 0) {
        const lastPos = selection[0];
        const newSelection = getLine(lastPos, pos);
        setSelection(newSelection);
    }
  };

  const handleMouseUp = useCallback(() => {
    if (!isSelecting || selection.length < 2) {
      setIsSelecting(false);
      setSelection([]);
      return;
    }

    const selectedWord = selection.map(pos => grid[pos.y][pos.x].letter).join('');
    
    // Use Intl.Segmenter to correctly reverse strings with complex graphemes, with a fallback for older environments.
    const getReversedWord = (word: string): string => {
      if (Intl && (Intl as any).Segmenter) {
        const segmenter = new (Intl as any).Segmenter(language, { granularity: 'grapheme' });
        return Array.from(segmenter.segment(word), ({ segment }: { segment: string }) => segment).reverse().join('');
      }
      // Fallback for older browsers
      return Array.from(word).reverse().join('');
    };
    
    const reversedSelectedWord = getReversedWord(selectedWord);

    const upperWords = words.map(w => w.toUpperCase());
    
    if (upperWords.includes(selectedWord.toUpperCase())) {
      onWordFound(selectedWord.toUpperCase());
    } else if (upperWords.includes(reversedSelectedWord.toUpperCase())) {
      onWordFound(reversedSelectedWord.toUpperCase());
    }

    setIsSelecting(false);
    setSelection([]);
  }, [isSelecting, selection, grid, words, onWordFound, language]);

  const getLine = (start: Position, end: Position): Position[] => {
    const line: Position[] = [];
    let dx = end.x - start.x;
    let dy = end.y - start.y;

    const dirX = Math.sign(dx);
    const dirY = Math.sign(dy);

    dx = Math.abs(dx);
    dy = Math.abs(dy);

    if (dx !== 0 && dy !== 0 && dx !== dy) return [start, end]; 
    if (dx === 0 && dy === 0) return [start];
    
    const steps = Math.max(dx, dy);

    for (let i = 0; i <= steps; i++) {
        const x = start.x + i * dirX;
        const y = start.y + i * dirY;
        line.push({x, y});
    }
    return line;
  };

  return (
    <div
      className="w-full max-w-xl aspect-square bg-slate-100 dark:bg-slate-800 p-2 sm:p-4 rounded-lg shadow-lg select-none"
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <div
        className="grid"
        style={{ gridTemplateColumns: `repeat(${gridSize}, minmax(0, 1fr))` }}
      >
        {grid.map((row, y) =>
          row.map((cell, x) => {
            const posKey = getPositionKey({ y, x });
            const isSelected = selectionSet.has(posKey);
            const wordData = positionToWordMap.get(posKey);
            const isFound = wordData?.found ?? false;
            const isAnswer = showAnswers && !!wordData;
            const color = wordData?.color;

            const isComplex = COMPLEX_SCRIPT_LANGS.includes(language);
            const fontClasses = isComplex ? 'text-sm sm:text-base md:text-lg' : 'text-sm sm:text-lg md:text-xl';

            let style: React.CSSProperties = {};
            const classes = [
              `flex items-center justify-center aspect-square ${fontClasses} font-bold uppercase transition-all duration-200 ease-in-out cursor-pointer`,
            ];

            if (isSelected) {
              classes.push('bg-yellow-500', 'text-slate-900', 'scale-110', 'rounded-full');
            } else {
              if (isFound || isAnswer) {
                style.backgroundColor = color;
                classes.push('text-white', 'rounded-full');
              } else {
                classes.push('text-slate-600 dark:text-slate-300', 'hover:bg-slate-200 dark:hover:bg-slate-700', 'rounded-lg');
              }
            }

            return (
              <div
                key={posKey}
                className={classes.join(' ')}
                style={style}
                onMouseDown={() => handleMouseDown({ y, x })}
                onMouseEnter={() => handleMouseEnter({ y, x })}
              >
                {cell.letter}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default WordSearchGrid;