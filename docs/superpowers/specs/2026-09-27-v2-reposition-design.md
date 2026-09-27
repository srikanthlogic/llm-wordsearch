# v2 Repositioning Design — Contextual Vocabulary for Humans and Agents

**Date:** 2026-09-27
**Branch target:** `dev` (product v2; `main` = production)
**Status:** DRAFT — awaiting owner review. Decision points are marked **[DECISION N]**.
**Author note:** brainstormed interactively where possible; where the owner was unavailable, a recommendation is made with rationale and flagged for ratification. Nothing below is implemented yet.

---

## 1. Vision

As LLMs become the default interface to information work, the bottleneck for humans is **contextual vocabulary**: knowing the words that name what you want, and knowing how their meaning shifts by setting. Someone who can say "ground this answer in the retrieved docs and cite your sources" gets a categorically better result than someone who says "answer my question."

The product becomes two faces of one corpus:

- **The game (humans):** a word search where every word is a real term and every clue is its *contextual* meaning. Playing builds AI-fluent vocabulary.
- **vocab.md (agents):** a machine-consumable markdown/JSON rendering of the same corpus, loadable into any agent's context during its workloads — the same convention-space as `llms.txt`, `AGENTS.md`, `CLAUDE.md`.

**Positioning statement (draft):**

> Learn the words that make AI work for you. Humans play the grid. Agents load vocab.md.

**Self-hostable:** one `docker run` gives a team their own instance — their people learn the vocabulary by playing, their agents load `/vocab.md` as shared context. A shared language, trained playfully, consumed mechanically.

### What stays, what changes

| Dimension | v1 (today) | v2 |
|---|---|---|
| Identity | "AI Word Search Generator" | New brand (**[DECISION 1]**) |
| Word source | LLM-generated per theme, always online | Curated corpus (offline) **+** LLM custom themes (kept) |
| Word payload | `word` + one-line `hint` | Full contextual entry: gloss, context shift, usage-in-a-prompt, related terms |
| Agent surface | none | `/vocab.md`, `/vocab.json`, `/llms.txt`, per-domain files |
| Installability | none (no manifest/SW) | PWA: installable, offline corpus games |
| Hosting | Vercel-only | Vercel **+** self-host Docker single image |
| Core mechanics | grid, 8 directions, levels, timer | unchanged |

---

## 2. Approaches considered

**A. Corpus-first rebuild (RECOMMENDED).** Make the corpus the heart of the product: games generate from it, vocab.md renders from it, self-host serves it, the brand is built around it. Staged in 7 shippable milestones so every increment works on its own. Highest effort, but it's the only approach where the game and vocab.md are *the same data* — which is the entire thesis. A vocab.md unrelated to the game is just a glossary file.

**B. Artifact layer on the current app.** Keep the game exactly as-is; add a curated vocab.md, PWA, Docker wrapper, rebrand. Cheapest and fastest, but the game and the file stay disconnected — the marketing claim ("play the game, load the file") would be false, and per-domain offline play (needed for PWA) never materializes because there's no corpus to play from.

**C. Two products, one repo.** A docs-ish vocab site plus the game app, sharing nothing but hosting. Cleanest separation, worst story: doubles maintenance, no data reuse, and the "one corpus, two faces" identity is lost.

Chosen: **A**, with B's cheap wins (PWA, Docker) absorbed as milestones and C explicitly rejected.

---

## 3. The corpus

### 3.1 Location & format

New top-level directory `corpus/` — one JSON file per domain, hand-curated, git-versioned, PR-friendly:

```
corpus/
  prompting.json
  ai-ml-essentials.json
  agentics.json
  retrieval-rag.json
  README.md          (authoring guide: grid constraints, schema, PR process)
```

### 3.2 Schema

```jsonc
{
  "domain": "prompting",
  "title": "Prompting & Context Control",
  "blurb": "Words for steering what a model sees, does, and refuses.",
  "locale": "en",
  "entries": [
    {
      "term": "grounding",
      "gloss": "Tying a model's answer to specific supplied sources instead of its training data.",
      "context": "In retrieval/RAG settings it means citing retrieved documents; in vision models it means linking words to regions of an image.",
      "usage": "Answer strictly from the grounded context below; if the sources don't cover it, say so.",
      "related": ["retrieval", "citation", "context window"]
    }
  ]
}
```

Field rules (enforced by a validation test, not just docs):

- `term`: 2–24 chars, single token, **grid-placeable** — letters only (no spaces/hyphens/apostrophes). Multi-word concepts get a grid-safe spelling (`fewshot`, `chainofthought` — with the spaced form mentioned in `gloss`). This is the corpus's key authoring constraint; it is what makes the same data playable.
- `gloss` ≤ 200 chars (fits the existing hint cap in `services/geminiService.ts` sanitization).
- `context` ≤ 300 chars — this is the differentiating field: *how the meaning shifts by setting*.
- `usage` ≤ 200 chars — a realistic prompt fragment showing the word in action.
- `related` terms must resolve to entries in the corpus (warning, not error).
- Terms unique across the whole corpus.

### 3.3 Seed domains **[DECISION 2]**

Recommendation: launch with 4 domains × 30–40 entries (~140 terms — enough for several levels each):

1. `prompting` — system prompt, fewshot, temperature, grounding, chainofthought…
2. `ai-ml-essentials` — token, embedding, hallucination, finetuning, contextwindow…
3. `agentics` — tool, planner, memory, guardrail, mcp, sandbox…
4. `retrieval-rag` — chunking, vectorstore, reranking, hybridsearch…

Owner may swap/add domains (e.g. `security`, `dataviz`). Locale strategy **[DECISION 3]**: corpus is English-only at launch (schema carries `locale` for future); the *game UI* keeps all 7 locales. Rationale: corpus quality is the product; translating 140 contextual entries ×7 is a follow-up, not a blocker.

### 3.4 Data flow

```
corpus/*.json ──(build step)──▶ public/vocab.md + vocab.json + llms.txt + vocab/<domain>.md
      │
      ▼
 Game: corpus → levels → grid   (deterministic placement, works offline, no LLM call)
      │
      ▼ (win a *generated* game + opt-in)
 Promote: export domain JSON / my-vocab.md / PR upstream
```

LLM-generated custom-theme games (today's core flow) are kept unchanged and run in parallel — corpus games are a new source, not a replacement.

---

## 4. Game changes (human surface)

- **New game source "corpus domain":** in MakerView, alongside theme+LLM, pick a domain and level count; the existing deterministic `utils/wordSearchGenerator.ts` places corpus terms. No network needed. `GameDefinition` gains `source: 'corpus' | 'generated'` and `domain?: string`; `Word.hint` carries the `gloss` for the list.
- **The learn moment:** when a word is found, the word-list entry expands to reveal `context` + `usage` ("*In RAG settings this means…* / Try: *"Answer strictly from the grounded context…"*"). Mechanics (grid, 8 directions, timer, levels, keyboard play, victory screen) unchanged.
- **Offline:** corpus games are fully playable with no connectivity — foundation for the PWA milestone.
- **WordList copy:** "Clues" stays; reveal copy is new i18n keys ×7 locales.

Out of scope (explicitly): spaced repetition, accounts, per-player mastery curves. The personal export (§8) gives a light version of this without a backend.

---

## 5. Agent surface: vocab.md and friends

Generated at **build time** from `corpus/` (one source of truth; no server required on any host):

- `public/vocab.md` — markdown rendering: header with corpus version + build date + provenance (`curated`), one section per domain, one block per entry (term, gloss, context, usage, related). Human-readable AND agent-loadable.
- `public/vocab.json` — the same, structured, for agents that prefer JSON.
- `public/vocab/<domain>.md` — per-domain files so an agent can load *only* the retrieval domain, not the whole corpus.
- `public/llms.txt` — agent-facing site map: what the site is, linking `/vocab.md`, `/vocab.json`, per-domain files, and the human game.
- A `/docs` help page section: "Loading vocab.md into your agent" with copy-paste snippets (curl, context-inclusion examples for common agent harnesses).

Trust props: entries are curated and versioned in git; the rendered header states the corpus version (`package.json` version + short git sha captured at build) and generation date. Promoted/self-grown corpora are always distinguishable from the shipped curated one (§8).

---

## 6. Self-hosting

### 6.1 Portable server

New `server/index.ts` — a small **Hono** app (TS-native, ~zero-dep, matches the codebase style):

- serves the built static site from `dist/`
- mounts the existing `/api/llm-proxy` modules (`api/llm-proxy/{validate,rateLimit,models,config,cors}.ts` are already framework-agnostic — they become shared code, not copies)
- `/api/health` (same health shape as today's proxy GET)
- in-memory rate-limit fallback when no Redis configured (the module already fails open)

Vercel deployment is untouched — the Edge function and the Hono server consume the same modules.

### 6.2 Docker

- `Dockerfile`: multi-stage (`npm ci` → `vite build` → `node:22-alpine` non-root runtime, `HEALTHCHECK`).
- `docker-compose.yml` example; env: `API_KEY`, `COMMUNITY_MODEL_NAME`, `PORT`, optional `UPSTASH_REDIS_*`.
- `SELF-HOSTING.md`: quickstart, env reference, "point your agents at http://your-host/vocab.md".
- CI: add a `docker build` job (build-only, no push) so the image can't rot.

**[DECISION 4]** Server-side corpus growth on self-host (a writable `/api/corpus` that persists promoted entries to a volume and regenerates vocab.md) — recommended **deferred to v2.1**. v2 ships read-only build-time artifacts; growth happens via export/PR (§8). Keeps the server surface minimal and stateless.

### 6.3 Build self-containment audit

The current `index.html` still carries an `esm.sh` import map + `/env.js` stub. For offline PWA and air-gapped self-host, the built bundle must be fully self-contained — audit and remove any runtime CDN dependency (mirrors the #57 work that already did this for Tailwind).

---

## 7. Installability (PWA)

- `vite-plugin-pwa` (workbox): precache app shell; runtime-cache `/locales/*`, `/vocab*`, `/docs/*`; `navigateFallback` to the SPA shell; update flow = "new version available → reload" prompt (no silent `skipWaiting` races).
- `manifest.webmanifest`: brand name (**[DECISION 1]**), 192/512 + maskable icons, `display: standalone`, shortcuts ("Play offline", "vocab.md").
- Install UX: `beforeinstallprompt` captured → "Install app" in Settings; iOS fallback instructions.
- CSP: service workers need `worker-src 'self' blob:` — update `vercel.json` headers and the Hono server's headers in lockstep (there is a `manifest-src 'self'` allowance already).
- Verification: extend the existing headless-browser e2e pattern (`docs/e2e/`) — offline load of a corpus game with network blocked, installability signals present, clean console.

---

## 8. Growth loop (closing the circle)

- **Promote-to-corpus:** after winning an LLM-generated game, "Add these words to my corpus" → review/edit entries (gloss/context/usage pre-filled from the LLM output, human-edited before save) → stored in the local corpus (localStorage, same caps discipline as saved games).
- **my-vocab.md export:** Settings → "Download my vocab" → markdown of mastered terms (terms found across won games + promoted entries), same format as `/vocab.md` so any agent can load the *player's* vocabulary as a file. This is the personal-corpus idea, delivered without a backend.
- **Upstream path:** corpus README documents the PR format; promoted domains that prove out can be contributed as new `corpus/*.json`.

---

## 9. Branding & positioning **[DECISION 1]**

Working recommendation (owner ratifies):

| Option | Brand | Trade-off |
|---|---|---|
| **A (recommended)** | **vocab.md** | Encodes the whole thesis in the name; instantly legible to the agent-ecosystem audience; memorable and unclaimed. Weakness: file-extension branding reads odd to non-technical players; the game subtitle must carry warmth ("vocab.md — the game that teaches AI-fluent vocabulary"). |
| B | **WordKey** | Human-first, brandable, "words as keys that unlock AI." Loses the agent-native signal. |
| C | **Lexicon** (+ qualifier) | Safe, classic; crowded and generic. |

Regardless of name: repo stays `llm-wordsearch` (GitHub continuity); the graph-paper/highlighter visual identity stays (landed in #86, it's good); touchpoints to rebrand — `index.html` title/og/meta, `metadata.json`, `package.json` description/keywords, `public/locales/*.json` sidebar/title keys (×7), README full rewrite (positioning-first), a real `og-image.jpg` (only a `.note` placeholder exists today), favicon/mark, footer links. Old URLs keep working; canonicals updated.

---

## 10. Milestones (loop-ready)

Each milestone becomes GitHub issues under a new milestone `v2-reposition`, worked via the existing dev-loop protocol (issue → branch off dev → PR into dev → ledger line). Order is deliberate: prove the corpus thesis first, distribution promises second, rebrand last (marketing an unfinished thing wastes the rename; rebrand also touches all 7 locales and shouldn't be done twice).

| # | Milestone | Delivers | Issues (est.) |
|---|---|---|---|
| M1 | Corpus foundation | schema + 4 seed domains + validation tests + build step emitting vocab.md/.json/llms.txt/per-domain | 3–4 |
| M2 | Game ↔ corpus | corpus game source, offline play, found-word reveal UX, `GameDefinition.source` | 2–3 |
| M3 | Agent surface | llms.txt polish, agent docs page, og/meta for agents, provenance header | 1–2 |
| M4 | Self-host | Hono server, Dockerfile + compose, SELF-HOSTING.md, CI docker-build job, CDN audit | 2–3 |
| M5 | PWA | manifest, SW, offline, update prompt, install UX, CSP updates, e2e | 2–3 |
| M6 | Rebrand | name decision applied across all touchpoints, README/positioning, og-image, i18n copy ×7 | 2–3 |
| M7 | Growth loop | promote-to-corpus, my-vocab.md export, PR guide | 2 |

Release: PR `dev → main` after M6 (M7 can follow). AGENTS.md ledger updated per issue as usual.

---

## 11. Testing strategy

- **Corpus schema:** unit tests for validation rules (grid-placeable terms, length caps, uniqueness, related-resolution warnings).
- **Artifact generation:** snapshot tests for `vocab.md`/`vocab.json`/`llms.txt` output shape (header, sections, provenance).
- **Game:** corpus-sourcing flow tests (deterministic levels, offline), reveal UX tests.
- **Server:** supertest integration against the Hono app (static serving, proxy passthrough, health, headers/CSP).
- **PWA:** headless-browser e2e (offline corpus game with network blocked, manifest/SW registered, update prompt).
- Existing suites (`type-check`, `lint`, `test`, `build`) stay green throughout — no check is disabled to pass.

---

## 12. Risks & mitigations

| Risk | Mitigation |
|---|---|
| Corpus quality burden (140 curated entries is real work) | Draft-in-loop: entries authored as part of M1 issues; schema validation catches drift; PR-friendly format lets contributions land as domains |
| Rename SEO/link disruption | Keep old paths + canonicals; 301 where URLs change; README notes the rename |
| vocab.md trust (agents loading garbage) | Curated-only at launch; provenance + version in header; promoted content always labeled and local |
| PWA vs strict CSP regressions | CSP changes tested in both vercel.json and Hono; e2e asserts SW registration + offline |
| Docker image rot | CI builds the image on every PR |
| Scope creep (server persistence, accounts, SRS) | Explicitly deferred/rejected in this doc; anything new re-specs first |

---

## 13. Open decisions (owner)

1. **Brand name** — recommend **vocab.md**; alternates WordKey, Lexicon (§9).
2. **Seed domains** — recommend prompting / ai-ml-essentials / agentics / retrieval-rag (§3.3). Swap or add?
3. **Corpus locale at launch** — recommend English-only corpus, full 7-locale UI (§3.3).
4. **Self-host corpus persistence** — recommend defer to v2.1; v2 = read-only artifacts + export/PR growth (§6.2).
