import { beforeEach, describe, expect, it } from 'vitest';

import { validateCorpusDomain } from '../../services/corpusService';
import {
  MAX_DRAFT_DOMAINS,
  deleteDraftDomain,
  loadDraftCorpus,
  saveDraftDomain,
} from '../../services/corpusStorageService';
import { CorpusDomain } from '../../types';

function makeDomain(slug: string): CorpusDomain {
  const entries = ['alpha', 'beta', 'gamma', 'delta'].map(term => ({
    term,
    gloss: `Gloss for ${term}.`,
    context: `Context for ${term}.`,
    usage: `Use ${term} in a prompt.`,
    related: [],
  }));
  const { data } = validateCorpusDomain({
    domain: slug,
    title: `Domain ${slug}`,
    blurb: `Blurb for ${slug}.`,
    locale: 'en',
    entries,
  });
  return data!;
}

describe('corpusStorageService', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('starts empty and round-trips a saved domain', () => {
    expect(loadDraftCorpus()).toEqual([]);
    const domain = makeDomain('payments');
    expect(saveDraftDomain(domain)).toEqual({ ok: true });
    expect(loadDraftCorpus()).toEqual([domain]);
  });

  it('upserts by slug instead of appending', () => {
    saveDraftDomain(makeDomain('payments'));
    const updated = { ...makeDomain('payments'), title: 'Payments v2' };
    saveDraftDomain(updated);
    const drafts = loadDraftCorpus();
    expect(drafts).toHaveLength(1);
    expect(drafts[0].title).toBe('Payments v2');
  });

  it('enforces MAX_DRAFT_DOMAINS, keeping the most recent', () => {
    for (let i = 0; i < MAX_DRAFT_DOMAINS + 3; i++) {
      saveDraftDomain(makeDomain(`domain-${i}`));
    }
    const drafts = loadDraftCorpus();
    expect(drafts).toHaveLength(MAX_DRAFT_DOMAINS);
    expect(drafts[MAX_DRAFT_DOMAINS - 1].domain).toBe(`domain-${MAX_DRAFT_DOMAINS + 2}`);
  });

  it('deletes by slug', () => {
    saveDraftDomain(makeDomain('payments'));
    saveDraftDomain(makeDomain('investing'));
    deleteDraftDomain('payments');
    expect(loadDraftCorpus().map(d => d.domain)).toEqual(['investing']);
  });

  it('returns an empty corpus on corrupt JSON', () => {
    window.localStorage.setItem('wordkey.corpus.drafts', '{not json');
    expect(loadDraftCorpus()).toEqual([]);
  });
});
