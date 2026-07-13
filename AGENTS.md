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
