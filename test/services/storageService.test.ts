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
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  describe('GameHistory', () => {
    it('should save and load game history', () => {
      const history = [{ theme: 'test', language: 'en', levelsCompleted: 1, totalLevels: 1, date: '2024-01-01', won: true }];
      saveGameHistory(history);
      expect(loadGameHistory()).toEqual(history);
    });

    it('should return an empty array if no history is saved', () => {
      expect(loadGameHistory()).toEqual([]);
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
  });

  describe('Theme', () => {
    it('should save and load theme', () => {
      saveTheme(Theme.Dark);
      expect(loadTheme()).toBe(Theme.Dark);
    });

    it('should return system theme by default', () => {
      expect(loadTheme()).toBe(Theme.System);
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
  });
});
