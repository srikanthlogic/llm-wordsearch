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

describe('checkRateLimit (KV-backed)', () => {
  beforeEach(() => {
    mockIncr.mockReset();
    mockPexpire.mockReset();
    mockPttl.mockReset();
  });

  it('returns allowed=true with full remaining on a fresh key', async () => {
    mockIncr.mockResolvedValueOnce(1);
    mockPexpire.mockResolvedValueOnce(1);
    mockPttl.mockResolvedValueOnce(60_000);

    const result = await checkRateLimit('1.1.1.1');

    expect(result).toEqual({
      allowed: true,
      remaining: 14,
      resetIn: 60_000,
    });
    expect(mockIncr).toHaveBeenCalledWith('rl:1.1.1.1');
    expect(mockPexpire).toHaveBeenCalledWith('rl:1.1.1.1', 60_000);
  });

  it('returns allowed=true with decremented remaining on increment within window', async () => {
    mockIncr.mockResolvedValueOnce(7);
    mockPttl.mockResolvedValueOnce(42_000);

    const result = await checkRateLimit('1.1.1.1');

    expect(result).toEqual({
      allowed: true,
      remaining: 8,
      resetIn: 42_000,
    });
    // pexpire should NOT be re-applied mid-window
    expect(mockPexpire).not.toHaveBeenCalled();
  });

  it('returns allowed=false when count exceeds the cap', async () => {
    mockIncr.mockResolvedValueOnce(16);
    mockPttl.mockResolvedValueOnce(15_000);

    const result = await checkRateLimit('1.1.1.1');

    expect(result).toEqual({
      allowed: false,
      remaining: 0,
      resetIn: 15_000,
    });
  });

  it('returns allowed=true with full remaining when counter is at the boundary', async () => {
    mockIncr.mockResolvedValueOnce(15);
    mockPttl.mockResolvedValueOnce(20_000);

    const result = await checkRateLimit('1.1.1.1');

    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(0);
  });

  it('treats pttl=-1 (no TTL set) as full window', async () => {
    mockIncr.mockResolvedValueOnce(1);
    mockPexpire.mockResolvedValueOnce(1);
    mockPttl.mockResolvedValueOnce(-1);

    const result = await checkRateLimit('1.1.1.1');

    expect(result.allowed).toBe(true);
    expect(result.resetIn).toBe(60_000);
  });

  it('floors resetIn to 0 when pttl is non-positive', async () => {
    mockIncr.mockResolvedValueOnce(16);
    mockPttl.mockResolvedValueOnce(-2);

    const result = await checkRateLimit('1.1.1.1');

    expect(result.resetIn).toBe(0);
  });

  it('uses the IP as the namespacing key', async () => {
    mockIncr.mockResolvedValueOnce(1);
    mockPexpire.mockResolvedValueOnce(1);
    mockPttl.mockResolvedValueOnce(60_000);

    await checkRateLimit('203.0.113.42');

    expect(mockIncr).toHaveBeenCalledWith('rl:203.0.113.42');
  });
});

describe('formatRateLimitHeaders', () => {
  it('emits the standard rate-limit headers on allowed response', () => {
    const headers = formatRateLimitHeaders({
      allowed: true,
      remaining: 9,
      resetIn: 42_000,
    });

    expect(headers['X-RateLimit-Limit']).toBe('15');
    expect(headers['X-RateLimit-Remaining']).toBe('9');
    expect(headers['X-RateLimit-Reset']).toBe('42');
    expect(headers['Retry-After']).toBeUndefined();
  });

  it('includes Retry-After on rejected response, rounded up', () => {
    const headers = formatRateLimitHeaders({
      allowed: false,
      remaining: 0,
      resetIn: 12_500,
    });

    expect(headers['X-RateLimit-Remaining']).toBe('0');
    expect(headers['Retry-After']).toBe('13');
  });
});
