// Server-side rate limit for the LLM proxy, backed by Vercel KV.
//
// Why KV: the proxy is a Vercel Edge Function. Cold starts spin up new
// instances and individual requests are routed arbitrarily, so an in-process
// Map is shared only by requests that happen to land on the same isolate for
// the same lifetime. KV gives us a single counter per IP that survives across
// instances and across cold starts.
//
// Algorithm: fixed-window counter.
//   key   = "rl:<ip>"
//   count = INCR key                       (returns new value, atomic)
//   if count == 1: EXPIRE key  windowMs    (set TTL on first hit only)
//   ttl   = PTTL key                       (ms remaining; -1 = no TTL,
//                                           -2 = key missing)
//   allowed  = count <= maxRequests
//   remaining = max(0, maxRequests - count)
//   resetIn  = max(0, ttl)
//
// We pipeline the EXPIRE behind the INCR so the network round-trip cost is
// at most one extra command on the first hit in each window. The TTL is
// only set on the first hit so subsequent INCRs don't keep extending the
// reset (which would be a sliding window in disguise and would weaken the
// cap). PTTL is read separately because the pipeline return value already
// gives us the new count.

import { kv } from '@vercel/kv';

import {
  RATE_LIMIT_MAX_REQUESTS,
  RATE_LIMIT_WINDOW_MS,
} from './config.js';

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetIn: number;
  limit: number;
}

function namespacedKey(ip: string): string {
  return `rl:${ip}`;
}

export async function checkRateLimit(ip: string): Promise<RateLimitResult> {
  const key = namespacedKey(ip);
  const count = await kv.incr(key);

  // Set TTL only on the first hit. Subsequent INCRs leave the expiry alone
  // so the window stays fixed.
  if (count === 1) {
    await kv.pexpire(key, RATE_LIMIT_WINDOW_MS);
  }

  const pttl = await kv.pttl(key);

  // -2 = key missing (shouldn't happen after a successful INCR, but defend
  // against a race where the key was evicted between calls), -1 = no TTL.
  // In both fall-throughs, treat as a full window remaining rather than
  // panicking — the next call will set the TTL.
  let resetIn: number;
  if (pttl < 0) {
    resetIn = RATE_LIMIT_WINDOW_MS;
    // The key has no usable TTL: it is missing (-2, e.g. evicted between
    // INCR and PTTL) or exists without an expiry (-1). Re-arm it on every
    // such observation so the window can never become immortal — a counter
    // with count > 1 and no TTL would block the IP forever once capped.
    await kv.pexpire(key, RATE_LIMIT_WINDOW_MS);
  } else {
    resetIn = pttl;
  }

  const allowed = count <= RATE_LIMIT_MAX_REQUESTS;
  const remaining = Math.max(0, RATE_LIMIT_MAX_REQUESTS - count);

  return {
    allowed,
    remaining,
    resetIn,
    limit: RATE_LIMIT_MAX_REQUESTS,
  };
}

// Standard rate-limit response headers. Single source of truth so the proxy
// can return them on both the 429 path and the 2xx path.
export function formatRateLimitHeaders(
  result: RateLimitResult
): Record<string, string> {
  return {
    'X-RateLimit-Limit': String(result.limit),
    'X-RateLimit-Remaining': String(result.remaining),
    'X-RateLimit-Reset': String(Math.ceil(result.resetIn / 1000)),
    ...(result.allowed
      ? {}
      : { 'Retry-After': String(Math.max(1, Math.ceil(result.resetIn / 1000))) }),
  };
}
