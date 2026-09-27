import { render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import { FeedbackProvider } from '../../components/Feedback';
import { InstanceConfigProvider } from '../../hooks/useInstanceConfig';
import { clearCorpusCache } from '../../services/corpusLoader';
import { GameDefinition, GameHistory } from '../../types';
import PlayerView from '../../views/PlayerView';

// t() renders the raw key with replacements applied, so assertions use the
// serve.* keys as stable markers.
vi.mock('../../hooks/useI18n', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../hooks/useI18n')>();
  return {
    ...actual,
    useI18n: () => ({
      language: 'en',
      setLanguage: vi.fn(),
      t: (key: string, replacements?: Record<string, string | number>) => {
        if (!replacements) return key;
        return key + Object.values(replacements).map(v => `:${v}`).join('');
      },
    }),
  };
});

const domainPayload = (slug: string, title: string) => ({
  domain: slug,
  title,
  blurb: `Blurb for ${slug}.`,
  locale: 'en',
  entries: ['alpha', 'beta', 'gamma', 'delta', 'epsilon'].map(term => ({
    term,
    gloss: `Gloss for ${term}.`,
    context: `Context for ${term}.`,
    usage: `Use ${term}.`,
    related: [],
  })),
});

function stubFetch(mode: 'serve' | 'author', withCorpus = true) {
  global.fetch = vi.fn().mockImplementation((url: string) => {
    if (url.includes('wordkey.config.json')) {
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ mode }) });
    }
    if (url.includes('corpus/manifest.json') && withCorpus) {
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ domains: ['payments'] }) });
    }
    if (url.includes('/payments.json') && withCorpus) {
      return Promise.resolve({ ok: true, json: () => Promise.resolve(domainPayload('payments', 'Payments & Cashless Living')) });
    }
    return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
  }) as any;
}

beforeAll(() => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
      matches: false, media: query, onchange: null,
      addListener: () => {}, removeListener: () => {},
      addEventListener: () => {}, removeEventListener: () => {},
      dispatchEvent: () => false,
    }),
  });
});

afterEach(() => {
  vi.restoreAllMocks();
  window.localStorage.clear();
  clearCorpusCache();
});

const playerProps = {
  availableGames: [] as GameDefinition[],
  sharedGame: null,
  history: [] as GameHistory[],
  onDeleteGame: vi.fn(),
  onShareGame: vi.fn(),
  onGameEnd: vi.fn(),
  onSaveGameToLibrary: vi.fn(),
};

function renderPlayer() {
  return render(
    <InstanceConfigProvider>
      <FeedbackProvider>
        <PlayerView {...playerProps} />
      </FeedbackProvider>
    </InstanceConfigProvider>,
  );
}

describe('PlayerView serve mode', () => {
  it('renders domain cards derived from the corpus as the home', async () => {
    stubFetch('serve');
    renderPlayer();
    expect(await screen.findByText('Payments & Cashless Living')).toBeInTheDocument();
    expect(screen.getByText('serve.entriesCount:5')).toBeInTheDocument();
    // The v1 library/history chrome is not part of the serve home.
    expect(screen.queryByText('player.tabs.games')).not.toBeInTheDocument();
  });

  it('starts a derived game when a domain card is clicked', async () => {
    stubFetch('serve');
    renderPlayer();
    const card = await screen.findByRole('button', {
      name: 'serve.domainPlay:Payments & Cashless Living',
    });
    card.click();
    // The game board shows the word list; the serve home is gone (the domain
    // title legitimately remains — it becomes the game's theme heading).
    expect(await screen.findByText('wordlist.title')).toBeInTheDocument();
    expect(screen.queryByText('serve.home')).not.toBeInTheDocument();
  });

  it('shows a load error when the corpus is unavailable', async () => {
    stubFetch('serve', false);
    renderPlayer();
    expect(await screen.findByText('serve.empty')).toBeInTheDocument();
  });

  it('keeps the v1 library UI in author mode', async () => {
    stubFetch('author');
    renderPlayer();
    await waitFor(() => expect(screen.getByText('player.title')).toBeInTheDocument());
    expect(screen.queryByText('serve.home')).not.toBeInTheDocument();
  });
});
