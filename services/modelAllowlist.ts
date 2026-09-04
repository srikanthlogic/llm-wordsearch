// Client-side view of the proxy's community model allowlist (#56).
//
// The deployment's allowlist (COMMUNITY_MODEL_NAME / COMMUNITY_ALLOWED_MODELS)
// is server-side config the client cannot know at build time, and a stale
// saved model gets rejected with a 400 before generation even starts. This
// module fetches the allowlist once per session (GET /allowed-models),
// caches it, and aligns the saved community model to something the proxy
// will accept.

const ENDPOINT = `${process.env.LLM_PROXY_URL || '/api/llm-proxy'}/allowed-models`;

export interface AllowedCommunityModels {
  models: string[];
  default: string;
}

let cache: AllowedCommunityModels | null = null;
let inflight: Promise<AllowedCommunityModels | null> | null = null;

async function fetchOnce(): Promise<AllowedCommunityModels | null> {
  try {
    const response = await fetch(ENDPOINT);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const data = await response.json();
    if (
      !data ||
      !Array.isArray(data.models) ||
      data.models.length === 0 ||
      data.models.some((m: unknown) => typeof m !== 'string') ||
      typeof data.default !== 'string'
    ) {
      throw new Error('Malformed allowed-models payload');
    }
    cache = { models: data.models, default: data.default };
    return cache;
  } catch (error) {
    console.warn('Could not load the community model allowlist:', error);
    return null;
  }
}

// Fetch (and memoize) the allowlist. Concurrent callers share one request;
// a failed attempt is not cached, so the next call retries.
export function getAllowedCommunityModels(): Promise<AllowedCommunityModels | null> {
  if (cache) return Promise.resolve(cache);
  if (!inflight) {
    inflight = fetchOnce().finally(() => {
      inflight = null;
    });
  }
  return inflight;
}

// Returns `model` unchanged when it is on the server allowlist (or when the
// allowlist cannot be loaded — never block generation on a diagnostic);
// otherwise the server's default community model.
export async function alignCommunityModel(model: string): Promise<string> {
  const allowed = await getAllowedCommunityModels();
  if (!allowed) return model;
  return allowed.models.includes(model) ? model : allowed.default;
}
