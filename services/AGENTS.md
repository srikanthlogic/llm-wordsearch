# Services Knowledge Base

**Scope:** `./services/`

## OVERVIEW
External integrations. LLM API via OpenRouter, localStorage persistence.

## FILES

```
services/
├── geminiService.ts      # LLM API (OpenAI-compatible)
└── storageService.ts     # localStorage/sessionStorage
```

## geminiService.ts

- **Purpose:** Generate word search puzzles via LLM
- **Providers:** OpenRouter (community) or BYOLLM (custom)
- **Proxy:** Vercel Edge Function at `/api/llm-proxy`
- **Key:** `generateGameLevels()` - main entry point

## storageService.ts

| Function | Storage | Key |
|----------|---------|-----|
| saveGameHistory | localStorage | wordSearchGameHistory |
| saveAvailableGames | localStorage | wordSearchAvailableGames |
| saveTheme | localStorage | wordSearchTheme |
| saveLanguage | localStorage | wordSearchLanguage |
| saveAIProviderSettings | localStorage | wordSearchAISettings |
| BYOLLM API key | sessionStorage | wordSearchBYOLLMKey |

## CONVENTIONS

- Try/catch all storage operations
- Console.error on failures (suppressed in tests)
- Default values returned on error
