import { describe, expect, it, vi } from 'vitest';

import { normalizeConfig } from '../../services/configService';
import { fetchCorpusDomains } from '../../services/corpusLoader';
import { validateCorpusDomain } from '../../services/corpusService';
import { deriveGameDefinition, deriveLevels } from '../../services/levelDerivation';
import { CorpusDomain, InstanceMode } from '../../types';

function makeDomain(entries: number, slug = 'payments'): CorpusDomain {
  const alpha = 'abcdefghijklmnopqrstuvwxyz';
  const terms = Array.from({ length: entries }, (_, i) => `term${alpha[i % 26]}${alpha[Math.floor(i / 26)]}`);
  const built = validateCorpusDomain({
    domain: slug,
    title: 'Test Domain',
    blurb: 'A test domain.',
    locale: 'en',
    entries: terms.map(term => ({
      term,
      gloss: `Gloss for ${term}.`,
      context: `Context for ${term}.`,
      usage: `Use ${term}.`,
      related: [],
    })),
  });
  if (!built.data) throw new Error('fixture invalid');
  return built.data;
}

describe('deriveLevels', () => {
  it('is deterministic — two calls are deeply equal', () => {
    const domain = makeDomain(10);
    expect(deriveLevels(domain, 3, 4)).toEqual(deriveLevels(domain, 3, 4));
  });

  it('splits entries across levels without repeats or loss', () => {
    const domain = makeDomain(10);
    const levels = deriveLevels(domain, 3, 4);
    expect(levels).toHaveLength(3);
    const all = levels.flatMap(l => l.words.map(w => w.word));
    expect(all).toHaveLength(10);
    expect(new Set(all).size).toBe(10);
    expect(levels.map(l => l.words.length)).toEqual([4, 3, 3]);
  });

  it('caps the level count at levelsPerDomain from the config', () => {
    const domain = makeDomain(20);
    const levels = deriveLevels(domain, 3, 4);
    expect(levels).toHaveLength(3);
    const all = levels.flatMap(l => l.words.map(w => w.word));
    expect(new Set(all).size).toBe(20);
  });

  it('uses a single level when the corpus is small', () => {
    const domain = makeDomain(5);
    const levels = deriveLevels(domain, 3, 4);
    expect(levels).toHaveLength(2);
  });

  it('carries the full contextual payload on each word', () => {
    const domain = makeDomain(5);
    const levels = deriveLevels(domain, 1, 4);
    const word = levels[0].words[0];
    expect(word.hint).toBeTruthy();
    expect(word.context).toBeTruthy();
    expect(word.usage).toBeTruthy();
  });

  it('sizes the grid from the word count', () => {
    const domain = makeDomain(4);
    const levels = deriveLevels(domain, 1, 4);
    expect(levels[0].gridSize).toBe(8);
  });
});

describe('deriveGameDefinition', () => {
  it('assembles a playable definition from the domain + config', () => {
    const domain = makeDomain(9);
    const config = normalizeConfig({ mode: InstanceMode.Serve });
    const game = deriveGameDefinition(domain, config);
    expect(game.id).toBe('corpus-payments');
    expect(game.theme).toBe('Test Domain');
    expect(game.language).toBe('en');
    expect(game.levels.length).toBeLessThanOrEqual(config.levels.perDomain);
    expect(game.levels[0].words.length).toBeLessThanOrEqual(config.levels.wordsPerLevel + 1);
  });
});

describe('fetchCorpusDomains', () => {
  it('fetches the manifest and every listed domain, dropping invalid ones', async () => {
    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes('manifest.json')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ domains: ['payments', 'bad'] }) });
      }
      if (url.includes('/payments.json')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(makeDomain(6)) });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ domain: 'bad', title: 'No entries', entries: [] }) });
    }) as any;

    const { domains, errors } = await fetchCorpusDomains(undefined, true);
    expect(domains.map(d => d.domain)).toEqual(['payments']);
    expect(errors.length).toBe(1);
  });

  it('caches per session — a second call does not refetch', async () => {
    const fetchMock = vi.fn().mockImplementation((url: string) => {
      if (url.includes('manifest.json')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ domains: ['payments'] }) });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve(makeDomain(6)) });
    });
    global.fetch = fetchMock as any;
    await fetchCorpusDomains(undefined, true);
    await fetchCorpusDomains();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
