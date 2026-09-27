import { render, screen } from '@testing-library/react';
import React from 'react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import App from '../App';
import { FeedbackProvider } from '../components/Feedback';
import { InstanceConfigProvider } from '../hooks/useInstanceConfig';
import { serializeBadgeShare } from '../services/badgeService';

vi.mock('../hooks/useI18n', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../hooks/useI18n')>();
  return {
    ...actual,
    useI18n: () => ({
      language: 'en',
      setLanguage: vi.fn(),
      t: (key: string, replacements?: Record<string, string | number>) =>
        replacements ? key + Object.values(replacements).map(v => `:${v}`).join('') : key,
    }),
  };
});

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
  window.location.hash = '';
});

describe('App badge share-link round-trip (#110)', () => {
  it('renders a read-only badge card from a #badges= link', () => {
    const compressed = serializeBadgeShare('WordKey — cashlessconsumer', 'Srikanth', {
      earned: { 'first-find': 1, 'domain-master-payments': 2 },
      counters: { wordsFound: 4, lostLevels: 0, localesPlayed: ['en'], domainsMastered: ['payments'] },
      streak: { current: 1, best: 1 },
    });
    window.location.hash = `#badges=${compressed}`;

    global.fetch = vi.fn().mockImplementation(() =>
      Promise.resolve({ ok: true, json: () => Promise.resolve({}) }),
    ) as any;

    render(
      <InstanceConfigProvider>
        <FeedbackProvider>
          <App />
        </FeedbackProvider>
      </InstanceConfigProvider>,
    );

    expect(screen.getByText('badgecard.title')).toBeInTheDocument();
    expect(screen.getByText('badgecard.by:Srikanth')).toBeInTheDocument();
    expect(screen.getByText('badge.firstFind.title')).toBeInTheDocument();
    expect(screen.getByText('badge.domainMaster.title:payments')).toBeInTheDocument();
    // The card replaces the app chrome entirely.
    expect(screen.queryByTestId('grid')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('sidebar.player')).not.toBeInTheDocument();
  });

  it('boots the normal app when the badge payload is garbage', () => {
    window.location.hash = '#badges=@@garbage@@';
    global.fetch = vi.fn().mockImplementation(() =>
      Promise.resolve({ ok: true, json: () => Promise.resolve({}) }),
    ) as any;

    render(
      <InstanceConfigProvider>
        <FeedbackProvider>
          <App />
        </FeedbackProvider>
      </InstanceConfigProvider>,
    );

    // Normal chrome renders (default config = author mode).
    expect(screen.getByText('maker.title')).toBeInTheDocument();
  });
});
