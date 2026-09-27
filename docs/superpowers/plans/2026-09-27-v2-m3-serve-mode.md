# WordKey v2 — Milestone M3: Serve Mode (Implementation Plan)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans task-by-task. Checkbox syntax for tracking. **Repo loop:** one task = one issue = one branch/PR into `dev`, CI green, ledger line. Verify: tests in main checkout; tsc/lint/build in `/tmp/ws-clean` worktree.

**Goal:** A serve-mode instance shows the owner's domains as the landing experience, derives playable levels deterministically from the corpus, reveals context+usage on found words, and offers a readable `/vocab` browser — no LLM, no API key needed.

**Architecture:** Corpus files are static assets under `public/corpus/` listed by `public/corpus/manifest.json` (owner replaces files; Docker/Hono mounts over the same paths in M5). A pure derivation service turns a `CorpusDomain` into a `GameDefinition` using `config.levels`. `PlayerView` renders domain cards (serve home) when in serve mode without an active session; `WordList` reveals `context`+`usage` on found words; a `VocabView` renders the readable corpus.

**Spec:** `docs/superpowers/specs/2026-09-27-v2-reposition-design.md` rev 4 — §3.3 (data flow), §5 (serve surface).

## Global Constraints

- Deterministic: same corpus + config ⇒ same levels (no randomness in level derivation; grid placement keeps its existing deterministic engine).
- `Word` gains optional `context?: string; usage?: string` — additive; existing generated games unaffected.
- Serve mode: no LLM call anywhere in the play path; share-links keep working.
- Sample corpora live in `public/corpus/` (2 domains), marked `provenance: "sample"`; content is provisional pending owner decision (spec §13 [DECISION 2]).
- New copy = i18n keys ×7 (en canonical + short translations); entry text is owner content, never translated.

---

### Task 1: Corpus loading + deterministic level derivation

**Files:**
- Modify: `types.ts` (`Word` + optional `context?`, `usage?`)
- Create: `services/corpusLoader.ts`
- Create: `services/levelDerivation.ts`
- Create: `public/corpus/manifest.json` + 2 sample domains (`payments.json`, `ai-basics.json`, ~10 entries each — content provisional per [DECISION 2])
- Test: `test/services/levelDerivation.test.ts`, `test/services/corpusLoader.test.ts`
- CI guard: extend `test/i18n-keys.test.ts` pattern — add `test/corpus-samples.test.ts`: every manifest-listed domain file exists, parses, and passes `validateCorpusDomain` with zero errors

**Interfaces:**
- Produces:
  - `services/corpusLoader.ts`: `fetchCorpusDomains(manifestUrl = '/corpus/manifest.json'): Promise<{ domains: CorpusDomain[]; errors: string[] }>` — fetch manifest `{ "domains": ["payments", "ai-basics"] }`, fetch each `/corpus/<slug>.json`, validate each via `validateCorpusDomain`, drop invalid (collecting errors). Module-level cache (per session) keyed by manifest URL; force-reload param for tests.
  - `services/levelDerivation.ts`: `deriveLevels(domain: CorpusDomain, levelsPerDomain: number, wordsPerLevel: number): GameLevel[]` — deterministic: sort entries alphabetically, chunk into `levelsPerDomain` consecutive groups, right-pad the last chunk by cycling its own entries (never below 4 words), map to `{ level, gridSize: gridSizeFor(wordCount), timeLimitSeconds, words: [{ word: term.toUpperCase() for latin? no — keep raw term, hint: gloss, context, usage }] }`. `gridSizeFor(n) = Math.max(8, Math.min(15, n + 4))` (matches the scale the grid engine comfortably places). `deriveGameDefinition(domain, config): GameDefinition` — assembles `{ id: 'corpus-' + domain.domain, theme: domain.title, language: domain.locale, levels }`.

- TDD: derivation tests assert determinism (two calls → deep-equal), chunking math (e.g. 10 entries / 3 levels → sizes 4/3/3 padded to 4/4/4? no: wordsPerLevel from config, entries spread: sizes = ceil/floor distribution), payload mapping (term→word, gloss→hint, context/usage carried), id/theme/language. Loader tests: happy path (stubbed fetch), invalid domain dropped with error, cache (second call → one fetch round).

- Commit: `feat(corpus): loader + deterministic level derivation (#<issue>)`

---

### Task 2: Serve-mode home (domain cards) in PlayerView

**Files:**
- Modify: `views/PlayerView.tsx` — when `config.mode === serve` AND no `sharedGame` AND no active session: render the serve home (domain cards) instead of the library/history tabs. Card: domain title, blurb, entry count; click → `deriveGameDefinition` → start playing that definition (reuse the existing "play a library game" entry path — pass a synthetically created game through the same state flow; the derived game is NOT persisted to the library).
- Modify: `public/locales/*.json` ×7 — `serve.*` keys (`serve.home`, `serve.domainPlay`, `serve.entriesCount`, `serve.loading`, `serve.loadError`, `serve.empty`)
- Test: `test/views/PlayerView.serve.test.tsx` — stub corpus fetches; domain cards render; clicking a card starts the grid with the derived game; loader error renders `serve.loadError`.

- Commit: `feat(serve): domain-card home with derived play (#<issue>)`

---

### Task 3: Learn-moment reveal + /vocab browser

**Files:**
- Modify: `components/WordList.tsx` — when a word is found AND carries `context`/`usage`, expand the entry in place: gloss (existing), then a quiet block with `context` and a "Try:" prompt-fragment line for `usage`. New i18n keys ×7: `wordlist.reveal.context`, `wordlist.reveal.usage`
- Create: `views/VocabView.tsx` — readable page: for each domain (from `fetchCorpusDomains`), section per domain (title, blurb) and a block per entry (term, gloss, context, usage, related). Back button returns to Player.
- Modify: `App.tsx` (`View.Vocab` case), `components/Sidebar.tsx` + `components/BottomTabBar.tsx` (optional `showVocab?: boolean` default false; App passes `isServeMode` — the vocabulary browser is a visitor surface)
- Modify: `types.ts` (`View.Vocab`), i18n keys ×7 (`vocab.title`, `vocab.back`, `vocab.empty`)
- Test: `test/components/WordList.reveal.test.tsx` (found word with context/usage → reveal visible; without → unchanged), `test/views/VocabView.test.tsx` (renders domains from stubbed loader)

- Commit: `feat(serve): learn-moment reveal + vocab browser (#<issue>)`

---

## Post-M3

M3b (gamification: sequential unlocks, badge catalog, trophy shelf) per spec §5.1 — plan written when reached. The M1 serve-mode redirect already lands visitors on Player; Task 2 makes that Player the domain home.
