import { render, screen } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import WordList from '../../components/WordList';
import { PlacedWord } from '../../types';

vi.mock('../../hooks/useI18n', () => ({
  useI18n: () => ({ t: (key: string) => key }),
}));

const base = {
  found: false,
  positions: [],
  color: '#3b82f6',
};

const plain: PlacedWord[] = [
  { ...base, text: 'INTERCHANGE', hint: 'Fee merchant bank pays cardholder bank.' },
];

const contextual: PlacedWord[] = [
  {
    ...base,
    text: 'INTERCHANGE',
    hint: 'Fee merchant bank pays cardholder bank.',
    found: true,
    context: 'In UPI discourse zero MDR made it a policy flashpoint.',
    usage: 'Explain how interchange differs from MDR.',
  },
];

beforeEach(() => {
  vi.clearAllMocks();
});

describe('WordList learn-moment reveal (#104)', () => {
  it('reveals context and usage when a corpus word is found', () => {
    render(<WordList words={contextual} />);
    expect(screen.getByText('wordlist.reveal.context')).toBeInTheDocument();
    expect(
      screen.getByText('In UPI discourse zero MDR made it a policy flashpoint.'),
    ).toBeInTheDocument();
    expect(screen.getByText('Explain how interchange differs from MDR.')).toBeInTheDocument();
  });

  it('stays unchanged for words without context (generated games)', () => {
    render(<WordList words={plain} />);
    expect(screen.queryByText('wordlist.reveal.context')).not.toBeInTheDocument();
  });

  it('does not reveal until the word is found', () => {
    render(<WordList words={contextual.map(w => ({ ...w, found: false }))} />);
    expect(screen.queryByText('wordlist.reveal.context')).not.toBeInTheDocument();
  });
});
