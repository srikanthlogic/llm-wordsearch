import { CorpusDomain } from '../types';

import { validateCorpusDomain } from './corpusService';

// v2 reposition spec §4: the authoring draft corpus lives device-local, with
// the same caps discipline as saved games (#47/#49).
const STORAGE_KEY = 'wordkey.corpus.drafts';
export const MAX_DRAFT_DOMAINS = 20;

export function loadDraftCorpus(): CorpusDomain[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map(d => validateCorpusDomain(d).data)
      .filter((d): d is CorpusDomain => d !== null);
  } catch (error) {
    console.warn('Draft corpus could not be loaded; starting empty.', error);
    return [];
  }
}

export function saveDraftDomain(domain: CorpusDomain): { ok: boolean; error?: string } {
  const drafts = loadDraftCorpus();
  const updated = [...drafts.filter(d => d.domain !== domain.domain), domain].slice(
    -MAX_DRAFT_DOMAINS,
  );
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    return { ok: true };
  } catch (error) {
    console.error('Draft corpus could not be saved.', error);
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}

export function deleteDraftDomain(slug: string): void {
  const drafts = loadDraftCorpus();
  window.localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(drafts.filter(d => d.domain !== slug)),
  );
}
