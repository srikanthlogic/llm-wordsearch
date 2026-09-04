import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  alignCommunityModel,
  getAllowedCommunityModels,
} from '../../services/modelAllowlist';

// The module caches per session, so every test gets a fresh instance.
async function freshModule() {
  vi.resetModules();
  return await import('../../services/modelAllowlist');
}

const PAYLOAD = {
  models: ['vendor/allowed-a', 'vendor/allowed-b'],
  default: 'vendor/allowed-a',
};

function mockFetchOnce(overrides: { status?: number; payload?: unknown } = {}) {
  const fetchMock = vi.fn().mockResolvedValue(
    new Response(JSON.stringify(overrides.payload ?? PAYLOAD), {
      status: overrides.status ?? 200,
      headers: { 'content-type': 'application/json' },
    })
  );
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

describe('modelAllowlist', () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('fetches and caches the allowlist — concurrent/repeat calls share one request', async () => {
    const mod = await freshModule();
    const fetchMock = mockFetchOnce();

    const [first, second] = await Promise.all([
      mod.getAllowedCommunityModels(),
      mod.getAllowedCommunityModels(),
    ]);
    const third = await mod.getAllowedCommunityModels();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe('/api/llm-proxy/allowed-models');
    expect(first).toEqual(PAYLOAD);
    expect(second).toEqual(PAYLOAD);
    expect(third).toEqual(PAYLOAD);
  });

  it('aligns a stale saved model to the server default (#56 regression)', async () => {
    const mod = await freshModule();
    mockFetchOnce();

    const aligned = await mod.alignCommunityModel('google/gemini-2.5-flash:free');
    expect(aligned).toBe('vendor/allowed-a');
  });

  it('keeps a model that is on the allowlist', async () => {
    const mod = await freshModule();
    mockFetchOnce();

    const aligned = await mod.alignCommunityModel('vendor/allowed-b');
    expect(aligned).toBe('vendor/allowed-b');
  });

  it('returns the model unchanged when the endpoint fails — never block generation', async () => {
    const mod = await freshModule();
    mockFetchOnce({ status: 500 });

    expect(await mod.alignCommunityModel('google/gemini-2.5-flash:free')).toBe(
      'google/gemini-2.5-flash:free'
    );
    expect(await mod.getAllowedCommunityModels()).toBeNull();

    // A failed attempt is not cached: the next call retries the endpoint.
    mockFetchOnce();
    expect(await mod.alignCommunityModel('google/gemini-2.5-flash:free')).toBe('vendor/allowed-a');
  });

  it('rejects a malformed payload instead of trusting it', async () => {
    const mod = await freshModule();
    mockFetchOnce({ payload: { models: 'not-an-array', default: 'x' } });

    expect(await mod.getAllowedCommunityModels()).toBeNull();
    expect(await mod.alignCommunityModel('whatever')).toBe('whatever');
  });
});

// Type-level guard: the public surface used by geminiService/SettingsView.
describe('modelAllowlist public surface', () => {
  it('exports the functions consumers rely on', async () => {
    expect(typeof alignCommunityModel).toBe('function');
    expect(typeof getAllowedCommunityModels).toBe('function');
  });
});
