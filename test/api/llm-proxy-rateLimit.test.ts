import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock @vercel/kv before importing the module under test
const mockIncr = vi.fn();
const mockPexpire = vi.fn();
const mockPttl = vi.fn();

vi.mock('@vercel/kv', () => ({
  kv: {
    incr: (...args: unknown[]) => mockIncr(...args),
    pexpire: (...args: unknown[]) => mockPexpire(...args),
    pttl: (...args: unknown[]) => mockPttl(...args),
  },
}));

// Mock the config module so tests are deterministic
vi.mock('../../api/llm-proxy/config', () => ({
  RATE_LIMIT_WINDOW_MS: 60_000,
  RATE_LIMIT_MAX_REQUESTS: 15,
}));

import { checkRateLimit, formatRateLimitHeaders } from '../../api/llm-proxy/rateLimit';

const RATE_LIMIT = 15;
const WINDOW = 60_000;

describe('checkRateLimit (KV-backed)', () => {
  beforeEach(() => {
    mockIncr.mockReset();
    mockPexpire.mockReset();
    mockPttl.mockReset();
  });

  it('returns allowed=true with full remaining on a fresh key', async () => {
    mockIncr.mockResolvedValueOnce(1);
    mockPttl.mockResolvedValueOnce(WINDOW);

    const result = await checkRateLimit('1.1.1.1');

    expect(result).toEqual({
      allowed: true,
      remaining: RATE_LIMIT - 1,
      resetIn: WINDOW,
      limit: RATE_LIMIT,
    });
    expect(mockIncr).toHaveBeenCalledWith('rl:1.1.1.1');
    expect(mockPexpire).toHaveBeenCalledWith('rl:1.1.1.1', WINDOW);
  });

  it('returns allowed=true with decremented remaining on increment within window', async () => {
    mockIncr.mockResolvedValueOnce(7);
    mockPttl.mockResolvedValueOnce(42_000);

    const result = await checkRateLimit('1.1.1.1');

    expect(result).toEqual({
      allowed: true,
      remaining: RATE_LIMIT - 7,
      resetIn: 42_000,
      limit: RATE_LIMIT,
    });
    // PEXPIRE is only called on the first hit of a window.
    expect(mockPexpire).not.toHaveBeenCalled();
  });

  it('returns allowed=false when count exceeds the cap', async () => {
    mockIncr.mockResolvedValueOnce(RATE_LIMIT + 1);
    mockPttl.mockResolvedValueOnce(10_000);

    const result = await checkRateLimit('1.1.1.1');

    expect(result).toEqual({
      allowed: false,
      remaining: 0,
      resetIn: 10_000,
      limit: RATE_LIMIT,
    });
  });

  it('returns allowed=true with full remaining when counter is at the boundary', async () => {
    mockIncr.mockResolvedValueOnce(RATE_LIMIT);
    mockPttl.mockResolvedValueOnce(5_000);

    const result = await checkRateLimit('1.1.1.1');

    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(0);
    expect(result.resetIn).toBe(5_000);
  });

  it('treats pttl=-1 (no TTL set) as full window and re-sets the TTL', async () => {
    mockIncr.mockResolvedValueOnce(3);
    mockPttl.mockResolvedValueOnce(-1);

    const result = await checkRateLimit('1.1.1.1');

    // -1 means the key has no expiry, so we treat resetIn as a full window
    // and try to set the TTL again (defensive: a previous pexpire may have
    // been lost to a race or eviction).
    expect(result.resetIn).toBe(WINDOW);
    expect(mockPexpire).toHaveBeenCalledWith('rl:1.1.1.1', WINDOW);
  });

  it('treats pttl=-2 (key missing) as full window', async () => {
    mockIncr.mockResolvedValueOnce(3);
    mockPttl.mockResolvedValueOnce(-2);

    const result = await checkRateLimit('1.1.1.1');

    expect(result.resetIn).toBe(WINDOW);
  });

  it('returns resetIn=0 when pttl is exactly 0 (window just elapsed)', async () => {
    mockIncr.mockResolvedValueOnce(5);
    mockPttl.mockResolvedValueOnce(0);

    const result = await checkRateLimit('1.1.1.1');

    expect(result.resetIn).toBe(0);
  });

  it('uses the IP as the namespacing key', async () => {
    mockIncr.mockResolvedValueOnce(1);
    mockPttl.mockResolvedValueOnce(WINDOW);

    await checkRateLimit('203.0.113.7');

    expect(mockIncr).toHaveBeenCalledWith('rl:203.0.113.7');
  });
});

describe('formatRateLimitHeaders', () => {
  it('emits the standard rate-limit headers on allowed response', () => {
    const headers = formatRateLimitHeaders({
      allowed: true,
      limit: RATE_LIMIT,
      remaining: 9,
      resetIn: 42_000,
    });

    expect(headers['X-RateLimit-Limit']).toBe(String(RATE_LIMIT));
    expect(headers['X-RateLimit-Remaining']).toBe('9');
    expect(headers['X-RateLimit-Reset']).toBe('42');
    expect(headers['Retry-After']).toBeUndefined();
  });

  it('includes Retry-After on rejected response, rounded up to at least 1', () => {
    const headers = formatRateLimitHeaders({
      allowed: false,
      limit: RATE_LIMIT,
      remaining: 0,
      resetIn: 12_500,
    });

    expect(headers['Retry-After']).toBe('13');
  });

  it('floors Retry-After to 1 when resetIn rounds down to 0', () => {
    const headers = formatRateLimitHeaders({
      allowed: false,
      limit: RATE_LIMIT,
      remaining: 0,
      resetIn: 400,
    });

    expect(headers['Retry-After']).toBe('1');
  });
});
