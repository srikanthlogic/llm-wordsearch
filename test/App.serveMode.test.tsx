import { render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import App from '../App';
import { FeedbackProvider } from '../components/Feedback';
import { InstanceConfigProvider } from '../hooks/useInstanceConfig';

// t() renders the raw key, so assertions use i18n keys as stable markers:
// 'maker.title' is MakerView's heading, 'player.title' is PlayerView's.
vi.mock('../hooks/useI18n', () => ({
  useI18n: () => ({
    language: 'en',
    setLanguage: vi.fn(),
    t: (key: string) => key,
  }),
}));

function renderApp(config: object) {
  global.fetch = vi.fn().mockImplementation((url: string) => {
    if (url.includes('wordkey.config.json')) {
      return Promise.resolve({ ok: true, json: () => Promise.resolve(config) });
    }
    return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
  }) as any;
  return render(
    <InstanceConfigProvider>
      <FeedbackProvider>
        <App />
      </FeedbackProvider>
    </InstanceConfigProvider>,
  );
}

beforeAll(() => {
  // App's theme effect reads matchMedia; jsdom does not implement it.
  // A plain function (not vi.fn) so afterEach's restoreAllMocks can't
  // wipe its implementation between tests.
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }),
  });
});

afterEach(() => {
  vi.restoreAllMocks();
  window.localStorage.clear();
  window.sessionStorage.clear();
});

describe('App serve mode', () => {
  it('lands on Player and never renders Maker when mode is serve', async () => {
    renderApp({ mode: 'serve' });
    await waitFor(() => expect(screen.getByText('player.title')).toBeInTheDocument());
    expect(screen.queryByText('maker.title')).not.toBeInTheDocument();
    // Maker nav is hidden on both chrome surfaces.
    expect(screen.queryByLabelText('sidebar.maker')).not.toBeInTheDocument();
    // The Author surface is likewise absent in serve mode (#98).
    expect(screen.queryByLabelText('sidebar.author')).not.toBeInTheDocument();
  });

  it('keeps the v1 Maker-first behavior in author mode', async () => {
    renderApp({ mode: 'author' });
    await waitFor(() => expect(screen.getByText('maker.title')).toBeInTheDocument());
    expect(screen.queryByText('player.title')).not.toBeInTheDocument();
    // Desktop sidebar and mobile tab bar both render (jsdom ignores
    // responsive classes), hence getAllBy*.
    expect(screen.getAllByLabelText('sidebar.maker').length).toBeGreaterThan(0);
    // Author mode exposes the vocabulary authoring surface (#98).
    expect(screen.getAllByLabelText('sidebar.author').length).toBeGreaterThan(0);
  });
});
