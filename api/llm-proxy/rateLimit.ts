// Server-side rate limit for the LLM proxy, backed by Upstash Redis
// (REST client — works on the Vercel Edge runtime).
//
// Why Redis: the proxy is a Vercel Edge Function. Cold starts spin up new
// instances and individual requests are routed arbitrarily, so an in-process
// Map is shared only by requests that happen to land on the same isolate for
// the same lifetime. A shared counter per IP survives across instances and
// across cold starts.
//
// Algorithm: fixed-window counter, sequential REST calls.
//   key   = "rl:<ip>"
//   count = INCR key                       (returns new value, atomic)
//   if count == 1: PEXPIRE key windowMs    (set ms TTL on first hit only)
//   ttl   = PTTL key                       (ms remaining; -1 = no TTL,
//                                           -2 = key missing)
//   allowed  = count <= maxRequests
//   remaining = max(0, maxRequests - count)
//   resetIn  = max(0, ttl)
//
// These are three sequential round-trips (the REST client has no atomic
// first-hit EXPIRE variant). The TTL is only set on the first hit so
// subsequent INCRs don't keep extending the reset (which would be a sliding
// window in disguise and would weaken the cap). PTTL is read separately
// because the INCR reply already gives us the new count.

import { Redis } from '@upstash/redis';

import {
  RATE_LIMIT_MAX_REQUESTS,
  RATE_LIMIT_WINDOW_MS,
} from './config.js';

// Vercel KV provisioned stores under KV_REST_API_*; native Upstash
// integrations use UPSTASH_REDIS_REST_*. Accept both so either deployment
// path works without code changes.
const KV_URL =
  process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL;
const KV_TOKEN =
  process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN;

const kv = new Redis({ url: KV_URL ?? '', token: KV_TOKEN ?? '' });

export function isRateLimitConfigured(): boolean {
  return Boolean(KV_URL && KV_TOKEN);
}

let warnedUnconfigured = false;

function warnUnconfiguredOnce(): void {
  if (warnedUnconfigured) return;
  warnedUnconfigured = true;
  console.error(
    'Rate limit store is not configured (set KV_REST_API_URL and ' +
      'KV_REST_API_TOKEN, or the UPSTASH_REDIS_REST_* equivalents). ' +
      'Running WITHOUT a rate limit until then.'
  );
}

// Used when the store is unavailable: fail open so a storage outage degrades
// to "unthrottled" instead of failing every proxy request with a 500.
function unlimited(): RateLimitResult {
  return {
    allowed: true,
    remaining: RATE_LIMIT_MAX_REQUESTS,
    resetIn: 0,
    limit: RATE_LIMIT_MAX_REQUESTS,
  };
}

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
  if (!isRateLimitConfigured()) {
    warnUnconfiguredOnce();
    return unlimited();
  }

  const key = namespacedKey(ip);

  let count: number;
  let pttl: number;
  try {
    count = await kv.incr(key);
  } catch (error) {
    console.error('Rate limit store unavailable — allowing request uncounted.', error);
    return unlimited();
  }

  // Set TTL only on the first hit. Subsequent INCRs leave the expiry alone
  // so the window stays fixed.
  if (count === 1) {
    try {
      await kv.pexpire(key, RATE_LIMIT_WINDOW_MS);
    } catch (error) {
      console.error('Rate limit store unavailable during PEXPIRE.', error);
      return unlimited();
    }
  }

  try {
    pttl = await kv.pttl(key);
  } catch (error) {
    console.error('Rate limit store unavailable during PTTL.', error);
    return unlimited();
  }

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
    try {
      await kv.pexpire(key, RATE_LIMIT_WINDOW_MS);
    } catch (error) {
      console.error('Rate limit store unavailable during TTL re-arm.', error);
      return unlimited();
    }
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
