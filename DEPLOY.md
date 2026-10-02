# Deploying WordKey

One WordKey instance = one owner's vocabulary, playable by visitors and loadable by agents.

> **New here?** Follow [GETTING-STARTED.md](GETTING-STARTED.md) first — a step-by-step walkthrough from deploy to published vocabulary. This page is the full reference matrix.

Pick a row:

| Target | Admin seeding | Vocabulary updates | Best for |
|---|---|---|---|
| **Docker** (this page) | Volume/CLI edit **or `/owner` + Publish** | File replace — artifacts re-render per request | Your own server or VPS (`wordkey.yourdomain.in`) |
| **Vercel / Netlify** | `/owner` + Publish (git commit → auto-redeploy) | ~30–60 s after publish | Zero-maintenance hosting |
| **Static** (GitHub Pages, Netlify Drop, any static server) | Edit `corpus/*.json` in the repo, push | On next build | Fully static, no functions |

## Docker (recommended for self-hosting)

```bash
docker run -d -p 8080:8080 \
  -v ./corpus:/app/corpus:ro \
  -v ./wordkey.config.json:/app/corpus/wordkey.config.json:ro \
  wordkey
```

Or with compose: `docker compose up -d` (uses this repo's `docker-compose.yml`).

What you get:

- **Visitors** — your domains at `/`, playable puzzles derived in-browser, the readable vocabulary at the Vocabulary tab. No LLM, no API key, no database.
- **Agents** — `/vocab.md`, `/vocab.json`, `/llms.txt`, and `/vocab/<domain>.md`, rendered per request from your mounted corpus.
- **Health** — `/api/health` (used by the container `HEALTHCHECK`).

Updating your vocabulary: replace a file in the mounted `corpus/` directory. Artifacts re-render per request — no restart needed.

### 1. Author your corpus

Run the app locally in author mode (default) and use the Author view: propose entries with an LLM (bring-your-own key), edit, validate, then **Export** → `corpus/<domain>.json`. Or hand-write the JSON — the schema and rules are documented in the Author view and enforced by `services/corpusService.ts` (grid-placeable terms: letters only, 2–24 characters).

### 2. Configure the instance

`wordkey.config.json` (mounted into the corpus dir):

```jsonc
{
  "mode": "serve",                 // serve = visitors play; author = full maker (local machines)
  "title": "WordKey — cashlessconsumer",
  "owner": "Srikanth",
  "blurb": "The vocabulary I use when I write about cashless living.",
  "locale": "en",
  "links": [{ "label": "Blog", "url": "https://cashlessconsumer.in" }],
  "levels": { "perDomain": 3, "wordsPerLevel": 8 },
  "progression": { "sequentialLevels": true }
}
```

This drives the page title/og meta, the sidebar identity, the manifest name, and the artifact headers.

### 3. Put it on your domain

Point a subdomain (e.g. `wordkey.yourdomain.in`) at the host and terminate TLS with your usual reverse proxy (Caddy/nginx/Traefik). The container listens on `8080` and speaks plain HTTP.

## Environment reference

| Variable | Default | Purpose |
|---|---|---|
| `PORT` | `8080` | HTTP port |
| `WORDKEY_STATIC_DIR` | `/app/dist` (Docker) | Built bundle directory |
| `WORDKEY_CORPUS_DIR` | `/app/corpus` (Docker) | Mounted corpus; falls back to the baked-in starter corpus |

No LLM keys are needed to serve. Author-mode LLM proposals use the visitor's/owner's own browser-held BYO key; the community proxy (Vercel) is the only key-bearing path and is optional.

## Vercel / Netlify

1. Fork the repo, import it with the deploy buttons in the README.
2. Set environment variables on the platform:
   - `ADMIN_TOKEN` — your secret owner token (any long random string)
   - `GITHUB_TOKEN` — a fine-grained token with **contents: read/write** on the fork
   - `GITHUB_REPO` — `yourname/llm-wordsearch`
   - `GITHUB_BRANCH` — optional (default `main`)
3. Visit `https://your-deployment/owner` (nobody else knows it — no link is rendered), unlock with the token, author your vocabulary, and hit **Publish**. The function commits `corpus/<domain>.json` to your fork; the platform redeploys automatically.

Without `ADMIN_TOKEN` the endpoint does not exist (404) — publishing is disabled by design.

## Static hosts

`npm run build` emits everything — including the agent artifacts (`vocab.md`, `vocab.json`, `llms.txt`, `vocab/*.md`) — into `dist/`. Upload `dist/` anywhere static. Updating vocabulary = edit the corpus, rebuild, redeploy.
