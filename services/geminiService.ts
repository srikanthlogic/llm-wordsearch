
import { getOpenAIGameGenerationMessages } from "../prompts";
import type { Word, AIProviderSettings, BYOLLMSettings, AILogEntry } from '../types';
import { AILogType, AILogStatus , AIProvider } from '../types';

const LLM_REQUEST_TIMEOUT_MS = 30_000;

async function fetchWithTimeout(url: string, options: globalThis.RequestInit, timeoutMs: number = LLM_REQUEST_TIMEOUT_MS): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
}

interface LevelWords {
  level: number;
  words: Word[];
}

const createLogEntry = (message: string, type: AILogType = AILogType.Info, status: AILogStatus = AILogStatus.Success, details?: string): AILogEntry => ({
  id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
  timestamp: new Date(),
  type,
  status,
  message,
  details,
});

const MAX_WORD_LENGTH = 30;
const MAX_HINT_LENGTH = 200;

function sanitizeContent(text: string): string {
  return text.replace(/<[^>]*>/g, '').trim();
}

function sanitizeLLMResponse(levels: LevelWords[]): LevelWords[] {
  return levels.map(level => ({
    level: level.level,
    words: level.words.map(w => ({
      word: sanitizeContent(w.word).slice(0, MAX_WORD_LENGTH),
      hint: sanitizeContent(w.hint).slice(0, MAX_HINT_LENGTH),
    })).filter(w => w.word.length > 0),
  }));
}

const sanitizeWords = (levels: LevelWords[]): Word[][] => {
  if (!levels || levels.length === 0) {
    throw new Error("AI response did not contain valid level data.");
  }
  const sanitizedLevels = sanitizeLLMResponse(levels);
  const sortedLevels = sanitizedLevels.sort((a, b) => a.level - b.level);
  return sortedLevels.map(levelData =>
    levelData.words.map(w => ({
      ...w,
      word: w.word.replace(/\s+/g, '').toUpperCase()
    })).filter(w => w.word.length > 0)
  );
};

// This function is now the single point of contact for any OpenAI-compatible API.
async function generateWithOpenAICompatibleAPI(
    { theme, wordCount, levelCount, onLog, settings, language }: { theme: string; wordCount: number; levelCount: number; onLog: (log: AILogEntry) => void; settings: BYOLLMSettings; language: string; }
): Promise<Word[][]> {
    const messages = getOpenAIGameGenerationMessages({ theme, wordCount, levelCount, language });
    onLog(createLogEntry(`PROVIDER: ${settings.providerName} (OpenAI-Compatible)\nENDPOINT: ${settings.baseURL}\nMODEL: ${settings.modelName}\nMESSAGES:\n${JSON.stringify(messages, null, 2)}`, AILogType.Request));

    // Use the LLM proxy only if it's enabled AND we are using the community provider
    const isCommunityProvider = settings.apiKey === process.env.API_KEY;
    const useProxy = process.env.USE_LLM_PROXY === 'true' && isCommunityProvider;
    const proxyUrl = process.env.LLM_PROXY_URL || '/api/llm-proxy';
    
  let response;
  try {
    if (useProxy) {
      // Use the proxy
      onLog(createLogEntry(`Using LLM Proxy at: ${proxyUrl}`, AILogType.Info));
      response = await fetchWithTimeout(proxyUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: settings.modelName,
          messages: messages,
          response_format: { type: 'json_object' }
        }),
      });
    } else {
      // Direct API call (original behavior)
      response = await fetchWithTimeout(settings.baseURL.endsWith('/chat/completions') ? settings.baseURL : `${settings.baseURL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${settings.apiKey}`,
        },
        body: JSON.stringify({
          model: settings.modelName,
          messages: messages,
          response_format: { type: 'json_object' }
        }),
      });
    }
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new Error('The AI request timed out. Please try again.');
    }
    throw error;
  }

    if (!response.ok) {
        const errorBody = await response.text();
        onLog(createLogEntry(`API request failed with status ${response.status}`, AILogType.Error, AILogStatus.Error, errorBody));
        throw new Error(`API request failed with status ${response.status}. Check the AI Log for more details.`);
    }

    const jsonResponse = await response.json();

    if (!jsonResponse) {
        onLog(createLogEntry(`Received an empty JSON response from the provider.`, AILogType.Error, AILogStatus.Error));
        throw new Error("Received an empty response from the AI provider.");
    }

    if (!jsonResponse.choices || jsonResponse.choices.length === 0) {
        onLog(createLogEntry(`AI response is missing 'choices'.`, AILogType.Error, AILogStatus.Error, JSON.stringify(jsonResponse)));
        throw new Error("Invalid AI response format: 'choices' field is missing or empty.");
    }

    const message = jsonResponse.choices[0].message;
    if (!message) {
        onLog(createLogEntry(`AI response is missing 'message'.`, AILogType.Error, AILogStatus.Error, JSON.stringify(jsonResponse)));
        throw new Error("Invalid AI response format: 'message' field is missing.");
    }

    const content = message.content;
    if (!content) {
        onLog(createLogEntry(`AI response is missing 'content'.`, AILogType.Error, AILogStatus.Error, JSON.stringify(jsonResponse)));
        throw new Error("Received an empty 'content' from the AI provider.");
    }

    onLog(createLogEntry(`RESPONSE (RAW JSON)`, AILogType.Response, AILogStatus.Success, content));

    try {
        const parsedResponse: { levels: LevelWords[] } = JSON.parse(content);
        return sanitizeWords(parsedResponse.levels);
    } catch (e) {
        onLog(createLogEntry(`Failed to parse AI response JSON. Error: ${e instanceof Error ? e.message : String(e)}`, AILogType.Error, AILogStatus.Error, content));
        throw new Error("Could not parse the JSON response from the AI. Check the AI Log for details.");
    }
}

export async function generateGameLevels(
    { theme, wordCount, levelCount, onLog, aiSettings, language }: { theme: string; wordCount: number; levelCount: number; onLog: (log: AILogEntry) => void; aiSettings: AIProviderSettings; language: string; }
): Promise<Word[][]> {
  try {
    let settingsToUse: BYOLLMSettings;

    if (aiSettings.provider === AIProvider.BYOLLM && aiSettings.byollm?.apiKey) {
      // Use user-provided settings, but check for language-specific overrides
      let effectiveByollmSettings = JSON.parse(JSON.stringify(aiSettings.byollm)); // Deep copy

      const languageMapJSON = process.env.LANGUAGE_MODEL_MAP;
      if (languageMapJSON) {
        try {
          const languageMap = JSON.parse(languageMapJSON);
          const overrideConfig = languageMap[language];
          if (overrideConfig && overrideConfig.model) {
            effectiveByollmSettings.modelName = overrideConfig.model;
            effectiveByollmSettings.baseURL = overrideConfig.baseURL || effectiveByollmSettings.baseURL;
            onLog(createLogEntry(
              `Language-specific model override applied for '${language}'.\n` +
              `Using model: '${effectiveByollmSettings.modelName}'\n` +
              `Base URL: '${effectiveByollmSettings.baseURL}'`,
              AILogType.Info
            ));
          }
        } catch (e) {
          const errorMessage = `WARNING: Could not parse LANGUAGE_MODEL_MAP environment variable. Make sure it's valid JSON. Error: ${e instanceof Error ? e.message : String(e)}`;
          onLog(createLogEntry(errorMessage, AILogType.Warning));
          console.warn(errorMessage);
        }
      }
      settingsToUse = effectiveByollmSettings;
    } else {
      // Use Community Provider (OpenRouter)
      if (!process.env.API_KEY) {
        throw new Error("Community provider (OpenRouter) is not configured. Please add an API_KEY to environment variables or use your own LLM in Settings.");
      }
      settingsToUse = {
        providerName: 'Community (OpenRouter)',
        apiKey: process.env.API_KEY,
        baseURL: 'https://openrouter.ai/api/v1',
        modelName: aiSettings.communityModel || process.env.COMMUNITY_MODEL_NAME || 'google/gemini-2.5-flash:free',
      };
    }
    
    return await generateWithOpenAICompatibleAPI({ theme, wordCount, levelCount, onLog, settings: settingsToUse, language });

  } catch (error) {
    console.error("Error generating game levels:", error);
    onLog(createLogEntry(`ERROR: ${error instanceof Error ? error.message : String(error)}`, AILogType.Error, AILogStatus.Error));
    return [];
  }
}

export async function testAIConnection(settings: BYOLLMSettings): Promise<void> {
    if (!settings.apiKey || !settings.baseURL || !settings.modelName) {
        throw new Error("API Key, Base URL, and Model Name are all required.");
    }

    const testPayload = {
        model: settings.modelName,
        messages: [{ role: 'user', content: 'Hello!' }],
        max_tokens: 5,
        stream: false,
    };

    // Use the proxy only if it's enabled AND we are using the community provider
    const isCommunityProvider = settings.apiKey === process.env.API_KEY;
    const useProxy = process.env.USE_LLM_PROXY === 'true' && isCommunityProvider;
    const proxyUrl = process.env.LLM_PROXY_URL || '/api/llm-proxy';
    
  let response;
  try {
    if (useProxy) {
      // Use the proxy
      response = await fetchWithTimeout(proxyUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(testPayload),
      });
    } else {
      // Direct API call (original behavior)
      const url = settings.baseURL.endsWith('/chat/completions') ? settings.baseURL : `${settings.baseURL}/chat/completions`;
      response = await fetchWithTimeout(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${settings.apiKey}`,
        },
        body: JSON.stringify(testPayload),
      });
    }
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new Error('The AI request timed out. Please try again.');
    }
    if (error instanceof Error) {
      throw new Error(`Network error during connection test: ${error.message}. Check the Base URL and your network connection.`);
    }
    throw new Error("An unknown network error occurred during the connection test.");
  }

    if (!response.ok) {
        const errorBody = await response.text();
        let errorMessage = `API request failed with status ${response.status} (${response.statusText}).`;
        try {
            const errorJson = JSON.parse(errorBody);
            if (errorJson.error && errorJson.error.message) {
                errorMessage += `\nProvider Message: ${errorJson.error.message}`;
            } else {
                 errorMessage += `\nRaw Response: ${errorBody}`;
            }
        } catch (e) {
            errorMessage += `\nRaw Response: ${errorBody.substring(0, 200)}${errorBody.length > 200 ? '...' : ''}`;
        }
        throw new Error(errorMessage);
    }
    return;
}
