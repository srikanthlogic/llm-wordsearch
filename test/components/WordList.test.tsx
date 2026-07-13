import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { describe, it, expect, vi } from 'vitest';

import WordList from '../../components/WordList';
import type { PlacedWord } from '../../types';

vi.mock('../../hooks/useI18n', () => ({
  useI18n: () => ({
    t: (key: string) => {
      const map: Record<string, string> = {
        'wordlist.title': 'Words',
        'wordlist.toggle': 'Show words',
        'wordlist.toggleAriaLabel': 'Toggle word visibility',
      };
      return map[key] || key;
    },
  }),
}));

const sampleWords: PlacedWord[] = [
  { text: 'CAT', hint: 'A small furry pet', found: false, positions: [], color: '#ef4444' },
  { text: 'DOG', hint: 'A loyal companion', found: true, positions: [], color: '#3b82f6' },
  { text: 'BIRD', hint: 'A flying animal', found: false, positions: [], color: '#22c55e' },
];

describe('WordList', () => {
  it('should render title', () => {
    render(<WordList words={sampleWords} />);
    expect(screen.getByText('Words')).toBeInTheDocument();
  });

  it('should render all word hints', () => {
    render(<WordList words={sampleWords} />);
    expect(screen.getByText('A small furry pet')).toBeInTheDocument();
    expect(screen.getByText('A loyal companion')).toBeInTheDocument();
    expect(screen.getByText('A flying animal')).toBeInTheDocument();
  });

  it('should apply line-through for found words', () => {
    render(<WordList words={sampleWords} />);
    const foundHint = screen.getByText('A loyal companion');
    expect(foundHint).toHaveClass('line-through');
  });

  it('should not apply line-through for unfound words', () => {
    render(<WordList words={sampleWords} />);
    const unfoundHint = screen.getByText('A small furry pet');
    expect(unfoundHint).not.toHaveClass('line-through');
  });

  it('should not show word text by default', () => {
    render(<WordList words={sampleWords} />);
    expect(screen.queryByText('CAT')).not.toBeInTheDocument();
    expect(screen.queryByText('DOG')).not.toBeInTheDocument();
  });

  it('should show word text when toggle is on', () => {
    render(<WordList words={sampleWords} />);
    const toggle = screen.getByRole('button', { name: 'Toggle word visibility' });
    fireEvent.click(toggle);
    expect(screen.getByText('CAT')).toBeInTheDocument();
    expect(screen.getByText('DOG')).toBeInTheDocument();
    expect(screen.getByText('BIRD')).toBeInTheDocument();
  });

  it('should render numbered items', () => {
    render(<WordList words={sampleWords} />);
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('should render toggle label', () => {
    render(<WordList words={sampleWords} />);
    expect(screen.getByText('Show words')).toBeInTheDocument();
  });

  it('should render empty list without errors', () => {
    const { container } = render(<WordList words={[]} />);
    expect(container).toBeInTheDocument();
  });
});
