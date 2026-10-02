import { describe, expect, it } from 'vitest';

import { getCorpusProposalMessages } from '../../prompts';
import { parseCorpusProposals } from '../../services/corpusProposalService';

const good = {
  term: 'interchange',
  gloss: 'Fee merchant bank pays cardholder bank per swipe.',
  context: 'In UPI discourse zero MDR made it a policy flashpoint.',
  usage: 'Explain how interchange differs from MDR.',
  related: ['MDR'],
};

describe('parseCorpusProposals', () => {
  it('parses a plain JSON payload', () => {
    const text = JSON.stringify({ entries: [good, { ...good, term: 'mandate' }] });
    const { proposals, errors } = parseCorpusProposals(text);
    expect(errors).toEqual([]);
    expect(proposals.map(p => p.term)).toEqual(['interchange', 'mandate']);
  });

  it('strips markdown fences', () => {
    const text = '```json\n' + JSON.stringify({ entries: [good] }) + '\n```';
    const { proposals, errors } = parseCorpusProposals(text);
    expect(errors).toEqual([]);
    expect(proposals).toHaveLength(1);
  });

  it('extracts JSON embedded in prose', () => {
    const text = 'Here are the entries:\n' + JSON.stringify({ entries: [good] }) + '\nDone.';
    const { proposals } = parseCorpusProposals(text);
    expect(proposals).toHaveLength(1);
  });

  it('drops invalid entries and reports them, keeping valid ones', () => {
    const text = JSON.stringify({
      entries: [good, { ...good, term: 'not grid safe' }, { ...good, term: 'x' }],
    });
    const { proposals, errors } = parseCorpusProposals(text);
    expect(proposals).toHaveLength(1);
    expect(errors.length).toBe(2);
  });

  it('dedupes terms case-insensitively', () => {
    const text = JSON.stringify({
      entries: [good, { ...good, term: 'INTERCHANGE' }, { ...good, term: 'Interchange' }],
    });
    const { proposals } = parseCorpusProposals(text);
    expect(proposals).toHaveLength(1);
  });

  it('caps proposals at 40', () => {
    // Letter-only unique terms (digits would be rejected as non-grid-safe).
    const alpha = 'abcdefghijklmnopqrstuvwxyz';
    const entries = Array.from({ length: 50 }, (_, i) => ({
      ...good,
      term: `term${alpha[i % 26]}${alpha[Math.floor(i / 26)]}`,
    }));
    const { proposals } = parseCorpusProposals(JSON.stringify({ entries }));
    expect(proposals).toHaveLength(40);
  });

  it('returns errors when no JSON is found', () => {
    const { proposals, errors } = parseCorpusProposals('The model apologizes in prose.');
    expect(proposals).toEqual([]);
    expect(errors.length).toBeGreaterThan(0);
  });
});

describe('getCorpusProposalMessages', () => {
  const messages = getCorpusProposalMessages({ theme: 'credit cards', locale: 'en', count: 12 });

  it('returns system + user messages', () => {
    expect(messages).toHaveLength(2);
    expect(messages[0].role).toBe('system');
    expect(messages[1].role).toBe('user');
  });

  it('states the JSON contract and the grid-placeability rule', () => {
    const system = messages[0].content;
    expect(system).toContain('entries');
    expect(system.toLowerCase()).toContain('no spaces');
    expect(system).toContain('context');
    expect(system).toContain('usage');
  });

  it('includes theme, locale and count in the user message', () => {
    const user = messages[1].content;
    expect(user).toContain('credit cards');
    expect(user).toContain('12');
  });
});
