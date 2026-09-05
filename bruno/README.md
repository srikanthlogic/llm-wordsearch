# LLM Proxy Tests (Bruno)

Bruno collection covering the `/api/llm-proxy` Edge Function: health check and
a full prompt round-trip (rate limit → validation → model allowlist → upstream
completion).

## CI / headless run

```bash
npm run test:integration
```

This boots `scripts/llm-proxy-harness.ts`, which serves the **real** handler
code from `api/llm-proxy/` on localhost:3000, backed by:

- a mock OpenAI-compatible chat/completions server (port 9101), wired in via
  the `LLM_BASE_URL` env override;
- a mock Upstash-REST KV store (port 9102) backing `@vercel/kv`.

It then runs this Bruno collection against it with the `ci` environment
(`--env ci`) and fails hard on any test failure. No external LLM calls, no
network egress.

## Manual runs against a deployed proxy

Open this folder in the Bruno desktop app (or run
`npx @usebruno/cli run --env local` from inside `bruno/`). The default request
targets `https://llm-wordsearch.vercel.app`; set an `apiKey` variable if you
want to exercise the community path against your own deployment.
