# WordKey v2 — Milestone M5: Deployment Kit — Docker + Hono Server (Implementation Plan)

> **For agentic workers:** subagent-driven or executing-plans task-by-task, checkbox tracking. **Repo loop:** one task = one issue = one branch/PR into `dev`, CI green, ledger. Verify: tests locally; tsc/lint/build in `/tmp/ws-clean` (NOTE: the M4 build script writes artifacts — untracked files in the worktree are expected).

**Goal:** One `docker run` serves a complete WordKey: the static bundle, the owner's volume-mounted corpus (overriding the baked-in one), request-time agent artifacts, and health — no LLM, no DB, no auth on the serving path.

**Architecture:** A small Hono app (`server/index.ts`) serves `dist/` statically, mounts `corpus/` over `/corpus/*`, renders `/vocab.md`, `/vocab.json`, `/llms.txt`, `/vocab/<domain>.md` per request via the shared M4 renderer, and serves `/wordkey.config.json` from the mounted file. Env: `WORDKEY_STATIC_DIR` (default `dist`), `WORDKEY_CORPUS_DIR` (default `corpus`; missing → fall back to static corpus). Existing Vercel Edge llm-proxy untouched. Docker multi-stage build; CI builds the image on every PR (publish decision [DECISION 3] still open — build-only for now).

**Spec:** `docs/superpowers/specs/2026-09-27-v2-reposition-design.md` rev 4 — §7.1, §7.4.

## Global Constraints

- Server renders artifacts via the SAME `services/vocabArtifacts.ts` module as the build script — no format drift.
- No auth/LLM/DB on the serving path; the admin surface arrives in M5b.
- Security headers mirror `vercel.json` in the Hono app (CSP, X-Frame-Options, etc.).
- New runtime deps allowed here only: `hono`, `@hono/node-server`, `@hono/node-server/serve-static` counterpart or manual static handler — prefer Hono's built-ins; no express-style bloat.

---

### Task 1: Hono server + tests

**Files:**
- Create: `server/index.ts` (app factory `createApp(options)` + `main()` guard for `tsx server/index.ts`)
- Modify: `package.json` (deps: hono, @hono/node-server; script `"serve": "tsx server/index.ts"`)
- Test: `test/server/server.test.ts` (`// @vitest-environment node` pragma; Hono `app.request()` — no network)

**Behavior (asserted in tests):**
- `GET /` serves `dist/index.html` from `WORDKEY_STATIC_DIR` (tests use a fixture dir with a stub index.html + a stub corpus subdir).
- `GET /corpus/manifest.json` and `/corpus/<slug>.json` serve from the CORPUS dir when present, falling back to the static dir.
- `GET /wordkey.config.json` serves the config file from the corpus dir root.
- `GET /vocab.md` / `/vocab.json` / `/llms.txt` / `/vocab/<domain>.md` — rendered per request from the corpus dir via the shared renderer (contains `# {title}` header and entry terms); 404 when no corpus.
- `GET /api/health` → `{ status: 'ok', corpus: <n domains> }`.
- 404 JSON for unknown API paths; security headers present on all responses.

- Commit: `feat(deploy): Hono server — static + corpus + request-time artifacts (#<issue>)`

### Task 2: Docker, CI image build, DEPLOY.md

**Files:**
- Create: `Dockerfile` (multi-stage: node:22-alpine deps+build → runtime with dist/, corpus-samples baked as default corpus, non-root `node` user, EXPOSE 8080, HEALTHCHECK hitting /api/health, CMD `tsx server/index.ts` — runtime keeps devDeps? No: install prod-only in runtime stage but tsx is a devDep… use `node --experimental-strip-types`? Simplest robust: copy full node_modules in build stage and copy `node_modules` (all) into runtime — image bigger but zero-config; OR compile server to JS with esbuild in build stage. Choose esbuild bundle: build stage compiles server/index.ts → dist-server/index.mjs (bundled, external:hono? bundle all) so runtime needs only `node dist-server/index.mjs`.)
- Create: `.dockerignore` (node_modules, dist, .git, test, docs…)
- Create: `docker-compose.yml` (volume mounts for ./corpus and wordkey.config.json, port 8080)
- Modify: `.github/workflows/ci.yml` (docker build job — build only, no push)
- Create: `DEPLOY.md` (matrix: Docker quickstart with volume mounts + subdomain note; static hosts row pointing at the M4 build artifacts; Vercel/Netlify rows marked for M5b; secrets/config reference; update workflow)
- Test: none beyond Task 1 (Dockerfile validated by CI build + local docker build if available)

- Commit: `feat(deploy): Docker image + CI build + DEPLOY guide (#<issue>)`

---

## Post-M5

M5b: platform-neutral admin handler (Hono route in server + Vercel/Netlify function adapters), `/owner` route, Publish-to-repo backend, `netlify.toml`, deploy buttons. Then M6 PWA, M7 rebrand + playground.
