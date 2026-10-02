# WordKey v2 — Milestone M4: Agent Artifacts (Implementation Plan)

> **For agentic workers:** subagent-driven or executing-plans task-by-task, checkbox tracking. **Repo loop:** one task = one issue = one branch/PR into `dev`, CI green, ledger. Verify: tests locally; tsc/lint/build in `/tmp/ws-clean`.

**Goal:** Every WordKey instance serves agent-consumable renderings of its corpus — `vocab.md`, `vocab.json`, `llms.txt`, per-domain `vocab/<domain>.md` — generated at build time for static hosts (and re-rendered per request by the M5 Hono server from the same module).

**Architecture:** One pure renderer module (`services/vocabArtifacts.ts`, no React) produces all four artifacts from `{ config, domains, meta }`. A thin build script (`scripts/generate-vocab-artifacts.ts`, run via the existing `tsx` devDep) reads `public/corpus/*` + `public/wordkey.config.json`, writes the artifacts into `public/`, and is wired into `npm run build`. VocabView grows an agent section documenting the URLs with copy-paste snippets.

**Spec:** `docs/superpowers/specs/2026-09-27-v2-reposition-design.md` rev 4 — §6.

## Global Constraints

- Renderer is pure and dependency-free (types only) — reused verbatim by the M5 server.
- Artifact headers state provenance: instance title/owner, `owner-authored`, app version + generation timestamp (injectable for tests).
- Entries render verbatim (owner content); no i18n in artifacts (English structural labels — the artifact IS the agent interface).
- The build must not fail when corpus is missing (script no-ops with a warning) — fresh forks without corpus still build.

---

### Task 1: Renderer module + tests

**Files:**
- Create: `services/vocabArtifacts.ts`
- Test: `test/services/vocabArtifacts.test.ts`

**Interfaces (exact):**
- `interface ArtifactMeta { version: string; generatedAt: string }`
- `renderVocabMd(config: WordKeyConfig, domains: CorpusDomain[], meta: ArtifactMeta): string`
- `renderVocabJson(config: WordKeyConfig, domains: CorpusDomain[], meta: ArtifactMeta): string`
- `renderLlmsTxt(config: WordKeyConfig, domains: CorpusDomain[], meta: ArtifactMeta): string`
- `renderDomainMd(config: WordKeyConfig, domain: CorpusDomain, meta: ArtifactMeta): string`

**Output contracts (asserted in tests):**
- `vocab.md`: H1 `# {title}`; owner line `by {owner}` when set; blurb; `> Generated {generatedAt} · v{version} · provenance: {owner-authored|sample}`; then `## {domain.title}` per domain with domain slug anchor, blurb, and per-entry blocks: `### {term}` + gloss paragraph + `**Context shift:** {context}` + `**Try in a prompt:** {usage}` + `**Related:** a, b`.
- `vocab.json`: `JSON.parse`-able object `{ meta, config: { title, owner, blurb }, domains: [domain] }` (domains verbatim).
- `llms.txt`: H1 + one-line description + a markdown link list: `vocab.md`, `vocab.json`, one line per domain (`- [{title}](/vocab/{slug}.md)`), plus the human game note.
- `domain.md`: same entry format as vocab.md, single domain, same header.

- Commit: `feat(agents): shared artifact renderer (#<issue>)`

### Task 2: Build-step generation + agent docs section

**Files:**
- Create: `scripts/generate-vocab-artifacts.ts`
- Modify: `package.json` (`"build": "tsx scripts/generate-vocab-artifacts.ts && vite build"`)
- Modify: `views/VocabView.tsx` (agent section: the four artifact URLs + copy-paste snippets — curl + "paste into your agent's context")
- Test: `test/scripts/generate-vocab-artifacts.test.ts` — run the script logic (extracted into an exported function `generateArtifacts(corpusDir: string, outDir: string, configPath: string): { written: string[] }`) against a temp dir seeded with the shipped samples; assert files exist and vocab.md parses-with-expected-header
- i18n ×7: `agents.heading`, `agents.description`, `agents.snippetTitle`, `agents.copyHint`

- Commit: `feat(agents): build-time artifact generation + agent docs (#<issue>)`

---

## Post-M4

M5 (Docker + Hono server — imports `renderVocabMd` etc. for request-time rendering from the mounted corpus) and M5b (Vercel/Netlify adapters + admin seeding) — plans written when reached. Then M6 PWA, M7 rebrand + playground.
