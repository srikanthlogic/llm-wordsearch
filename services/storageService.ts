
import type { GameHistory, GameDefinition, Theme, AIProviderSettings, BYOLLMSettings } from '../types';
import { Theme as ThemeEnum, AIProvider } from '../types';


const HISTORY_KEY = 'wordSearchGameHistory';
const AVAILABLE_GAMES_KEY = 'wordSearchAvailableGames';
const THEME_KEY = 'wordSearchTheme';
const LANGUAGE_KEY = 'wordSearchLanguage';
const AI_PROVIDER_SETTINGS_KEY = 'wordSearchAISettings';
const BYOLLM_API_KEY = 'wordSearchBYOLLMKey'; // Session storage key

export function saveGameHistory(history: GameHistory[]): void {
  try {
    const jsonHistory = JSON.stringify(history);
    localStorage.setItem(HISTORY_KEY, jsonHistory);
  } catch (error) {
    console.error("Failed to save game history to localStorage:", error);
  }
}

export function loadGameHistory(): GameHistory[] {
  try {
    const jsonHistory = localStorage.getItem(HISTORY_KEY);
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
    localStorage.setItem(AVAILABLE_GAMES_KEY, jsonGames);
  } catch (error) {
    console.error("Failed to save available games to localStorage:", error);
  }
}

export function loadAvailableGames(): GameDefinition[] {
  try {
    const jsonGames = localStorage.getItem(AVAILABLE_GAMES_KEY);
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
    localStorage.setItem(THEME_KEY, theme);
  } catch (error) {
    console.error("Failed to save theme to localStorage:", error);
  }
}

export function loadTheme(): Theme {
  try {
    const storedTheme = localStorage.getItem(THEME_KEY);
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
    localStorage.setItem(LANGUAGE_KEY, language);
  } catch (error) {
    console.error("Failed to save language to localStorage:", error);
  }
}

export function loadLanguage(): string {
  try {
    const storedLanguage = localStorage.getItem(LANGUAGE_KEY);
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
    const settingsToStore: any = { provider: settings.provider };
    if (settings.provider === AIProvider.BYOLLM && settings.byollm) {
      const { apiKey, ...byollmSettingsToStore } = settings.byollm;
      settingsToStore.byollm = byollmSettingsToStore;
      if (apiKey) {
        sessionStorage.setItem(BYOLLM_API_KEY, apiKey);
      }
    } else {
      settingsToStore.communityModel = settings.communityModel;
      sessionStorage.removeItem(BYOLLM_API_KEY);
    }
    localStorage.setItem(AI_PROVIDER_SETTINGS_KEY, JSON.stringify(settingsToStore));
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
    const storedSettingsJSON = localStorage.getItem(AI_PROVIDER_SETTINGS_KEY);
    if (!storedSettingsJSON) return defaultSettings;
    
    const storedSettings = JSON.parse(storedSettingsJSON);
    const apiKey = sessionStorage.getItem(BYOLLM_API_KEY) || '';

    let finalSettings: AIProviderSettings = {
        ...defaultSettings,
        ...storedSettings,
    };

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
    localStorage.removeItem(HISTORY_KEY);
    localStorage.removeItem(AVAILABLE_GAMES_KEY);
    localStorage.removeItem(THEME_KEY);
    localStorage.removeItem(LANGUAGE_KEY);
    localStorage.removeItem(AI_PROVIDER_SETTINGS_KEY);
    sessionStorage.removeItem(BYOLLM_API_KEY);
  } catch (error)
 {
    console.error("Failed to clear application data from localStorage:", error);
  }
}