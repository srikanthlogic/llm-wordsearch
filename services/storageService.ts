import type { GameHistory, GameDefinition, Theme, AIProviderSettings, BYOLLMSettings } from '../types';
import { Theme as ThemeEnum, AIProvider } from '../types';

const HISTORY_KEY = 'wordSearchGameHistory';
const AVAILABLE_GAMES_KEY = 'wordSearchAvailableGames';
const THEME_KEY = 'wordSearchTheme';
const LANGUAGE_KEY = 'wordSearchLanguage';
const AI_PROVIDER_SETTINGS_KEY = 'wordSearchAISettings';
const BYOLLM_API_KEY = 'wordSearchBYOLLMKey'; // Session storage key

// Storage availability cache
let _storageAvailable: boolean | null = null;
let _sessionStorageAvailable: boolean | null = null;

function isStorageAvailable(storage: Storage): boolean {
  try {
    const testKey = '__storage_test__';
    storage.setItem(testKey, 'test');
    storage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
}

export function isLocalStorageAvailable(): boolean {
  if (_storageAvailable === null) {
    _storageAvailable = isStorageAvailable(localStorage);
  }
  return _storageAvailable;
}

export function isSessionStorageAvailable(): boolean {
  if (_sessionStorageAvailable === null) {
    _sessionStorageAvailable = isStorageAvailable(sessionStorage);
  }
  return _sessionStorageAvailable;
}

// In-memory fallback when storage is unavailable
const memoryStorage: Record<string, string> = {};
const sessionMemoryStorage: Record<string, string> = {};

function safeGetItem(key: string, useSessionStorage = false): string | null {
  try {
    if (useSessionStorage) {
      return isSessionStorageAvailable() ? sessionStorage.getItem(key) : sessionMemoryStorage[key] ?? null;
    }
    return isLocalStorageAvailable() ? localStorage.getItem(key) : memoryStorage[key] ?? null;
  } catch {
    return null;
  }
}

function safeSetItem(key: string, value: string, useSessionStorage = false): boolean {
  try {
    if (useSessionStorage) {
      if (isSessionStorageAvailable()) {
        sessionStorage.setItem(key, value);
      } else {
        sessionMemoryStorage[key] = value;
      }
    } else {
      if (isLocalStorageAvailable()) {
        localStorage.setItem(key, value);
      } else {
        memoryStorage[key] = value;
      }
    }
    return true;
  } catch (error) {
    if (error instanceof DOMException && error.name === 'QuotaExceededError') {
      console.error('Storage quota exceeded. Some data may not be saved.');
      // Store in memory as fallback
      if (useSessionStorage) {
        sessionMemoryStorage[key] = value;
      } else {
        memoryStorage[key] = value;
      }
      return false;
    }
    console.error('Failed to write to storage:', error);
    return false;
  }
}

function safeRemoveItem(key: string, useSessionStorage = false): void {
  try {
    if (useSessionStorage) {
      if (isSessionStorageAvailable()) sessionStorage.removeItem(key);
      delete sessionMemoryStorage[key];
    } else {
      if (isLocalStorageAvailable()) localStorage.removeItem(key);
      delete memoryStorage[key];
    }
  } catch {
    // Silently fail
  }
}

// Schema versioning
const STORAGE_VERSION = 1;
const VERSION_KEY = 'wordSearchStorageVersion';

export function migrateStorage(): void {
  const currentVersion = safeGetItem(VERSION_KEY);
  const version = currentVersion ? parseInt(currentVersion, 10) : 0;

  if (version < STORAGE_VERSION) {
    // Future migrations go here
    // Example: if (version < 2) { migrateV1toV2(); }
    safeSetItem(VERSION_KEY, String(STORAGE_VERSION));
  }
}

export function saveGameHistory(history: GameHistory[]): void {
  try {
    const jsonHistory = JSON.stringify(history);
    safeSetItem(HISTORY_KEY, jsonHistory);
  } catch (error) {
    console.error("Failed to save game history to localStorage:", error);
  }
}

export function loadGameHistory(): GameHistory[] {
  try {
    const jsonHistory = safeGetItem(HISTORY_KEY);
    if (jsonHistory) {
      return JSON.parse(jsonHistory);
    }
  } catch (error) {
    console.error("Failed to load game history from localStorage:", error);
  }
  return [];
}

export function saveAvailableGames(games: GameDefinition[]): void {
  try {
    const jsonGames = JSON.stringify(games);
    safeSetItem(AVAILABLE_GAMES_KEY, jsonGames);
  } catch (error) {
    console.error("Failed to save available games to localStorage:", error);
  }
}

export function loadAvailableGames(): GameDefinition[] {
  try {
    const jsonGames = safeGetItem(AVAILABLE_GAMES_KEY);
    if (jsonGames) {
      return JSON.parse(jsonGames);
    }
  } catch (error) {
    console.error("Failed to load available games from localStorage:", error);
  }
  return [];
}

export function saveTheme(theme: Theme): void {
  try {
    safeSetItem(THEME_KEY, theme);
  } catch (error) {
    console.error("Failed to save theme to localStorage:", error);
  }
}

export function loadTheme(): Theme {
  try {
    const storedTheme = safeGetItem(THEME_KEY);
    if (storedTheme && Object.values(ThemeEnum).includes(storedTheme as Theme)) {
      return storedTheme as Theme;
    }
  } catch (error) {
    console.error("Failed to load theme from localStorage:", error);
  }
  return ThemeEnum.System;
}

export function saveLanguage(language: string): void {
  try {
    safeSetItem(LANGUAGE_KEY, language);
  } catch (error) {
    console.error("Failed to save language to localStorage:", error);
  }
}

export function loadLanguage(): string {
  try {
    const storedLanguage = safeGetItem(LANGUAGE_KEY);
    if (storedLanguage) {
      return storedLanguage;
    }
  } catch (error) {
    console.error("Failed to load language from localStorage:", error);
  }
  // Default to browser language or English
  return navigator.language.split('-')[0] || 'en';
}

export function saveAIProviderSettings(settings: AIProviderSettings): void {
  try {
    const settingsToStore: { provider: AIProvider; byollm?: Omit<BYOLLMSettings, 'apiKey'>; communityModel?: string } = { provider: settings.provider };
    if (settings.provider === AIProvider.BYOLLM && settings.byollm) {
      const { apiKey, ...byollmSettingsToStore } = settings.byollm;
      settingsToStore.byollm = byollmSettingsToStore;
      if (apiKey) {
        safeSetItem(BYOLLM_API_KEY, apiKey, true);
      }
    } else {
      settingsToStore.communityModel = settings.communityModel;
      safeRemoveItem(BYOLLM_API_KEY, true);
    }
    safeSetItem(AI_PROVIDER_SETTINGS_KEY, JSON.stringify(settingsToStore));
  } catch (error) {
    console.error("Failed to save AI provider settings:", error);
  }
}

export function loadAIProviderSettings(): AIProviderSettings {
  const defaultSettings: AIProviderSettings = {
    provider: AIProvider.Community,
    communityModel: 'google/gemini-2.5-flash:free',
    byollm: { providerName: 'Custom OpenAI-Compatible', apiKey: '', baseURL: '', modelName: '' },
  };

  try {
    const storedSettingsJSON = safeGetItem(AI_PROVIDER_SETTINGS_KEY);
    if (!storedSettingsJSON) return defaultSettings;

    const storedSettings = JSON.parse(storedSettingsJSON);
    const apiKey = safeGetItem(BYOLLM_API_KEY, true) || '';

    const finalSettings: AIProviderSettings = {
      ...defaultSettings,
      ...storedSettings,
    };

    // Validate provider
    if (!Object.values(AIProvider).includes(finalSettings.provider as AIProvider)) {
      finalSettings.provider = AIProvider.Community;
    }

    if (finalSettings.provider === AIProvider.BYOLLM) {
      finalSettings.byollm = {
        ...defaultSettings.byollm,
        ...storedSettings.byollm,
        apiKey: apiKey,
      };
    }

    return finalSettings;

  } catch (error) {
    console.error("Failed to load AI provider settings:", error);
  }
  return defaultSettings;
}

export function clearApplicationData(): void {
  try {
    safeRemoveItem(HISTORY_KEY);
    safeRemoveItem(AVAILABLE_GAMES_KEY);
    safeRemoveItem(THEME_KEY);
    safeRemoveItem(LANGUAGE_KEY);
    safeRemoveItem(AI_PROVIDER_SETTINGS_KEY);
    safeRemoveItem(BYOLLM_API_KEY, true);

    // Also clear memory storage
    Object.keys(memoryStorage).forEach(key => delete memoryStorage[key]);
    Object.keys(sessionMemoryStorage).forEach(key => delete sessionMemoryStorage[key]);
  } catch (error) {
    console.error("Failed to clear application data from localStorage:", error);
  }
}

// Run migration on module load
migrateStorage();
