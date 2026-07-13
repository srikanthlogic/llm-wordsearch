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

  it('should throw if useI18n is used outside I18nProvider', () => {
    // Suppress expected error log
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => {
      renderHook(() => useI18n());
    }).toThrow('useI18n must be used within an I18nProvider');
    consoleError.mockRestore();
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
});
