# WordKey

**Your vocabulary, playable and loadable.**

WordKey turns a site's contextual vocabulary into two things at once: word-search puzzles humans play, and `vocab.md` agents load. Every deployment is one owner's vocabulary — their terms, how the meanings shift by context, and how to use them in real prompts.

[![CI](https://github.com/srikanthlogic/llm-wordsearch/actions/workflows/ci.yml/badge.svg)](https://github.com/srikanthlogic/llm-wordsearch/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/srikanthlogic/llm-wordsearch&env=ADMIN_TOKEN,GITHUB_TOKEN,GITHUB_REPO&project-name=wordkey)
[![Deploy to Netlify](https://www.netlify.com/img/deploy/button.svg)](https://app.netlify.com/start/deploy?repository=https://github.com/srikanthlogic/llm-wordsearch)

Your vocabulary site in 3 steps: fork & deploy (buttons above) → set `ADMIN_TOKEN` + `GITHUB_TOKEN` + `GITHUB_REPO` → open `/owner`, author your domains, hit **Publish**.

**First 5 minutes after deploying:**

1. Your site is live on an auto-assigned subdomain — the sample corpus is already playable, and `/vocab.md` + `/llms.txt` are live for agents.
2. Set the env vars (`ADMIN_TOKEN`, `GITHUB_TOKEN`, `GITHUB_REPO`) in the platform dashboard and redeploy.
3. Open `/owner`, unlock with your `ADMIN_TOKEN`, author a domain, **Publish** — it commits to your repo and auto-redeploys.
4. Optional: `wordkey.yourdomain.in` — CNAME to your deployment, add the domain in the dashboard, TLS is automatic.
5. Point an agent at `/vocab.md`.

Full walkthrough: **[GETTING-STARTED.md](GETTING-STARTED.md)** · deployment matrix: [DEPLOY.md](DEPLOY.md)

## How it works

```
corpus/*.json ──▶ deterministic puzzles in the browser   (visitors play — no LLM, no key, offline-capable)
      └──────▶ /vocab.md · /vocab.json · /llms.txt       (agents load — same data, same words)
```

- **Serve mode** — visitors see your domain cards, play levels derived deterministically from your corpus, and pick up vocabulary from in-game context reveals. Progress and badges are theirs alone (device-local). Creation is disabled by design.
- **Author mode** — on your machine or behind the `/owner` token gate: LLM-assisted entry proposals (term, gloss, context shift, usage, related), inline validation, export or publish.
- **Agents** — point any agent at your `/vocab.md` (or a single domain's slice) to load the site's language into its workload. Curated, versioned, provenance-stamped.

The full deployment matrix — Docker one-liner, Vercel/Netlify, static hosts — lives in [DEPLOY.md](DEPLOY.md). The design rationale is in [docs/superpowers/specs/2026-09-27-v2-reposition-design.md](docs/superpowers/specs/2026-09-27-v2-reposition-design.md).

## The corpus

One JSON file per domain: 4–40 entries, each `{ term, gloss, context, usage, related }`. The one hard rule: **terms are grid-placeable** — letters only, 2–24 characters (`chainofthought`, not "chain of thought"; the spaced form goes in the gloss). The same validator gates authoring, serving, and admin publishing.

## Development

```bash
npm ci
npm run dev        # author mode — make puzzles, author vocabulary
npm test           # vitest
npm run build      # emits dist/ incl. vocab.md, vocab.json, llms.txt
```

- Community LLM generation (optional) needs `API_KEY` (OpenRouter) + `COMMUNITY_MODEL_NAME` on the server; BYO-LLM keys stay in the browser.
- Pre-release: run an E2E pass per `docs/e2e/` conventions before cutting a release.

## Repository history

This repo shipped as **LLM-Wordsearch** (an AI word-search generator). The `dev` branch is v2: the game engine stayed, the product became WordKey. Issues and the review ledger track the transition under milestone `v2-reposition`.
