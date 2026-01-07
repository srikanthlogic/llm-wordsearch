/**
 * OpenRouter Model Fetcher
 * Fetches available models from OpenRouter API, specifically filtering for free models
 */

export interface OpenRouterModel {
  id: string;
  name: string;
  description: string;
  context_length: number;
  pricing: {
    prompt: number;
    completion: number;
  };
  architecture?: {
    modality: string;
    tokenizer: string;
    instruct_mode: boolean;
  };
}

export interface OpenRouterModelsResponse {
  data: OpenRouterModel[];
}

/**
 * Fetch all models from OpenRouter
 */
export async function fetchAllModels(apiKey: string): Promise<OpenRouterModel[]> {
  const response = await fetch('https://openrouter.ai/api/v1/models', {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://llm-wordsearch.vercel.app',
      'X-Title': 'LLM WordSearch',
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to fetch models: ${response.status} - ${errorText}`);
  }

  const data: OpenRouterModelsResponse = await response.json();
  return data.data;
}

/**
 * Filter models to only free models
 * Free models are identified by having 0 pricing or containing ':free' in the id
 */
export function filterFreeModels(models: OpenRouterModel[]): OpenRouterModel[] {
  return models.filter(model => {
    const modelId = model.id.toLowerCase();

    // Check if model has :free suffix (OpenRouter's convention for free models)
    if (modelId.includes(':free')) {
      return true;
    }

    // Check if both prompt and completion pricing are 0
    const promptPrice = model.pricing?.prompt ?? 0;
    const completionPrice = model.pricing?.completion ?? 0;

    if (promptPrice === 0 && completionPrice === 0) {
      return true;
    }

    return false;
  });
}

/**
 * Filter out models that are known to be unsuitable for structured JSON generation
 * This includes very small models, vision-only models, etc.
 */
export function filterUnsuitableModels(models: OpenRouterModel[]): OpenRouterModel[] {
  const excludePatterns = [
    // Vision-only models
    'vision',
    'image',
    // Very small context models (under 4k tokens)
    // Embedding models
    'embed',
    // Audio models
    'audio',
    'speech',
    'tts',
    'whisper',
  ];

  return models.filter(model => {
    const modelId = model.id.toLowerCase();
    const modelName = model.name.toLowerCase();

    // Exclude models matching unwanted patterns
    for (const pattern of excludePatterns) {
      if (modelId.includes(pattern) || modelName.includes(pattern)) {
        return false;
      }
    }

    // Require reasonable context length (at least 4096)
    if (model.context_length && model.context_length < 4096) {
      return false;
    }

    return true;
  });
}

/**
 * Sort models by context length (descending) - more context is generally better
 */
export function sortModelsByCapability(models: OpenRouterModel[]): OpenRouterModel[] {
  return [...models].sort((a, b) => {
    // First, prefer models with known context length
    if (a.context_length && !b.context_length) return -1;
    if (!a.context_length && b.context_length) return 1;
    if (a.context_length && b.context_length) {
      return b.context_length - a.context_length;
    }

    // If no context info, sort by ID
    return a.id.localeCompare(b.id);
  });
}
