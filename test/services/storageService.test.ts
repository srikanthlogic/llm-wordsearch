import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  saveGameHistory,
  loadGameHistory,
  saveAvailableGames,
  loadAvailableGames,
  saveTheme,
  loadTheme,
  saveLanguage,
  loadLanguage,
  saveAIProviderSettings,
  loadAIProviderSettings,
  clearApplicationData,
} from '../../services/storageService';
import { Theme, AIProvider } from '../../types';

// Mock localStorage and sessionStorage
const localStorageMock = (() => {
  let store: { [key: string]: string } = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

const sessionStorageMock = (() => {
  let store: { [key: string]: string } = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, 'localStorage', { value: localStorageMock });
Object.defineProperty(window, 'sessionStorage', { value: sessionStorageMock });

describe('storageService', () => {
  // This test suite covers the storageService module, which handles local and session storage operations.
  // It includes mocking of localStorage and sessionStorage for isolated testing.
  // Important for ensuring data persistence and error handling in browser storage.

  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  describe('GameHistory', () => {
    // This test suite covers game history storage functions: saveGameHistory and loadGameHistory.
    // Tests include basic save/load, error handling, and data corruption scenarios.
    // Important for maintaining user game progress.
    it('should save and load game history', () => {
      const history = [{ theme: 'test', language: 'en', levelsCompleted: 1, totalLevels: 1, date: '2024-01-01', won: true }];
      saveGameHistory(history);
      expect(loadGameHistory()).toEqual(history);
    });

    it('should return an empty array if no history is saved', () => {
      expect(loadGameHistory()).toEqual([]);
    });

    // Test for corrupted JSON in localStorage
    // Ensures that if stored data is invalid JSON, the function returns empty array and logs error.
    // Important for data integrity and graceful degradation.
    it('should handle corrupted JSON data', () => {
      localStorage.setItem('wordSearchGameHistory', 'invalid json');
      expect(loadGameHistory()).toEqual([]);
      expect(console.error).toHaveBeenCalledWith("Failed to load game history from localStorage:", expect.any(SyntaxError));
    });

    // Test for localStorage errors during save
    // Ensures errors during storage operations are handled gracefully.
    // Covers storage quota exceeded or other storage failures.
    it('should handle localStorage errors during save', () => {
      const mockSetItem = vi.fn().mockImplementation(() => {
        throw new Error('Storage quota exceeded');
      });
      Object.defineProperty(window, 'localStorage', {
        value: { ...localStorageMock, setItem: mockSetItem },
        configurable: true
      });

      const history = [{ theme: 'test', language: 'en', levelsCompleted: 1, totalLevels: 1, date: '2024-01-01', won: true }];
      saveGameHistory(history);
      expect(console.error).toHaveBeenCalledWith("Failed to save game history to localStorage:", expect.any(Error));

      // Restore
      Object.defineProperty(window, 'localStorage', { value: localStorageMock });
    });
  });

  describe('AvailableGames', () => {
    it('should save and load available games', () => {
      const games = [{ id: '1', theme: 'test', language: 'en', levels: [] }];
      saveAvailableGames(games);
      expect(loadAvailableGames()).toEqual(games);
    });

    it('should return an empty array if no games are saved', () => {
      expect(loadAvailableGames()).toEqual([]);
    });

    // Test for corrupted JSON in available games storage
    // Similar to game history, ensures invalid data is handled.
    it('should handle corrupted JSON data for available games', () => {
      localStorage.setItem('wordSearchAvailableGames', '{invalid}');
      expect(loadAvailableGames()).toEqual([]);
      expect(console.error).toHaveBeenCalledWith("Failed to load available games from localStorage:", expect.any(SyntaxError));
    });

    // Test for localStorage errors during save of available games
    it('should handle localStorage errors during save of available games', () => {
      const mockSetItem = vi.fn().mockImplementation(() => {
        throw new Error('Storage full');
      });
      Object.defineProperty(window, 'localStorage', {
        value: { ...localStorageMock, setItem: mockSetItem },
        configurable: true
      });

      const games = [{ id: '1', theme: 'test', language: 'en', levels: [] }];
      saveAvailableGames(games);
      expect(console.error).toHaveBeenCalledWith("Failed to save available games to localStorage:", expect.any(Error));

      // Restore
      Object.defineProperty(window, 'localStorage', { value: localStorageMock });
    });
  });

  describe('Theme', () => {
    it('should save and load theme', () => {
      saveTheme(Theme.Dark);
      expect(loadTheme()).toBe(Theme.Dark);
    });

    it('should return system theme by default', () => {
      expect(loadTheme()).toBe(Theme.System);
    });

    // Test for invalid theme value in storage
    // Ensures that invalid theme strings fall back to default.
    // Covers data validation.
    it('should handle invalid theme value', () => {
      localStorage.setItem('wordSearchTheme', 'invalid-theme');
      expect(loadTheme()).toBe(Theme.System);
    });

    // Test for localStorage errors during theme save
    it('should handle localStorage errors during theme save', () => {
      const mockSetItem = vi.fn().mockImplementation(() => {
        throw new Error('Storage error');
      });
      Object.defineProperty(window, 'localStorage', {
        value: { ...localStorageMock, setItem: mockSetItem },
        configurable: true
      });

      saveTheme(Theme.Dark);
      expect(console.error).toHaveBeenCalledWith("Failed to save theme to localStorage:", expect.any(Error));

      // Restore
      Object.defineProperty(window, 'localStorage', { value: localStorageMock });
    });
  });

  describe('Language', () => {
    it('should save and load language', () => {
      saveLanguage('fr');
      expect(loadLanguage()).toBe('fr');
    });

    it('should return browser language by default', () => {
      Object.defineProperty(navigator, 'language', { value: 'de-DE', configurable: true });
      expect(loadLanguage()).toBe('de');
    });

    // Test for localStorage errors during language save
    it('should handle localStorage errors during language save', () => {
      const mockSetItem = vi.fn().mockImplementation(() => {
        throw new Error('Storage error');
      });
      Object.defineProperty(window, 'localStorage', {
        value: { ...localStorageMock, setItem: mockSetItem },
        configurable: true
      });

      saveLanguage('fr');
      expect(console.error).toHaveBeenCalledWith("Failed to save language to localStorage:", expect.any(Error));

      // Restore
      Object.defineProperty(window, 'localStorage', { value: localStorageMock });
    });
  });

  describe('AIProviderSettings', () => {
    it('should save and load AI provider settings for community model', () => {
      const settings = { provider: AIProvider.Community, communityModel: 'test-model' };
      saveAIProviderSettings(settings);
      const loaded = loadAIProviderSettings();
      expect(loaded.provider).toBe(AIProvider.Community);
      expect(loaded.communityModel).toBe('test-model');
    });

    it('should save and load AI provider settings for BYOLLM', () => {
      const settings = {
        provider: AIProvider.BYOLLM,
        byollm: { providerName: 'test', apiKey: '123', baseURL: 'http://test.com', modelName: 'test-model' },
      };
      saveAIProviderSettings(settings);
      const loaded = loadAIProviderSettings();
      expect(loaded.provider).toBe(AIProvider.BYOLLM);
      expect(loaded.byollm?.apiKey).toBe('123');
      expect(loaded.byollm?.baseURL).toBe('http://test.com');
    });

    it('should load default settings if nothing is saved', () => {
        const defaultSettings = loadAIProviderSettings();
        expect(defaultSettings.provider).toBe(AIProvider.Community);
        expect(defaultSettings.communityModel).toBe('google/gemini-2.5-flash:free');
    });

    // Test for corrupted JSON in AI settings storage
    // Ensures invalid stored data falls back to defaults.
    it('should handle corrupted JSON data for AI settings', () => {
      localStorage.setItem('wordSearchAISettings', 'corrupted');
      const loaded = loadAIProviderSettings();
      expect(loaded.provider).toBe(AIProvider.Community);
      expect(console.error).toHaveBeenCalledWith("Failed to load AI provider settings:", expect.any(SyntaxError));
    });

    // Test for partial AI settings data
    // Ensures missing fields are filled with defaults.
    it('should handle partial AI settings data', () => {
      localStorage.setItem('wordSearchAISettings', JSON.stringify({ provider: AIProvider.BYOLLM }));
      const loaded = loadAIProviderSettings();
      expect(loaded.provider).toBe(AIProvider.BYOLLM);
      expect(loaded.byollm?.providerName).toBe('Custom OpenAI-Compatible');
    });

    // Test for invalid provider in stored settings
    // Falls back to defaults if provider is invalid.
    it('should handle invalid provider in stored settings', () => {
      localStorage.setItem('wordSearchAISettings', JSON.stringify({ provider: 'invalid-provider' }));
      const loaded = loadAIProviderSettings();
      expect(loaded.provider).toBe(AIProvider.Community);
    });

    // Test for localStorage errors during AI settings save
    it('should handle localStorage errors during AI settings save', () => {
      const mockSetItem = vi.fn().mockImplementation(() => {
        throw new Error('Storage error');
      });
      Object.defineProperty(window, 'localStorage', {
        value: { ...localStorageMock, setItem: mockSetItem },
        configurable: true
      });

      const settings = { provider: AIProvider.Community, communityModel: 'test-model' };
      saveAIProviderSettings(settings);
      expect(console.error).toHaveBeenCalledWith("Failed to save AI provider settings:", expect.any(Error));

      // Restore
      Object.defineProperty(window, 'localStorage', { value: localStorageMock });
    });
  });

  describe('clearApplicationData', () => {
    it('should clear all relevant data from localStorage and sessionStorage', () => {
      saveGameHistory([
        { theme: 'test', language: 'en', levelsCompleted: 1, totalLevels: 1, date: '2024-01-01', won: true },
      ]);
      saveAvailableGames([{ id: '1', theme: 'test', language: 'en', levels: [] }]);
      saveTheme(Theme.Dark);
      saveLanguage('fr');
      saveAIProviderSettings({
        provider: AIProvider.BYOLLM,
        byollm: { providerName: 'test', apiKey: '123', baseURL: 'http://test.com', modelName: 'test-model' },
      });

      clearApplicationData();

      expect(loadGameHistory()).toEqual([]);
      expect(loadAvailableGames()).toEqual([]);
      expect(loadTheme()).toBe(Theme.System);
      expect(loadLanguage()).not.toBe('fr');
      const aiSettings = loadAIProviderSettings();
      expect(aiSettings.provider).toBe(AIProvider.Community);
      expect(sessionStorage.getItem('wordSearchBYOLLMKey')).toBe(null);
    });

    // Test for errors during clearApplicationData
    // Ensures that if localStorage.removeItem throws, it's logged but doesn't break the process.
    it('should handle errors during data clearing', () => {
      saveGameHistory([{ theme: 'test', language: 'en', levelsCompleted: 1, totalLevels: 1, date: '2024-01-01', won: true }]);

      const mockRemoveItem = vi.fn().mockImplementation((key) => {
        if (key === 'wordSearchGameHistory') {
          throw new Error('Remove failed');
        }
      });
      Object.defineProperty(window, 'localStorage', {
        value: { ...localStorageMock, removeItem: mockRemoveItem },
        configurable: true
      });

      clearApplicationData();
      expect(console.error).toHaveBeenCalledWith("Failed to clear application data from localStorage:", expect.any(Error));

      // Restore
      Object.defineProperty(window, 'localStorage', { value: localStorageMock });
    });
  });
});
