# WordKey v2 Design — Self-Hostable Contextual Vocabulary for Humans and Agents

**Date:** 2026-09-27 (rev 4 — added Vercel/Netlify deploys with admin word-seeding)
**Branch target:** `dev` (product v2; `main` = production)
**Status:** DRAFT rev 4 — awaiting owner review. Open items marked **[DECISION N]**.
**Revision notes:** rev 1 proposed a repo-curated corpus with self-host as a secondary option. Owner feedback repositioned it: **the instance is the product** — people launch and serve their *own* WordKey (e.g. `wordkey.cashlessconsumer.in`); creation is disabled on served sites; the owner's seeded vocabulary is the content visitors come to understand. Rev 3 added gamification of visitors (multiple levels, issued badges). Rev 4 adds first-class Vercel/Netlify deploys with token-gated admin seeding of words, per owner feedback.

---

## 1. Vision

As LLMs become the default interface to information work, the bottleneck for humans is **contextual vocabulary**: the words that name what you want, and how their meaning shifts by setting. People who run websites, blogs, and teams *already have* a contextual vocabulary — the terms their content, domain, and community lean on. WordKey lets an owner publish theirs in two consumable forms:

- **The game (humans):** visitors to `wordkey.<owner>.in` play word-search puzzles seeded from the owner's vocabulary. Every clue is a contextual meaning; finding a word reveals how to *use* it. No accounts, no LLM needed, no API key — just play.
- **vocab.md (agents):** the same vocabulary rendered at `/vocab.md` (plus `.json`, `llms.txt`, per-domain files) so any agent working on that domain — the owner's own agents, or a visitor's assistant reading their site — loads the site's contextual language into its workload. Same convention-space as `llms.txt` / `AGENTS.md`.

**Product tagline (draft):** *WordKey — your vocabulary, playable and loadable.*

**Instance voice (draft, configurable):** *"The vocabulary I use when I write about cashless living. Play it yourself, or point your agent at vocab.md."*

### Two modes, one codebase

| Mode | Where | Enabled | Who |
|---|---|---|---|
| **Author mode** | Owner's machine (local dev / author container) *or* the hidden Owner route on a deployment | Full maker: LLM-assisted vocabulary authoring, curation, export/publish, vocab.md preview | The owner |
| **Serve mode** | `wordkey.<owner>.in` (Docker/Vercel/Netlify) | Play seeded puzzles, browse vocabulary, fetch agent artifacts. **Create disabled for visitors**; owner-only seeding via hidden Owner route. | Visitors + agents |

The served instance needs **no LLM, no API key, no database** — puzzles are derived deterministically from the seeded corpus in the browser, exactly like today's offline placement engine already works.

### What stays, what changes (vs v1)

| Dimension | v1 (today) | v2 |
|---|---|---|
| Identity | "AI Word Search Generator" | **WordKey** (resolved) |
| Product shape | One hosted generator app | A self-hostable **vocabulary site kit**; each instance = one owner's vocabulary |
| Word source | LLM-generated per theme at play time | Owner-authored corpus (LLM-assisted at *authoring* time only) |
| Word payload | `word` + one-line `hint` | Structured entry: gloss, context shift, usage-in-a-prompt, related terms |
| Visitors | Can create anything | **Create disabled**; play seeded puzzles, learn the owner's vocabulary |
| Visitor engagement | Play history only | **Progression + badges** (sequential levels, issued achievements, trophy shelf — device-local) |
| Agent surface | none | `/vocab.md`, `/vocab.json`, `/llms.txt`, `/vocab/<domain>.md` |
| Installability | none | PWA: installable, offline seeded games |
| Hosting | Vercel-only | Docker first (volume corpus) **+ Vercel/Netlify git-deploys with admin seeding** + static hosts documented |
| Core mechanics | grid, 8 directions, levels, timer | unchanged |

---

## 2. Approach: where authoring happens

The corpus-first architecture (rev 1, Approach A) stands — game and vocab.md render from the same data. Owner feedback settles the open axis: **who curates, and where**. Options:

**A. Local authoring + token-gated git-backed admin seeding (CHOSEN, evolved in rev 4).** Two ways to feed a deployment, one corpus format:
- *Local:* owner authors on their machine (author mode, BYOLLM key in-browser — no server needed), exports corpus files, drops them into the deployment (repo or volume).
- *Admin seeding (rev 4):* the owner opens a hidden Owner route on their deployed instance, authenticates with `ADMIN_TOKEN`, uses the same AuthorView, and **Publish** commits `corpus/*.json` to the git repo via a serverless function (on Docker: writes the corpus volume directly) → the platform's git integration redeploys → new vocabulary live in under a minute. The corpus stays git-versioned; serving stays static; git history doubles as the vocabulary changelog.
The visitor-facing serve path remains stateless; the only dynamic surface is the optional, fail-closed admin function (inactive unless `ADMIN_TOKEN` is set).

**B. Server-side DB/KV-backed authoring.** Corpus persisted in Vercel KV / Netlify Blobs, rendered on request. Instant updates and no redeploy, but: corpus leaves git (loses provenance/versioning — part of the product's promise), two divergent storage paths, platform-specific blob APIs hurt portability, weaker backup story. Rejected for v2 **[DECISION 6]** (owner may overrule).

Chosen: **A.**

---

## 3. Core concepts

### 3.1 Instance config — `wordkey.config.json`

Per-instance, volume/repo-mounted, drives all instance-specific copy:

```jsonc
{
  "mode": "serve",              // "serve" | "author"
  "title": "WordKey — cashlessconsumer",
  "owner": "Srikanth",
  "blurb": "The vocabulary I use when I write about cashless living. Play it, or point your agent at vocab.md.",
  "locale": "en",
  "links": [{ "label": "Blog", "url": "https://cashlessconsumer.in" }],
  "levels": { "perDomain": 3, "wordsPerLevel": 8 },
  "progression": { "sequentialLevels": true }
}
```

Rendered into: page `<title>`/og/meta, sidebar header, manifest name (PWA), vocab.md header, footer links. `mode` is the single source of truth for the switch; the serve container exposes it to the app by generating `/env.js` from the config at request time (static builds bake it at build time). In serve mode the Maker/Author view is removed from navigation *and* route-guarded — disabled by design, not hidden (note: this is a UX/clarity measure; nothing in the client is secret, and a serve-mode instance exposes no generation endpoint or key anyway).

### 3.2 Corpus

Owner-authored, one JSON file per domain, mounted at `corpus/` in the deployment:

```
corpus/
  payments.json
  credit-cards.json
  investing.json
wordkey.config.json
```

Schema (unchanged from rev 1; the key constraint is grid-placeability so the *same data* is playable):

```jsonc
{
  "domain": "payments",
  "title": "Payments & Cashless Living",
  "blurb": "How I talk about money moving without cash.",
  "locale": "en",
  "entries": [
    {
      "term": "interchange",
      "gloss": "The fee a merchant's bank pays the cardholder's bank on every swipe.",
      "context": "In card-network talk it's set by Visa/Mastercard schemes; in UPI discourse 'zero MDR' made it a policy flashpoint.",
      "usage": "Explain how interchange differs from MDR, and who actually pays it.",
      "related": ["MDR", "routing"]
    }
  ]
}
```

Validation (enforced by tests, reusing the pattern of the existing i18n key CI check):
- `term`: 2–24 chars, single token, letters only — no spaces/hyphens/apostrophes. Multi-word concepts get grid-safe spellings (`floorlimit`, with the spaced form in `gloss`). This is *the* authoring constraint that makes one dataset both playable and loadable.
- `gloss` ≤ 200 chars (matches the existing hint sanitization cap), `context` ≤ 300, `usage` ≤ 200.
- Terms unique across the corpus; `related` unresolved terms warn (not fail).

**Starter corpus:** the repo ships a small sample (`corpus-samples/`, ~2 domains × ~20 entries, marked `provenance: "sample"`) so a fresh `docker run` and the playground instance aren't empty — content is **[DECISION 2]**. Rev 1's ambition of a large in-repo curated corpus is dropped — the canonical corpus lives with each owner, not in this repo.

### 3.3 Data flow

```
AUTHOR MODE (owner's machine)                     SERVE MODE (wordkey.<owner>.in)
theme ─▶ LLM proposes entries ─▶ owner edits      corpus/*.json ─▶ deterministic level
      ─▶ validate (grid-placeable)                     derivation in-browser ─▶ play
      ─▶ export corpus/<domain>.json                      │
                                       ┌──────────────────┤
                                       ▼                  ▼
                                 /vocab.md + .json   human vocab browser
                                 + llms.txt + /vocab/<domain>.md   (readable page)
                                        ▲
                                   agents fetch & load
```

Puzzles are **derived**, not baked: the client builds levels from corpus entries using the existing deterministic `utils/wordSearchGenerator.ts` (config `levels.perDomain` / `wordsPerLevel`). Same corpus, same game, every visitor; no stored game state on the server.

---

## 4. Author mode (owner surface)

Evolution of today's MakerView into an **AuthorView**:

1. Owner enters a domain theme ("credit cards") → upgraded prompt (`prompts.ts`) asks the LLM for structured entries `{term, gloss, context, usage, related[]}`, not bare word lists.
2. Editable proposal list: owner fixes terms, rewrites glosses, marks grid-safe spellings; live validation shows constraint violations inline (term not placeable, gloss too long…).
3. Saved to a local draft corpus (localStorage, existing caps discipline); domains list with add/remove/edit.
4. **Export/Publish:** downloads `corpus/<domain>.json` per domain (+ a `wordkey.config.json` template on first export) — or, when authenticated on a deployment's Owner route, **Publish** writes via the admin API instead (§7.2).
5. **vocab.md preview:** renders the draft corpus through the shared renderer (§6) so the owner sees exactly what agents will fetch.

BYOLLM in-browser (existing, sessionStorage) is the default LLM path for authoring; the community proxy remains available where it exists (playground / local proxy container).

---

## 5. Serve mode (visitor surface)

- **Home = the owner's domains.** Cards per domain (title, blurb, term count); instance blurb + owner links from config. This replaces the maker-first landing.
- **Play:** domain → levels derived deterministically → the familiar grid (mechanics unchanged). `Word.hint` carries `gloss`; **on found**, the entry expands to reveal `context` + `usage` — the learn moment ("*In policy discourse this means…* / Try: *"Explain how interchange differs from MDR…"*").
- **Browse vocabulary:** a readable `/vocab` page listing all domains and entries (the human rendering of vocab.md) — for visitors who want the glossary without playing.
- **Create disabled:** no maker entry point, route-guarded, and the copy explains why ("This is Srikanth's vocabulary — get your own WordKey" with a link to the project).
- **Existing features retained:** keyboard play, victory screen, share-links (still hash-encoded, still stateless), 7-locale UI, dark mode, print worksheet.

### 5.1 Progression & badges (gamification)

Owner feedback: multiple levels, issued badges, etc., to gamify visitors. Reading taken (flag if wrong): **levels** = sequential progression within a domain — the vocabulary is taught in stages; **badges** = achievements issued as the visitor plays. Everything is **device-local** (localStorage, existing caps discipline) — no accounts, no server state; this is what keeps a WordKey instance trivially self-hostable, so anything needing a database (leaderboards, cross-device profiles) is explicitly out of scope for v2.

- **Level progression:** within a domain, Level N+1 unlocks when Level N is completed (`progression.sequentialLevels`, default on — owner can opt out for free-browse). Domains themselves stay free-choice; an owner-ordered "learning path" across domains is a v2.1 option. Progress state: `wordkey.progress = { [domain]: { unlockedLevel, completedLevels[], bestTimes[] } }`.
- **Badge catalog** (fixed, ships with the app — works on every instance; owner-custom badges are **[DECISION 5]**):
  - *First Find* — first word found; *Word Hunter* — 50 words found; *Flawless* — a level with zero incorrect selections; *Speed Solver* — level won with >50% time left; *Comeback* — won after a lost level; *Streak 3 / 7 / 30* — daily-play streaks; *Domain Master: \<domain\>* — all levels of a domain (auto-generated per domain); *Completionist* — every domain mastered; *Polyglot* — played in two locales.
  - Issued with a toast + shelf entry; **trophy shelf** view ("Your badges") shows earned + locked-with-hint (locked badges show their condition — itself a motivator).
  - State: `wordkey.badges = { [badgeId]: { earnedAt } }` + `wordkey.streak = { lastPlayed, current, best }`.
- **Celebration & visibility:** victory screen (existing, from #78) extends to award badges on win; domain cards show completion state (e.g. "2/3 levels"); a small progress ring on the home header for whole-corpus completion.
- **Sharing progress, statelessly:** "Share my badges" produces a hash-encoded URL (same mechanism as game share-links) a visitor can post anywhere — renders a read-only badge card. No verification claims (it's self-reported); an Open-Badges-style *verifiable* issuance would need issuer keys/infrastructure and is recorded as a v2.1 exploration, not v2.
- **Reset:** Settings gains "Reset progress & badges" (reuses the clear-data dialog pattern from #73).

---

## 6. Agent surface

One shared TS renderer module (`services/vocabArtifacts.ts`) produces, from `corpus/` + config:

- `vocab.md` — markdown: instance header (owner, title, blurb, provenance `owner-authored`, corpus version = app version + generation timestamp; build-time renders add the short git sha), one section per domain, one block per entry.
- `vocab.json` — structured equivalent.
- `llms.txt` — site map for agents: what this WordKey is, links to `/vocab.md`, `/vocab.json`, per-domain files, the human game.
- `vocab/<domain>.md` — per-domain slices so agents load only what they need.
- `/docs` section: "Loading this site's vocab.md into your agent" with copy-paste snippets.

Rendered **at request time by the serve container** (reads the mounted corpus, caches in memory — updating vocabulary = replace the file, no rebuild), and **at build time by a script** for pure-static hosts. Same module, one format, snapshot-tested.

---

## 7. Deployment kit

Three deployment targets, one artifact set, one admin story where the platform allows it.

### 7.1 Docker (self-host)

- **`server/index.ts`** — small Hono app: serves the built static bundle, renders agent artifacts from the mounted corpus (§6), `/api/health`, security headers mirroring `vercel.json` (+ `worker-src` for PWA). No LLM, no DB, no auth.
- Multi-stage Dockerfile → `node:22-alpine` non-root, `HEALTHCHECK`:
  ```
  docker run -d -p 8080:8080 \
    -v ./corpus:/app/corpus \
    -v ./wordkey.config.json:/app/wordkey.config.json \
    ghcr.io/srikanthlogic/wordkey
  ```
  Corpus baked at build is the documented alternative (fork-and-edit repo). `docker-compose.yml` example included. **[DECISION 3]** publishing to GHCR on release via existing CI (recommend yes).
- Updating vocabulary: replace the volume file and the renderer picks it up (in-memory cache per file mtime); or use the admin route (§7.2) with its **local-file publish backend** — writes corpus files into the volume directly, active only when `ADMIN_TOKEN` is set.

### 7.2 Vercel / Netlify (git-deploy + admin seeding)

For owners who don't run Docker. The deployment is a **fork of this repo connected to the platform's git integration**; the corpus lives in the repo; agent artifacts render at build time (§6 build path).

**Admin seeding (rev 4):**

- Hidden Owner route (path-based, e.g. `/owner`; not linked in serve-mode UI) → token prompt → sessionStorage (same discipline as the BYOLLM key) → the full AuthorView with a **Publish to repo** action replacing (or alongside) file-download export.
- `POST /api/admin/corpus` — a serverless function, implemented once as a platform-neutral Web-API handler (Hono route) with thin adapters: Vercel function, Netlify function, and the Docker server mounts the same route (so the API surface is identical everywhere, mirroring how `api/llm-proxy` modules are shared today).
- Function behavior: constant-time `ADMIN_TOKEN` check against the env secret → **fail closed if unset** (endpoint 404s/405s and the Owner route stays hidden — an instance without the secret has no admin surface at all) → payload validated against the corpus schema (§3.2 validators, same code as authoring) → **publish backend:** on PaaS deploys, a GitHub Contents API commit of `corpus/<domain>.json` using `GITHUB_TOKEN` secret (blob-sha optimistic concurrency; last-write-wins for a single owner; conflicts surface as an explicit error) → platform redeploys automatically → vocabulary live in ~30–60s; on Docker (§7.1), the same route writes to the local corpus volume instead.
- Authz notes: token never reaches the client bundle (checked server-side only); reuse the existing `rateLimit` module on the admin route; commits are attributable via a dedicated GITHUB_TOKEN.
- LLM for authoring on PaaS deploys: BYOLLM key in-browser (works on any host, no platform key needed); the Vercel community proxy remains available where configured (playground).
- Netlify parity: `netlify.toml` (build, functions dir, headers mirroring `vercel.json` CSP); Netlify Functions v2 support the same Web-API handler shape.
- Growth touch: **Deploy buttons** — "Deploy to Vercel" / "Deploy to Netlify" in the README (pre-fill the fork + prompt for `ADMIN_TOKEN`/`GITHUB_TOKEN` secrets where supported).

### 7.3 Static hosts (any)

Build-time artifacts + built bundle → GitHub Pages / Netlify Drop / any static server; no admin seeding (documented: edit corpus in the fork, push). This is the already-supported path, now documented in the matrix.

### 7.4 CI, docs, hygiene

- **CI:** `docker build` job on every PR (no push until [DECISION 3]); admin-function integration tests (fail-closed, token check, schema rejection, mock GitHub commit) run in the normal suite; existing jobs unchanged.
- **DEPLOY.md** (replaces/absorbs SELF-HOSTING.md): a matrix — Docker / Vercel / Netlify / static — with quickstarts, the subdomain guide (`wordkey.yourdomain.in`), config reference, secrets reference (`ADMIN_TOKEN`, `GITHUB_TOKEN`), corpus authoring recap, and the update-latency expectations per platform.
- **Build self-containment:** audit/remove the remaining `esm.sh` import-map runtime dependency (completes the #57 direction) — required for offline PWA and air-gapped serving.
- **The current Vercel app becomes the WordKey Playground** **[DECISION 4]** — recommend keeping it as the demo/community instance: author mode enabled, community LLM key, starter corpus playable, "deploy your own" CTA. It showcases the product and keeps the community/BYOLLM code paths exercised in production.

---

## 8. Installability (PWA)

- `vite-plugin-pwa`: precache shell; runtime-cache locales, `/vocab*`, `/docs`; update flow = explicit "new version → reload" prompt (no skipWaiting races).
- Manifest: instance title from config, 192/512 + maskable icons, standalone, shortcuts ("Play", "vocab.md").
- Install UX: `beforeinstallprompt` → Settings; iOS fallback instructions.
- Offline: seeded games are fully offline-capable (deterministic, no network) — SW makes that real.
- e2e: extend the headless-browser pattern — network-blocked load of a seeded game, manifest/SW registered, clean console.

---

## 9. Branding

**Resolved: WordKey.** Repo rename `llm-wordsearch` → `wordkey` is safe to schedule (GitHub redirects); Vercel project/domain and the artifact name `vocab.md` unchanged in meaning. Tagline: *"Your vocabulary, playable and loadable."* The graph-paper/highlighter visual identity stays (landed in #86). Touchpoints: `index.html` title/og/meta (now config-driven), `metadata.json`, `package.json`, sidebar/title i18n keys ×7, README full rewrite (self-host-first positioning, owner + visitor stories), a real `og-image.jpg` (only a `.note` placeholder exists), favicon/mark, footer. Old paths keep working; canonicals updated.

---

## 10. Milestones (loop-ready)

Issues under milestone `v2-reposition`, worked via the existing dev loop. Order: make *one instance* work end-to-end first (author → serve), then distribution promises, then polish.

| # | Milestone | Delivers | Issues (est.) |
|---|---|---|---|
| M1 | Modes + instance config | author/serve mode switch, `wordkey.config.json` loading, config-driven title/og/copy, route-guarded maker in serve mode | 2–3 |
| M2 | Vocabulary authoring | AuthorView (structured-entry prompt, editable proposals, validation), local draft corpus, corpus JSON + config export, vocab.md preview | 3–4 |
| M3 | Serve mode | domain-home landing, deterministic level derivation from corpus, learn-moment reveals, human `/vocab` browser, starter corpus sample | 3 |
| M3b | Gamification | sequential level unlock + progress state, badge catalog + issuance, trophy shelf, badge share-links, reset flow, badge/progression copy ×7 locales | 3–4 |
| M4 | Agent artifacts | shared renderer, vocab.md/.json/llms.txt/per-domain, agent docs page, provenance/version header | 2 |
| M5 | Deployment kit — Docker | Hono server, Dockerfile + compose, DEPLOY.md matrix, CI docker job, GHCR publish, CDN-import audit | 3 |
| M5b | Deployment kit — PaaS + admin seeding | platform-neutral admin handler (fail-closed token, schema validation, GitHub + local-file publish backends), Vercel + Netlify adapters, `/owner` route + AuthorView Publish, `netlify.toml`, deploy buttons | 3–4 |
| M6 | PWA | manifest, SW, offline seeded games, update prompt, install UX, CSP updates | 2–3 |
| M7 | Rebrand + playground | WordKey rename across touchpoints, README rewrite, og-image, playground instance (Vercel) with starter corpus + deploy CTA | 2–3 |

(Rebrand moved from rev 1's last-but-one to **M7 with the playground**, since serve-mode copy is config-driven and the rename is now low-risk/known — it's mechanical, not conceptual.) Personal `my-vocab.md` export (rev 1 §8) is deferred to v2.1 — the instance story doesn't need it. Promote-to-upstream PR flow is dropped with the centralized corpus.

Release: PR `dev → main` after M7. AGENTS.md ledger updated per issue as usual.

---

## 11. Testing strategy

- **Config/corpus schema:** validation tests (grid-placeable terms, caps, uniqueness, related warnings); CI test that starter corpus passes validation (pattern: i18n key CI check).
- **Derivation:** deterministic level-derivation tests (same corpus → same levels; level sizing from config).
- **Artifacts:** snapshot tests for the shared renderer (header/provenance/domains/entries) in both server and build-script paths.
- **Modes:** serve-mode route guard + hidden maker tests; config-driven copy tests.
- **Gamification:** badge-issuance tests (each trigger condition, idempotent re-issue), progression unlock tests (sequential gate, opt-out flag), streak/date-bucketing tests (reuse the #59 calendar-day bucketing), badge share-link round-trip, storage shape/caps.
- **Server:** supertest against the Hono app (static, artifacts from mounted corpus, health, headers) + admin-route integration tests (fail-closed without `ADMIN_TOKEN`, constant-time token check, schema rejection, mocked GitHub Contents commit incl. sha-conflict error, local-file backend write).
- **PWA/e2e:** headless-browser pass (offline seeded game, SW/manifest, update prompt).
- Existing suites stay green; no check disabled.

## 12. Risks & mitigations

| Risk | Mitigation |
|---|---|
| Owners bounce off corpus authoring friction | LLM-assisted proposals + inline validation + playground to try it first; starter corpus as template |
| Browser-download export feels clunky | Documented author-container recipe; v2.1 admin mode if demand |
| Someone "creates" on a serve instance anyway | Route-guarded + no generation endpoint/key on serve; copy explains the model |
| Gamification expectations vs stateless reality (cross-device, leaderboards) | Spec is explicit: v2 gamification is device-local by design; verifiable/shared variants scoped as v2.1; badge share-links are labeled self-reported |
| Admin endpoint exposure | Fail-closed without `ADMIN_TOKEN` (route hidden + 404); constant-time compare; rate-limited (existing module); `GITHUB_TOKEN` scoped to contents-write on the corpus repo only |
| Vercel/Netlify adapter drift | One platform-neutral handler (Web-API Hono route), adapters stay thin; handler tests run in the normal suite, platform-agnostic |
| vocab.md trust | provenance + version + date in header; owner-authored is the point — it's *their* site's language |
| Docker image rot | CI builds every PR |
| PWA vs strict CSP | CSP changes in vercel.json + Hono lockstep; e2e asserts |
| Repo rename fallout | GitHub redirects; old URLs canonical; do it in M7 after everything else is stable |

## 13. Decisions

**Resolved by owner (cumulative):**
1. Brand = **WordKey**.
2. Self-hosting is the primary product; each instance serves one owner's vocabulary on their own domain.
3. Serve mode is read-only for visitors: create disabled, seeded vocabulary is the content.
4. Vercel/Netlify deploys are first-class, with owner-only admin word-seeding in v2 (rev 4); visitors stay read-only.

**Open (owner):**
1. ~~Brand~~ — resolved WordKey.
2. Starter corpus content for samples/playground (~2 domains × 20 entries; propose one AI-adjacent + one demo of a blogger's domain like personal finance — happy to draft).
3. Publish the image to GHCR on release (recommend yes), or build-it-yourself only.
4. Vercel app fate: keep as WordKey Playground with author mode + community LLM (recommended) vs. freeze/read-only.
5. Badge scope (rev 3): fixed catalog only (recommended — works everywhere, no authoring burden) vs. owner-custom badges defined in `wordkey.config.json` (v2.1).
6. Admin seeding mechanism (rev 4): **git-backed commits + auto-redeploy** (spec's choice — provenance, portability, static serving; ~30–60s update latency) vs. KV/Blobs runtime storage (instant updates, corpus leaves git). Recommend git-backed; owner may overrule.
