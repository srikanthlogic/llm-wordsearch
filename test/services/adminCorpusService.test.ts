// @vitest-environment node
import fs from 'fs';
import os from 'os';
import path from 'path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  checkAdminEnabled,
  handleAdminCorpus,
  resetRateLimit,
} from '../../services/adminCorpusService';

const TOKEN = 'unit-test-admin-token';
const GIT_ENV = { adminToken: TOKEN, githubToken: 'gh-token', githubRepo: 'owner/repo', githubBranch: 'main' };

function validDomainBody(domain = 'payments') {
  return {
    domain,
    title: 'Payments Domain',
    blurb: 'Blurb.',
    locale: 'en',
    provenance: 'owner-authored',
    entries: [
      { term: 'interchange', gloss: 'G1.', context: 'C1.', usage: 'U1.', related: [] },
      { term: 'mandate', gloss: 'G2.', context: 'C2.', usage: 'U2.', related: [] },
      { term: 'settlement', gloss: 'G3.', context: 'C3.', usage: 'U3.', related: [] },
      { term: 'chargeback', gloss: 'G4.', context: 'C4.', usage: 'U4.', related: [] },
    ],
  };
}

function post(body: unknown, token: string | null = TOKEN) {
  return new Request('https://wordkey.test/api/admin/corpus', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  resetRateLimit();
});

describe('handleAdminCorpus — fail closed (#122)', () => {
  it('404s every method when ADMIN_TOKEN is unset', async () => {
    const env = { githubToken: 'gh', githubRepo: 'o/r' };
    expect(checkAdminEnabled(env).enabled).toBe(false);
    expect((await handleAdminCorpus(new Request('https://x', { method: 'GET' }), env)).status).toBe(404);
    expect((await handleAdminCorpus(post(validDomainBody(), null), env)).status).toBe(404);
  });

  it('reports enabled + backend on GET when configured', async () => {
    const res = await handleAdminCorpus(new Request('https://x'), GIT_ENV);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ enabled: true, backend: 'github' });
  });

  it('selects the local backend when a writable corpus dir is provided', () => {
    expect(
      checkAdminEnabled({ adminToken: TOKEN, corpusDir: '/app/corpus' }, { version: '1', writeFile: () => {} }),
    ).toEqual({ enabled: true, backend: 'local' });
  });
});

describe('handleAdminCorpus — auth + validation', () => {
  it('401s a wrong token', async () => {
    const res = await handleAdminCorpus(post(validDomainBody(), 'nope'), GIT_ENV);
    expect(res.status).toBe(401);
  });

  it('400s a payload the strict validator rejects', async () => {
    const bad = validDomainBody();
    (bad as any).entries = [{ term: 'not grid safe', gloss: 'g', context: 'c', usage: 'u', related: [] }];
    const res = await handleAdminCorpus(post(bad), GIT_ENV);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('invalid');
    expect(body.errors.length).toBeGreaterThan(0);
  });

  it('rate-limits bursts of publishes', async () => {
    resetRateLimit();
    const fetchMock = vi.fn().mockResolvedValue(new Response('{}', { status: 201 }));
    vi.stubGlobal('fetch', fetchMock);
    for (let i = 0; i < 10; i++) {
      const res = await handleAdminCorpus(post(validDomainBody(`domain${i}`)), GIT_ENV);
      expect(res.status).toBe(200);
    }
    const limited = await handleAdminCorpus(post(validDomainBody('one-more')), GIT_ENV);
    expect(limited.status).toBe(429);
    vi.unstubAllGlobals();
  });

  // #161: the rate limiter used to run before the token check, so ~10
  // unauthenticated POSTs per minute could lock the owner out entirely.
  it('does not let unauthenticated POSTs consume the rate-limit window (#161)', async () => {
    resetRateLimit();
    const fetchMock = vi.fn().mockResolvedValue(new Response('{}', { status: 201 }));
    vi.stubGlobal('fetch', fetchMock);
    for (let i = 0; i < 15; i++) {
      const res = await handleAdminCorpus(post(validDomainBody('payments'), 'nope'), GIT_ENV);
      expect(res.status).toBe(401);
    }
    const owned = await handleAdminCorpus(post(validDomainBody()), GIT_ENV);
    expect(owned.status).toBe(200);
    vi.unstubAllGlobals();
  });
});

describe('handleAdminCorpus — local backend', () => {
  let corpusDir: string;
  const writeFile = vi.fn();

  beforeEach(() => {
    corpusDir = fs.mkdtempSync(path.join(os.tmpdir(), 'wordkey-admin-'));
    writeFile.mockClear();
  });

  afterEach(() => {
    fs.rmSync(corpusDir, { recursive: true, force: true });
  });

  it('writes the corpus file into the mounted directory', async () => {
    writeFile.mockImplementation((p, c) => fs.writeFileSync(p, c, 'utf8'));
    const runtime = { version: '1', writeFile };
    const res = await handleAdminCorpus(post(validDomainBody()), { adminToken: TOKEN, corpusDir }, runtime);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.backend).toBe('local');
    const written = JSON.parse(fs.readFileSync(path.join(corpusDir, 'payments.json'), 'utf8'));
    expect(written.entries).toHaveLength(4);
  });

  it('500s when the write throws', async () => {
    const runtime = { version: '1', writeFile: () => { throw new Error('disk full'); } };
    const res = await handleAdminCorpus(post(validDomainBody()), { adminToken: TOKEN, corpusDir }, runtime);
    expect(res.status).toBe(500);
  });
});

describe('handleAdminCorpus — git backend', () => {
  it('creates a new file (no existing sha) via the Contents API', async () => {
    const fetchMock = vi.fn().mockImplementation((url: any) => {
      if (String(url).includes('payments.json?ref=')) {
        return Promise.resolve(new Response('not found', { status: 404 }));
      }
      return Promise.resolve(new Response(JSON.stringify({ commit: { sha: 'abc' } }), { status: 201 }));
    });
    vi.stubGlobal('fetch', fetchMock);

    const res = await handleAdminCorpus(post(validDomainBody()), GIT_ENV);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, backend: 'github', path: 'corpus/payments.json' });

    const [, putInit] = fetchMock.mock.calls[1];
    const putBody = JSON.parse(putInit.body);
    expect(putBody.branch).toBe('main');
    expect(putBody.sha).toBeUndefined();
    expect(atob(putBody.content)).toContain('"domain": "payments"');
    vi.unstubAllGlobals();
  });

  it('updates an existing file with its sha, and surfaces 409 conflicts', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ sha: 'existing-sha' }), { status: 200 }))
      .mockResolvedValueOnce(new Response('conflict', { status: 409 }));
    vi.stubGlobal('fetch', fetchMock);

    const res = await handleAdminCorpus(post(validDomainBody()), GIT_ENV);
    expect(res.status).toBe(409);
    const [, putInit] = fetchMock.mock.calls[1];
    expect(JSON.parse(putInit.body).sha).toBe('existing-sha');
    vi.unstubAllGlobals();
  });
});
