# Test Knowledge Base

**Scope:** `./test/`

## OVERVIEW
Vitest test suite. 60 tests passing. Mirrors source structure.

## STRUCTURE

```
test/
├── setup.ts              # Global mocks, env vars
├── components/           # Component tests
├── services/            # Service tests
├── utils/               # Utility tests
├── api/                 # API endpoint tests
└── integration/         # Integration tests
```

## CONVENTIONS

- **Naming:** `{file}.test.tsx`
- **Mocks:** In `setup.ts` - fetch, env vars, console
- **Console:** Muted globally (mocked to vi.fn())
- **Touch Events:** Polyfilled in setup.ts for jsdom

## KEY PATTERNS

```typescript
// Test file pattern
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

import { Component } from '../components/Component';

describe('Component', () => {
  it('renders correctly', () => {
    render(<Component />);
    expect(screen.getByText('expected')).toBeInTheDocument();
  });
});
```

## WHERE TO LOOK

| Task | Location |
|------|----------|
| Add component test | `./components/` |
| Mock environment | `./setup.ts` |
| Test services | `./services/` |
| Integration tests | `./integration/` |
