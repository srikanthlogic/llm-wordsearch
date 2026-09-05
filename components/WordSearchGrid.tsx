import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';

import { useI18n } from '../hooks/useI18n';
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

// Uses Intl.Segmenter to correctly reverse strings with complex graphemes,
// with a fallback for older environments.
const reverseWord = (word: string, language: string): string => {
  if (Intl && (Intl as any).Segmenter) {
    const segmenter = new (Intl as any).Segmenter(language, { granularity: 'grapheme' });
    return Array.from(segmenter.segment(word), ({ segment }: { segment: string }) => segment).reverse().join('');
  }
  return Array.from(word).reverse().join('');
};

const WordSearchGrid: React.FC<WordSearchGridProps> = ({ grid, words, onWordFound, showAnswers, placedWords, language }) => {
  const { t } = useI18n();
  const [isSelecting, setIsSelecting] = useState(false);
  const [selection, setSelection] = useState<Position[]>([]);
  const [startPos, setStartPos] = useState<Position | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  // #66: cells of a failed attempt flash red + shake before the selection
  // clears, so the attempt is acknowledged instead of silently dropped.
  const [wrongSelection, setWrongSelection] = useState<Set<string>>(new Set());
  const wrongSelectionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // #67: keyboard play — roving tabindex + arrow/Enter/Space selection that
  // shares the same selection state as the pointer paths.
  const [focusedPos, setFocusedPos] = useState<Position | null>(null);
  const [announcement, setAnnouncement] = useState('');
  const cellRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const gridSize = grid.length;

  const getPositionKey = (pos: Position) => `${pos.y}-${pos.x}`;

  const rejectSelection = useCallback((positions: Position[]) => {
    setWrongSelection(new Set(positions.map(getPositionKey)));
    if (wrongSelectionTimerRef.current) {
      clearTimeout(wrongSelectionTimerRef.current);
    }
    wrongSelectionTimerRef.current = setTimeout(() => setWrongSelection(new Set()), 300);
  }, []);

  useEffect(() => {
    return () => {
      if (wrongSelectionTimerRef.current) {
        clearTimeout(wrongSelectionTimerRef.current);
      }
    };
  }, []);

  const positionToWordMap = useMemo(() => {
    const map = new Map<string, PlacedWord>();
    // For intersections, the last word in the list wins, which is acceptable.
    placedWords.forEach(word => {
        word.positions.forEach(pos => map.set(getPositionKey(pos), word));
    });
    return map;
  }, [placedWords]);

  const selectionSet = useMemo(() => new Set(selection.map(getPositionKey)), [selection]);

  // Shared by the pointer and keyboard paths: checks the current selection
  // against the word list (forward or reversed) and reports a found word.
  const checkSelectionMatch = useCallback((positions: Position[]): boolean => {
    const selectedWord = positions.map(pos => grid[pos.y][pos.x].letter).join('');
    const reversedSelectedWord = reverseWord(selectedWord, language);
    const upperWords = words.map(w => w.toUpperCase());

    if (upperWords.includes(selectedWord.toUpperCase())) {
      onWordFound(selectedWord.toUpperCase());
      setAnnouncement(t('grid.announceFound', { word: selectedWord.toUpperCase() }));
      return true;
    }
    if (upperWords.includes(reversedSelectedWord.toUpperCase())) {
      onWordFound(reversedSelectedWord.toUpperCase());
      setAnnouncement(t('grid.announceFound', { word: reversedSelectedWord.toUpperCase() }));
      return true;
    }
    return false;
  }, [grid, words, onWordFound, language, t]);

  // #67: roving-tabindex navigation. Arrows move focus (and extend an active
  // selection), Enter/Space start or commit, Escape cancels.
  const moveFocus = (from: Position, key: string): Position => {
    const dx = key === 'ArrowRight' ? 1 : key === 'ArrowLeft' ? -1 : 0;
    const dy = key === 'ArrowDown' ? 1 : key === 'ArrowUp' ? -1 : 0;
    return {
      x: Math.max(0, Math.min(gridSize - 1, from.x + dx)),
      y: Math.max(0, Math.min(gridSize - 1, from.y + dy)),
    };
  };

  const handleCellKeyDown = (e: React.KeyboardEvent, pos: Position) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      e.preventDefault();
      const next = moveFocus(focusedPos ?? pos, e.key);
      setFocusedPos(next);
      cellRefs.current[getPositionKey(next)]?.focus();
      if (isSelecting && selection.length > 0) {
        setSelection(getLine(selection[0], next));
      }
      return;
    }

    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (!isSelecting) {
        setWrongSelection(new Set());
        setIsSelecting(true);
        setSelection([pos]);
      } else if (selection.length >= 2) {
        if (!checkSelectionMatch(selection)) {
          rejectSelection(selection);
          setAnnouncement(t('grid.announceWrong'));
        }
        setIsSelecting(false);
        setSelection([]);
      }
      return;
    }

    if (e.key === 'Escape' && isSelecting) {
      e.preventDefault();
      setIsSelecting(false);
      setSelection([]);
    }
  };

  const handleMouseDown = (pos: Position) => {
    setWrongSelection(new Set());
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

    if (!checkSelectionMatch(selection)) {
      rejectSelection(selection);
    }

    setIsSelecting(false);
    setSelection([]);
  }, [isSelecting, selection, checkSelectionMatch, rejectSelection]);

  const getTouchPosition = (touch: Touch): Position => {
    if (!gridRef.current) return { x: 0, y: 0 };
    const rect = gridRef.current.getBoundingClientRect();
    const cellWidth = rect.width / gridSize;
    const cellHeight = rect.height / gridSize;
    const x = Math.floor((touch.clientX - rect.left) / cellWidth);
    const y = Math.floor((touch.clientY - rect.top) / cellHeight);
    return { x: Math.max(0, Math.min(gridSize - 1, x)), y: Math.max(0, Math.min(gridSize - 1, y)) };
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    e.preventDefault();
    const pos = getTouchPosition(e.touches[0]);
    setIsSelecting(true);
    setStartPos(pos);
    setSelection([pos]);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    e.preventDefault();
    if (!isSelecting || !startPos) return;
    const pos = getTouchPosition(e.touches[0]);
    setSelection(getLine(startPos, pos));
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    e.preventDefault();
    if (!isSelecting || selection.length < 2) {
      setIsSelecting(false);
      setSelection([]);
      setStartPos(null);
      return;
    }

    if (!checkSelectionMatch(selection)) {
      rejectSelection(selection);
    }
    setIsSelecting(false);
    setSelection([]);
    setStartPos(null);
  };

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
      className="w-full max-w-xl aspect-square animate-scale-in"
      data-testid="word-search-grid"
    >
      {/* eslint-disable-next-line jsx-a11y/no-static-element-interactions */}
      <div
        className="relative w-full h-full p-3 sm:p-4 card-elevated rounded-2xl shadow-xl select-none overflow-hidden"
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Grid background pattern */}
        <div
          className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05] pointer-events-none"
          style={{
            backgroundImage: `radial-gradient(circle, currentColor 1px, transparent 1px)`,
            backgroundSize: '8px 8px',
          }}
        />

        {/* #67: announces found words / failed attempts to screen readers */}
        <div aria-live="polite" role="status" className="sr-only">{announcement}</div>

        <div
          ref={gridRef}
          className="grid relative z-10"
          style={{ gridTemplateColumns: `repeat(${gridSize}, minmax(0, 1fr))` }}
        >
          {grid.map((row, y) =>
            row.map((cell, x) => {
              const posKey = getPositionKey({ y, x });
              const isSelected = selectionSet.has(posKey);
              const isWrong = wrongSelection.has(posKey);
              const wordData = positionToWordMap.get(posKey);
              const isFound = wordData?.found ?? false;
              const isAnswer = showAnswers && !!wordData;
              const color = wordData?.color;

              const isComplex = COMPLEX_SCRIPT_LANGS.includes(language);
              const fontClasses = isComplex ? 'text-sm sm:text-base md:text-lg' : 'text-sm sm:text-lg md:text-xl';

              let style: React.CSSProperties = {};
              const baseClasses = `flex items-center justify-center aspect-square min-h-[36px] sm:min-h-[44px] min-w-[36px] sm:min-w-[44px] ${fontClasses} font-bold uppercase transition-all duration-200 ease-out cursor-pointer`;

              // #67: roving tabindex — exactly one cell is tabbable; arrows
              // move focus from there and Enter/Space drive the selection.
              const isTabbable = focusedPos
                ? focusedPos.y === y && focusedPos.x === x
                : y === 0 && x === 0;
              const keyboardProps = {
                ref: (el: HTMLDivElement | null) => { cellRefs.current[posKey] = el; },
                onFocus: () => setFocusedPos({ y, x }),
                onKeyDown: (e: React.KeyboardEvent) => handleCellKeyDown(e, { y, x }),
              };

            if (isWrong) {
              return (
                <div
                  key={posKey}
                  role="button"
                  aria-label={`Cell ${y + 1}, ${x + 1}`}
                  tabIndex={isTabbable ? 0 : -1}
                  className={`${baseClasses} bg-gradient-to-br from-rose-500 to-red-600 text-white rounded-xl shadow-lg wrong-selection-shake focus-visible:outline focus-visible:outline-2`}
                  onMouseDown={() => handleMouseDown({ y, x })}
                  onMouseEnter={() => handleMouseEnter({ y, x })}
                  data-testid={`cell-${y}-${x}`}
                  {...keyboardProps}
                >
                  {cell.letter}
                </div>
              );
            }

            if (isSelected) {
              return (
                <div
                  key={posKey}
                  role="button"
                  aria-label={`Cell ${y + 1}, ${x + 1}`}
                  tabIndex={isTabbable ? 0 : -1}
                  className={`${baseClasses} bg-gradient-to-br from-amber-400 to-orange-500 text-white scale-110 rounded-xl shadow-lg focus-visible:outline focus-visible:outline-2`}
                  onMouseDown={() => handleMouseDown({ y, x })}
                  onMouseEnter={() => handleMouseEnter({ y, x })}
                  data-testid={`cell-${y}-${x}`}
                  {...keyboardProps}
                >
                  {cell.letter}
                </div>
              );
            }

            if (isFound || isAnswer) {
              style.backgroundColor = color;
              return (
                <div
                  key={posKey}
                  role="gridcell"
                  aria-label={`Cell ${y + 1}, ${x + 1}`}
                  tabIndex={isTabbable ? 0 : -1}
                  className={`${baseClasses} text-white rounded-lg shadow-md focus-visible:outline focus-visible:outline-2`}
                  style={style}
                  data-testid={`cell-${y}-${x}`}
                  {...keyboardProps}
                >
                  {cell.letter}
                </div>
              );
            }

            return (
              <div
                key={posKey}
                role="button"
                aria-label={`Cell ${y + 1}, ${x + 1}`}
                tabIndex={isTabbable ? 0 : -1}
                className={`${baseClasses} text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/50 rounded-lg focus-visible:outline focus-visible:outline-2`}
                onMouseDown={() => handleMouseDown({ y, x })}
                onMouseEnter={() => handleMouseEnter({ y, x })}
                data-testid={`cell-${y}-${x}`}
                {...keyboardProps}
              >
                {cell.letter}
              </div>
            );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export default WordSearchGrid;
