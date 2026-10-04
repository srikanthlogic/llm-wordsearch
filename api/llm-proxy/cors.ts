// Shared CORS policy for the llm-proxy routes. Single source of truth so
// every route in this directory answers origins identically.

const DEFAULT_ORIGIN = 'https://llm-wordsearch.vercel.app';

const ALLOWED_ORIGINS = [
  DEFAULT_ORIGIN,
  'https://llm-wordsearch-git-*.vercel.app', // Preview deployments
  'http://localhost:5173', // Local development
];

// #162: trust only the PARSED hostname for the localhost dev shortcut — a
// startsWith on the raw string also matched attacker hosts like
// http://localhost:5173.evil.com.
function isLocalDevOrigin(origin: string): boolean {
  try {
    const url = new URL(origin);
    return (
      (url.protocol === 'http:' || url.protocol === 'https:') &&
      (url.hostname === 'localhost' || url.hostname === '127.0.0.1')
    );
  } catch {
    return false;
  }
}

// #162: wildcard entries must match the WHOLE origin, with '*' spanning a
// single DNS label. The old unanchored, unescaped '.*' substring test
// reflected attacker origins like
// https://llm-wordsearch-git-x.vercel.app.evil.com.
function matchesWildcard(pattern: string, origin: string): boolean {
  const escaped = pattern
    .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    .replace(/\\\*/g, '[^.]+');
  return new RegExp(`^${escaped}$`).test(origin);
}

export function getAllowedOrigin(request: Request): string {
  const origin = request.headers.get('origin');
  if (!origin) return DEFAULT_ORIGIN;
  // Allow all localhost ports for development
  if (isLocalDevOrigin(origin)) {
    return origin;
  }
  // Check against allowed origins
  for (const allowed of ALLOWED_ORIGINS) {
    if (allowed.includes('*')) {
      if (matchesWildcard(allowed, origin)) {
        return origin;
      }
    } else if (origin === allowed) {
      return origin;
    }
  }
  // Default: return first production origin
  return DEFAULT_ORIGIN;
}

export function corsHeaders(request: Request): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': getAllowedOrigin(request),
  };
}

export function preflightHeaders(request: Request): Record<string, string> {
  return {
    ...corsHeaders(request),
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };
}
