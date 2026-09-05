/* eslint-disable import/order */
import { act, render, renderHook, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { I18nProvider, useI18n } from '../../hooks/useI18n';

vi.mock('../../services/storageService', () => ({
  loadLanguage: vi.fn(() => 'en'),
  saveLanguage: vi.fn(),
}));

import { loadLanguage, saveLanguage } from '../../services/storageService';

const enTranslations = {
  greeting: 'Hello',
  farewell: 'Goodbye',
  items: 'You have {{count}} items',
  nested: 'Hello {{name}}',
};

const taTranslations = {
  greeting: 'வணக்கம்',
  farewell: 'பிரியாவிடை',
};

describe('useI18n hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  const setupFetchMock = (lang: string, data: any, fail = false) => {
    (global.fetch as any).mockImplementation((url: string) => {
      if (fail) return Promise.resolve({ ok: false, status: 500 });
      if (url.includes(`/${lang}.json`)) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(data) });
      }
      if (url.includes('/en.json')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(enTranslations) });
      }
      return Promise.resolve({ ok: false, status: 404 });
    });
  };

  it('should render loading spinner before translations load', () => {
    setupFetchMock('en', enTranslations);
    const { container } = render(
      <I18nProvider>
        <div data-testid="child">Child</div>
      </I18nProvider>
    );
    expect(container.querySelector('.animate-spin')).toBeTruthy();
    expect(screen.queryByTestId('child')).toBeNull();
  });

  it('should load English translations and expose t()', async () => {
    setupFetchMock('en', enTranslations);
    const { result } = renderHook(() => useI18n(), { wrapper: I18nProvider });
    await waitFor(() => {
      expect(result.current.t('greeting')).toBe('Hello');
    });
    expect(result.current.language).toBe('en');
  });

  it('should return the key when translation is missing', async () => {
    setupFetchMock('en', enTranslations);
    const { result } = renderHook(() => useI18n(), { wrapper: I18nProvider });
    await waitFor(() => {
      expect(result.current.t('greeting')).toBe('Hello');
    });
    expect(result.current.t('non.existent.key')).toBe('non.existent.key');
  });

  it('should perform placeholder replacement', async () => {
    setupFetchMock('en', enTranslations);
    const { result } = renderHook(() => useI18n(), { wrapper: I18nProvider });
    await waitFor(() => {
      expect(result.current.t('items', { count: 5 })).toBe('You have 5 items');
    });
    expect(result.current.t('nested', { name: 'Cashless' })).toBe('Hello Cashless');
  });

  it('should set language and save to storage', async () => {
    setupFetchMock('en', enTranslations);
    const { result } = renderHook(() => useI18n(), { wrapper: I18nProvider });
    await waitFor(() => expect(result.current.t('greeting')).toBe('Hello'));
    act(() => {
      result.current.setLanguage('en');
    });
    expect(saveLanguage).toHaveBeenCalledWith('en');
  });

  it('should fetch new language translations when language changes', async () => {
    setupFetchMock('en', enTranslations);
    (loadLanguage as any).mockReturnValue('en');
    const { result, rerender: _rerender } = renderHook(() => useI18n(), { wrapper: I18nProvider });
    await waitFor(() => expect(result.current.t('greeting')).toBe('Hello'));

    setupFetchMock('ta', taTranslations);
    act(() => {
      result.current.setLanguage('ta');
    });
    await waitFor(() => {
      expect(result.current.t('greeting')).toBe('வணக்கம்');
    });
    expect(result.current.language).toBe('ta');
  });

  it('should fall back to English when target language fetch fails', async () => {
    setupFetchMock('en', enTranslations);
    const { result } = renderHook(() => useI18n(), { wrapper: I18nProvider });
    await waitFor(() => expect(result.current.t('greeting')).toBe('Hello'));

    // Now switch to a language that will fail; should fall back to en translations
    (loadLanguage as any).mockReturnValue('en');
    (global.fetch as any).mockImplementation((url: string) => {
      if (url.includes('/ta.json')) return Promise.resolve({ ok: false, status: 500 });
      if (url.includes('/en.json')) return Promise.resolve({ ok: true, json: () => Promise.resolve(enTranslations) });
      return Promise.resolve({ ok: false, status: 404 });
    });
    act(() => {
      result.current.setLanguage('ta');
    });
    await waitFor(() => {
      // Falls back to en for missing key
      expect(result.current.t('non.existent.key')).toBe('non.existent.key');
    });
  });

  it('v2 hardening (#50): ignores a stale locale fetch that resolves after a newer one', async () => {
    let resolveTa: (v: any) => void = () => {};
    (global.fetch as any).mockImplementation((url: string) => {
      if (url.includes('/ta.json')) {
        return new Promise((resolve) => { resolveTa = resolve; });
      }
      if (url.includes('/en.json')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(enTranslations) });
      }
      return Promise.resolve({ ok: false, status: 404 });
    });

    const { result } = renderHook(() => useI18n(), { wrapper: I18nProvider });
    await waitFor(() => expect(result.current.t('greeting')).toBe('Hello'));

    // Switch to ta: its fetch hangs (stale-to-be).
    act(() => {
      result.current.setLanguage('ta');
    });
    // Switch back to en before ta resolves; en fetch resolves immediately.
    (global.fetch as any).mockImplementation((url: string) => {
      if (url.includes('/en.json')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(enTranslations) });
      }
      return Promise.resolve({ ok: false, status: 404 });
    });
    act(() => {
      result.current.setLanguage('en');
    });
    await waitFor(() => expect(result.current.t('greeting')).toBe('Hello'));

    // The stale ta fetch resolves now — cancellation must discard it.
    resolveTa({ ok: true, json: () => Promise.resolve(taTranslations) });
    await Promise.resolve();

    // Current selection still wins; the stale write did not land.
    expect(result.current.t('greeting')).toBe('Hello');
  });

  it('v2 hardening (#50): does not negatively cache failed locale; retry succeeds', async () => {
    (global.fetch as any).mockImplementation((url: string) => {
      if (url.includes('/ta.json')) return Promise.resolve({ ok: false, status: 500 });
      if (url.includes('/en.json')) return Promise.resolve({ ok: true, json: () => Promise.resolve(enTranslations) });
      return Promise.resolve({ ok: false, status: 404 });
    });
    const { result } = renderHook(() => useI18n(), { wrapper: I18nProvider });
    await waitFor(() => expect(result.current.t('greeting')).toBe('Hello'));

    act(() => {
      result.current.setLanguage('ta');
    });
    await waitFor(() => {
      // 'ta' fetch failed → t() falls back through to en cache
      expect(result.current.t('greeting')).toBe('Hello');
    });

    // Now 'ta.json' succeeds on retry (language toggled away and back)
    (global.fetch as any).mockImplementation((url: string) => {
      if (url.includes('/ta.json')) return Promise.resolve({ ok: true, json: () => Promise.resolve(taTranslations) });
      if (url.includes('/en.json')) return Promise.resolve({ ok: true, json: () => Promise.resolve(enTranslations) });
      return Promise.resolve({ ok: false, status: 404 });
    });
    act(() => {
      result.current.setLanguage('en');
    });
    await waitFor(() => expect(result.current.t('greeting')).toBe('Hello'));
    act(() => {
      result.current.setLanguage('ta');
    });
    await waitFor(() => {
      expect(result.current.t('greeting')).toBe('வணக்கம்');
    });
  });

  it('v2 hardening (#51): syncs document.documentElement.lang on language change', async () => {
    setupFetchMock('en', enTranslations);
    const { result } = renderHook(() => useI18n(), { wrapper: I18nProvider });
    await waitFor(() => expect(result.current.t('greeting')).toBe('Hello'));

    setupFetchMock('ta', taTranslations);
    act(() => {
      result.current.setLanguage('ta');
    });
    await waitFor(() => expect(document.documentElement.lang).toBe('ta'));

    act(() => {
      result.current.setLanguage('en');
    });
    await waitFor(() => expect(document.documentElement.lang).toBe('en'));
  });

  it('v2 hardening: resolves keys missing from a successful partial locale via the English baseline', async () => {
    (loadLanguage as any).mockReturnValue('es');
    (global.fetch as any).mockImplementation((url: string) => {
      // es.json loads fine but omits 'farewell' — the baseline must fill it in
      if (url.includes('/es.json')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ greeting: 'Hola' }) });
      }
      if (url.includes('/en.json')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(enTranslations) });
      }
      return Promise.resolve({ ok: false, status: 404 });
    });

    const { result } = renderHook(() => useI18n(), { wrapper: I18nProvider });
    await waitFor(() => expect(result.current.t('greeting')).toBe('Hola'));
    expect(result.current.t('farewell')).toBe('Goodbye');
  });

  it('should throw if useI18n is used outside I18nProvider', () => {
    // Suppress expected error log
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => {
      renderHook(() => useI18n());
    }).toThrow('useI18n must be used within an I18nProvider');
    consoleError.mockRestore();
  });

  describe('v2 hardening (#27)', () => {
    it('should reject non-allowlisted locales and fetch English instead', async () => {
      const fetchCalls: string[] = [];
      (global.fetch as any).mockImplementation((url: string) => {
        fetchCalls.push(url);
        if (url.includes('/en.json')) {
          return Promise.resolve({ ok: true, json: () => Promise.resolve(enTranslations) });
        }
        return Promise.resolve({ ok: false, status: 404 });
      });
      (loadLanguage as any).mockReturnValue('<script>alert(1)</script>');
      const { result } = renderHook(() => useI18n(), { wrapper: I18nProvider });
      await waitFor(() => expect(result.current.t('greeting')).toBe('Hello'));
      // No request may embed the unvalidated language string
      for (const call of fetchCalls) {
        expect(call).not.toContain('alert');
      }
      expect(fetchCalls.some(c => c.endsWith('/locales/en.json'))).toBe(true);
    });

    it('should select _singular/_plural variants when count is provided', async () => {
      const plurals = {
        'levels': '{{count}} levels base',
        'levels_singular': '{{count}} Level',
        'levels_plural': '{{count}} Levels',
        'items': 'You have {{count}} items',
      };
      setupFetchMock('en', plurals);
      const { result } = renderHook(() => useI18n(), { wrapper: I18nProvider });
      await waitFor(() => expect(result.current.t('levels')).toBe('{{count}} levels base'));
      expect(result.current.t('levels', { count: 1 })).toBe('1 Level');
      expect(result.current.t('levels', { count: 3 })).toBe('3 Levels');
      // No suffixed variant -> base key still used with replacement
      expect(result.current.t('items', { count: 5 })).toBe('You have 5 items');
    });

    it('should keep caches isolated between provider instances', async () => {
      setupFetchMock('en', enTranslations);
      const first = renderHook(() => useI18n(), { wrapper: I18nProvider });
      await waitFor(() => expect(first.result.current.t('greeting')).toBe('Hello'));

      // A second, fresh provider instance must not inherit the first's cache
      (global.fetch as any).mockImplementation(() =>
        Promise.reject(new Error('network down'))
      );
      const second = renderHook(() => useI18n(), { wrapper: I18nProvider });
      await waitFor(() => expect(second.result.current.language).toBe('en'));
      // Falls back gracefully; must not show first instance's translations without fetching
      expect(second.result.current.t('greeting')).toBe('greeting'); // own fetch failed; no leak of first instance's cache
    });

    it('should warn on missing keys in dev mode', async () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
      setupFetchMock('en', enTranslations);
      const { result } = renderHook(() => useI18n(), { wrapper: I18nProvider });
      await waitFor(() => expect(result.current.t('greeting')).toBe('Hello'));
      result.current.t('totally.missing');
      expect(warn).toHaveBeenCalledWith(
        expect.stringContaining('totally.missing')
      );
      // Same key again should not duplicate the warning
      const callsAfterFirst = warn.mock.calls.length;
      result.current.t('totally.missing');
      expect(warn.mock.calls.length).toBe(callsAfterFirst);
      warn.mockRestore();
    });
  });

  it('should handle multiple placeholders in one string', async () => {
    const t = {
      greet: '{{greeting}}, {{name}}!',
    };
    setupFetchMock('en', t);
    const { result } = renderHook(() => useI18n(), { wrapper: I18nProvider });
    await waitFor(() => {
      expect(result.current.t('greet', { greeting: 'Hi', name: 'Sri' })).toBe('Hi, Sri!');
    });
  });

  describe('v2 hardening (#58): language switch must not unmount the app', () => {
    let mountCount: number;

    const CountingChild: React.FC = () => {
      React.useEffect(() => {
        mountCount += 1;
      }, []);
      return <div data-testid="probe">probe</div>;
    };

    const ProviderWithChild: React.FC<{ children?: React.ReactNode }> = ({ children }) => (
      <I18nProvider>
        <CountingChild />
        {children}
      </I18nProvider>
    );

    beforeEach(() => {
      mountCount = 0;
    });

    function deferredFetchMock(): () => void {
      let resolveTa!: (value: unknown) => void;
      const taFetch = new Promise(resolve => {
        resolveTa = resolve;
      });
      (global.fetch as any).mockImplementation((url: string) => {
        if (url.includes('/ta.json')) return taFetch.then(() => ({ ok: true, json: () => Promise.resolve(taTranslations) }));
        if (url.includes('/en.json')) return Promise.resolve({ ok: true, json: () => Promise.resolve(enTranslations) });
        return Promise.resolve({ ok: false, status: 404 });
      });
      return () => resolveTa(undefined);
    }

    it('child mount counter stays at 1 across a locale switch', async () => {
      setupFetchMock('en', enTranslations);
      const resolveTa = deferredFetchMock();
      const { result } = renderHook(() => useI18n(), { wrapper: ProviderWithChild });
      await waitFor(() => expect(result.current.t('greeting')).toBe('Hello'));
      expect(mountCount).toBe(1);

      act(() => {
        result.current.setLanguage('ta');
      });
      resolveTa();
      await waitFor(() => expect(result.current.t('greeting')).toBe('வணக்கம்'));
      expect(mountCount).toBe(1);
    });

    it('keeps children rendered and shows no spinner while an uncached locale revalidates', async () => {
      setupFetchMock('en', enTranslations);
      const resolveTa = deferredFetchMock();
      const { result } = renderHook(() => useI18n(), { wrapper: ProviderWithChild });
      await waitFor(() => expect(result.current.t('greeting')).toBe('Hello'));

      act(() => {
        result.current.setLanguage('ta');
      });
      // Mid-fetch: no spinner gate, child still mounted, English baseline served
      expect(document.querySelector('.animate-spin')).toBeNull();
      expect(screen.getByTestId('probe')).not.toBeNull();
      expect(result.current.t('greeting')).toBe('Hello');

      resolveTa();
      await waitFor(() => expect(result.current.t('greeting')).toBe('வணக்கம்'));
    });

    it('shows the spinner only on the very first load', async () => {
      let resolveEn!: (value: unknown) => void;
      const enFetch = new Promise(resolve => {
        resolveEn = resolve;
      });
      (global.fetch as any).mockImplementation((url: string) => {
        if (url.includes('/en.json')) return enFetch.then(() => ({ ok: true, json: () => Promise.resolve(enTranslations) }));
        return Promise.resolve({ ok: false, status: 404 });
      });
      const { container } = render(
        <I18nProvider>
          <CountingChild />
        </I18nProvider>
      );
      expect(container.querySelector('.animate-spin')).not.toBeNull();

      resolveEn(undefined);
      await waitFor(() => expect(container.querySelector('[data-testid="probe"]')).not.toBeNull());
      expect(container.querySelector('.animate-spin')).toBeNull();
    });

    it('switching to an already-cached locale swaps translations without waiting for the refetch', async () => {
      setupFetchMock('en', enTranslations);
      const resolveTa = deferredFetchMock();
      const { result } = renderHook(() => useI18n(), { wrapper: I18nProvider });
      await waitFor(() => expect(result.current.t('greeting')).toBe('Hello'));

      act(() => {
        result.current.setLanguage('ta');
      });
      resolveTa();
      await waitFor(() => expect(result.current.t('greeting')).toBe('வணக்கம்'));

      // Back to en, which is cached: t() resolves from cache immediately even
      // though the background re-fetch never resolves.
      (global.fetch as any).mockImplementation(() => new Promise(() => {}));
      act(() => {
        result.current.setLanguage('en');
      });
      expect(result.current.t('greeting')).toBe('Hello');
      expect(result.current.language).toBe('en');
    });
  });
});
