import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Handler tests for GET /api/llm-proxy/allowed-models (#56). The route reads
// env at request time via models.ts, so plain env stubs (no module mocking)
// drive it.
import { GET, OPTIONS } from '../../api/llm-proxy/allowed-models';

function request(headers: Record<string, string> = {}): Request {
  return new Request('https://example.com/api/llm-proxy/allowed-models', { headers });
}

describe('allowed-models GET', () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('returns the deployment default as the single allowed model', async () => {
    vi.stubEnv('COMMUNITY_MODEL_NAME', 'vendor/only-model');
    vi.stubEnv('COMMUNITY_ALLOWED_MODELS', '');
    vi.stubEnv('LANGUAGE_MODEL_MAP', '');

    const res = await GET(request());
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data).toEqual({ models: ['vendor/only-model'], default: 'vendor/only-model' });
  });

  it('includes COMMUNITY_ALLOWED_MODELS extras and LANGUAGE_MODEL_MAP models, sorted', async () => {
    vi.stubEnv('COMMUNITY_MODEL_NAME', 'vendor/base-model');
    vi.stubEnv('COMMUNITY_ALLOWED_MODELS', 'vendor/extra-b, vendor/extra-a');
    vi.stubEnv('LANGUAGE_MODEL_MAP', JSON.stringify({ es: { model: 'vendor/es-model' } }));

    const res = await GET(request());
    const data = await res.json();

    expect(data.models).toEqual([
      'vendor/base-model',
      'vendor/es-model',
      'vendor/extra-a',
      'vendor/extra-b',
    ]);
    expect(data.default).toBe('vendor/base-model');
  });

  it('falls back to the built-in default when env is unset', async () => {
    vi.stubEnv('COMMUNITY_MODEL_NAME', '');
    vi.stubEnv('COMMUNITY_ALLOWED_MODELS', '');
    vi.stubEnv('LANGUAGE_MODEL_MAP', '');

    const res = await GET(request());
    const data = await res.json();

    expect(data.models).toContain('google/gemini-2.5-flash');
    expect(data.default).toBe('google/gemini-2.5-flash');
  });

  it('sends CORS headers for allowed origins', async () => {
    const res = await GET(request({ origin: 'https://llm-wordsearch.vercel.app' }));
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('https://llm-wordsearch.vercel.app');
  });

  it('answers preflight with the shared CORS policy', async () => {
    const res = await OPTIONS(request({ origin: 'http://localhost:5173' }));
    expect(res.status).toBe(200);
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('http://localhost:5173');
    expect(res.headers.get('Access-Control-Allow-Methods')).toContain('GET');
    expect(res.headers.get('Access-Control-Allow-Headers')).toContain('Content-Type');
  });
});
