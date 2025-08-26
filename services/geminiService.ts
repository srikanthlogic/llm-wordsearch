
import type { Word, AIProviderSettings, BYOLLMSettings } from '../types';
import { getOpenAIGameGenerationMessages } from "../prompts";
import { AIProvider } from "../types";

// Community provider now uses OpenRouter by default.
const OPENROUTER_API_KEY = process.env.API_KEY;

interface LevelWords {
    level: number;
    words: Word[];
}

const sanitizeWords = (levels: LevelWords[]): Word[][] => {
    if (!levels || levels.length === 0) {
        throw new Error("AI response did not contain valid level data.");
    }
    // Sort levels just in case AI returns them out of order
    const sortedLevels = levels.sort((a, b) => a.level - b.level);
    
    // Sanitize words and return an array of word arrays
    return sortedLevels.map(levelData => 
        levelData.words.map(w => ({
            ...w,
            word: w.word.replace(/\s+/g, '').toUpperCase()
        })).filter(w => w.word.length > 0)
    );
};

// This function is now the single point of contact for any OpenAI-compatible API.
async function generateWithOpenAICompatibleAPI(
    { theme, wordCount, levelCount, onLog, settings, language }: { theme: string; wordCount: number; levelCount: number; onLog: (log: string) => void; settings: BYOLLMSettings; language: string; }
): Promise<Word[][]> {
    const messages = getOpenAIGameGenerationMessages({ theme, wordCount, levelCount, language });
    onLog(`PROVIDER: ${settings.providerName} (OpenAI-Compatible)\nENDPOINT: ${settings.baseURL}\nMODEL: ${settings.modelName}\nMESSAGES:\n${JSON.stringify(messages, null, 2)}`);

    // Use the LLM proxy if available, otherwise fall back to direct API call
    const useProxy = process.env.USE_LLM_PROXY === 'true';
    const proxyUrl = process.env.LLM_PROXY_URL || '/api/llm-proxy';
    
    let response;
    if (useProxy) {
        // Use the proxy
        onLog(`Using LLM Proxy at: ${proxyUrl}`);
        response = await fetch(proxyUrl, {
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
        response = await fetch(settings.baseURL.endsWith('/chat/completions') ? settings.baseURL : `${settings.baseURL}/chat/completions`, {
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

    if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`API request failed with status ${response.status}: ${errorBody}`);
    }

    const jsonResponse = await response.json();
    const content = jsonResponse.choices?.[0]?.message?.content;

    if (!content) {
        throw new Error("Received an empty or invalid response from the AI provider.");
    }

    onLog(`RESPONSE (RAW JSON):\n${content}`);
    const parsedResponse: { levels: LevelWords[] } = JSON.parse(content);
    return sanitizeWords(parsedResponse.levels);
}

export async function generateGameLevels(
    { theme, wordCount, levelCount, onLog, aiSettings, language }: { theme: string; wordCount: number; levelCount: number; onLog: (log: string) => void; aiSettings: AIProviderSettings; language: string; }
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
            onLog(
              `Language-specific model override applied for '${language}'.\n` +
              `Using model: '${effectiveByollmSettings.modelName}'\n` +
              `Base URL: '${effectiveByollmSettings.baseURL}'`
            );
          }
        } catch (e) {
          const errorMessage = `WARNING: Could not parse LANGUAGE_MODEL_MAP environment variable. Make sure it's valid JSON. Error: ${e instanceof Error ? e.message : String(e)}`;
          onLog(errorMessage);
          console.warn(errorMessage);
        }
      }
      settingsToUse = effectiveByollmSettings;
    } else {
      // Use Community Provider (OpenRouter)
      if (!OPENROUTER_API_KEY) {
        throw new Error("Community provider (OpenRouter) is not configured. Please add an API_KEY to environment variables or use your own LLM in Settings.");
      }
      settingsToUse = {
        providerName: 'Community (OpenRouter)',
        apiKey: OPENROUTER_API_KEY,
        baseURL: 'https://openrouter.ai/api/v1',
        modelName: process.env.COMMUNITY_MODEL_NAME || 'google/gemini-2.5-flash',
      };
    }
    
    return await generateWithOpenAICompatibleAPI({ theme, wordCount, levelCount, onLog, settings: settingsToUse, language });

  } catch (error) {
    console.error("Error generating game levels:", error);
    onLog(`ERROR: ${error instanceof Error ? error.message : String(error)}`);
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

    // Use the proxy if available, otherwise fall back to direct API call
    const useProxy = process.env.USE_LLM_PROXY === 'true';
    const proxyUrl = process.env.LLM_PROXY_URL || '/api/llm-proxy';
    
    let response;
    try {
        if (useProxy) {
            // Use the proxy
            response = await fetch(proxyUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(testPayload),
            });
        } else {
            // Direct API call (original behavior)
            const url = settings.baseURL.endsWith('/chat/completions') ? settings.baseURL : `${settings.baseURL}/chat/completions`;
            response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${settings.apiKey}`,
                },
                body: JSON.stringify(testPayload),
            });
        }
    } catch (error) {
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
