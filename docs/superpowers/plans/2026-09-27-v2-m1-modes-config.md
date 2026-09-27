# WordKey v2 — Milestone M1: Modes + Instance Config (Implementation Plan)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **Execution note (this repo):** tasks are executed via the AGENTS.md dev-loop protocol — one task = one GitHub issue = one branch off `dev` = one squash PR into `dev`, CI green before merge, ledger line appended per issue. Local verification before every push: `npm run type-check && npm run lint:check && npm run test:run && npm run build`.

**Goal:** Each WordKey deployment is driven by a `wordkey.config.json` (mode/title/owner/blurb/links/levels) — author mode preserves today's behavior, serve mode hides and route-guards creation.

**Architecture:** Config is fetched once at `/wordkey.config.json` (a static asset in Vite; the Hono server in M5 serves the volume-mounted file at the same path), normalized defensively in a pure function, and exposed through a React context provider alongside `I18nProvider`. Mode gating happens in `App.tsx` (navigation guard + render defense) and the two nav components (conditional Maker item).

**Tech Stack:** React 19 + TypeScript + Vite, Vitest + Testing Library, Tailwind (existing).

**Spec:** `docs/superpowers/specs/2026-09-27-v2-reposition-design.md` (rev 4) — §2 (two modes), §3.1 (instance config).

## Global Constraints

- Default `mode` is `author`: a missing/invalid config must degrade to exactly today's v1 behavior (playground must not break before M7).
- No new runtime dependencies in M1.
- Every `t()` key referenced in source must exist in all 7 locales (`test/i18n-keys.test.ts` enforces — M1 is designed to add **zero** new keys; owner strings come from config, not i18n).
- All lint/type/test/build gates green; no check disabled to pass.
- Config strings are owner-supplied and rendered as-is except for length clamps (XSS is not a concern via React text nodes, but URL schemes are: links must be `http(s)` only).
- Existing i18n fallbacks stay: `config.title` empty ⇒ sidebar keeps current `sidebar.titleShort/Long` keys.

---

### Task 1: Instance config types, config service, default config, provider

**Files:**
- Modify: `types.ts` (append)
- Create: `services/configService.ts`
- Create: `public/wordkey.config.json`
- Create: `hooks/useInstanceConfig.tsx`
- Modify: `index.tsx` (wrap providers)
- Test: `test/services/configService.test.ts`
- Test: `test/hooks/useInstanceConfig.test.tsx`

**Interfaces:**
- Consumes: `isSupportedLocale` from `hooks/useI18n.tsx` (already exported; no import cycle — useI18n does not import configService).
- Produces (later tasks depend on these exact names):
  - `types.ts`: `enum InstanceMode { Author = 'author', Serve = 'serve' }`; `interface DomainLink { label: string; url: string }`; `interface InstanceLevels { perDomain: number; wordsPerLevel: number }`; `interface WordKeyConfig { mode: InstanceMode; title: string; owner: string; blurb: string; locale: string; links: DomainLink[]; levels: InstanceLevels; progression: { sequentialLevels: boolean } }`
  - `services/configService.ts`: `DEFAULT_INSTANCE_CONFIG: WordKeyConfig`; `normalizeConfig(raw: unknown): WordKeyConfig` (pure); `fetchInstanceConfig(fetchImpl?: typeof fetch): Promise<WordKeyConfig>`
  - `hooks/useInstanceConfig.tsx`: `interface InstanceConfigContextType { config: WordKeyConfig; loading: boolean }`; `const InstanceConfigProvider: React.FC<{ children: React.ReactNode }>`; `function useInstanceConfig(): InstanceConfigContextType` (throws outside provider)

- [ ] **Step 1: Write failing tests for `normalizeConfig`**

Create `test/services/configService.test.ts`:

```ts
import { describe, expect, it } from 'vitest';

import {
  DEFAULT_INSTANCE_CONFIG,
  normalizeConfig,
} from '../../services/configService';
import { InstanceMode } from '../../types';

describe('normalizeConfig', () => {
  it('returns defaults for garbage input', () => {
    expect(normalizeConfig(null)).toEqual(DEFAULT_INSTANCE_CONFIG);
    expect(normalizeConfig('nope')).toEqual(DEFAULT_INSTANCE_CONFIG);
    expect(normalizeConfig(42)).toEqual(DEFAULT_INSTANCE_CONFIG);
  });

  it('defaults to author mode on missing or unknown mode', () => {
    expect(normalizeConfig({}).mode).toBe(InstanceMode.Author);
    expect(normalizeConfig({ mode: 'banana' }).mode).toBe(InstanceMode.Author);
  });

  it('accepts serve mode', () => {
    expect(normalizeConfig({ mode: 'serve' }).mode).toBe(InstanceMode.Serve);
  });

  it('clamps strings and drops oversized values', () => {
    const config = normalizeConfig({
      mode: 'serve',
      title: 'x'.repeat(200),
      owner: '  Srikanth  ',
      blurb: 'y'.repeat(500),
    });
    expect(config.title).toHaveLength(80);
    expect(config.owner).toBe('Srikanth');
    expect(config.blurb).toHaveLength(280);
  });

  it('filters unsafe links and caps the list at 5', () => {
    const config = normalizeConfig({
      links: [
        { label: 'Blog', url: 'https://cashlessconsumer.in' },
        { label: 'Evil', url: 'javascript:alert(1)' },
        { label: '', url: 'https://no-label.example' },
        { label: 'Ok', url: 'http://plain.example' },
        { label: 'A', url: 'https://a.example' },
        { label: 'B', url: 'https://b.example' },
        { label: 'C', url: 'https://c.example' },
      ],
    });
    expect(config.links).toEqual([
      { label: 'Blog', url: 'https://cashlessconsumer.in' },
      { label: 'Ok', url: 'http://plain.example' },
      { label: 'A', url: 'https://a.example' },
      { label: 'B', url: 'https://b.example' },
      { label: 'C', url: 'https://c.example' },
    ]);
  });

  it('clamps level sizing and honors sequentialLevels=false', () => {
    const config = normalizeConfig({
      levels: { perDomain: 99, wordsPerLevel: 1 },
      progression: { sequentialLevels: false },
    });
    expect(config.levels).toEqual({ perDomain: 10, wordsPerLevel: 4 });
    expect(config.progression.sequentialLevels).toBe(false);
  });

  it('falls back to en for unsupported locale', () => {
    expect(normalizeConfig({ locale: 'xx' }).locale).toBe('en');
    expect(normalizeConfig({ locale: 'ta' }).locale).toBe('ta');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:run -- test/services/configService.test.ts`
Expected: FAIL — cannot resolve `../../services/configService`.

- [ ] **Step 3: Implement types + config service**

Append to `types.ts`:

```ts
export enum InstanceMode {
  Author = 'author',
  Serve = 'serve',
}

export interface DomainLink {
  label: string;
  url: string;
}

export interface InstanceLevels {
  perDomain: number;
  wordsPerLevel: number;
}

export interface WordKeyConfig {
  mode: InstanceMode;
  title: string;
  owner: string;
  blurb: string;
  locale: string;
  links: DomainLink[];
  levels: InstanceLevels;
  progression: { sequentialLevels: boolean };
}
```

Create `services/configService.ts`:

```ts
import { isSupportedLocale } from '../hooks/useI18n';
import { DomainLink, InstanceMode, WordKeyConfig } from '../types';

// v2 reposition spec §3.1. Served at /wordkey.config.json: a static asset in
// Vite builds, the volume-mounted file in the M5 Hono server. Missing or
// invalid config degrades to author mode = today's v1 behavior.
export const CONFIG_URL = '/wordkey.config.json';

export const DEFAULT_INSTANCE_CONFIG: WordKeyConfig = {
  mode: InstanceMode.Author,
  title: '',
  owner: '',
  blurb: '',
  locale: 'en',
  links: [],
  levels: { perDomain: 3, wordsPerLevel: 8 },
  progression: { sequentialLevels: true },
};

function clampString(value: unknown, max: number): string {
  if (typeof value !== 'string') return '';
  return value.trim().slice(0, max);
}

function clampInt(value: unknown, min: number, max: number, fallback: number): number {
  const n = typeof value === 'number' && Number.isFinite(value) ? Math.floor(value) : fallback;
  return Math.min(max, Math.max(min, n));
}

function clampLink(raw: unknown): DomainLink | null {
  if (typeof raw !== 'string' && (typeof raw !== 'object' || raw === null)) return null;
  const candidate = raw as { label?: unknown; url?: unknown };
  const label = clampString(candidate.label, 40);
  const url = typeof candidate.url === 'string' ? candidate.url.trim() : '';
  if (!label || !/^https?:\/\//i.test(url)) return null;
  return { label, url };
}

export function normalizeConfig(raw: unknown): WordKeyConfig {
  if (typeof raw !== 'object' || raw === null) return DEFAULT_INSTANCE_CONFIG;
  const source = raw as Record<string, unknown>;

  const mode = source.mode === InstanceMode.Serve ? InstanceMode.Serve : InstanceMode.Author;
  const locale = typeof source.locale === 'string' && isSupportedLocale(source.locale)
    ? source.locale
    : 'en';
  const links = Array.isArray(source.links)
    ? source.links.map(clampLink).filter((l): l is DomainLink => l !== null).slice(0, 5)
    : [];
  const progression = (typeof source.progression === 'object' && source.progression !== null
    ? source.progression
    : {}) as { sequentialLevels?: unknown };

  return {
    mode,
    title: clampString(source.title, 80),
    owner: clampString(source.owner, 80),
    blurb: clampString(source.blurb, 280),
    locale,
    links,
    levels: {
      perDomain: clampInt(
        (typeof source.levels === 'object' && source.levels !== null
          ? (source.levels as Record<string, unknown>).perDomain
          : undefined),
        1, 10, DEFAULT_INSTANCE_CONFIG.levels.perDomain),
      wordsPerLevel: clampInt(
        (typeof source.levels === 'object' && source.levels !== null
          ? (source.levels as Record<string, unknown>).wordsPerLevel
          : undefined),
        4, 16, DEFAULT_INSTANCE_CONFIG.levels.wordsPerLevel),
    },
    progression: { sequentialLevels: progression.sequentialLevels !== false },
  };
}

export async function fetchInstanceConfig(fetchImpl: typeof fetch = fetch): Promise<WordKeyConfig> {
  try {
    const response = await fetchImpl(CONFIG_URL);
    if (!response.ok) {
      console.warn(`Instance config unavailable (HTTP ${response.status}); using defaults.`);
      return DEFAULT_INSTANCE_CONFIG;
    }
    return normalizeConfig(await response.json());
  } catch (error) {
    console.warn('Instance config could not be loaded; using defaults.', error);
    return DEFAULT_INSTANCE_CONFIG;
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:run -- test/services/configService.test.ts`
Expected: PASS (9 tests).

- [ ] **Step 5: Create the default config asset**

Create `public/wordkey.config.json`:

```json
{
  "mode": "author"
}
```

- [ ] **Step 6: Write failing test for the provider**

Create `test/hooks/useInstanceConfig.test.tsx`:

```tsx
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { InstanceConfigProvider, useInstanceConfig } from '../../hooks/useInstanceConfig';
import { InstanceMode } from '../../types';

function Probe() {
  const { config, loading } = useInstanceConfig();
  return (
    <div>
      <span>{loading ? 'loading' : 'ready'}</span>
      <span data-testid="mode">{config.mode}</span>
      <span data-testid="title">{config.title || '(none)'}</span>
    </div>
  );
}

afterEach(() => vi.unstubAllGlobals());

describe('InstanceConfigProvider', () => {
  it('exposes the fetched config and clears loading', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(
      JSON.stringify({ mode: 'serve', title: 'WordKey — cashlessconsumer' }),
      { status: 200 },
    )));
    render(
      <InstanceConfigProvider>
        <Probe />
      </InstanceConfigProvider>,
    );
    await waitFor(() => expect(screen.getByText('ready')).toBeInTheDocument());
    expect(screen.getByTestId('mode')).toHaveTextContent(InstanceMode.Serve);
    expect(screen.getByTestId('title')).toHaveTextContent('WordKey — cashlessconsumer');
  });

  it('falls back to defaults when the config is missing', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('not found', { status: 404 })));
    render(
      <InstanceConfigProvider>
        <Probe />
      </InstanceConfigProvider>,
    );
    await waitFor(() => expect(screen.getByText('ready')).toBeInTheDocument());
    expect(screen.getByTestId('mode')).toHaveTextContent(InstanceMode.Author);
  });

  it('throws outside a provider', () => {
    expect(() => render(<Probe />)).toThrow(/useInstanceConfig/);
  });
});
```

- [ ] **Step 7: Run test to verify it fails**

Run: `npm run test:run -- test/hooks/useInstanceConfig.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 8: Implement the provider**

Create `hooks/useInstanceConfig.tsx`:

```tsx
import React, { createContext, useContext, useEffect, useState } from 'react';

import { fetchInstanceConfig } from '../services/configService';
import { WordKeyConfig } from '../types';

interface InstanceConfigContextType {
  config: WordKeyConfig;
  loading: boolean;
}

const InstanceConfigContext = createContext<InstanceConfigContextType | undefined>(undefined);

export const InstanceConfigProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [config, setConfig] = useState<WordKeyConfig | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchInstanceConfig().then(result => {
      if (!cancelled) setConfig(result);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const value: InstanceConfigContextType = config
    ? { config, loading: false }
    : { config: fetchInstanceConfigDefaults(), loading: true };

  return <InstanceConfigContext.Provider value={value}>{children}</InstanceConfigContext.Provider>;
};

// Placeholder import target — see Step 8b.
function fetchInstanceConfigDefaults(): WordKeyConfig {
  throw new Error('not implemented');
}

export function useInstanceConfig(): InstanceConfigContextType {
  const ctx = useContext(InstanceConfigContext);
  if (!ctx) throw new Error('useInstanceConfig must be used within InstanceConfigProvider');
  return ctx;
}
```

**Step 8b:** replace the placeholder with the real default import — the file must read:

```tsx
import React, { createContext, useContext, useEffect, useState } from 'react';

import { fetchInstanceConfig, DEFAULT_INSTANCE_CONFIG } from '../services/configService';
import { WordKeyConfig } from '../types';

interface InstanceConfigContextType {
  config: WordKeyConfig;
  loading: boolean;
}

const InstanceConfigContext = createContext<InstanceConfigContextType | undefined>(undefined);

export const InstanceConfigProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // config starts null so consumers see loading:true, not a flash of defaults.
  const [config, setConfig] = useState<WordKeyConfig | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchInstanceConfig().then(result => {
      if (!cancelled) setConfig(result);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const value: InstanceConfigContextType = config
    ? { config, loading: false }
    : { config: DEFAULT_INSTANCE_CONFIG, loading: true };

  return <InstanceConfigContext.Provider value={value}>{children}</InstanceConfigContext.Provider>;
};

export function useInstanceConfig(): InstanceConfigContextType {
  const ctx = useContext(InstanceConfigContext);
  if (!ctx) throw new Error('useInstanceConfig must be used within InstanceConfigProvider');
  return ctx;
}
```

(The two-step write above exists only to honor the failing-test-first cycle; land the final version from 8b.)

- [ ] **Step 9: Wrap the app**

Modify `index.tsx` — providers become:

```tsx
<ErrorBoundary>
  <React.StrictMode>
    <InstanceConfigProvider>
      <I18nProvider>
        <FeedbackProvider>
          <App />
        </FeedbackProvider>
      </I18nProvider>
    </InstanceConfigProvider>
  </React.StrictMode>
</ErrorBoundary>
```

with `import { InstanceConfigProvider } from './hooks/useInstanceConfig';` added.

- [ ] **Step 10: Full local verification**

Run: `npm run type-check && npm run lint:check && npm run test:run && npm run build`
Expected: all green.

- [ ] **Step 11: Commit**

```bash
git checkout -b feat/m1-1-instance-config
git add types.ts services/configService.ts public/wordkey.config.json hooks/useInstanceConfig.tsx index.tsx test/services/configService.test.ts test/hooks/useInstanceConfig.test.tsx
git commit -m "feat(instance): wordkey.config.json loading, normalization, provider (#<issue>)"
```

Push, open PR into `dev`, wait for CI green, squash-merge, close issue, append ledger line.

---

### Task 2: Config-driven title/meta and sidebar identity

**Files:**
- Create: `hooks/useDocumentMeta.ts`
- Modify: `components/Sidebar.tsx` (header block, lines ~56–66)
- Modify: `App.tsx` (call the hook)
- Test: `test/hooks/useDocumentMeta.test.tsx`
- Test: `test/components/Sidebar.identity.test.tsx`

**Interfaces:**
- Consumes: `useInstanceConfig()` (Task 1), `WordKeyConfig` type.
- Produces: `function useDocumentMeta(config: WordKeyConfig): void` — sets `document.title` and og/twitter `title`/`description` metas when the config supplies values; never clears owner values back to v1 defaults (config wins only when non-empty).

- [ ] **Step 1: Write failing tests**

`test/hooks/useDocumentMeta.test.tsx`:

```tsx
import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { useDocumentMeta } from '../../hooks/useDocumentMeta';
import { DEFAULT_INSTANCE_CONFIG, normalizeConfig } from '../../services/configService';
import { InstanceMode } from '../../types';

describe('useDocumentMeta', () => {
  it('leaves document state untouched for the default config', () => {
    document.title = 'before';
    renderHook(() => useDocumentMeta(DEFAULT_INSTANCE_CONFIG));
    expect(document.title).toBe('before');
  });

  it('applies config title and blurb to title + metas', () => {
    const config = normalizeConfig({
      mode: 'serve',
      title: 'WordKey — cashlessconsumer',
      blurb: 'Play my vocabulary or load it into your agent.',
    });
    renderHook(() => useDocumentMeta(config));
    expect(document.title).toBe('WordKey — cashlessconsumer');
    const ogTitle = document.querySelector('meta[property="og:title"]')?.getAttribute('content');
    const ogDesc = document.querySelector('meta[property="og:description"]')?.getAttribute('content');
    const desc = document.querySelector('meta[name="description"]')?.getAttribute('content');
    expect(ogTitle).toBe('WordKey — cashlessconsumer');
    expect(ogDesc).toBe('Play my vocabulary or load it into your agent.');
    expect(desc).toBe('Play my vocabulary or load it into your agent.');
  });
});
```

`test/components/Sidebar.identity.test.tsx`:

```tsx
import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import Sidebar from '../../components/Sidebar';
import { InstanceConfigProvider } from '../../hooks/useInstanceConfig';
import { I18nProvider } from '../../hooks/useI18n';
import { InstanceMode } from '../../types';

// Renders the real providers with a stubbed config fetch so the sidebar
// header reflects the instance identity.
function renderSidebar(config: object, collapsed = false) {
  vi.stubGlobal('fetch', vi.fn((url: string) => {
    if (url.endsWith('wordkey.config.json')) {
      return Promise.resolve(new Response(JSON.stringify(config), { status: 200 }));
    }
    const locale = url.match(/locales\/(\w+)\.json/)?.[1] ?? 'en';
    // Minimal i18n payload; Sidebar renders t() keys it already has via the
    // real en.json in other tests — here we only assert identity rendering.
    return Promise.resolve(new Response(JSON.stringify({
      'sidebar.titleShort': 'AI',
      'sidebar.titleLong': 'AI Word Search',
      'sidebar.maker': 'Maker', 'sidebar.player': 'Player',
      'sidebar.settings': 'Settings', 'sidebar.help': 'Help',
      'sidebar.expand': 'Expand', 'sidebar.collapse': 'Collapse',
      'sidebar.homeAria': 'Home', 'sidebar.expandAria': 'Expand',
      'sidebar.collapseAria': 'Collapse',
    }), { status: 200 }));
  }));
  return render(
    <InstanceConfigProvider>
      <I18nProvider>
        <Sidebar currentView={undefined as any} onNavigate={() => {}} isCollapsed={collapsed} onToggle={() => {}} />
      </I18nProvider>
    </InstanceConfigProvider>,
  );
}

describe('Sidebar identity', () => {
  it('shows config title and owner byline when configured', async () => {
    renderSidebar({ mode: InstanceMode.Serve, title: 'WordKey — cashlessconsumer', owner: 'Srikanth' });
    expect(await screen.findByText('WordKey — cashlessconsumer')).toBeInTheDocument();
    expect(screen.getByText('Srikanth')).toBeInTheDocument();
  });

  it('keeps v1 header when no title is configured', async () => {
    renderSidebar({ mode: InstanceMode.Author });
    expect(await screen.findByText('AI Word Search')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test:run -- test/hooks/useDocumentMeta.test.tsx test/components/Sidebar.identity.test.tsx`
Expected: FAIL — `useDocumentMeta` missing; sidebar shows v1 strings.

- [ ] **Step 3: Implement**

Create `hooks/useDocumentMeta.ts`:

```ts
import { useEffect } from 'react';

import { WordKeyConfig } from '../types';

// v2 reposition spec §3.1: page title/og/meta follow the instance config.
// Config values win only when non-empty — an unconfigured deployment keeps
// the static v1 meta from index.html.
function setMeta(selector: string, content: string) {
  const el = document.head.querySelector<HTMLMetaElement>(selector);
  if (el) el.setAttribute('content', content);
}

export function useDocumentMeta(config: WordKeyConfig): void {
  const { title, blurb } = config;
  useEffect(() => {
    if (title) {
      document.title = title;
      setMeta('meta[property="og:title"]', title);
      setMeta('meta[name="twitter:title"]', title);
    }
    if (blurb) {
      setMeta('meta[name="description"]', blurb);
      setMeta('meta[property="og:description"]', blurb);
      setMeta('meta[name="twitter:description"]', blurb);
    }
  }, [title, blurb]);
}
```

Modify `components/Sidebar.tsx` header block:

```tsx
import { useInstanceConfig } from '../hooks/useInstanceConfig';
// ...
const Sidebar: React.FC<SidebarProps> = ({ currentView, onNavigate, isCollapsed, onToggle }) => {
  const { t } = useI18n();
  const { config } = useInstanceConfig();
  // ...
  <h1 className="font-display text-xl sm:text-2xl font-bold text-ink px-2 text-center truncate transition-all group-hover:text-ink-soft">
    {config.title || (isCollapsed ? t('sidebar.titleShort') : t('sidebar.titleLong'))}
  </h1>
  {!isCollapsed && config.owner && (
    <p className="text-xs text-ink-soft text-center mt-1 truncate">{config.owner}</p>
  )}
```

(Keep the existing button/aria structure; the byline `<p>` sits inside the header `<div>`, below the `<button>`.)

Modify `App.tsx`: add `const { config } = useInstanceConfig();` near the top (hook import from `./hooks/useInstanceConfig`) and call `useDocumentMeta(config);` before the return. (App does not otherwise consume config until Task 3 — that is fine; the hook call is idempotent.)

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test:run -- test/hooks/useDocumentMeta.test.tsx test/components/Sidebar.identity.test.tsx`
Expected: PASS.

- [ ] **Step 5: Full local verification + commit**

Run: `npm run type-check && npm run lint:check && npm run test:run && npm run build` — all green.

```bash
git checkout -b feat/m1-2-config-branding
git add hooks/useDocumentMeta.ts components/Sidebar.tsx App.tsx test/hooks/useDocumentMeta.test.tsx test/components/Sidebar.identity.test.tsx
git commit -m "feat(instance): config-driven title/meta and sidebar identity (#<issue>)"
```

---

### Task 3: Serve mode — hide and guard creation

**Files:**
- Modify: `components/Sidebar.tsx` (props + conditional Maker item)
- Modify: `components/BottomTabBar.tsx` (same)
- Modify: `App.tsx` (guard + defense)
- Test: `test/components/Sidebar.serveMode.test.tsx`
- Test: `test/App.serveMode.test.tsx`

**Interfaces:**
- Consumes: `useInstanceConfig()` (Task 1), `InstanceMode` (Task 1).
- Produces: `SidebarProps`/`BottomTabBarProps` gain `showMaker: boolean` (required). App computes `showMaker = config.mode !== InstanceMode.Serve`.

- [ ] **Step 1: Write failing tests**

`test/components/Sidebar.serveMode.test.tsx` (same harness as identity test; assert nav items):

```tsx
it('hides the Maker item in serve mode', async () => {
  renderSidebar({ mode: InstanceMode.Serve });
  await screen.findByText('WordKey — cashlessconsumer');
  expect(screen.queryByText('Maker')).not.toBeInTheDocument();
  expect(screen.getByText('Player')).toBeInTheDocument();
});

it('shows the Maker item in author mode', async () => {
  renderSidebar({ mode: InstanceMode.Author });
  await screen.findByText('AI Word Search');
  expect(screen.getByText('Maker')).toBeInTheDocument();
});
```

(`renderSidebar` gains a `showMaker` pass-through — the component API change under test.)

`test/App.serveMode.test.tsx`: render the full `App` under `InstanceConfigProvider` + `I18nProvider` + `FeedbackProvider` with fetch stubbed to return `{ mode: 'serve' }` for config and real locale files (other App tests in `test/` show the fetch-stub pattern — reuse it verbatim; if none exists, stub `/locales/en.json` with the same payload as the identity test plus keys `share.error.invalidLink`, and assert):

```tsx
it('redirects Maker to Player in serve mode', async () => {
  // App starts on Maker; serve mode must land on Player instead.
  // Assert the Player view is present: the "Player" nav is active and the
  // Maker view heading is absent.
  render(<App />); // wrapped in providers as above
  await waitFor(() => expect(screen.getByText('Player')).toHaveAttribute('aria-current', 'page'));
});
```

(Exact selectors finalized against `PlayerView`'s actual markup during implementation; the behavioral contract is: serve mode + initial Maker ⇒ Player renders, Maker never does.)

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test:run -- test/components/Sidebar.serveMode.test.tsx test/App.serveMode.test.tsx`
Expected: FAIL — `showMaker` prop unknown; Maker still renders.

- [ ] **Step 3: Implement**

`components/Sidebar.tsx` + `components/BottomTabBar.tsx`: add `showMaker: boolean;` to props interfaces; wrap the Maker `NavItem`/`TabItem` in `{showMaker && (...)}`.

`App.tsx`:

```tsx
const { config } = useInstanceConfig();
const isServeMode = config.mode === InstanceMode.Serve;
const showMaker = !isServeMode;

// Serve mode (#v2 spec §2): creation is disabled by design. The Maker nav
// item is hidden (showMaker) and direct access is redirected — the
// explanatory landing copy arrives with the M3 serve-mode home.
const handleNavigate = (targetView: View) => {
  if (view === targetView) return;
  if (isServeMode && targetView === View.Maker) {
    setView(View.Player);
    return;
  }
  setView(targetView);
};

// Initial-load guard: App mounts on Maker; a serve-mode instance must land
// on Player once the config resolves. Shared-link games (#game=) already
// route to Player and are unaffected.
useEffect(() => {
  if (config.loading) return;
  setView(currentView => (isServeMode && currentView === View.Maker ? View.Player : currentView));
}, [config.loading, isServeMode]);
```

and in `renderView()`:

```tsx
case View.Maker:
  if (isServeMode) {
    return <div key="player" className={viewClass}><PlayerView /* existing props */ /></div>;
  }
  return <div key="maker" className={viewClass}>{/* existing MakerView */}</div>;
```

(`/* existing props */` = the exact `PlayerView` prop spread already used in the `View.Player` case — extract it into a `renderPlayer()` local function so both cases share it.)

Pass `showMaker={showMaker}` to `Sidebar` and `BottomTabBar`.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test:run`
Expected: full suite PASS (no regressions — author-mode tests unaffected because default config = author).

- [ ] **Step 5: Full local verification + commit**

Run: `npm run type-check && npm run lint:check && npm run test:run && npm run build` — all green.

```bash
git checkout -b feat/m1-3-serve-mode-guard
git add components/Sidebar.tsx components/BottomTabBar.tsx App.tsx test/components/Sidebar.serveMode.test.tsx test/App.serveMode.test.tsx
git commit -m "feat(instance): serve mode hides and guards puzzle creation (#<issue>)"
```

---

## Post-M1 (not in this plan)

M2 (vocabulary authoring) and beyond get their own plan documents written when the loop reaches them, against the then-current tree — per the repo protocol, each milestone's issues are filed just-in-time under the GitHub milestone `v2-reposition`.
