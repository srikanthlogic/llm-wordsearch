# Getting Started — your WordKey in ~5 minutes

Turn a deploy of this repo into your own vocabulary site: visitors play your puzzles, agents load your `vocab.md`. No accounts, no database, no LLM key needed to serve.

> Full deployment matrix (Docker / Vercel / Netlify / static): [DEPLOY.md](DEPLOY.md)

## 1. Deploy

Pick one:

- **Vercel** — click the Deploy button in the [README](README.md). It pre-fills the env-var names for you.
- **Netlify** — click the Deploy button. Everything (build, functions, headers) comes from `netlify.toml`.
- **Docker** — `docker run -d -p 8080:8080 -v ./corpus:/app/corpus:ro -v ./wordkey.config.json:/app/corpus/wordkey.config.json:ro wordkey`

You immediately have a working site on an auto-assigned subdomain (`something.vercel.app` / `something.netlify.app`): visitors can play the starter corpus, and `/vocab.md` + `/llms.txt` are live.

## 2. Set your admin secrets

| Variable | Value |
|---|---|
| `ADMIN_TOKEN` | any long random string — this is your owner password |
| `GITHUB_TOKEN` | fine-grained token, **contents: read/write** on the repo |
| `GITHUB_REPO` | `yourname/llm-wordsearch` |
| `GITHUB_BRANCH` | optional, default `main` |

Where: Vercel → Project → Settings → Environment Variables; Netlify → Site configuration → Environment variables; Docker → pass `-e ADMIN_TOKEN=…` (with the git backend also `-e GITHUB_TOKEN=… -e GITHUB_REPO=…`). Trigger a redeploy after setting them (Vercel/Netlify dashboards: "Redeploy"; Docker: restart the container).

Until `ADMIN_TOKEN` is set, publishing is disabled by design — `/api/admin/corpus` 404s and the `/owner` page says so.

## 3. Unlock the owner route

Visit **`/owner`** on your deployment (the route is never linked in the UI — only you know it). Enter `ADMIN_TOKEN`. The token is held in that browser's sessionStorage; the endpoint itself stays token-gated regardless.

## 4. Author and publish your first domain

In the Author view:

1. Enter a domain title (e.g. "Payments") — the slug auto-generates.
2. **Propose entries with AI** (uses a bring-your-own LLM key from Settings) or **Add entry** by hand.
3. Edit each entry: term, gloss, context shift, usage-in-a-prompt, related terms. Validation is inline — errors block saving.
4. Hit **Publish**. The function commits `corpus/<domain>.json` to your repo → the platform redeploys → your vocabulary is live in ~30–60 seconds.

(Docker without the git backend: Publish writes straight into the mounted `corpus/` volume. Local authoring: **Save** keeps a device-local draft, **Export** downloads the JSON.)

## 5. Your own subdomain

For `wordkey.yourdomain.in`:

1. Add a CNAME record: `wordkey` → your deployment's hostname (e.g. `your-site.netlify.app`, or your server's address for Docker).
2. Add the custom domain in the platform's domain settings (Vercel/Netlify) or your reverse proxy (Docker). TLS is automatic on Vercel/Netlify.

## 6. Point your agents at it

```
curl -s https://wordkey.yourdomain.in/vocab.md
```

Load that file into any agent's context (paste it, or fetch it in the agent's startup). `llms.txt` links every artifact: full vocabulary (md + json) and per-domain slices.

## Updating vocabulary later

- **Vercel/Netlify**: `/owner` → edit → Publish. Or edit `corpus/*.json` in the repo and push.
- **Docker**: replace the file in the mounted `corpus/` — artifacts re-render per request, no restart.
- **Static**: edit + rebuild + redeploy.

## Troubleshooting

| Symptom | Cause / fix |
|---|---|
| `/owner` says publishing is not enabled | `ADMIN_TOKEN` not set (or set after last deploy — redeploy) |
| `/api/admin/corpus` returns 401 | Token mismatch — re-enter it on `/owner` |
| Publish returns 409 | The corpus file changed remotely — reload the Author view and republish |
| `vocab.md` doesn't include my new domain | On static/Vercel-without-git flows the artifacts are build-time; ensure the deploy actually rebuilt |
| Term rejected as "not grid-placeable" | Terms must be letters only, 2–24 characters — put the spaced form in the gloss |
