import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Handler tests for the real Vercel Edge Function (api/llm-proxy/index.ts).
//
// The previous version of this file re-implemented the handler inline and
// tested the copy — which is why index.ts sat at 0% coverage. These tests
// import the actual module. Only './rateLimit.js' is mocked (it needs Redis);
// validate.ts and models.ts run for real, driven by env stubs.

const mocks = vi.hoisted(() => ({
  checkRateLimit: vi.fn(),
  formatRateLimitHeaders: vi.fn(),
}));

vi.mock('../../api/llm-proxy/rateLimit.js', () => ({
  checkRateLimit: mocks.checkRateLimit,
  formatRateLimitHeaders: mocks.formatRateLimitHeaders,
}));

const COMMUNITY_MODEL = 'test-community-model';

function stubProxyEnv() {
  vi.stubEnv('API_KEY', 'test-api-key');
  vi.stubEnv('COMMUNITY_MODEL_NAME', COMMUNITY_MODEL);
  vi.stubEnv('COMMUNITY_ALLOWED_MODELS', '');
  vi.stubEnv('LANGUAGE_MODEL_MAP', '');
}

async function loadProxy() {
  return await import('../../api/llm-proxy/index.js');
}

function proxyRequest(body: unknown, headers: Record<string, string> = {}): Request {
  return new Request('https://example.com/api/llm-proxy', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
}

const validMessages = [
  { role: 'system', content: 'You are a helpful assistant.' },
  { role: 'user', content: 'Make me a puzzle' },
];

const providerPayload = {
  choices: [{ message: { role: 'assistant', content: 'Here is your puzzle' } }],
  usage: { prompt_tokens: 10, completion_tokens: 20, total_tokens: 30 },
};

type FetchInit = { body?: string; headers?: Record<string, string> };

async function stubProviderFetch(
  overrides: { status?: number; body?: string; headers?: Record<string, string> } = {}
) {
  const fetchMock = vi.fn(async (_url: string | URL | Request, _init?: FetchInit) =>
    new Response(overrides.body ?? JSON.stringify(providerPayload), {
      status: overrides.status ?? 200,
      headers: overrides.headers ?? { 'content-type': 'application/json' },
    })
  );
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

describe('llm-proxy POST handler', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
    vi.clearAllMocks();
    mocks.checkRateLimit.mockResolvedValue({ allowed: true, remaining: 14, resetMs: 60_000 });
    mocks.formatRateLimitHeaders.mockReturnValue({ 'X-RateLimit-Remaining': '14' });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('forwards a valid request to the provider with server-side defaults applied', async () => {
    stubProxyEnv();
    const fetchMock = await stubProviderFetch({ headers: { 'x-request-id': 'req-123', 'openai-processing-ms': '42' } });
    const proxy = await loadProxy();

    const res = await proxy.POST(proxyRequest({ messages: validMessages }));
    expect(res.status).toBe(200);

    const [url, init] = fetchMock.mock.calls[0] as [string, FetchInit];
    expect(url).toBe('https://openrouter.ai/api/v1/chat/completions');
    const headers = init.headers as Record<string, string>;
    expect(headers.Authorization).toBe('Bearer test-api-key');

    const forwarded = JSON.parse(init.body as string);
    expect(forwarded.model).toBe(COMMUNITY_MODEL);
    expect(forwarded.max_tokens).toBe(1_000);
    expect(forwarded.stream).toBe(false);
    expect(forwarded.messages).toEqual(validMessages);

    const data = await res.json();
    expect(data.choices[0].message.content).toBe('Here is your puzzle');
    expect(res.headers.get('X-Request-ID')).toBe('req-123');
  });

  it('allows a client-supplied model that is on the allowlist', async () => {
    stubProxyEnv();
    vi.stubEnv('COMMUNITY_ALLOWED_MODELS', 'vendor/other-model');
    const fetchMock = await stubProviderFetch();
    const proxy = await loadProxy();

    const res = await proxy.POST(proxyRequest({ messages: validMessages, model: 'vendor/other-model' }));
    expect(res.status).toBe(200);
    const forwarded = JSON.parse((fetchMock.mock.calls[0] as [string, FetchInit])[1].body as string);
    expect(forwarded.model).toBe('vendor/other-model');
  });

  it('rejects a model that is not on the server allowlist', async () => {
    stubProxyEnv();
    await stubProviderFetch();
    const proxy = await loadProxy();

    const res = await proxy.POST(proxyRequest({ messages: validMessages, model: 'unauthorized-model' }));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe(
      `Model "unauthorized-model" is not allowed. Permitted models: ${COMMUNITY_MODEL}`
    );
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it('returns 429 with rate limit headers when the limiter denies the request', async () => {
    stubProxyEnv();
    mocks.checkRateLimit.mockResolvedValue({ allowed: false, remaining: 0, resetMs: 30_000 });
    mocks.formatRateLimitHeaders.mockReturnValue({ 'Retry-After': '30', 'X-RateLimit-Remaining': '0' });
    const proxy = await loadProxy();

    const res = await proxy.POST(proxyRequest({ messages: validMessages }, { 'x-forwarded-for': '203.0.113.7' }));
    expect(res.status).toBe(429);
    expect(res.headers.get('Retry-After')).toBe('30');
    expect(mocks.checkRateLimit).toHaveBeenCalledWith('203.0.113.7');
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it('prefers the first IP in x-forwarded-for and falls back to x-real-ip', async () => {
    stubProxyEnv();
    await stubProviderFetch();
    const proxy = await loadProxy();

    await proxy.POST(proxyRequest({ messages: validMessages }, { 'x-forwarded-for': '198.51.100.9, 10.0.0.1' }));
    expect(mocks.checkRateLimit).toHaveBeenLastCalledWith('198.51.100.9');

    await proxy.POST(
      proxyRequest({ messages: validMessages }, { 'x-real-ip': '198.51.100.42' })
    );
    expect(mocks.checkRateLimit).toHaveBeenLastCalledWith('198.51.100.42');

    await proxy.POST(proxyRequest({ messages: validMessages }));
    expect(mocks.checkRateLimit).toHaveBeenLastCalledWith('unknown');
  });

  it('returns 500 before any spend when API_KEY is not configured', async () => {
    vi.stubEnv('API_KEY', '');
    vi.stubEnv('COMMUNITY_MODEL_NAME', COMMUNITY_MODEL);
    await stubProviderFetch();
    const proxy = await loadProxy();

    const res = await proxy.POST(proxyRequest({ messages: validMessages }));
    expect(res.status).toBe(500);
    await expect(res.json()).resolves.toEqual({ error: 'API key not configured' });
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it('returns 400 for an unparseable JSON body', async () => {
    stubProxyEnv();
    await stubProviderFetch();
    const proxy = await loadProxy();

    const res = await proxy.POST(proxyRequest('{not json'));
    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toEqual({ error: 'Request body is not valid JSON.' });
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it('returns 400 with the validation error for a contract violation', async () => {
    stubProxyEnv();
    await stubProviderFetch();
    const proxy = await loadProxy();

    const res = await proxy.POST(proxyRequest({ messages: validMessages, max_tokens: 999_999 }));
    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toEqual({
      error: `'max_tokens' exceeds the server maximum of 4000.`,
    });
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it('passes through provider error status and body', async () => {
    stubProxyEnv();
    await stubProviderFetch({ status: 502, body: 'upstream exploded' });
    const proxy = await loadProxy();

    const res = await proxy.POST(proxyRequest({ messages: validMessages }));
    expect(res.status).toBe(502);
    const data = await res.json();
    expect(data.error).toContain('LLM provider error: 502 - upstream exploded');
  });

  it('returns 500 when the provider call throws', async () => {
    stubProxyEnv();
    vi.stubGlobal('fetch', vi.fn(async () => {
      throw new Error('network down');
    }));
    const proxy = await loadProxy();

    const res = await proxy.POST(proxyRequest({ messages: validMessages }));
    expect(res.status).toBe(500);
    await expect(res.json()).resolves.toEqual({ error: 'Internal server error' });
  });

  it('sends CORS headers for allowed, wildcard-preview and disallowed origins', async () => {
    stubProxyEnv();
    await stubProviderFetch();
    const proxy = await loadProxy();

    const prod = await proxy.POST(
      proxyRequest({ messages: validMessages }, { origin: 'https://llm-wordsearch.vercel.app' })
    );
    expect(prod.headers.get('Access-Control-Allow-Origin')).toBe('https://llm-wordsearch.vercel.app');

    const preview = await proxy.POST(
      proxyRequest({ messages: validMessages }, { origin: 'https://llm-wordsearch-git-abc123.vercel.app' })
    );
    expect(preview.headers.get('Access-Control-Allow-Origin')).toBe(
      'https://llm-wordsearch-git-abc123.vercel.app'
    );

    const evil = await proxy.POST(
      proxyRequest({ messages: validMessages }, { origin: 'https://evil.example.com' })
    );
    expect(evil.headers.get('Access-Control-Allow-Origin')).toBe('https://llm-wordsearch.vercel.app');
  });
});

describe('llm-proxy GET health check', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('reports the configured community model and ok status', async () => {
    stubProxyEnv();
    const proxy = await loadProxy();

    const res = await proxy.GET(new Request('https://example.com/api/llm-proxy'));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.status).toBe('ok');
    expect(data.defaultModel).toBe(COMMUNITY_MODEL);
  });

  it('falls back to the default community model when env is unset', async () => {
    vi.stubEnv('API_KEY', 'test-api-key');
    const proxy = await loadProxy();

    const res = await proxy.GET(new Request('https://example.com/api/llm-proxy'));
    const data = await res.json();
    expect(data.defaultModel).toBe('google/gemini-2.5-flash');
  });
});

describe('llm-proxy OPTIONS preflight', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('returns CORS preflight headers', async () => {
    stubProxyEnv();
    const proxy = await loadProxy();

    const res = await proxy.options(
      new Request('https://example.com/api/llm-proxy', {
        method: 'OPTIONS',
        headers: { origin: 'http://localhost:5173' },
      })
    );
    expect(res.status).toBe(200);
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('http://localhost:5173');
    expect(res.headers.get('Access-Control-Allow-Methods')).toBe('GET, POST, OPTIONS');
    expect(res.headers.get('Access-Control-Allow-Headers')).toBe('Content-Type, Authorization');
  });
});
