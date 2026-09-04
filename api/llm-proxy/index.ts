// Vercel Edge Function for LLM Proxy
// This is a standalone TypeScript version that doesn't depend on Next.js

import { RATE_LIMIT_MAX_REQUESTS, RATE_LIMIT_WINDOW_MS } from './config.js';
import { corsHeaders, preflightHeaders } from './cors.js';
import { buildAllowedModels, checkModelPermission } from './models.js';
import { checkRateLimit, formatRateLimitHeaders, isRateLimitConfigured } from './rateLimit.js';
import { validateProxyRequest } from './validate.js';

function getClientIP(request: Request): string {
  // Vercel forwards the real IP in headers
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  const realIP = request.headers.get('x-real-ip');
  if (realIP) {
    return realIP.trim();
  }
  return 'unknown';
}


interface LLMProxyResponse {
  choices: Array<{
    message: {
      role: string;
      content: string;
    };
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

// Environment variables
const API_KEY = process.env.API_KEY;
const COMMUNITY_MODEL_NAME = process.env.COMMUNITY_MODEL_NAME || 'google/gemini-2.5-flash';
const LANGUAGE_MODEL_MAP = process.env.LANGUAGE_MODEL_MAP;
const COMMUNITY_ALLOWED_MODELS = process.env.COMMUNITY_ALLOWED_MODELS;

// Server-configured allowlist env for the proxy (#17)
function getProxyEnv() {
  return {
    communityModelName: COMMUNITY_MODEL_NAME,
    communityAllowedModels: COMMUNITY_ALLOWED_MODELS,
    languageModelMap: LANGUAGE_MODEL_MAP,
  };
}

// Get effective model settings based on language
function getEffectiveModelSettings(modelName: string, language?: string): { model: string; baseURL: string; provider: string } {
  let effectiveModel = modelName;
  // LLM_BASE_URL lets a deployment redirect all upstream calls (self-hosted
  // gateways, tests). Server-side trusted config — never client-supplied.
  const envBaseURL = process.env.LLM_BASE_URL?.trim();
  let effectiveBaseURL = envBaseURL || 'https://openrouter.ai/api/v1';
  let provider = envBaseURL ? 'custom' : 'openrouter';

  if (LANGUAGE_MODEL_MAP && language) {
    try {
      const languageMap = JSON.parse(LANGUAGE_MODEL_MAP);
      const overrideConfig = languageMap[language];
      if (overrideConfig && overrideConfig.model) {
        effectiveModel = overrideConfig.model;
        effectiveBaseURL = overrideConfig.baseURL || effectiveBaseURL;
        provider = overrideConfig.baseURL ? 'custom' : 'openrouter';
      }
    } catch (e) {
      console.warn('Could not parse LANGUAGE_MODEL_MAP environment variable');
    }
  }

  // The API_KEY is attached as a Bearer token to every upstream call, so
  // refuse to hand it to a cleartext http endpoint. Loopback http stays
  // allowed for the local/CI harness and integration tests.
  assertSecureUpstream(effectiveBaseURL);

  return { model: effectiveModel, baseURL: effectiveBaseURL, provider };
}

// Throws on malformed or insecure upstream base URLs.
function assertSecureUpstream(baseURL: string): void {
  let parsed: URL;
  try {
    parsed = new URL(baseURL);
  } catch {
    throw new Error(`Invalid upstream base URL: ${baseURL}`);
  }
  const isLoopback =
    parsed.hostname === 'localhost' ||
    parsed.hostname === '127.0.0.1' ||
    parsed.hostname === '::1' ||
    parsed.hostname === '[::1]';
  if (parsed.protocol === 'http:' && !isLoopback) {
    throw new Error(
      `Refusing to send credentials over cleartext http to "${parsed.hostname}". Use an https upstream.`
    );
  }
}

// Get provider-specific headers
function getProviderHeaders(provider: string, apiKey: string): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${apiKey}`,
  };

  // OpenRouter-specific headers
  if (provider === 'openrouter') {
    headers['HTTP-Referer'] = 'https://llm-wordsearch.vercel.app';
    headers['X-Title'] = 'LLM WordSearch';
    headers['X-Api-Key'] = apiKey;
    headers['Accept'] = 'application/json';
    headers['OpenRouter-Site'] = 'https://llm-wordsearch.vercel.app/';
    headers['OpenRouter-Site-Name'] = 'LLM WordSearch';
  }

  return headers;
}

export async function POST(request: Request) {
  try {
    // Check rate limit first
    const clientIP = getClientIP(request);
    const rateLimitResult = await checkRateLimit(clientIP);
    if (!rateLimitResult.allowed) {
      return new Response(
        JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders(request),
            ...formatRateLimitHeaders(rateLimitResult),
          },
        }
      );
    }

    // Check if API key is configured
    if (!API_KEY) {
      return new Response(
        JSON.stringify({ error: 'API key not configured' }),
        {
          status: 500,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders(request),
          },
        }
      );
    }

    let rawBody: unknown;
    try {
      rawBody = await request.json();
    } catch {
      return new Response(
        JSON.stringify({ error: 'Request body is not valid JSON.' }),
        {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders(request),
          },
        }
      );
    }

    // Enforce a strict request contract before any provider spend (#18)
    const validation = validateProxyRequest(rawBody);
    if (validation.status === 'error') {
      return new Response(
        JSON.stringify({ error: validation.error }),
        {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders(request),
          },
        }
      );
    }
    const { model, messages, max_tokens, response_format } = validation.value;

    // Enforce the server-configured model allowlist before any provider spend (#17)
    const permission = checkModelPermission(model, getProxyEnv());
    if (!permission.allowed) {
      const allowedList = Array.from(buildAllowedModels(getProxyEnv())).sort().join(', ');
      return new Response(
        JSON.stringify({
          error: `Model "${permission.model}" is not allowed. Permitted models: ${allowedList}`,
        }),
        {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders(request),
          },
        }
      );
    }
    
    // Get effective model settings. getEffectiveModelSettings throws on an
    // insecure/malformed upstream URL — a server-side configuration problem,
    // so fail closed before any credentials or bodies leave the handler.
    let effectiveSettings: ReturnType<typeof getEffectiveModelSettings>;
    try {
      effectiveSettings = getEffectiveModelSettings(
        permission.model,
        // Try to detect language from messages
        messages.find(m => m.role === 'system' && m.content.includes('language:'))?.content?.match(/language:\s*([a-z]+)/)?.[1]
      );
    } catch (error) {
      console.error('Upstream configuration error:', error);
      return new Response(
        JSON.stringify({ error: 'Upstream configuration error' }),
        {
          status: 500,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders(request),
          },
        }
      );
    }
    const { model: effectiveModel, baseURL, provider: effectiveProvider } = effectiveSettings;

    // Use the provider resolved from the effective settings (env-configured
    // upstream wins over model-name sniffing, so a custom endpoint never
    // receives OpenRouter-specific headers).
    const detectedProvider = effectiveProvider;

    // Prepare the request to the LLM provider
    const llmRequest = {
      model: effectiveModel,
      messages,
      max_tokens,
      stream: false as const,
      ...(response_format && { response_format }),
    };

    // Get provider-specific headers
    const headers = getProviderHeaders(detectedProvider, API_KEY);

    // Make request to the LLM provider
    const response = await fetch(`${baseURL}/chat/completions`, {
      method: 'POST',
      headers,
      body: JSON.stringify(llmRequest),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('LLM provider error:', errorText);
      return new Response(
        JSON.stringify({ error: `LLM provider error: ${response.status} - ${errorText}` }),
        {
          status: response.status,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders(request),
          },
        }
      );
    }

    const data: LLMProxyResponse = await response.json();

    // Log the request/response for debugging (in production, consider using a proper logging service)
    console.log('LLM Proxy Request:', {
      provider: detectedProvider,
      model: effectiveModel,
      baseURL,
      messages: messages.map(m => ({ role: m.role, content: m.content.substring(0, 100) + '...' })),
      response: data.choices[0]?.message?.content?.substring(0, 200) + '...'
    });

    // Add OpenRouter-specific response headers if available
    const responseHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      ...corsHeaders(request),
    };

    // Add OpenRouter-specific headers to response
    if (detectedProvider === 'openrouter') {
      const openRouterHeaders = response.headers;
      const openRouterId = openRouterHeaders.get('x-request-id');
      const openRouterProcessTime = openRouterHeaders.get('openai-processing-ms');
      
      if (openRouterId) {
        responseHeaders['X-Request-ID'] = openRouterId;
      }
      if (openRouterProcessTime) {
        responseHeaders['OpenAI-Processing-MS'] = openRouterProcessTime;
      }
    }

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: responseHeaders,
    });

  } catch (error) {
    console.error('LLM Proxy error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders(request),
        },
      }
    );
  }
}

// Handle CORS preflight requests
export async function options(request: Request) {
  return new Response(null, {
    status: 200,
    headers: preflightHeaders(request),
  });
}

// Health check endpoint
export async function GET(request: Request) {
  const healthInfo = {
    message: 'LLM Proxy is running',
    status: 'ok',
    timestamp: new Date().toISOString(),
    provider: 'openrouter',
    defaultModel: COMMUNITY_MODEL_NAME,
    // #62: observable rate-limit posture without exposing credential values.
    // false means the proxy is serving unthrottled (no KV/Upstash env vars).
    rateLimitConfigured: isRateLimitConfigured(),
    rateLimit: {
      maxRequests: RATE_LIMIT_MAX_REQUESTS,
      windowMs: RATE_LIMIT_WINDOW_MS,
    },
    features: [
      'OpenRouter integration',
      'Language-specific model overrides',
      'Provider-specific headers',
      'Request/response logging',
      'CORS support',
      'Error handling',
      'Rate limiting',
      'CORS origin restriction'
    ],
    supportedProviders: [
      'openrouter',
      'openai',
      'custom'
    ],
    supportedModels: [
      'google/gemini-2.5-flash',
      'anthropic/claude-3-haiku',
      'meta-llama/llama-3.1-8b-instruct',
      'openai/gpt-3.5-turbo',
      'openai/gpt-4'
    ]
  };

  return new Response(
    JSON.stringify(healthInfo),
    {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders(request),
        'X-Provider': 'openrouter',
      },
    }
  );
}