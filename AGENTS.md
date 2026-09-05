# LLM-Wordsearch Knowledge Base

## Current State (2026-07-13)

**Status:** LIVE at https://llm-wordsearch.vercel.app

### What's Done
- **CI/CD Pipeline** — green across all 4 jobs: lint+type-check, test, security-audit, build
- **Workflows fixed:** ci.yml (YAML indentation, security-audit level, Bruno install w/ graceful fallback), cd.yml (graceful skip when VERCEL_TOKEN not set), release.yml (simplified, no npm token dependency)
- **Lint:** 0 errors (34 warnings — no-console, hook deps — non-blocking)
- **Deployment:** Vercel GitHub App auto-deploys on every push to main. Project: `llm-wordsearch.vercel.app`
- **CD workflow:** Runs on main/dev pushes, deploys via Vercel if VERCEL_TOKEN secret is configured in GitHub repo

### Remaining
- **API_KEY env var** needs to be set in Vercel Dashboard for community LLM (OpenRouter) to work. Without it, users can still use "Bring Your Own LLM" in Settings.
- Set in Vercel: `API_KEY` = OpenRouter API key (`sk-or-v1-...`), `COMMUNITY_MODEL_NAME` = `google/gemini-2.5-flash:free`

### Architecture
- React + Vite + TypeScript app, deployed on Vercel
- AI providers: Community (OpenRouter via `/api/llm-proxy` serverless fn) + BYOLLM (any OpenAI-compatible endpoint)
- Storage: localStorage for games/theme/lang; sessionStorage for API keys
- Test Console: Muted in tests to reduce noise

## Dev Branch — Loop Engineering Protocol (2026-09-05, post-v2 release)

Milestone v2 shipped: `v2` merged into `main` via PR #45 (merge commit 10e9852) and deployed. `dev` (branched from `main`) is now the integration branch; `main` = production. Vercel deploys `main` to production and every other ref to a preview.

### The Loop
1. `gh issue list -R srikanthlogic/llm-wordsearch --label v2 --state open` — pick the top issue (security first, then bug, then quality)
2. Branch off dev: `git checkout dev && git pull && git checkout -b fix/<issue#>-slug`
3. Implement + add/adjust tests for the changed behavior
4. Verify locally (all must pass):
   - `npm run type-check`
   - `npm run lint` (0 errors; warnings tracked separately)
   - `npm test`
   - `npm run build`
5. Commit referencing the issue number (`fix: ... (#N)`), push, PR into **dev**
6. After CI green on the PR → merge (squash, one sha per issue), close the issue, append the ledger line below
7. Repeat from 1. Periodically release: PR dev → main.

### Rules
- One issue per PR; atomic commits referencing #N.
- Never disable a failing check to get green; fix or explicitly scope it out in the issue.
- CI runs on push to main/dev/v2 and PRs targeting main/v2 (added 2026-08-26).
- Review ledger lives with this file: append one line per closed issue (`#N fixed in <sha>`).
- #16 fixed in af4c106
- #17 fixed in d868b08 (allowlist, merged via #31)
- #18 fixed in 17be9b8 (validation, merged via #32)
- #19 fixed in f8a0f46 (KV rate limit, merged via #33)
- #26 fixed in 54f6e4c (batched level generation, merged via #42)
- #27 fixed in a0b4aec (i18n hardening, merged via #43)
- #28 fixed in 3a1e9ba (toast+confirm dialog, merged via #44)
- #47 fixed in f2784c2 (history cap 100, PR #52)
- #49 fixed in f2784c2 (saved-games cap 50, PR #52)
- #48 fixed in 184e58e (deterministic filler, PR #53)
- #51 fixed in 494b997 (html lang sync, PR #54)
- #50 fixed in e55d434 (i18n race + no negative cache, PR #55)
Coverage pass (2026-08-28, pre-merge for #45): replaced fake llm-proxy tests with real module tests (api/llm-proxy 17% -> 96.67%), added tests for 5 untested views (views 38.3% -> 82.78%); overall 51.95% -> 70.9%. Commits 849ac9c, dba8dde, dac19e0.
PR #45 review pass (2026-09-04): prod deploy gated to main, FeedbackProvider at app root, shared-link game playable, provider-correct proxy headers, cleartext upstream rejection, fail-open KV rate limit, i18n English baseline, storage caps on load, harness/shell cleanup fixes, @vercel/kv -> @upstash/redis.
#56 fixed in a41b503 (allowed-models route + client alignment, PR #68)
#62 fixed in 3f20d98 (health rateLimitConfigured + KV env docs, PR #69); Vercel KV credential config + live 429 verification remain a documented manual step (see issue comment)
#57 fixed in 8fa7d14 (build-time Tailwind via PostCSS, CDN dropped, /env.js stub, CSP trimmed; headless-browser verified dark toggle + clean console, PR #70)
#58 fixed in 2949b8b (i18n stale-while-revalidate — spinner is first-load only, app stays mounted on locale switch, 4 new tests, PR #71)
#60 fixed in 6903388 (7 missing en.json keys in all locales, dead t()||fallbacks removed, CI key-existence test test/i18n-keys.test.ts, PR #72)
#61 fixed in 9875058 (clear-data/delete-game dialogs + shared-link toast routed through t(), 7 keys x 7 locales, PR #73)
#59 fixed in c75a7cd (calendar-day date bucketing + boundary tests, PR #74). All v2 merge blockers (#56-#62) closed 2026-09-04; v2 -> main PR opened.
E2E pass (2026-09-04, v2 preview da1a2eb): full GUI playthrough via headless Chromium; report + evidence in docs/e2e/2026-09-04-report.md. Found blocking generation failure (#56), CDN-CSS/dark-mode split-brain (#57), language-switch remount (#58), plus i18n/a11y/UX gaps (#59-#67). Tickets filed for all findings.

## Loop Queue (2026-09-04, after E2E pass)

Suggested loop order per the protocol (security -> bug -> quality, priority labels refine):
1. #62 (security/ops: KV creds — rate limit fail-open until configured)
2. #56 (P0 bug: community generation broken — allowlist vs model dropdown)
3. #57 (P1: build-time CSS, drop Tailwind CDN, dark-mode split-brain)
4. #58 (P1: language switch unmounts app)
5. #60 (P1: missing i18n keys + CI key check)
6. #61 (P2: hardcoded English dialogs)
7. #59 (P2: history Math.ceil date bug)
8. #63-#67 (ux/a11y enhancements, non-milestone)

Milestone `v2` closed 2026-09-05 (all of #56-#62 fixed via PRs #68-#74, shipped in #45).

## Loop Queue (2026-09-05, post-release — target `dev`)

Enhancement pass complete — all five landed on `dev`:
- #66 fixed in 3358544 (rejection flash, PR #77)
- #63 fixed in 1d94327 (victory screen + run summary, PR #78)
- #67 fixed in 5ddb843 (keyboard play for the grid, PR #80)
- #64 fixed in 77bcf11 (shared-game save-to-library, PR #82 — port of #76)
- #65 fixed in 3154031 (error diagnostics + persisted AI logs, PR #83 — port of #79)

Next: release `dev` -> `main` when ready (all suites green; note the v2-side
duplicates #75/#76/#79 were superseded and stay on the retired branch).
