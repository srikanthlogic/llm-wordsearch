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

## v2 Branch — Loop Engineering Protocol (2026-08-26)

`v2` is the integration branch for the v2 hardening pass (milestone: [v2](https://github.com/srikanthlogic/llm-wordsearch/milestone/1)). Production `main` stays untouched until v2 merges back.

### The Loop
1. `gh issue list -R srikanthlogic/llm-wordsearch --label v2 --state open` — pick the top issue (security first, then bug, then quality)
2. Branch off v2: `git checkout v2 && git pull && git checkout -b fix/<issue#>-slug`
3. Implement + add/adjust tests for the changed behavior
4. Verify locally (all must pass):
   - `npm run type-check`
   - `npm run lint` (0 errors; warnings tracked separately)
   - `npm test`
   - `npm run build`
5. Commit referencing the issue number (`fix: ... (#N)`), push, PR into **v2**
6. After CI green on the PR → merge, close issue automatically via commit keyword
7. Repeat from 1. When all milestone issues closed → PR v2 → main.

### Rules
- One issue per PR; atomic commits referencing #N.
- Never disable a failing check to get green; fix or explicitly scope it out in the issue.
- CI runs on push to main/dev/v2 and PRs targeting main/v2 (added 2026-08-26).
- Review ledger lives with this file: append one line per closed issue (`#N fixed in <sha>`).
