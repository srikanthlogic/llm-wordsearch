// Shared CORS policy for the llm-proxy routes. Single source of truth so
// every route in this directory answers origins identically.

const ALLOWED_ORIGINS = [
  'https://llm-wordsearch.vercel.app',
  'https://llm-wordsearch-git-*.vercel.app', // Preview deployments
  'http://localhost:5173', // Local development
];

export function getAllowedOrigin(request: Request): string {
  const origin = request.headers.get('origin');
  if (!origin) return 'https://llm-wordsearch.vercel.app';
  // Allow all localhost ports for development
  if (origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:')) {
    return origin;
  }
  // Check against allowed origins
  for (const allowed of ALLOWED_ORIGINS) {
    if (allowed.includes('*')) {
      // Wildcard matching for preview deployments
      const pattern = allowed.replace('*', '.*');
      if (new RegExp(pattern).test(origin)) {
        return origin;
      }
    } else if (origin === allowed) {
      return origin;
    }
  }
  // Default: return first production origin
  return 'https://llm-wordsearch.vercel.app';
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
