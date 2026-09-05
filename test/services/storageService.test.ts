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
  saveAiLogs,
  loadAiLogs,
  clearApplicationData,
} from '../../services/storageService';
import { Theme, AIProvider, AILogType, AILogStatus } from '../../types';

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

  describe('history cap (#47)', () => {
    const entry = (i: number) => ({ theme: 't', language: 'en', levelsCompleted: i, totalLevels: 3, date: `2024-01-${String(i % 28 + 1).padStart(2, '0')}`, won: true });

    it('caps saved history at 100, dropping oldest', () => {
      const seeded = Array.from({ length: 105 }, (_, i) => entry(i));
      saveGameHistory(seeded);
      const loaded = loadGameHistory();
      expect(loaded).toHaveLength(100);
      expect(loaded[0].levelsCompleted).toBe(5);
      expect(loaded[99].levelsCompleted).toBe(104);
    });
  });

  describe('saved games cap (#49)', () => {
    const game = (i: number) => ({ id: `g${i}`, title: `Game ${i}`, theme: 'Animals', language: 'en', gridSize: 10, createdAt: '2024-01-01', levels: [] });

    it('caps saved games at 50, dropping oldest', () => {
      const seeded = Array.from({ length: 53 }, (_, i) => game(i));
      saveAvailableGames(seeded as any);
      const loaded = loadAvailableGames();
      expect(loaded).toHaveLength(50);
      expect(loaded[0].id).toBe('g3');
      expect(loaded[49].id).toBe('g52');
    });
  });

  describe('load caps on pre-cap raw storage', () => {
    // Seed oversized JSON directly, the way a pre-cap app version would have
    // written it, so the loaders (not the savers) have to enforce the caps.
    const rawHistoryEntry = (i: number) => ({
      theme: 't', language: 'en', levelsCompleted: i, totalLevels: 3, date: '2024-01-01', won: true,
    });

    it('loadGameHistory caps oversized raw storage at 100, keeping the newest', () => {
      const seeded = Array.from({ length: 130 }, (_, i) => rawHistoryEntry(i));
      localStorage.setItem('wordSearchGameHistory', JSON.stringify(seeded));
      const loaded = loadGameHistory();
      expect(loaded).toHaveLength(100);
      expect(loaded[0].levelsCompleted).toBe(30);
      expect(loaded[99].levelsCompleted).toBe(129);
    });

    it('loadAvailableGames caps oversized raw storage at 50, keeping the newest', () => {
      const seeded = Array.from({ length: 75 }, (_, i) => ({
        id: `g${i}`, theme: 'Animals', language: 'en', gridSize: 10, levels: [],
      }));
      localStorage.setItem('wordSearchAvailableGames', JSON.stringify(seeded));
      const loaded = loadAvailableGames();
      expect(loaded).toHaveLength(50);
      expect(loaded[0].id).toBe('g25');
      expect(loaded[49].id).toBe('g74');
    });
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

    it('should handle corrupted JSON data', () => {
      localStorage.setItem('wordSearchGameHistory', 'invalid json');
      expect(loadGameHistory()).toEqual([]);
      expect(console.error).toHaveBeenCalledWith("Failed to load game history from localStorage:", expect.any(SyntaxError));
    });

    it('should handle localStorage errors during save', () => {
      const mockSetItem = vi.fn().mockImplementation(() => {
        throw new DOMException('Storage quota exceeded', 'QuotaExceededError');
      });
      Object.defineProperty(window, 'localStorage', {
        value: { ...localStorageMock, setItem: mockSetItem },
        configurable: true
      });

      const history = [{ theme: 'test', language: 'en', levelsCompleted: 1, totalLevels: 1, date: '2024-01-01', won: true }];
      saveGameHistory(history);
      // The error is caught by safeSetItem internally
      expect(console.error).toHaveBeenCalled();

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

    it('should handle corrupted JSON data for available games', () => {
      localStorage.setItem('wordSearchAvailableGames', '{invalid}');
      expect(loadAvailableGames()).toEqual([]);
      expect(console.error).toHaveBeenCalledWith("Failed to load available games from localStorage:", expect.any(SyntaxError));
    });

    it('should handle localStorage errors during save of available games', () => {
      const mockSetItem = vi.fn().mockImplementation(() => {
        throw new DOMException('Storage full', 'QuotaExceededError');
      });
      Object.defineProperty(window, 'localStorage', {
        value: { ...localStorageMock, setItem: mockSetItem },
        configurable: true
      });

      const games = [{ id: '1', theme: 'test', language: 'en', levels: [] }];
      saveAvailableGames(games);
      expect(console.error).toHaveBeenCalled();

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

    it('should handle invalid theme value', () => {
      localStorage.setItem('wordSearchTheme', 'invalid-theme');
      expect(loadTheme()).toBe(Theme.System);
    });

    it('should handle localStorage errors during theme save', () => {
      const mockSetItem = vi.fn().mockImplementation(() => {
        throw new DOMException('Storage error', 'QuotaExceededError');
      });
      Object.defineProperty(window, 'localStorage', {
        value: { ...localStorageMock, setItem: mockSetItem },
        configurable: true
      });

      saveTheme(Theme.Dark);
      expect(console.error).toHaveBeenCalled();

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

    it('should handle localStorage errors during language save', () => {
      const mockSetItem = vi.fn().mockImplementation(() => {
        throw new DOMException('Storage error', 'QuotaExceededError');
      });
      Object.defineProperty(window, 'localStorage', {
        value: { ...localStorageMock, setItem: mockSetItem },
        configurable: true
      });

      saveLanguage('fr');
      expect(console.error).toHaveBeenCalled();

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

    it('should handle corrupted JSON data for AI settings', () => {
      localStorage.setItem('wordSearchAISettings', 'corrupted');
      const loaded = loadAIProviderSettings();
      expect(loaded.provider).toBe(AIProvider.Community);
      expect(console.error).toHaveBeenCalledWith("Failed to load AI provider settings:", expect.any(SyntaxError));
    });

    it('should handle partial AI settings data', () => {
      localStorage.setItem('wordSearchAISettings', JSON.stringify({ provider: AIProvider.BYOLLM }));
      const loaded = loadAIProviderSettings();
      expect(loaded.provider).toBe(AIProvider.BYOLLM);
      expect(loaded.byollm?.providerName).toBe('Custom OpenAI-Compatible');
    });

    it('should handle invalid provider in stored settings', () => {
      localStorage.setItem('wordSearchAISettings', JSON.stringify({ provider: 'invalid-provider' }));
      const loaded = loadAIProviderSettings();
      expect(loaded.provider).toBe(AIProvider.Community);
    });

    it('should handle localStorage errors during AI settings save', () => {
      const mockSetItem = vi.fn().mockImplementation(() => {
        throw new DOMException('Storage error', 'QuotaExceededError');
      });
      Object.defineProperty(window, 'localStorage', {
        value: { ...localStorageMock, setItem: mockSetItem },
        configurable: true
      });

      const settings = { provider: AIProvider.Community, communityModel: 'test-model' };
      saveAIProviderSettings(settings);
      expect(console.error).toHaveBeenCalled();

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

    it('should handle errors during data clearing', () => {
      saveGameHistory([{ theme: 'test', language: 'en', levelsCompleted: 1, totalLevels: 1, date: '2024-01-01', won: true }]);

      const mockRemoveItem = vi.fn().mockImplementation((key: string) => {
        if (key === 'wordSearchGameHistory') {
          throw new Error('Remove failed');
        }
      });
      Object.defineProperty(window, 'localStorage', {
        value: { ...localStorageMock, removeItem: mockRemoveItem },
        configurable: true
      });

      expect(() => clearApplicationData()).not.toThrow();

      // Restore
      Object.defineProperty(window, 'localStorage', { value: localStorageMock });
    });
  });
});

describe('AI log persistence (#65)', () => {
  const makeLog = (id: string) => ({
    id,
    timestamp: new Date('2026-09-04T12:00:00Z'),
    type: 'info' as AILogType,
    status: 'success' as AILogStatus,
    message: `log ${id}`,
  });

  it('round-trips logs through sessionStorage, reviving timestamps', () => {
    saveAiLogs([makeLog('a'), makeLog('b')]);
    const loaded = loadAiLogs();
    expect(loaded).toHaveLength(2);
    expect(loaded[0].id).toBe('a');
    expect(loaded[1].timestamp).toBeInstanceOf(Date);
  });

  it('caps saved logs at 50 entries, keeping the newest (#47-style cap)', () => {
    const entries = Array.from({ length: 60 }, (_, i) => makeLog(`log-${i}`));
    saveAiLogs(entries);
    const loaded = loadAiLogs();
    expect(loaded).toHaveLength(50);
    expect(loaded[0].id).toBe('log-10');
    expect(loaded[49].id).toBe('log-59');
  });

  it('returns empty and never throws on corrupt storage', () => {
    sessionStorage.setItem('wordSearchAiLogs', '{not json');
    expect(loadAiLogs()).toEqual([]);
  });

  it('is cleared by clearApplicationData', () => {
    saveAiLogs([makeLog('a')]);
    clearApplicationData();
    expect(loadAiLogs()).toEqual([]);
  });
});
