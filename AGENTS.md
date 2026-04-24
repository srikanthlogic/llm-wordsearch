# LLM-Wordsearch Knowledge Base

**Generated:** 2026-04-19 18:35 UTC  
**Commit:** e826532  
**Branch:** main

## OVERVIEW
AI-powered word search puzzle generator. React 19 + TypeScript + Vite. Multi-language support (7 languages), PDF export, LLM integration via OpenRouter.

## STRUCTURE

```
./
├── components/          # React components (20 files)
├── views/              # Main views: Maker, Player, Settings, Help, AILog
├── services/           # geminiService.ts (LLM API), storageService.ts (localStorage)
├── utils/              # wordSearchGenerator.ts, formatters.ts
├── hooks/              # useI18n.tsx (i18n context)
├── api/                # Vercel Edge Function: llm-proxy
├── test/               # Vitest tests (60 passed)
│   ├── components/
│   ├── services/
│   ├── utils/
│   └── integration/
├── public/             # Static assets, locales/, docs/
├── scripts/            # Deployment scripts
└── bruno/              # API testing collection
```

## WHERE TO LOOK

| Task | Location | Notes |
|------|----------|-------|
| Add component | `components/` | PascalCase, `.tsx`, export default |
| Add view | `views/` | Top-level route component |
| Update types | `types.ts` | Single source of truth |
| Constants | `constants.ts` | Grid size, colors |
| AI prompts | `prompts.ts` | OpenAI message templates |
| i18n strings | `public/locales/*.json` | 7 languages supported |
| LLM proxy | `api/llm-proxy/index.ts` | Vercel Edge Function |
| Storage | `services/storageService.ts` | localStorage/sessionStorage |

## CONVENTIONS

### TypeScript
- ES2022 target, ESNext modules
- `isolatedModules: true` enforced
- Path alias `@/` maps to `./`
- Modern JSX transform (no React import needed)

### Imports (Strict)
```typescript
// Order: builtin → external → internal → parent → sibling → index
// Newlines between groups
// Alphabetical, case-insensitive
import React from 'react';
import { useState } from 'react';

import { SomeComponent } from '@/components/SomeComponent';
import { utilFunction } from '@/utils/util';

import { helper } from './helper';
```

### Linting
- `no-console: warn` (off in tests)
- Unused vars: prefix with `_` to ignore
- `unused-imports/no-unused-imports: error`
- `comma-dangle: only-multiline`
- React: `jsx-key`, `no-danger-with-children` = error

### Components
- PascalCase filenames
- Default exports
- Props interface named `{ComponentName}Props`
- Colocate component + styles (Tailwind classes)

### Testing
- Vitest + jsdom + @testing-library/react
- Tests alongside source or in `test/` (parallel structure)
- Naming: `{file}.test.tsx`
- `test/setup.ts` mocks env vars, fetch, console

## COMMANDS

```bash
# Dev
npm run dev                 # Vite dev server @ 5173

# Build
npm run build               # Production build
npm run preview             # Preview production build

# Quality
npm run lint               # ESLint --fix
npm run lint:check         # ESLint check only
npm run type-check         # tsc --noEmit

# Test
npm test                   # Vitest watch mode
npm run test:run           # Run once
npm run test:coverage      # With coverage report

# Deploy
npm run deploy:vercel      # Production deploy
npm run deploy:preview     # Preview deploy
```

## NOTES

- **No Prettier**: ESLint handles formatting
- **Vercel Edge**: LLM proxy runs at `/api/llm-proxy`
- **Environment**: API_KEY required for AI features
- **Language Map**: `LANGUAGE_MODEL_MAP` env var for per-language model overrides
- **Storage**: localStorage for games/theme/lang; sessionStorage for API keys
- **Test Console**: Muted in tests to reduce noise
