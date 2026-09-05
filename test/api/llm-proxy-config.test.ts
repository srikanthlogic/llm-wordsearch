import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// config.ts evaluates env at module load, so every case re-imports a fresh
// module instance with a stubbed process.env.
async function loadConfig() {
  return await import('../../api/llm-proxy/config');
}

describe('llm-proxy config', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('falls back to defaults when env is unset', async () => {
    vi.stubEnv('RATE_LIMIT_WINDOW_MS', '');
    vi.stubEnv('RATE_LIMIT_MAX_REQUESTS', '');
    const config = await loadConfig();
    expect(config.RATE_LIMIT_WINDOW_MS).toBe(60_000);
    expect(config.RATE_LIMIT_MAX_REQUESTS).toBe(15);
  });

  it('parses valid overrides', async () => {
    vi.stubEnv('RATE_LIMIT_WINDOW_MS', '5000');
    vi.stubEnv('RATE_LIMIT_MAX_REQUESTS', '3');
    const config = await loadConfig();
    expect(config.RATE_LIMIT_WINDOW_MS).toBe(5000);
    expect(config.RATE_LIMIT_MAX_REQUESTS).toBe(3);
  });

  it.each(['abc', '0', '-10', '15requests', '3.5', '1_000', ' '])(
    'falls back to defaults for invalid %s',
    async (raw) => {
      vi.stubEnv('RATE_LIMIT_WINDOW_MS', raw);
      vi.stubEnv('RATE_LIMIT_MAX_REQUESTS', raw);
      const config = await loadConfig();
      expect(config.RATE_LIMIT_WINDOW_MS).toBe(60_000);
      expect(config.RATE_LIMIT_MAX_REQUESTS).toBe(15);
    }
  );

  it.each([
    ['1e3', 1000],
    ['0x10', 16],
    [' 5 ', 5],
  ])('accepts %s when it parses fully as an integer (%i)', async (raw, expected) => {
    vi.stubEnv('RATE_LIMIT_WINDOW_MS', raw);
    vi.stubEnv('RATE_LIMIT_MAX_REQUESTS', raw);
    const config = await loadConfig();
    expect(config.RATE_LIMIT_WINDOW_MS).toBe(expected);
    expect(config.RATE_LIMIT_MAX_REQUESTS).toBe(expected);
  });
});
