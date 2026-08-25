// Vercel KV-backed distributed rate limiting for the LLM proxy.
// Replaces the previous in-memory Map which was per-instance and reset
// on every cold start — effectively a no-op for adversarial traffic.

import { kv } from '@vercel/kv';

const WINDOW_SECONDS = 60;
const MAX_REQUESTS = 15;

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetIn: number; // milliseconds until the window resets
}

// Pure formatter — kept as a free function so it can be unit-tested
// without importing the @vercel/kv module at all.
export function formatRateLimitHeaders(result: RateLimitResult): Record<string, string> {
  return {
    'X-RateLimit-Limit': String(MAX_REQUESTS),
    'X-RateLimit-Remaining': String(Math.max(0, result.remaining)),
    'Retry-After': String(Math.ceil(result.resetIn / 1000)),
  };
}

export async function checkRateLimit(ip: string): Promise<RateLimitResult> {
  const key = `ratelimit:llm-proxy:${ip}`;
  // Atomic INCR; KV returns the new value. EXPIRE only on the first hit
  // of the window so subsequent calls don't push the reset out.
  const pipeline = kv.multi();
  pipeline.incr(key);
  pipeline.ttl(key);
  const replies = (await pipeline.exec()) as [number | null, number | null];

  const count = typeof replies[0] === 'number' ? replies[0] : 0;
  let ttl = typeof replies[1] === 'number' ? replies[1] : -1;

  if (count === 1 || ttl < 0) {
    await kv.expire(key, WINDOW_SECONDS);
    ttl = WINDOW_SECONDS;
  }

  const remaining = Math.max(0, MAX_REQUESTS - count);
  const allowed = count <= MAX_REQUESTS;
  return { allowed, remaining, resetIn: ttl * 1000 };
}
