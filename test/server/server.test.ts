// @vitest-environment node
import fs from 'fs';
import os from 'os';
import path from 'path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { createApp } from '../../server/index';

// Fixture: a minimal dist (shell only) + a valid mounted corpus.
function buildFixture(): { dist: string; corpus: string } {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'wordkey-server-'));
  const dist = path.join(root, 'dist');
  const corpus = path.join(root, 'corpus');
  fs.mkdirSync(dist, { recursive: true });
  fs.mkdirSync(corpus, { recursive: true });

  fs.writeFileSync(path.join(dist, 'index.html'),
    '<!DOCTYPE html><html><head><title>shell</title></head><body>shell</body></html>');
  fs.writeFileSync(path.join(dist, 'asset.js'), 'console.log(1)');

  fs.writeFileSync(path.join(corpus, 'manifest.json'), JSON.stringify({ domains: ['payments'] }));
  fs.writeFileSync(
    path.join(corpus, 'payments.json'),
    JSON.stringify({
      domain: 'payments',
      title: 'Payments Domain',
      blurb: 'Test blurb.',
      locale: 'en',
      provenance: 'owner-authored',
      entries: [
        { term: 'interchange', gloss: 'G.', context: 'C.', usage: 'U.', related: [] },
        { term: 'mandate', gloss: 'G.', context: 'C.', usage: 'U.', related: [] },
        { term: 'settlement', gloss: 'G.', context: 'C.', usage: 'U.', related: [] },
        { term: 'chargeback', gloss: 'G.', context: 'C.', usage: 'U.', related: [] },
      ],
    }),
  );
  fs.writeFileSync(
    path.join(corpus, 'wordkey.config.json'),
    JSON.stringify({ mode: 'serve', title: 'WordKey — test', owner: 'Tester', blurb: 'Blurb.' }),
  );
  return { dist, corpus };
}

let dist: string;
let corpus: string;

beforeEach(() => {
  ({ dist, corpus } = buildFixture());
});

afterEach(() => {
  fs.rmSync(path.dirname(dist), { recursive: true, force: true });
});

describe('WordKey Hono server (#118)', () => {
  it('serves the static shell at /', async () => {
    const app = createApp({ staticDir: dist, corpusDir: corpus, version: '1.0.0' });
    const res = await app.request('/');
    expect(res.status).toBe(200);
    expect(await res.text()).toContain('shell');
  });

  it('serves the mounted corpus over /corpus/*', async () => {
    const app = createApp({ staticDir: dist, corpusDir: corpus, version: '1.0.0' });
    const res = await app.request('/corpus/manifest.json');
    expect(res.status).toBe(200);
    const manifest = await res.json();
    expect(manifest.domains).toEqual(['payments']);
  });

  it('serves the mounted config at /wordkey.config.json', async () => {
    const app = createApp({ staticDir: dist, corpusDir: corpus, version: '1.0.0' });
    const res = await app.request('/wordkey.config.json');
    expect(res.status).toBe(200);
    const config = await res.json();
    expect(config.owner).toBe('Tester');
  });

  it('renders agent artifacts per request from the corpus', async () => {
    const app = createApp({ staticDir: dist, corpusDir: corpus, version: '1.0.0' });
    const md = await (await app.request('/vocab.md')).text();
    expect(md).toContain('# WordKey — test');
    expect(md).toContain('by Tester');
    expect(md).toContain('### interchange');
    const json = await (await app.request('/vocab.json')).json();
    expect(json.domains).toHaveLength(1);
    const domainMd = await (await app.request('/vocab/payments.md')).text();
    expect(domainMd).toContain('### mandate');
  });

  it('404s unknown per-domain artifacts', async () => {
    const app = createApp({ staticDir: dist, corpusDir: corpus, version: '1.0.0' });
    const res = await app.request('/vocab/unknown.md');
    expect(res.status).toBe(404);
  });

  it('reports health with corpus count', async () => {
    const app = createApp({ staticDir: dist, corpusDir: corpus, version: '1.0.0' });
    const res = await app.request('/api/health');
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: 'ok', corpus: 1 });
  });

  it('sets security headers on responses', async () => {
    const app = createApp({ staticDir: dist, corpusDir: corpus, version: '1.0.0' });
    const res = await app.request('/');
    expect(res.headers.get('x-frame-options')).toBe('DENY');
    expect(res.headers.get('x-content-type-options')).toBe('nosniff');
  });

  it('falls back to the static bundle when no corpus is mounted', async () => {
    const emptyCorpus = fs.mkdtempSync(path.join(os.tmpdir(), 'wordkey-nocorpus-'));
    const app = createApp({ staticDir: dist, corpusDir: emptyCorpus, version: '1.0.0' });
    const res = await app.request('/');
    expect(res.status).toBe(200);
    const health = await (await app.request('/api/health')).json();
    expect(health.corpus).toBe(0);
    fs.rmSync(emptyCorpus, { recursive: true, force: true });
  });
});
