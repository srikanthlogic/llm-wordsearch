# API Knowledge Base

**Scope:** `./api/`

## OVERVIEW
Vercel Edge Functions. Stateless LLM proxy.

## FILES

```
api/
└── llm-proxy/
    └── index.ts          # Edge Function handler
```

## llm-proxy/index.ts

**Endpoints:**
- `POST` - Forward request to LLM provider
- `GET` - Health check
- `OPTIONS` - CORS preflight

**Provider Detection:**
- OpenRouter: `google/`, `anthropic/`, `meta/`, etc.
- OpenAI: `openai/`, `gpt-`
- Custom: Everything else

**Headers (OpenRouter):**
```
HTTP-Referer, X-Title, X-Api-Key, Accept
OpenRouter-Site, OpenRouter-Site-Name
```

## Environment

- Runs on Vercel Edge runtime
- Requires `API_KEY` env var
- CORS enabled for all origins
