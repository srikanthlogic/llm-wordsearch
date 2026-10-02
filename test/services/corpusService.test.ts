import { describe, expect, it } from 'vitest';

import { validateCorpusDomain, validateCorpusEntry } from '../../services/corpusService';

const validEntry = {
  term: 'interchange',
  gloss: 'Fee merchant bank pays cardholder bank per swipe.',
  context: 'In UPI discourse zero MDR made it a policy flashpoint.',
  usage: 'Explain how interchange differs from MDR.',
  related: ['MDR'],
};

function makeEntry(term: string) {
  return {
    ...validEntry,
    term,
    usage: `Use "${term}" correctly.`,
  };
}

describe('validateCorpusEntry', () => {
  it('accepts a well-formed entry', () => {
    const { entry, errors } = validateCorpusEntry(validEntry);
    expect(errors).toEqual([]);
    expect(entry).toEqual(validEntry);
  });

  it('rejects non-grid-safe terms (spaces, hyphens, digits, empties)', () => {
    for (const term of ['zero mdr', 'zero-mdr', 'mdr2', 'a', '', '  ', 'inter_change']) {
      expect(validateCorpusEntry({ ...validEntry, term }).entry).toBeNull();
    }
  });

  it('accepts unicode-letter terms (Tamil, Devanagari)', () => {
    expect(validateCorpusEntry({ ...validEntry, term: 'இடமாற்று' }).entry).not.toBeNull();
    expect(validateCorpusEntry({ ...validEntry, term: 'इंटरचेंज' }).entry).not.toBeNull();
  });

  it('rejects over-length fields and returns specific errors', () => {
    const { entry, errors } = validateCorpusEntry({ ...validEntry, gloss: 'x'.repeat(201) });
    expect(entry).toBeNull();
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain('gloss');
  });

  it('normalizes related to an array of trimmed strings', () => {
    const { entry } = validateCorpusEntry({ ...validEntry, related: 'MDR' });
    expect(entry?.related).toEqual(['MDR']);
  });
});

describe('validateCorpusDomain', () => {
  const domain = {
    domain: 'payments',
    title: 'Payments & Cashless Living',
    blurb: 'How money moves without cash.',
    locale: 'en',
    entries: [validEntry, makeEntry('upi'), makeEntry('mandate'), makeEntry('MDR')],
  };

  it('accepts a valid domain', () => {
    const { data, errors, warnings } = validateCorpusDomain(domain);
    expect(errors).toEqual([]);
    expect(warnings).toEqual([]);
    expect(data?.entries).toHaveLength(4);
  });

  it('errors on bad slug', () => {
    const { data, errors } = validateCorpusDomain({ ...domain, domain: 'Bad Slug' });
    expect(data).toBeNull();
    expect(errors.length).toBeGreaterThan(0);
  });

  it('errors on duplicate terms', () => {
    const dup = { ...domain, entries: [...domain.entries, validEntry] };
    const { data, errors } = validateCorpusDomain(dup);
    expect(data).toBeNull();
    expect(errors.some(e => e.includes('duplicate'))).toBe(true);
  });

  it('errors on too few entries', () => {
    const { data, errors } = validateCorpusDomain({ ...domain, entries: [validEntry] });
    expect(data).toBeNull();
    expect(errors.some(e => e.includes('at least 4'))).toBe(true);
  });

  it('warns (not errors) on unresolved related terms', () => {
    const dangling = { ...makeEntry('settlement'), related: ['NPCI'] };
    const { errors, warnings } = validateCorpusDomain({ ...domain, entries: [...domain.entries.slice(0, 3), dangling] });
    expect(errors).toEqual([]);
    expect(warnings.some(w => w.includes('NPCI'))).toBe(true);
  });

  it('rejects garbage input with errors, data null', () => {
    const { data, errors } = validateCorpusDomain(null);
    expect(data).toBeNull();
    expect(errors.length).toBeGreaterThan(0);
  });
});
