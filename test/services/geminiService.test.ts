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
  // This test suite covers the GeminiService module, which handles AI-powered game level generation and connection testing.
  // It includes mocking of external dependencies like fetch and prompts to ensure isolated testing.
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('generateGameLevels', () => {
    // This test suite covers the generateGameLevels function, which generates word search levels using AI providers.
    // Tests include provider selection, API interactions, response parsing, error handling, and edge cases.
    // Important for ensuring reliable game generation across different configurations.

    it('should use community provider when no custom LLM is provided', async () => {
      // Test basic functionality with community provider.
      // Setup: Mock successful API response with valid levels.
      // Assertion: Correct levels returned, no errors.
      // Important: Verifies default provider behavior.
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
      // Test custom BYOLLM provider configuration.
      // Setup: Provide custom settings, mock API response.
      // Assertion: Correct API call with custom headers and URL.
      // Important: Verifies user-provided LLM integration.
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
        expect.objectContaining({
          type: 'error',
          status: 'error',
          message: expect.stringContaining('ERROR: API request failed with status 500')
        })
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
        expect.objectContaining({
          type: 'info',
          status: 'success',
          message: expect.stringContaining("Language-specific model override applied for 'es'")
        })
      );

      // Restore original value
      process.env.LANGUAGE_MODEL_MAP = originalLanguageMap;
    });

    // Test for invalid JSON in AI response content
    // This test ensures that when the AI returns invalid JSON, the function handles it gracefully by logging an error and returning an empty array.
    // Important for robustness against malformed AI responses.
    it('should handle invalid JSON in AI response content', async () => {
      const mockResponse = {
        ok: true,
        json: () => Promise.resolve({
          choices: [{
            message: {
              content: 'invalid json {'
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
        wordCount: 1,
        levelCount: 1,
        onLog: mockLog,
        aiSettings,
        language: 'en'
      });

      expect(result).toEqual([]);
      expect(mockLog).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'error',
          status: 'error',
          message: expect.stringContaining('Failed to parse AI response JSON')
        })
      );
    });

    // Test for empty levels array in response
    // Ensures that if AI returns no levels, the function throws an error as expected.
    // Covers edge case where AI fails to generate any content.
    it('should handle empty levels array', async () => {
      const mockResponse = {
        ok: true,
        json: () => Promise.resolve({
          choices: [{
            message: {
              content: JSON.stringify({ levels: [] })
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
        wordCount: 1,
        levelCount: 1,
        onLog: mockLog,
        aiSettings,
        language: 'en'
      });

      expect(result).toEqual([]);
      expect(mockLog).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'error',
          status: 'error',
          message: expect.stringContaining('AI response did not contain valid level data')
        })
      );
    });

    // Test for levels with no valid words after sanitization
    // Ensures words that become empty strings are filtered out.
    // Important for data integrity.
    it('should filter out empty words after sanitization', async () => {
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
                      { word: '   ', hint: 'Empty word' },
                      { word: 'VALID', hint: 'Valid word' }
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
        wordCount: 2,
        levelCount: 1,
        onLog: mockLog,
        aiSettings,
        language: 'en'
      });

      expect(result[0]).toEqual([
        { word: 'VALID', hint: 'Valid word' }
      ]);
    });

    // Test for multiple levels and sorting
    // Ensures levels are sorted by level number even if AI returns them out of order.
    // Covers multi-level game generation.
    it('should sort levels correctly', async () => {
      const mockResponse = {
        ok: true,
        json: () => Promise.resolve({
          choices: [{
            message: {
              content: JSON.stringify({
                levels: [
                  {
                    level: 3,
                    words: [{ word: 'LEVEL3', hint: 'Third level' }]
                  },
                  {
                    level: 1,
                    words: [{ word: 'LEVEL1', hint: 'First level' }]
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
        wordCount: 1,
        levelCount: 2,
        onLog: mockLog,
        aiSettings,
        language: 'en'
      });

      expect(result).toHaveLength(2);
      expect(result[0][0].word).toBe('LEVEL1');
      expect(result[1][0].word).toBe('LEVEL3');
    });

    // Test for missing choices in response
    // Ensures proper error handling when API response lacks choices array.
    // Covers API response validation.
    it('should handle missing choices in response', async () => {
      const mockResponse = {
        ok: true,
        json: () => Promise.resolve({})
      };

      global.fetch = vi.fn().mockResolvedValue(mockResponse);

      const aiSettings: AIProviderSettings = {
        provider: AIProvider.Community
      };

      const mockLog = vi.fn();
      const result = await generateGameLevels({
        theme: 'test',
        wordCount: 1,
        levelCount: 1,
        onLog: mockLog,
        aiSettings,
        language: 'en'
      });

      expect(result).toEqual([]);
      expect(mockLog).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'error',
          status: 'error',
          message: 'ERROR: Invalid AI response format: \'choices\' field is missing or empty.'
        })
      );
    });

    // Test for empty content in message
    // Ensures handling of empty content from AI.
    // Covers edge case in response parsing.
    it('should handle empty content in message', async () => {
      const mockResponse = {
        ok: true,
        json: () => Promise.resolve({
          choices: [{
            message: {
              content: ''
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
        wordCount: 1,
        levelCount: 1,
        onLog: mockLog,
        aiSettings,
        language: 'en'
      });

      expect(result).toEqual([]);
      expect(mockLog).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'error',
          status: 'error',
          message: 'ERROR: Received an empty \'content\' from the AI provider.'
        })
      );
    });

    // Test for network errors during fetch
    // Ensures fetch rejections are handled gracefully.
    // Important for network reliability.
    it('should handle network errors', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Network failure'));

      const aiSettings: AIProviderSettings = {
        provider: AIProvider.Community
      };

      const mockLog = vi.fn();
      const result = await generateGameLevels({
        theme: 'test',
        wordCount: 1,
        levelCount: 1,
        onLog: mockLog,
        aiSettings,
        language: 'en'
      });

      expect(result).toEqual([]);
      expect(mockLog).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'error',
          status: 'error',
          message: expect.stringContaining('Network failure')
        })
      );
    });
  });

  describe('testAIConnection', () => {
    // This test suite covers the testAIConnection function, which validates AI provider connections.
    // Tests include successful connections, error handling, proxy usage, and network issues.
    // Important for ensuring users can verify their LLM configurations.

    it('should successfully test connection with valid settings', async () => {
      // Test successful connection test.
      // Setup: Mock successful API response.
      // Assertion: No error thrown.
      // Important: Verifies basic connection functionality.
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

    it('should NOT use proxy for custom providers even if USE_LLM_PROXY is true', async () => {
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
        apiKey: 'a-custom-user-key', // Not the community key
        baseURL: 'https://api.test.com/v1',
        modelName: 'test-model'
      };

      await testAIConnection(settings);

      // Should make a direct call, not use the proxy
      expect(fetch).toHaveBeenCalledWith(
        'https://api.test.com/v1/chat/completions',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Authorization': `Bearer ${settings.apiKey}`
          })
        })
      );

      process.env.USE_LLM_PROXY = originalUseProxy;
    });

    it('should use proxy for community provider when USE_LLM_PROXY is true', async () => {
      const originalUseProxy = process.env.USE_LLM_PROXY;
      const originalApiKey = process.env.API_KEY;
      process.env.USE_LLM_PROXY = 'true';
      process.env.API_KEY = 'community-key'; // This is the community key

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
        providerName: 'Community Provider',
        apiKey: 'community-key', // Matching the community key
        baseURL: 'https://openrouter.ai/api/v1',
        modelName: 'google/gemini-2.5-flash'
      };

      await testAIConnection(settings);

      // Should use the proxy
      expect(fetch).toHaveBeenCalledWith(
        '/api/llm-proxy',
        expect.objectContaining({
          method: 'POST'
        })
      );

      process.env.USE_LLM_PROXY = originalUseProxy;
      process.env.API_KEY = originalApiKey;
    });

    // Test for empty response from API
    // Ensures handling when API returns no response body.
    // Covers edge case in connection testing.
    it('should handle empty response in connection test', async () => {
      const mockResponse = {
        ok: true,
        json: () => Promise.resolve(null)
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

    // Test for malformed error JSON in API response
    // Ensures error parsing handles invalid JSON gracefully.
    // Important for error message display.
    it('should handle malformed error JSON in connection test', async () => {
      const mockResponse = {
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        text: () => Promise.resolve('not json')
      };

      global.fetch = vi.fn().mockResolvedValue(mockResponse);

      const settings: BYOLLMSettings = {
        providerName: 'Test Provider',
        apiKey: 'test-key',
        baseURL: 'https://api.test.com/v1',
        modelName: 'test-model'
      };

      await expect(testAIConnection(settings))
        .rejects.toThrow('API request failed with status 400 (Bad Request).\nRaw Response: not json');
    });
  });
});