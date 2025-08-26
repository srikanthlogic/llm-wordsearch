// Vercel Edge Function for LLM Proxy
// This is a standalone TypeScript version that doesn't depend on Next.js

interface LLMProxyRequest {
  model: string;
  messages: Array<{ role: string; content: string }>;
  max_tokens?: number;
  stream?: boolean;
  response_format?: { type: string };
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

// Get effective model settings based on language
function getEffectiveModelSettings(modelName: string, language?: string): { model: string; baseURL: string; provider: string } {
  let effectiveModel = modelName;
  let effectiveBaseURL = 'https://openrouter.ai/api/v1';
  let provider = 'openrouter';

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

  return { model: effectiveModel, baseURL: effectiveBaseURL, provider };
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

// Detect provider from model name
function detectProviderFromModel(modelName: string): string {
  if (!modelName) return 'openrouter';
  
  const modelLower = modelName.toLowerCase();
  
  // OpenRouter models
  if (modelLower.includes('openrouter') ||
      modelLower.includes('google/') ||
      modelLower.includes('anthropic/') ||
      modelLower.includes('meta/') ||
      modelLower.includes('mistral/') ||
      modelLower.includes('cohere/') ||
      modelLower.includes('deepseek/') ||
      modelLower.includes('qwen/')) {
    return 'openrouter';
  }
  
  // Custom providers
  if (modelLower.includes('openai/') || modelLower.includes('gpt-')) {
    return 'openai';
  }
  
  return 'openrouter'; // Default to OpenRouter
}

export default async function handler(request: Request) {
  try {
    // Check if API key is configured
    if (!API_KEY) {
      return new Response(
        JSON.stringify({ error: 'API key not configured' }),
        {
          status: 500,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        }
      );
    }

    const body: LLMProxyRequest = await request.json();
    
    // Extract relevant information from the request
    const { model, messages, max_tokens = 1000, stream = false, response_format } = body;
    
    // Get effective model settings
    const { model: effectiveModel, baseURL, provider } = getEffectiveModelSettings(
      model || COMMUNITY_MODEL_NAME,
      // Try to detect language from messages
      messages.find(m => m.role === 'system' && m.content.includes('language:'))?.content?.match(/language:\s*([a-z]+)/)?.[1]
    );

    // Detect provider from model name for additional optimization
    const detectedProvider = detectProviderFromModel(effectiveModel);

    // Prepare the request to the LLM provider
    const llmRequest = {
      model: effectiveModel,
      messages: messages,
      max_tokens,
      stream,
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
            'Access-Control-Allow-Origin': '*',
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
      'Access-Control-Allow-Origin': '*',
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
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  }
}

// Handle CORS preflight requests
export async function options(request: Request) {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}

// Health check endpoint
export async function GET() {
  const healthInfo = {
    message: 'LLM Proxy is running',
    status: 'ok',
    timestamp: new Date().toISOString(),
    provider: 'openrouter',
    defaultModel: COMMUNITY_MODEL_NAME,
    features: [
      'OpenRouter integration',
      'Language-specific model overrides',
      'Provider-specific headers',
      'Request/response logging',
      'CORS support',
      'Error handling'
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
        'Access-Control-Allow-Origin': '*',
        'X-Provider': 'openrouter',
      },
    }
  );
}