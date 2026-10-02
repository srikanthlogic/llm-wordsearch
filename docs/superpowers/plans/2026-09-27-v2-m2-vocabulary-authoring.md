# WordKey v2 — Milestone M2: Vocabulary Authoring (Implementation Plan)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **Execution note (this repo):** one task = one GitHub issue = one branch off `dev` = one squash PR into `dev`, CI green before merge, ledger line per issue. Local verification: tests in the main checkout; `type-check`/`lint:check`/`build` in the `/tmp/ws-clean` worktree (see memory `local-dev-env-pollution` — ancestor `node_modules` shadows tsc, parent `eslint.config.js` breaks ESLint).

**Goal:** In author mode, the owner can create vocabulary domains — LLM-assisted structured-entry proposals edited into curated entries — persisted as a local draft corpus and exported as `corpus/<domain>.json` (+ a `wordkey.config.json` template).

**Architecture:** Pure validation (corpus schema, shared by authoring, serving, and the M5b admin API) lives in `services/corpusService.ts`; draft persistence in `services/corpusStorageService.ts` (localStorage, capped). Proposals reuse the existing provider plumbing in `services/geminiService.ts` with a new structured-entry prompt from `prompts.ts`, parsed/sanitized by a pure function. `AuthorView` (new view, author-mode-only nav) wires it together; export is a browser download.

**Tech Stack:** React 19 + TypeScript + Vite, Vitest + Testing Library. No new runtime dependencies.

**Spec:** `docs/superpowers/specs/2026-09-27-v2-reposition-design.md` (rev 4) — §3.2 (corpus schema), §4 (author mode), §2 (author mode on).

## Global Constraints

- Entry `term` must be grid-placeable: 2–24 graphemes, unicode letters only (`/^[\p{L}]+$/u`) — no spaces/hyphens/digits. Multi-word concepts use grid-safe spellings; the spaced form goes in `gloss`.
- Caps: `gloss` ≤ 200, `context` ≤ 300, `usage` ≤ 200, title ≤ 80, blurb ≤ 280; domain: 4–40 entries; drafts: ≤ 20 domains (const `MAX_DRAFT_DOMAINS = 20`).
- Validation is pure and shared: authoring UI, M3 level derivation, and M5b admin API all call the same `validateCorpusDomain`.
- `errors` block saving; `warnings` (unresolved `related`) do not.
- New UI strings are i18n keys ×7 locales; entry field values are owner content (never translated).
- Existing suites stay green; no check disabled.

---

### Task 1: Corpus schema, validator, draft storage

**Files:**
- Modify: `types.ts` (append)
- Create: `services/corpusService.ts`
- Create: `services/corpusStorageService.ts`
- Test: `test/services/corpusService.test.ts`
- Test: `test/services/corpusStorageService.test.ts`

**Interfaces:**
- Produces (Tasks 2–3 and later milestones depend on these exact names):
  - `types.ts`: `interface CorpusEntry { term: string; gloss: string; context: string; usage: string; related: string[] }`; `interface CorpusDomain { domain: string; title: string; blurb: string; locale: string; provenance?: 'sample' | 'owner-authored'; entries: CorpusEntry[] }`; `type CorpusValidation = { data: CorpusDomain | null; errors: string[]; warnings: string[] }`
  - `services/corpusService.ts`: `GRID_SAFE_TERM = /^[\p{L}]+$/u`; `validateCorpusEntry(raw: unknown): { entry: CorpusEntry | null; errors: string[] }`; `validateCorpusDomain(raw: unknown): CorpusValidation`; `exportCorpusDomainJson(domain: CorpusDomain): string`
  - `services/corpusStorageService.ts`: `MAX_DRAFT_DOMAINS = 20`; `loadDraftCorpus(): CorpusDomain[]`; `saveDraftDomain(domain: CorpusDomain): { ok: boolean; error?: string }` (upsert by `domain` slug, enforces cap); `deleteDraftDomain(slug: string): void`

- [ ] **Step 1: Failing tests — validator** (`test/services/corpusService.test.ts`)

```ts
import { describe, expect, it } from 'vitest';

import { validateCorpusDomain, validateCorpusEntry } from '../../services/corpusService';

const validEntry = {
  term: 'interchange',
  gloss: 'Fee merchant bank pays cardholder bank per swipe.',
  context: 'In UPI discourse zero MDR made it a policy flashpoint.',
  usage: 'Explain how interchange differs from MDR.',
  related: ['MDR'],
};

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
    expect(errors.length).toBe(1);
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
    entries: [validEntry, validEntry, validEntry, validEntry],
  };

  it('accepts a valid domain', () => {
    const { data, errors, warnings } = validateCorpusDomain(domain);
    expect(errors).toEqual([]);
    expect(warnings).toEqual([]);
    expect(data?.entries).toHaveLength(4);
  });

  it('errors on bad slug, duplicate terms, too few entries', () => {
    expect(validateCorpusDomain({ ...domain, domain: 'Bad Slug' }).errors.length).toBeGreaterThan(0);
    expect(validateCorpusDomain({ ...domain, entries: [validEntry, validEntry, validEntry, { ...validEntry, term: 'interchange' }] }).errors.length).toBeGreaterThan(0);
  });

  it('warns (not errors) on unresolved related terms', () => {
    const { warnings, errors } = validateCorpusDomain(domain);
    expect(errors).toEqual([]);
    expect(warnings.some(w => w.includes('MDR'))).toBe(true);
  });

  it('rejects garbage input with errors, data null', () => {
    const { data, errors } = validateCorpusDomain(null);
    expect(data).toBeNull();
    expect(errors.length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run — expect FAIL** (`npm run test:run -- test/services/corpusService.test.ts`, module missing)

- [ ] **Step 3: Implement `types.ts` additions + `services/corpusService.ts`**

```ts
// services/corpusService.ts
import { CorpusDomain, CorpusEntry, CorpusValidation } from '../types';
import { isSupportedLocale } from '../hooks/useI18n';

// v2 reposition spec §3.2. A corpus term must be grid-placeable so the same
// data is playable: 2–24 graphemes, unicode letters only.
export const GRID_SAFE_TERM = /^[\p{L}]+$/u;
const ENTRY_CAPS = { gloss: 200, context: 300, usage: 200 } as const;

function graphemeLength(s: string): number {
  return [...s].length;
}

function clamp(s: unknown, max: number): string {
  return typeof s === 'string' ? s.trim().slice(0, max) : '';
}

export function validateCorpusEntry(raw: unknown): { entry: CorpusEntry | null; errors: string[] } {
  const errors: string[] = [];
  const source = (typeof raw === 'object' && raw !== null ? raw : {}) as Record<string, unknown>;
  const term = clamp(source.term, 24);
  if (graphemeLength(term) < 2 || !GRID_SAFE_TERM.test(term)) {
    errors.push(`term "${term}" is not grid-placeable (2–24 letters, no spaces/hyphens)`);
  }
  const gloss = clamp(source.gloss, ENTRY_CAPS.gloss);
  if (!gloss) errors.push('gloss is required');
  const context = clamp(source.context, ENTRY_CAPS.context);
  if (!context) errors.push('context is required');
  const usage = clamp(source.usage, ENTRY_CAPS.usage);
  if (!usage) errors.push('usage is required');
  const related = Array.isArray(source.related)
    ? source.related.map(r => clamp(r, 24)).filter(Boolean)
    : typeof source.related === 'string' && clamp(source.related, 24)
      ? [clamp(source.related, 24)]
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

  const domain = clamp(source.domain, 40).toLowerCase().replace(/[^a-z0-9-]/g, '');
  if (!domain) errors.push('domain slug is required (a-z, 0-9, -)');
  const title = clamp(source.title, 80);
  if (!title) errors.push('title is required');
  const blurb = clamp(source.blurb, 280);
  const locale = typeof source.locale === 'string' && isSupportedLocale(source.locale) ? source.locale : 'en';

  const entries: CorpusEntry[] = [];
  const seen = new Set<string>();
  if (Array.isArray(source.entries)) {
    for (const [i, rawEntry] of source.entries.entries()) {
      const { entry, errors: entryErrors } = validateCorpusEntry(rawEntry);
      if (entryErrors.length) {
        errors.push(...entryErrors.map(e => `entries[${i}]: ${e}`));
        continue;
      }
      if (entry && seen.has(entry.term.toLowerCase())) {
        errors.push(`entries[${i}]: duplicate term "${entry.term}"`);
        continue;
      }
      if (entry) {
        seen.add(entry.term.toLowerCase());
        entries.push(entry);
      }
    }
  }
  if (entries.length < 4) errors.push(`at least 4 entries are required (got ${entries.length})`);
  if (entries.length > 40) errors.push('at most 40 entries are allowed');
  for (const entry of entries) {
    for (const rel of entry.related) {
      if (!seen.has(rel.toLowerCase())) warnings.push(`"${entry.term}" relates to "${rel}", which is not in this corpus`);
    }
  }
  const provenance = source.provenance === 'sample' ? 'sample' : source.provenance === 'owner-authored' ? 'owner-authored' : undefined;
  if (errors.length) return { data: null, errors, warnings };
  return { data: { domain, title, blurb, locale, provenance, entries }, errors, warnings };
}

export function exportCorpusDomainJson(domain: CorpusDomain): string {
  return JSON.stringify(domain, null, 2) + '\n';
}
```

Types append to `types.ts`:

```ts
export interface CorpusEntry {
  term: string;
  gloss: string;
  context: string;
  usage: string;
  related: string[];
}

export interface CorpusDomain {
  domain: string;
  title: string;
  blurb: string;
  locale: string;
  provenance?: 'sample' | 'owner-authored';
  entries: CorpusEntry[];
}

export interface CorpusValidation {
  data: CorpusDomain | null;
  errors: string[];
  warnings: string[];
}
```

- [ ] **Step 4: Run — expect PASS.**

- [ ] **Step 5: Failing tests + implementation for draft storage** — follow the `loadAvailableGames/saveAvailableGames` pattern in `services/storageService.ts` (JSON in localStorage, try/catch around parse, cap enforced on save):

```ts
// services/corpusStorageService.ts
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
  const updated = [...drafts.filter(d => d.domain !== domain.domain), domain].slice(-MAX_DRAFT_DOMAINS);
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
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(drafts.filter(d => d.domain !== slug)));
}
```

Tests (`test/services/corpusStorageService.test.ts`): localStorage round-trip (jsdom), upsert-by-slug replaces, cap enforcement (insert 21 → 20 kept), corrupt JSON → empty array, delete removes. Clear `window.localStorage` in `beforeEach`.

- [ ] **Step 6: Full local verification + commit**

```bash
git checkout -b fix/<issue>-corpus-schema
# gates: tests locally; tsc/lint/build in /tmp/ws-clean
git commit -m "feat(corpus): schema validation + draft storage (#<issue>)"
```

---

### Task 2: LLM corpus proposals (prompt + parse/sanitize)

**Files:**
- Modify: `prompts.ts` (append)
- Modify: `services/geminiService.ts` (append a `proposeCorpusEntries` following the existing `generateGameLevels` provider plumbing)
- Create: `services/corpusProposalService.ts`
- Test: `test/services/corpusProposalService.test.ts`
- Test: `test/prompts.test.ts` (extend existing file)

**Interfaces:**
- Consumes: `validateCorpusEntry` (Task 1), the LLM call plumbing inside `geminiService.ts`.
- Produces:
  - `prompts.ts`: `getCorpusProposalMessages(theme: string, locale: string, count: number)` returning chat messages whose system prompt demands strict JSON `{"entries":[{"term","gloss","context","usage","related"}]}` with the grid-placeability rule stated (letters only, 2–24; put spaced forms in `gloss`), `context` = "how the meaning shifts by setting", `usage` = a realistic prompt fragment using the term.
  - `services/corpusProposalService.ts`: `parseCorpusProposals(text: string): { proposals: CorpusEntry[]; errors: string[] }` — strips markdown fences, extracts the JSON object, maps through `validateCorpusEntry`, drops invalid entries (collecting their errors), dedupes case-insensitively, caps at 40.
  - `services/geminiService.ts`: `proposeCorpusEntries(aiSettings: AIProviderSettings, theme: string, locale: string, count: number, setLogs?: ...): Promise<CorpusEntry[]>` — same request path as `generateGameLevels` (community model / BYOLLM / proxy headers), parses via `parseCorpusProposals`, throws with the raw-text snippet on total parse failure (AI Log records it, matching #65 diagnostics).

- [ ] **Step 1: Failing tests** for `parseCorpusProposals`: plain JSON, ```json-fenced JSON, invalid entries dropped (term with space → dropped, others kept), dedupe, no-JSON-found → proposals [] + errors non-empty. For `prompts.ts`: messages exist, system prompt contains "grid-placeable" and the JSON shape.
- [ ] **Step 2: Run — expect FAIL.**
- [ ] **Step 3: Implement** the three pieces above; reuse the exact JSON-extraction approach already used for game generation in `geminiService.ts` (fence stripping lives there or in a shared helper — match whatever exists).
- [ ] **Step 4: Run — PASS.** Note: `proposeCorpusEntries` network path is exercised by the existing llm-proxy integration harness pattern; unit tests cover the pure parser.
- [ ] **Step 5: Verification + commit** `feat(corpus): LLM-assisted entry proposals (#<issue>)`.

---

### Task 3: AuthorView, author-mode nav, export

**Files:**
- Modify: `types.ts` (`enum View { ..., Author }`)
- Modify: `components/Sidebar.tsx`, `components/BottomTabBar.tsx` (optional `showAuthor?: boolean`, default false; new nav item — icon from `components/Icons.tsx`, e.g. `BookIcon`/`NotebookPenIcon` if available in the lucide-style set, else add one)
- Modify: `App.tsx` (pass `showAuthor={config.mode === InstanceMode.Author && !isServeMode}` — author mode implies not serve, so just `config.mode === InstanceMode.Author`; route-guard Author like Maker: serve-mode navigate/render redirect to Player)
- Create: `views/AuthorView.tsx`
- Modify: `public/locales/*.json` ×7 (new keys, namespace `author.*`: `title`, `subtitle`, `domainForm.title`, `domainForm.slug`, `domainForm.blurb`, `propose`, `proposeCount`, `proposing`, `entries.heading`, `entry.term`, `entry.gloss`, `entry.context`, `entry.usage`, `entry.related`, `entry.add`, `entry.remove`, `save`, `saved`, `export`, `exported`, `drafts.heading`, `drafts.empty`, `validation.errorHeading`, `validation.warningHeading`, `configTemplate.export`)
- Test: `test/views/AuthorView.test.tsx`
- Test: `test/App.serveMode.test.tsx` (extend: author mode shows Author nav; serve mode hides it and guards the view)

**Interfaces:**
- Consumes: Task 1 services, Task 2 `proposeCorpusEntries`, `useInstanceConfig`, `useFeedback` (toast).
- Produces: `AuthorView` with no props (reads/writes draft storage directly). Export helpers: `downloadJson(filename: string, content: string): void` in `utils/download.ts` (Blob + object URL + anchor click; revoke afterwards) — unit-testable by stubbing `URL.createObjectURL`.

**AuthorView behavior (the whole flow, single file):**
1. Domain form (slug, title, blurb) + "Propose entries" → `proposeCorpusEntries(aiSettings, title, locale, count)` → entries land in an editable list (each row: term, gloss, context, usage inputs; related comma-separated).
2. Manual "Add entry" appends a blank row. Rows are removable.
3. "Save domain" runs `validateCorpusDomain` on the assembled `CorpusDomain` (`provenance: 'owner-authored'`): errors render in a list (blocking, with per-entry feedback), warnings render separately (non-blocking); on success `saveDraftDomain` + toast `author.saved`.
4. Drafts list (from `loadDraftCorpus`): load-into-editor (by slug), delete (confirm via existing `useFeedback().confirm`), and "Export" per domain: `downloadJson('corpus/<slug>.json', exportCorpusDomainJson(domain))` + toast; plus "Export config template" → `wordkey.config.json` with mode/title prefilled from `useInstanceConfig()`.
5. AI Log link reuses the same `setLogs`/`onOpenAiLogs` props pattern as MakerView (pass through App).

**TDD steps:** failing AuthorView tests first — renders form; propose (mock `geminiService.proposeCorpusEntries` → 4 valid entries) fills editable rows; save-with-validation-error shows errors and does NOT persist; save-valid persists (assert `loadDraftCorpus()`); export stubs `URL.createObjectURL`/`click` and asserts blob filename. Then implement; then extend App serve-mode test; then i18n keys ×7 (en canonical first — the CI key test enforces the rest; short natural translations for de/es/fr/hi/ta/bn).

- [ ] Full local verification + commit `feat(author): AuthorView with propose/edit/save/export (#<issue>)`.

---

## Post-M2

M3 (serve mode: domain-home, level derivation, learn-moment, /vocab browser) gets its own plan when the loop reaches it — it consumes `validateCorpusDomain` + `loadDraftCorpus`-shaped corpus input from `public/corpus/*.json`. The vocab.md preview moves to M4 where the shared artifact renderer lands (avoid building the renderer twice).
