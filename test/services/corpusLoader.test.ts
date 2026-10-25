import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// #166 coverage: every degraded-mode branch of fetchCorpusDomains was
// untested — exactly what a serve instance hits when its corpus mount is
// broken. Assertions verified against services/corpusLoader.ts.

import { clearCorpusCache, fetchCorpusDomains } from '../../services/corpusLoader';

const MANIFEST = '/corpus/manifest.json';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status });
}

beforeEach(() => {
  clearCorpusCache();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('fetchCorpusDomains — degraded modes (#166)', () => {
  it('returns an empty domain list with the manifest HTTP error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('nope', { status: 404 })));
    const result = await fetchCorpusDomains(MANIFEST);
    expect(result).toEqual({ domains: [], errors: ['corpus manifest unavailable (HTTP 404)'] });
  });

  it('survives a manifest that is not fetchable at all', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
    const result = await fetchCorpusDomains(MANIFEST);
    expect(result.domains).toEqual([]);
    expect(result.errors[0]).toContain('corpus manifest could not be loaded');
  });

  it('loads the healthy domains and reports the broken one on a partial failure', async () => {
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url === MANIFEST) return jsonResponse({ domains: ['payments', 'broken'] });
      if (url === '/corpus/payments.json') {
        return jsonResponse({
          domain: 'payments',
          title: 'Payments',
          blurb: 'b',
          locale: 'en',
          provenance: 'owner-authored',
          entries: [
            { term: 'interchange', gloss: 'g', context: 'c', usage: 'u', related: [] },
            { term: 'mandate', gloss: 'g', context: 'c', usage: 'u', related: [] },
            { term: 'settlement', gloss: 'g', context: 'c', usage: 'u', related: [] },
            { term: 'chargeback', gloss: 'g', context: 'c', usage: 'u', related: [] },
          ],
        });
      }
      return new Response('missing', { status: 500 }); // broken.json
    }));
    const result = await fetchCorpusDomains(MANIFEST);
    expect(result.domains.map(d => d.domain)).toEqual(['payments']);
    expect(result.errors).toEqual(['corpus/broken.json unavailable (HTTP 500)']);
  });

  it('caches per session and only refetches on forceReload', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url === MANIFEST) return jsonResponse({ domains: [] });
      throw new Error('unexpected fetch');
    });
    vi.stubGlobal('fetch', fetchMock);

    await fetchCorpusDomains(MANIFEST);
    await fetchCorpusDomains(MANIFEST);
    await fetchCorpusDomains(MANIFEST);
    expect(fetchMock).toHaveBeenCalledTimes(1); // manifest only, once

    await fetchCorpusDomains(MANIFEST, true);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
