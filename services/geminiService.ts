
import { GoogleGenAI, Type } from "@google/genai";
import type { Word, AIProviderSettings, BYOLLMSettings } from '../types';
import { getGameGenerationPrompt, getOpenAIGameGenerationMessages } from "../prompts";
import { AIProvider } from "../types";

// This service now handles both the default Community provider (Gemini)
// and user-provided OpenAI-compatible providers.

const GEMINI_API_KEY = process.env.API_KEY;

const ai = GEMINI_API_KEY ? new GoogleGenAI({ apiKey: GEMINI_API_KEY }) : null;

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


async function generateWithGemini(
    { theme, wordCount, levelCount, onLog, language }: { theme: string; wordCount: number; levelCount: number; onLog: (log: string) => void; language: string; }
): Promise<Word[][]> {
  if (!ai) {
      throw new Error("Community provider (Gemini) is not configured. Please add an API_KEY to environment variables or use your own LLM in Settings.");
  }
  const communityModel = process.env.COMMUNITY_MODEL_NAME || "gemini-2.5-flash";
  const prompt = getGameGenerationPrompt({ theme, wordCount, levelCount, language });
  onLog(`PROVIDER: Community (Gemini)\nMODEL: ${communityModel}\nPROMPT:\n${prompt}`);
  
  const response = await ai.models.generateContent({
    model: communityModel,
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          levels: {
            type: Type.ARRAY,
            description: 'An array of levels for the word search game.',
            items: {
              type: Type.OBJECT,
              properties: {
                level: { type: Type.INTEGER, description: 'The level number.' },
                words: {
                  type: Type.ARRAY,
                  description: 'A list of words and hints for this level.',
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      word: {
                        type: Type.STRING,
                        description: 'An uppercase word related to the theme, with no spaces.',
                      },
                      hint: {
                        type: Type.STRING,
                        description: 'A short hint for the word.',
                      },
                    },
                    required: ["word", "hint"],
                  }
                }
              },
              required: ["level", "words"],
            }
          }
        },
        required: ["levels"],
      },
    },
  });

  const jsonText = response.text.trim();
  onLog(`RESPONSE (RAW JSON):\n${jsonText}`);
  const parsedResponse: { levels: LevelWords[] } = JSON.parse(jsonText);
  return sanitizeWords(parsedResponse.levels);
}

async function generateWithOpenAI(
    { theme, wordCount, levelCount, onLog, settings, language }: { theme: string; wordCount: number; levelCount: number; onLog: (log: string) => void; settings: BYOLLMSettings; language: string; }
): Promise<Word[][]> {
    const messages = getOpenAIGameGenerationMessages({ theme, wordCount, levelCount, language });
    onLog(`PROVIDER: ${settings.providerName} (OpenAI-Compatible)\nENDPOINT: ${settings.baseURL}\nMODEL: ${settings.modelName}\nMESSAGES:\n${JSON.stringify(messages, null, 2)}`);

    const response = await fetch(settings.baseURL.endsWith('/chat/completions') ? settings.baseURL : `${settings.baseURL}/chat/completions`, {
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
    let effectiveAISettings = JSON.parse(JSON.stringify(aiSettings)); // Deep copy to avoid mutation

    if (effectiveAISettings.provider === AIProvider.BYOLLM && effectiveAISettings.byollm) {
      const languageMapJSON = process.env.LANGUAGE_MODEL_MAP;
      if (languageMapJSON) {
        try {
          const languageMap = JSON.parse(languageMapJSON);
          const overrideConfig = languageMap[language];
          if (overrideConfig && overrideConfig.model) {
            const originalSettings = effectiveAISettings.byollm;
            effectiveAISettings.byollm = {
              ...originalSettings,
              modelName: overrideConfig.model,
              baseURL: overrideConfig.baseURL || originalSettings.baseURL,
            };
            onLog(
              `Language-specific model override applied for '${language}'.\n` +
              `Using model: '${effectiveAISettings.byollm.modelName}'\n` +
              `Base URL: '${effectiveAISettings.byollm.baseURL}'`
            );
          }
        } catch (e) {
          const errorMessage = `WARNING: Could not parse LANGUAGE_MODEL_MAP environment variable. Make sure it's valid JSON. Error: ${e instanceof Error ? e.message : String(e)}`;
          onLog(errorMessage);
          console.warn(errorMessage);
        }
      }
    }

    if (effectiveAISettings.provider === AIProvider.BYOLLM && effectiveAISettings.byollm?.apiKey) {
      return await generateWithOpenAI({ theme, wordCount, levelCount, onLog, settings: effectiveAISettings.byollm, language });
    }
    return await generateWithGemini({ theme, wordCount, levelCount, onLog, language });
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

    const url = settings.baseURL.endsWith('/chat/completions') ? settings.baseURL : `${settings.baseURL}/chat/completions`;

    let response;
    try {
        response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${settings.apiKey}`,
            },
            body: JSON.stringify(testPayload),
        });
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
