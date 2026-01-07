/**
 * Model Evaluator
 * Evaluates OpenRouter models for their capability to generate word search puzzles
 */

import type { OpenRouterModel } from './openrouter.js';

export interface WordSearchLevel {
  level: number;
  words: Array<{
    word: string;
    hint: string;
  }>;
}

export interface WordSearchResponse {
  levels: WordSearchLevel[];
}

export interface EvalResult {
  modelId: string;
  modelName: string;
  passed: boolean;
  score: number;
  errors: string[];
  responseTime: number;
  generatedContent?: WordSearchResponse;
}

export interface EvalConfig {
  apiKey: string;
  baseURL?: string;
  timeout?: number;
  maxConcurrent?: number;
}

/**
 * The test prompt to use for evaluation - same as the actual app uses
 */
export function getEvalPrompt(theme: string = 'animals', language: string = 'english'): Array<{ role: string; content: string }> {
  return [
    {
      role: 'system',
      content: `You are an expert puzzle creator. You must generate lists of unique, single words for a word search puzzle. The words must not contain spaces or special characters and must be in all uppercase letters. For each word, you must provide a short, one-sentence hint. You must return the result as a single JSON object with a key "levels", which is an array of objects. Each object in the "levels" array represents a level and must have a "level" number and a "words" array. Each item in the "words" array must be an object with a "word" and a "hint". All words and hints must be in the language specified by the user.`,
    },
    {
      role: 'user',
      content: `Create a word search puzzle definition with the theme "${theme}" in the language "${language}". The puzzle should have 2 level(s), with 3 words per level. Level 1 should contain common words related to the theme, and subsequent levels should contain progressively more obscure or difficult words.`,
    },
  ];
}

/**
 * Validate the response from a model
 */
export function validateResponse(content: string): { valid: boolean; errors: string[]; parsed?: WordSearchResponse; score: number } {
  const errors: string[] = [];
  let score = 0;

  // Try to parse JSON
  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
    score += 20; // Valid JSON
  } catch (e) {
    errors.push(`Failed to parse JSON: ${e instanceof Error ? e.message : String(e)}`);
    return { valid: false, errors, score };
  }

  // Check structure
  if (!parsed || typeof parsed !== 'object') {
    errors.push('Response is not an object');
    return { valid: false, errors, score };
  }

  const response = parsed as WordSearchResponse;

  // Check for levels array
  if (!response.levels || !Array.isArray(response.levels)) {
    errors.push('Missing or invalid "levels" array');
    return { valid: false, errors, score };
  }

  if (response.levels.length === 0) {
    errors.push('Levels array is empty');
    return { valid: false, errors, score };
  }

  score += 20; // Has levels

  // Check each level
  for (const level of response.levels) {
    if (typeof level.level !== 'number') {
      errors.push(`Level missing "level" number`);
      continue;
    }
    score += 5;

    if (!level.words || !Array.isArray(level.words)) {
      errors.push(`Level ${level.level} missing "words" array`);
      continue;
    }

    if (level.words.length === 0) {
      errors.push(`Level ${level.level} has empty words array`);
      continue;
    }

    score += 5; // Has words array

    // Check each word
    for (const word of level.words) {
      if (!word.word || typeof word.word !== 'string') {
        errors.push(`Word missing "word" string`);
        continue;
      }

      // Check word format (uppercase, no spaces)
      const cleanWord = word.word.replace(/\s+/g, '').toUpperCase();
      if (cleanWord !== word.word) {
        errors.push(`Word "${word.word}" is not uppercase or contains spaces`);
      } else if (cleanWord.length === 0) {
        errors.push(`Word is empty`);
      } else if (!/^[A-Z]+$/.test(cleanWord)) {
        errors.push(`Word "${cleanWord}" contains special characters`);
      } else {
        score += 3; // Valid word format
      }

      // Check hint
      if (!word.hint || typeof word.hint !== 'string') {
        errors.push(`Word "${word.word}" missing "hint" string`);
      } else if (word.hint.length === 0) {
        errors.push(`Word "${word.word}" has empty hint`);
      } else {
        score += 2; // Has hint
      }
    }
  }

  const valid = errors.length === 0;
  return { valid, errors, parsed: response, score };
}

/**
 * Evaluate a single model
 */
export async function evaluateModel(model: OpenRouterModel, config: EvalConfig): Promise<EvalResult> {
  const startTime = Date.now();
  const errors: string[] = [];
  let score = 0;
  let generatedContent: WordSearchResponse | undefined;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), config.timeout ?? 30000);

    const response = await fetch(`${config.baseURL || 'https://openrouter.ai/api/v1'}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://llm-wordsearch.vercel.app',
        'X-Title': 'LLM WordSearch',
      },
      body: JSON.stringify({
        model: model.id,
        messages: getEvalPrompt(),
        max_tokens: 1000,
        response_format: { type: 'json_object' },
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const responseTime = Date.now() - startTime;

    if (!response.ok) {
      const errorText = await response.text();
      errors.push(`HTTP ${response.status}: ${errorText.substring(0, 200)}`);
      return {
        modelId: model.id,
        modelName: model.name,
        passed: false,
        score: 0,
        errors,
        responseTime,
      };
    }

    const data = await response.json();

    if (!data.choices || data.choices.length === 0) {
      errors.push('No choices in response');
      return {
        modelId: model.id,
        modelName: model.name,
        passed: false,
        score: 0,
        errors,
        responseTime,
      };
    }

    const content = data.choices[0]?.message?.content;

    if (!content) {
      errors.push('No content in response');
      return {
        modelId: model.id,
        modelName: model.name,
        passed: false,
        score: 0,
        errors,
        responseTime,
      };
    }

    // Validate the response
    const validation = validateResponse(content);

    return {
      modelId: model.id,
      modelName: model.name,
      passed: validation.valid,
      score: validation.score,
      errors: validation.errors,
      responseTime,
      generatedContent: validation.parsed,
    };

  } catch (error) {
    const responseTime = Date.now() - startTime;

    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        errors.push('Request timeout');
      } else {
        errors.push(error.message);
      }
    } else {
      errors.push(String(error));
    }

    return {
      modelId: model.id,
      modelName: model.name,
      passed: false,
      score,
      errors,
      responseTime,
    };
  }
}

/**
 * Evaluate multiple models with concurrency control
 */
export async function evaluateModels(models: OpenRouterModel[], config: EvalConfig): Promise<EvalResult[]> {
  const maxConcurrent = config.maxConcurrent ?? 3;
  const results: EvalResult[] = [];

  // Process models in batches
  for (let i = 0; i < models.length; i += maxConcurrent) {
    const batch = models.slice(i, i + maxConcurrent);
    const batchResults = await Promise.all(
      batch.map(model => evaluateModel(model, config))
    );
    results.push(...batchResults);
  }

  return results;
}

/**
 * Filter models that pass the evaluation
 * Models must pass validation (no errors) and have a minimum score
 */
export function filterPassingModels(results: EvalResult[], minScore: number = 50): EvalResult[] {
  return results.filter(result => result.passed && result.score >= minScore);
}

/**
 * Sort results by score (descending)
 */
export function sortResultsByScore(results: EvalResult[]): EvalResult[] {
  return [...results].sort((a, b) => b.score - a.score);
}
