import { describe, expect, it, vi } from 'vitest';

import { DEFAULT_INSTANCE_CONFIG, normalizeConfig } from '../../services/configService';
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

describe('fetchInstanceConfig', () => {
  it('returns defaults on HTTP 404', async () => {
    const { fetchInstanceConfig } = await import('../../services/configService');
    global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 404 }) as any;
    await expect(fetchInstanceConfig()).resolves.toEqual(DEFAULT_INSTANCE_CONFIG);
  });

  it('normalizes a served config', async () => {
    const { fetchInstanceConfig } = await import('../../services/configService');
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ mode: 'serve', title: 'WordKey — cashlessconsumer' }),
    }) as any;
    const config = await fetchInstanceConfig();
    expect(config.mode).toBe(InstanceMode.Serve);
    expect(config.title).toBe('WordKey — cashlessconsumer');
  });

  it('returns defaults on network failure', async () => {
    const { fetchInstanceConfig } = await import('../../services/configService');
    global.fetch = vi.fn().mockRejectedValue(new Error('offline')) as any;
    await expect(fetchInstanceConfig()).resolves.toEqual(DEFAULT_INSTANCE_CONFIG);
  });
});
