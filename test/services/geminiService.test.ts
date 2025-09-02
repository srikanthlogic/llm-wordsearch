import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateGameLevels, testAIConnection } from '../../services/geminiService';
import { AIProvider, AIProviderSettings, BYOLLMSettings } from '../../types';

// Mock the prompts module
vi.mock('../../prompts', () => ({
  getOpenAIGameGenerationMessages: vi.fn(() => [
    { role: 'system', content: 'You are a puzzle creator.' },
    { role: 'user', content: 'Create a word search puzzle.' }
  ])
}));

describe('GeminiService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('generateGameLevels', () => {
    it('should use community provider when no custom LLM is provided', async () => {
      const mockResponse = {
        ok: true,
        json: () => Promise.resolve({
          choices: [{
            message: {
              content: JSON.stringify({
                levels: [
                  {
                    level: 1,
                    words: [
                      { word: 'CAT', hint: 'A small furry pet' },
                      { word: 'DOG', hint: 'A loyal companion' }
                    ]
                  }
                ]
              })
            }
          }]
        })
      };

      global.fetch = vi.fn().mockResolvedValue(mockResponse);

      const aiSettings: AIProviderSettings = {
        provider: AIProvider.Community
      };

      const mockLog = vi.fn();
      const result = await generateGameLevels({
        theme: 'animals',
        wordCount: 2,
        levelCount: 1,
        onLog: mockLog,
        aiSettings,
        language: 'en'
      });

      expect(result).toHaveLength(1);
      expect(result[0]).toHaveLength(2);
      expect(result[0][0]).toEqual({ word: 'CAT', hint: 'A small furry pet' });
      expect(result[0][1]).toEqual({ word: 'DOG', hint: 'A loyal companion' });
    });

    it('should use custom LLM settings when provided', async () => {
      const mockResponse = {
        ok: true,
        json: () => Promise.resolve({
          choices: [{
            message: {
              content: JSON.stringify({
                levels: [
                  {
                    level: 1,
                    words: [
                      { word: 'HELLO', hint: 'A greeting' }
                    ]
                  }
                ]
              })
            }
          }]
        })
      };

      global.fetch = vi.fn().mockResolvedValue(mockResponse);

      const customSettings: BYOLLMSettings = {
        providerName: 'Custom OpenAI',
        apiKey: 'custom-key',
        baseURL: 'https://api.openai.com/v1',
        modelName: 'gpt-3.5-turbo'
      };

      const aiSettings: AIProviderSettings = {
        provider: AIProvider.BYOLLM,
        byollm: customSettings
      };

      const mockLog = vi.fn();
      const result = await generateGameLevels({
        theme: 'greetings',
        wordCount: 1,
        levelCount: 1,
        onLog: mockLog,
        aiSettings,
        language: 'en'
      });

      expect(result).toHaveLength(1);
      expect(result[0]).toHaveLength(1);
      expect(result[0][0]).toEqual({ word: 'HELLO', hint: 'A greeting' });
      expect(fetch).toHaveBeenCalledWith(
        'https://api.openai.com/v1/chat/completions',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Authorization': 'Bearer custom-key'
          })
        })
      );
    });

    it('should use proxy when USE_LLM_PROXY is true', async () => {
      // Temporarily override environment variable
      const originalUseProxy = process.env.USE_LLM_PROXY;
      process.env.USE_LLM_PROXY = 'true';

      const mockResponse = {
        ok: true,
        json: () => Promise.resolve({
          choices: [{
            message: {
              content: JSON.stringify({
                levels: [
                  {
                    level: 1,
                    words: [
                      { word: 'PROXY', hint: 'A middleman' }
                    ]
                  }
                ]
              })
            }
          }]
        })
      };

      global.fetch = vi.fn().mockResolvedValue(mockResponse);

      const aiSettings: AIProviderSettings = {
        provider: AIProvider.Community
      };

      const mockLog = vi.fn();
      await generateGameLevels({
        theme: 'technology',
        wordCount: 1,
        levelCount: 1,
        onLog: mockLog,
        aiSettings,
        language: 'en'
      });

      expect(fetch).toHaveBeenCalledWith(
        '/api/llm-proxy',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json'
          })
        })
      );

      // Restore original value
      process.env.USE_LLM_PROXY = originalUseProxy;
    });

    it('should handle API errors gracefully', async () => {
      const mockResponse = {
        ok: false,
        status: 500,
        text: () => Promise.resolve('Internal Server Error')
      };

      global.fetch = vi.fn().mockResolvedValue(mockResponse);

      const aiSettings: AIProviderSettings = {
        provider: AIProvider.Community
      };

      const mockLog = vi.fn();
      const result = await generateGameLevels({
        theme: 'animals',
        wordCount: 2,
        levelCount: 1,
        onLog: mockLog,
        aiSettings,
        language: 'en'
      });

      expect(result).toEqual([]);
      expect(mockLog).toHaveBeenCalledWith(
        expect.stringContaining('ERROR: API request failed with status 500')
      );
    });

    it('should sanitize words correctly', async () => {
      const mockResponse = {
        ok: true,
        json: () => Promise.resolve({
          choices: [{
            message: {
              content: JSON.stringify({
                levels: [
                  {
                    level: 1,
                    words: [
                      { word: ' cat dog ', hint: 'Multiple words with spaces' },
                      { word: 'hello world', hint: 'Words with space' },
                      { word: 'VALID', hint: 'Already valid' }
                    ]
                  }
                ]
              })
            }
          }]
        })
      };

      global.fetch = vi.fn().mockResolvedValue(mockResponse);

      const aiSettings: AIProviderSettings = {
        provider: AIProvider.Community
      };

      const mockLog = vi.fn();
      const result = await generateGameLevels({
        theme: 'test',
        wordCount: 3,
        levelCount: 1,
        onLog: mockLog,
        aiSettings,
        language: 'en'
      });

      expect(result[0]).toEqual([
        { word: 'CATDOG', hint: 'Multiple words with spaces' },
        { word: 'HELLOWORLD', hint: 'Words with space' },
        { word: 'VALID', hint: 'Already valid' }
      ]);
    });

    it('should apply language-specific model overrides', async () => {
      // Set up language map in environment
      const originalLanguageMap = process.env.LANGUAGE_MODEL_MAP;
      process.env.LANGUAGE_MODEL_MAP = JSON.stringify({
        'es': { 'model': 'spanish-model', 'baseURL': 'https://spanish-api.com/v1' }
      });

      const mockResponse = {
        ok: true,
        json: () => Promise.resolve({
          choices: [{
            message: {
              content: JSON.stringify({
                levels: [
                  {
                    level: 1,
                    words: [
                      { word: 'HOLA', hint: 'Un saludo' }
                    ]
                  }
                ]
              })
            }
          }]
        })
      };

      global.fetch = vi.fn().mockResolvedValue(mockResponse);

      const customSettings: BYOLLMSettings = {
        providerName: 'Custom',
        apiKey: 'test-key',
        baseURL: 'https://api.openai.com/v1',
        modelName: 'gpt-3.5-turbo'
      };

      const aiSettings: AIProviderSettings = {
        provider: AIProvider.BYOLLM,
        byollm: customSettings
      };

      const mockLog = vi.fn();
      await generateGameLevels({
        theme: 'greetings',
        wordCount: 1,
        levelCount: 1,
        onLog: mockLog,
        aiSettings,
        language: 'es'
      });

      expect(mockLog).toHaveBeenCalledWith(
        expect.stringContaining("Language-specific model override applied for 'es'")
      );

      // Restore original value
      process.env.LANGUAGE_MODEL_MAP = originalLanguageMap;
    });
  });

  describe('testAIConnection', () => {
    it('should successfully test connection with valid settings', async () => {
      const mockResponse = {
        ok: true,
        json: () => Promise.resolve({
          choices: [{
            message: { content: 'Hello!' }
          }]
        })
      };

      global.fetch = vi.fn().mockResolvedValue(mockResponse);

      const settings: BYOLLMSettings = {
        providerName: 'Test Provider',
        apiKey: 'test-key',
        baseURL: 'https://api.test.com/v1',
        modelName: 'test-model'
      };

      await expect(testAIConnection(settings)).resolves.toBeUndefined();
    });

    it('should throw error for missing required fields', async () => {
      const incompleteSettings: Partial<BYOLLMSettings> = {
        providerName: 'Test Provider',
        // Missing apiKey, baseURL, modelName
      };

      await expect(testAIConnection(incompleteSettings as BYOLLMSettings))
        .rejects.toThrow('API Key, Base URL, and Model Name are all required.');
    });

    it('should handle API errors in connection test', async () => {
      const mockResponse = {
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        text: () => Promise.resolve('{"error": {"message": "Invalid API key"}}')
      };

      global.fetch = vi.fn().mockResolvedValue(mockResponse);

      const settings: BYOLLMSettings = {
        providerName: 'Test Provider',
        apiKey: 'invalid-key',
        baseURL: 'https://api.test.com/v1',
        modelName: 'test-model'
      };

      await expect(testAIConnection(settings))
        .rejects.toThrow('API request failed with status 401 (Unauthorized)');
    });

    it('should handle network errors in connection test', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

      const settings: BYOLLMSettings = {
        providerName: 'Test Provider',
        apiKey: 'test-key',
        baseURL: 'https://api.test.com/v1',
        modelName: 'test-model'
      };

      await expect(testAIConnection(settings))
        .rejects.toThrow('Network error during connection test: Network error');
    });

    it('should use proxy when USE_LLM_PROXY is true', async () => {
      const originalUseProxy = process.env.USE_LLM_PROXY;
      process.env.USE_LLM_PROXY = 'true';

      const mockResponse = {
        ok: true,
        json: () => Promise.resolve({
          choices: [{
            message: { content: 'Hello!' }
          }]
        })
      };

      global.fetch = vi.fn().mockResolvedValue(mockResponse);

      const settings: BYOLLMSettings = {
        providerName: 'Test Provider',
        apiKey: 'test-key',
        baseURL: 'https://api.test.com/v1',
        modelName: 'test-model'
      };

      await testAIConnection(settings);

      expect(fetch).toHaveBeenCalledWith(
        '/api/llm-proxy',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json'
          })
        })
      );

      process.env.USE_LLM_PROXY = originalUseProxy;
    });
  });
});