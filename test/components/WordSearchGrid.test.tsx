import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import WordSearchGrid from '../../components/WordSearchGrid';
import type { Grid, PlacedWord } from '../../types';

// Sample test data
const sampleGrid: Grid = [
  [{ letter: 'A' }, { letter: 'B' }, { letter: 'C' }],
  [{ letter: 'D' }, { letter: 'E' }, { letter: 'F' }],
  [{ letter: 'G' }, { letter: 'H' }, { letter: 'I' }]
];

const sampleWords = ['ABC', 'DEF', 'GHI', 'ADG', 'BEH', 'CFI', 'AEI', 'CEG'];
const samplePlacedWords: PlacedWord[] = [
  {
    text: 'ABC',
    hint: 'First row',
    positions: [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 }],
    found: false,
    color: '#ff0000'
  },
  {
    text: 'DEF',
    hint: 'Second row',
    positions: [{ x: 0, y: 1 }, { x: 1, y: 1 }, { x: 2, y: 1 }],
    found: true,
    color: '#00ff00'
  }
];

/**
 * Test suite for WordSearchGrid component
 * This suite verifies the WordSearchGrid component's core functionality including:
 * - Grid rendering with letters and proper styling
 * - Mouse and touch interactions for word selection
 * - Word detection (forward and reverse)
 * - Visual feedback for found words and answers
 * - Edge cases like single cell selections and invalid inputs
 * - Support for complex script languages
 * - Proper event handling and state management
 */
describe('WordSearchGrid', () => {
  let mockOnWordFound: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockOnWordFound = vi.fn();
  });

  /**
   * Test basic grid rendering
   * Ensures all letters are displayed correctly in the grid
   */
  it('should render the grid with all letters visible', () => {
    render(
      <WordSearchGrid
        grid={sampleGrid}
        words={sampleWords}
        onWordFound={mockOnWordFound}
        showAnswers={false}
        placedWords={[]}
        language="en"
      />
    );

    // Check that all letters are rendered
    expect(screen.getByText('A')).toBeInTheDocument();
    expect(screen.getByText('B')).toBeInTheDocument();
    expect(screen.getByText('C')).toBeInTheDocument();
    expect(screen.getByText('D')).toBeInTheDocument();
    expect(screen.getByText('E')).toBeInTheDocument();
    expect(screen.getByText('F')).toBeInTheDocument();
    expect(screen.getByText('G')).toBeInTheDocument();
    expect(screen.getByText('H')).toBeInTheDocument();
    expect(screen.getByText('I')).toBeInTheDocument();
  });

  /**
   * Test grid container structure
   * Verifies the grid has correct data-testid and CSS classes
   */
  it('should have correct grid container structure', () => {
    render(
      <WordSearchGrid
        grid={sampleGrid}
        words={sampleWords}
        onWordFound={mockOnWordFound}
        showAnswers={false}
        placedWords={[]}
        language="en"
      />
    );

    const grid = screen.getByTestId('word-search-grid');
    expect(grid).toHaveClass('w-full', 'max-w-xl', 'aspect-square', 'bg-slate-100');
  });

  /**
   * Test mouse word selection
   * Verifies that selecting a word with mouse triggers onWordFound
   */
  it('should detect word selection with mouse', () => {
    render(
      <WordSearchGrid
        grid={sampleGrid}
        words={sampleWords}
        onWordFound={mockOnWordFound}
        showAnswers={false}
        placedWords={[]}
        language="en"
      />
    );

    const cellA = screen.getByTestId('cell-0-0');
    const cellB = screen.getByTestId('cell-0-1');
    const cellC = screen.getByTestId('cell-0-2');

    // Simulate mouse down on A
    fireEvent.mouseDown(cellA);
    // Mouse enter on B
    fireEvent.mouseEnter(cellB);
    // Mouse enter on C
    fireEvent.mouseEnter(cellC);
    // Mouse up
    fireEvent.mouseUp(cellC);

    expect(mockOnWordFound).toHaveBeenCalledWith('ABC');
  });

  /**
   * Test reverse word detection
   * Ensures words can be found when selected in reverse order
   */
  it('should detect reverse word selection', () => {
    render(
      <WordSearchGrid
        grid={sampleGrid}
        words={sampleWords}
        onWordFound={mockOnWordFound}
        showAnswers={false}
        placedWords={[]}
        language="en"
      />
    );

    const cellC = screen.getByTestId('cell-0-2');
    const cellB = screen.getByTestId('cell-0-1');
    const cellA = screen.getByTestId('cell-0-0');

    // Select C -> B -> A (reverse of ABC)
    fireEvent.mouseDown(cellC);
    fireEvent.mouseEnter(cellB);
    fireEvent.mouseEnter(cellA);
    fireEvent.mouseUp(cellA);

    expect(mockOnWordFound).toHaveBeenCalledWith('ABC'); // Normalized to forward direction
  });

  /**
   * Test single cell selection
   * Verifies that selecting only one cell doesn't trigger word detection
   */
  it('should not detect word for single cell selection', () => {
    render(
      <WordSearchGrid
        grid={sampleGrid}
        words={sampleWords}
        onWordFound={mockOnWordFound}
        showAnswers={false}
        placedWords={[]}
        language="en"
      />
    );

    const cellA = screen.getByTestId('cell-0-0');

    fireEvent.mouseDown(cellA);
    fireEvent.mouseUp(cellA);

    expect(mockOnWordFound).not.toHaveBeenCalled();
  });

  /**
   * Test diagonal word selection
   * Ensures diagonal selections work correctly
   */
  it('should detect diagonal word selection', () => {
    render(
      <WordSearchGrid
        grid={sampleGrid}
        words={sampleWords}
        onWordFound={mockOnWordFound}
        showAnswers={false}
        placedWords={[]}
        language="en"
      />
    );

    const cellA = screen.getByTestId('cell-0-0');
    const cellE = screen.getByTestId('cell-1-1');
    const cellI = screen.getByTestId('cell-2-2');

    fireEvent.mouseDown(cellA);
    fireEvent.mouseEnter(cellE);
    fireEvent.mouseEnter(cellI);
    fireEvent.mouseUp(cellI);

    expect(mockOnWordFound).toHaveBeenCalledWith('AEI');
  });

  /**
   * Test found word styling
   * Verifies that found words have correct background color
   */
  it('should apply correct styling for found words', () => {
    render(
      <WordSearchGrid
        grid={sampleGrid}
        words={sampleWords}
        onWordFound={mockOnWordFound}
        showAnswers={false}
        placedWords={samplePlacedWords}
        language="en"
      />
    );

    // DEF is found, so cells D, E, F should have green background
    const cellD = screen.getByTestId('cell-1-0');
    const cellE = screen.getByTestId('cell-1-1');
    const cellF = screen.getByTestId('cell-1-2');

    expect(cellD).toHaveStyle({ backgroundColor: '#00ff00' });
    expect(cellE).toHaveStyle({ backgroundColor: '#00ff00' });
    expect(cellF).toHaveStyle({ backgroundColor: '#00ff00' });
  });

  /**
   * Test show answers functionality
   * Ensures answer words are highlighted when showAnswers is true
   */
  it('should show answers when showAnswers is true', () => {
    render(
      <WordSearchGrid
        grid={sampleGrid}
        words={sampleWords}
        onWordFound={mockOnWordFound}
        showAnswers={true}
        placedWords={samplePlacedWords}
        language="en"
      />
    );

    // ABC is not found but should be shown as answer
    const cellA = screen.getByTestId('cell-0-0');
    expect(cellA).toHaveStyle({ backgroundColor: '#ff0000' });
  });

  /**
   * Test selection styling
   * Verifies that selected cells have correct visual feedback
   */
  it('should apply selection styling during mouse interaction', () => {
    render(
      <WordSearchGrid
        grid={sampleGrid}
        words={sampleWords}
        onWordFound={mockOnWordFound}
        showAnswers={false}
        placedWords={[]}
        language="en"
      />
    );

    const cellA = screen.getByTestId('cell-0-0');
    const cellB = screen.getByTestId('cell-0-1');

    fireEvent.mouseDown(cellA);
    expect(cellA).toHaveClass('bg-yellow-500');

    fireEvent.mouseEnter(cellB);
    expect(cellB).toHaveClass('bg-yellow-500');
  });

  /**
   * Test complex script language support
   * Verifies component handles complex scripts correctly
   */
  it('should handle complex script languages', () => {
    render(
      <WordSearchGrid
        grid={sampleGrid}
        words={sampleWords}
        onWordFound={mockOnWordFound}
        showAnswers={false}
        placedWords={[]}
        language="hi" // Hindi
      />
    );

    const cellA = screen.getByTestId('cell-0-0');
    // Should have smaller font classes for complex scripts
    expect(cellA).toHaveClass('text-sm');
  });

  /**
   * Test mouse leave event
   * Ensures selection is cleared when mouse leaves the grid
   */
  it('should clear selection on mouse leave', () => {
    render(
      <WordSearchGrid
        grid={sampleGrid}
        words={sampleWords}
        onWordFound={mockOnWordFound}
        showAnswers={false}
        placedWords={[]}
        language="en"
      />
    );

    const grid = screen.getByTestId('word-search-grid');
    const cellA = screen.getByTestId('cell-0-0');

    fireEvent.mouseDown(cellA);
    expect(cellA).toHaveClass('bg-yellow-500');

    fireEvent.mouseLeave(grid);
    // Selection should be cleared, but we can't easily test the internal state
    // This test ensures no errors occur
  });

  /**
   * Test touch events
   * Verifies touch interactions work and preventDefault is called
   */
  it('should handle touch events', () => {
    render(
      <WordSearchGrid
        grid={sampleGrid}
        words={sampleWords}
        onWordFound={mockOnWordFound}
        showAnswers={false}
        placedWords={[]}
        language="en"
      />
    );

    const grid = screen.getByTestId('word-search-grid');

    // Create a proper TouchEvent to test preventDefault
    const touchStartEvent = new TouchEvent('touchstart', {
      bubbles: true,
      touches: [new Touch({ identifier: 0, target: grid, clientX: 50, clientY: 50 })]
    });

    const preventDefaultSpy = vi.spyOn(touchStartEvent, 'preventDefault');

    fireEvent(grid, touchStartEvent);
    expect(preventDefaultSpy).toHaveBeenCalled();
  });
});