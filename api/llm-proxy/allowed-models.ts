// GET /api/llm-proxy/allowed-models — the server-configured community model
// allowlist (#17), exposed so the client can offer only models the proxy
// will actually accept (#56). Read-only, no auth required: the same data is
// already disclosed by a rejected request's error message.

import { corsHeaders, preflightHeaders } from './cors.js';
import { buildAllowedModels, resolveRequestedModel } from './models.js';

// Read at request time (not module load) so deployments pick up env changes
// without a cold start and tests can stub env per call.
function getProxyEnv() {
  return {
    communityModelName: process.env.COMMUNITY_MODEL_NAME,
    communityAllowedModels: process.env.COMMUNITY_ALLOWED_MODELS,
    languageModelMap: process.env.LANGUAGE_MODEL_MAP,
  };
}

export async function GET(request: Request) {
  const models = Array.from(buildAllowedModels(getProxyEnv())).sort();
  const defaultModel = resolveRequestedModel(undefined, getProxyEnv());

  return new Response(
    JSON.stringify({ models, default: defaultModel }),
    {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders(request),
      },
    }
  );
}

// CORS preflight
export async function OPTIONS(request: Request) {
  return new Response(null, {
    status: 200,
    headers: preflightHeaders(request),
  });
}
