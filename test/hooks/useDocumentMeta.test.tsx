import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { useDocumentMeta } from '../../hooks/useDocumentMeta';
import { DEFAULT_INSTANCE_CONFIG, normalizeConfig } from '../../services/configService';

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
    expect(
      document.querySelector('meta[property="og:title"]')?.getAttribute('content'),
    ).toBe('WordKey — cashlessconsumer');
    expect(
      document.querySelector('meta[name="twitter:title"]')?.getAttribute('content'),
    ).toBe('WordKey — cashlessconsumer');
    expect(
      document.querySelector('meta[property="og:description"]')?.getAttribute('content'),
    ).toBe('Play my vocabulary or load it into your agent.');
    expect(
      document.querySelector('meta[name="twitter:description"]')?.getAttribute('content'),
    ).toBe('Play my vocabulary or load it into your agent.');
    expect(
      document.querySelector('meta[name="description"]')?.getAttribute('content'),
    ).toBe('Play my vocabulary or load it into your agent.');
  });

  it('keep v1 metas when only the mode is configured', () => {
    document.title = 'v1 title';
    renderHook(() => useDocumentMeta(normalizeConfig({ mode: 'serve' })));
    expect(document.title).toBe('v1 title');
  });
});
