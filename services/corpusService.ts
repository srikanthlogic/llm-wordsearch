import { isSupportedLocale } from '../hooks/useI18n';
import { CorpusDomain, CorpusEntry, CorpusValidation } from '../types';

// v2 reposition spec §3.2. A corpus term must be grid-placeable so the same
// data is playable: 2–24 graphemes, letters and combining marks only (marks
// keep Indic-script terms like Tamil conjuncts placeable; the grid engine
// walks graphemes via Intl.Segmenter). No spaces/hyphens/digits.
export const GRID_SAFE_TERM = /^[\p{L}\p{M}]+$/u;

const ENTRY_CAPS = { gloss: 200, context: 300, usage: 200 } as const;
const TERM_MAX = 24;
const MIN_ENTRIES = 4;
const MAX_ENTRIES = 40;

function graphemeLength(s: string): number {
  return [...s].length;
}

function clamp(s: unknown, max: number): string {
  return typeof s === 'string' ? s.trim().slice(0, max) : '';
}

// The corpus validator is STRICT (over-length is an error, not a silent
// clamp): the same function gates the M5b admin API. The authoring UI
// pre-clamps its inputs and pre-slugs titles before calling it.
function overLength(s: unknown, max: number): boolean {
  return typeof s === 'string' && s.trim().length > max;
}

export function validateCorpusEntry(raw: unknown): { entry: CorpusEntry | null; errors: string[] } {
  const errors: string[] = [];
  const source = (typeof raw === 'object' && raw !== null ? raw : {}) as Record<string, unknown>;

  if (overLength(source.term, TERM_MAX)) errors.push(`term exceeds ${TERM_MAX} characters`);
  const term = clamp(source.term, TERM_MAX);
  if (graphemeLength(term) < 2 || !GRID_SAFE_TERM.test(term)) {
    errors.push(`term "${term}" is not grid-placeable (2–24 letters, no spaces/hyphens)`);
  }
  if (overLength(source.gloss, ENTRY_CAPS.gloss)) errors.push(`gloss exceeds ${ENTRY_CAPS.gloss} characters`);
  const gloss = clamp(source.gloss, ENTRY_CAPS.gloss);
  if (!gloss) errors.push('gloss is required');
  if (overLength(source.context, ENTRY_CAPS.context)) errors.push(`context exceeds ${ENTRY_CAPS.context} characters`);
  const context = clamp(source.context, ENTRY_CAPS.context);
  if (!context) errors.push('context is required');
  if (overLength(source.usage, ENTRY_CAPS.usage)) errors.push(`usage exceeds ${ENTRY_CAPS.usage} characters`);
  const usage = clamp(source.usage, ENTRY_CAPS.usage);
  if (!usage) errors.push('usage is required');

  const related = Array.isArray(source.related)
    ? source.related.map(r => clamp(r, TERM_MAX)).filter(Boolean)
    : typeof source.related === 'string' && clamp(source.related, TERM_MAX)
      ? [clamp(source.related, TERM_MAX)]
      : [];

  if (errors.length) return { entry: null, errors };
  return { entry: { term, gloss, context, usage, related }, errors: [] };
}

export function validateCorpusDomain(raw: unknown): CorpusValidation {
  if (typeof raw !== 'object' || raw === null) {
    return { data: null, errors: ['corpus domain must be an object'], warnings: [] };
  }
  const source = raw as Record<string, unknown>;
  const errors: string[] = [];
  const warnings: string[] = [];

  // Case normalization is tolerated; anything beyond [a-z0-9-] is an error
  // (it becomes a filename and a URL path segment on served instances).
  const domain = clamp(source.domain, 40).toLowerCase();
  if (!/^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/.test(domain)) {
    errors.push('domain slug must be 2–40 chars of a-z, 0-9, "-" (no spaces)');
  }
  const title = clamp(source.title, 80);
  if (!title) errors.push('title is required');
  const blurb = clamp(source.blurb, 280);
  const locale =
    typeof source.locale === 'string' && isSupportedLocale(source.locale) ? source.locale : 'en';

  const entries: CorpusEntry[] = [];
  const seen = new Set<string>();
  if (Array.isArray(source.entries)) {
    for (const [i, rawEntry] of source.entries.entries()) {
      const { entry, errors: entryErrors } = validateCorpusEntry(rawEntry);
      if (entryErrors.length) {
        errors.push(...entryErrors.map(e => `entries[${i}]: ${e}`));
        continue;
      }
      if (entry) {
        if (seen.has(entry.term.toLowerCase())) {
          errors.push(`entries[${i}]: duplicate term "${entry.term}"`);
          continue;
        }
        seen.add(entry.term.toLowerCase());
        entries.push(entry);
      }
    }
  }
  if (entries.length < MIN_ENTRIES) {
    errors.push(`at least ${MIN_ENTRIES} entries are required (got ${entries.length})`);
  }
  if (entries.length > MAX_ENTRIES) errors.push(`at most ${MAX_ENTRIES} entries are allowed`);

  for (const entry of entries) {
    for (const rel of entry.related) {
      if (!seen.has(rel.toLowerCase())) {
        warnings.push(`"${entry.term}" relates to "${rel}", which is not in this corpus`);
      }
    }
  }

  const provenance =
    source.provenance === 'sample' || source.provenance === 'owner-authored'
      ? source.provenance
      : undefined;

  if (errors.length) return { data: null, errors, warnings };
  return { data: { domain, title, blurb, locale, provenance, entries }, errors, warnings };
}

export function exportCorpusDomainJson(domain: CorpusDomain): string {
  return JSON.stringify(domain, null, 2) + '\n';
}
