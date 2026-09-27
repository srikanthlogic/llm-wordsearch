# WordKey v2 — Milestone M5b: PaaS Deploys + Admin Seeding (Implementation Plan)

> **For agentic workers:** subagent-driven or executing-plans task-by-task, checkbox tracking. **Repo loop:** one task = one issue = one branch/PR into `dev`, CI green, ledger. Verify: tests locally; tsc/lint/build in `/tmp/ws-clean`.

**Goal:** On Vercel/Netlify, the owner opens a hidden `/owner` route, authenticates with `ADMIN_TOKEN`, authors in the existing AuthorView, and **Publish** commits `corpus/<domain>.json` to their fork via the GitHub Contents API — the platform redeploys, vocabulary live in ~30–60 s. On Docker the same endpoint writes the corpus volume. Fail-closed everywhere.

**Architecture:** One platform-neutral handler (`services/adminCorpusService.ts`: auth → validate → backend dispatch) with three thin mounts: Vercel Edge function `api/admin/corpus/index.ts`, Netlify function `netlify/functions/corpus.mts`, and a route in `server/index.ts`. Client: `#owner` route gates a token prompt (sessionStorage, BYOLLM-key discipline), enables AuthorView with Publish, and calls the endpoint.

**Spec:** `docs/superpowers/specs/2026-09-27-v2-reposition-design.md` rev 4 — §7.2, §7.4.

## Global Constraints

- **Fail closed**: no `ADMIN_TOKEN` set ⇒ GET returns `{ enabled: false }` on PaaS (hidden route shows "not available") and Docker identical; no token ever reaches the client bundle; wrong token ⇒ 401 with constant-time compare (hand-rolled XOR accumulate over both strings, length-padded — portable across Node and Edge runtimes).
- Backends: `GITHUB_TOKEN` + `GITHUB_REPO` set ⇒ **git backend** (Contents API PUT with base64 content + fetched blob sha; 409 → explicit conflict error, no silent overwrite); else `ADMIN_TOKEN` set ⇒ **local backend** (write `<corpusDir>/<domain>.json`, Docker volume). Neither ⇒ disabled.
- Payload validated with the same strict `validateCorpusDomain` — one gate for authoring, serving, and publishing.
- Simple in-memory fixed-window rate limit on the endpoint (per instance; the admin token is high-entropy, this is abuse damping not the security boundary).
- `ADMIN_TOKEN`, `GITHUB_TOKEN`, `GITHUB_REPO`, `GITHUB_BRANCH` (default `main`) are server env only.

---

### Task 1: Admin handler + backends + platform mounts + tests

**Files:**
- Create: `services/adminCorpusService.ts` — `checkAdminEnabled(env)`, `constantTimeEqual(a,b)`, `handleAdminCorpus(request, env): Promise<Response>` (GET status, POST publish), `publishToGithub(...)`, `publishToLocal(...)`
- Create: `api/admin/corpus/index.ts` (Vercel Edge function: `export default (req: Request) => handleAdminCorpus(req, envFromProcess)`)
- Create: `netlify/functions/corpus.mts` (same)
- Modify: `server/index.ts` (mount `/api/admin/corpus` bridging to the handler)
- Modify: `DEPLOY.md` (Vercel/Netlify rows: fork → import → secrets `ADMIN_TOKEN`, `GITHUB_TOKEN`, `GITHUB_REPO` → done; Docker admin = set `ADMIN_TOKEN`)
- Test: `test/services/adminCorpusService.test.ts` (node env)

**Behavior (asserted in tests):**
- GET: disabled without token (404 on POST; GET `{ enabled: false }`), `{ enabled: true, backend: 'github'|'local' }` when configured.
- POST: 404 disabled / 401 wrong token / 400 invalid payload (validator errors surfaced) / 200 `{ ok, backend, path }`.
- Local backend: writes `<corpusDir>/<domain>.json` (temp-dir asserted); rejects unwritable dir with 500.
- Git backend (fetch mocked): GETs sha (404 → null → create), PUTs base64 content to `/repos/{repo}/contents/corpus/{domain}.json?ref={branch}` with message; 409 → 409 response `{ error: 'conflict' }`.
- Rate limit: >N posts/min from same instance → 429.

- Commit: `feat(admin): token-gated corpus publish with git + local backends (#<issue>)`

### Task 2: `/owner` route + AuthorView Publish + deploy plumbing

**Files:**
- Create: `views/OwnerGate.tsx` — token prompt (sessionStorage `wordkey.ownerToken`), on submit GET status with Bearer → enabled → render AuthorView with publish context; disabled → explanatory copy
- Modify: `App.tsx` (`#owner` hash route → OwnerGate overlay, mirroring `#badges=` pattern; strips hash)
- Modify: `views/AuthorView.tsx` — when a token is in sessionStorage: **Publish** button alongside Save → POST current domain to `/api/admin/corpus` → toast result (success = commit sha / conflict message)
- Modify: `vercel.json`/`netlify.toml` — create `netlify.toml` (build, functions dir, headers mirroring CSP); Vercel needs no config change (function discovery automatic)
- Modify: `README.md` — Deploy-to-Vercel/Netlify buttons + one-paragraph "your vocabulary in 3 steps"
- i18n ×7: `owner.*` keys (gate title, token prompt, unlock, disabled copy, publish, published, conflict, rejected)
- Test: `test/views/OwnerGate.test.tsx` (disabled endpoint copy; token stored; enabled → AuthorView renders), AuthorView publish test (mocked fetch POST, success/conflict toasts)

- Commit: `feat(admin): /owner route with publish-to-repo (#<issue>)`

---

## Post-M5b

M6 PWA (vite-plugin-pwa, manifest, offline corpus play, update prompt, CSP worker-src) → M7 WordKey rebrand + playground. Then release PR `dev → main`.
