// Server-side configuration for the LLM proxy. Centralized here so the
// rate limit, model allowlist, and request validation can all read from
// the same source of truth and the values can be overridden by env vars
// without each module re-implementing the lookup.

export const RATE_LIMIT_WINDOW_MS: number = (() => {
  const raw = process.env.RATE_LIMIT_WINDOW_MS;
  const n = raw ? Number.parseInt(raw, 10) : NaN;
  return Number.isFinite(n) && n > 0 ? n : 60_000;
})();

export const RATE_LIMIT_MAX_REQUESTS: number = (() => {
  const raw = process.env.RATE_LIMIT_MAX_REQUESTS;
  const n = raw ? Number.parseInt(raw, 10) : NaN;
  return Number.isFinite(n) && n > 0 ? n : 15;
})();
