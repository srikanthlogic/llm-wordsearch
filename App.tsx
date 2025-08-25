
import React, { useState, useEffect, useCallback } from 'react';
import { View, GameDefinition, GameHistory, Theme, AIProviderSettings } from './types';
import { loadGameHistory, saveGameHistory, clearApplicationData, saveAvailableGames, loadAvailableGames, saveTheme, loadTheme, loadAIProviderSettings, saveAIProviderSettings, loadLanguage } from './services/storageService';
import lz from 'lz-string';

import Sidebar from './components/Sidebar';
import MakerView from './views/MakerView';
import PlayerView from './views/PlayerView';
import HelpView from './views/HelpView';
import SettingsView from './views/SettingsView';
import { useI18n } from './hooks/useI18n';

export default function App() {
  const [view, setView] = useState<View>(View.Maker);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [theme, setTheme] = useState<Theme>(loadTheme());
  const [aiSettings, setAiSettings] = useState<AIProviderSettings>(loadAIProviderSettings());
  
  // History and Library State
  const [gameHistory, setGameHistory] = useState<GameHistory[]>([]);
  const [availableGames, setAvailableGames] = useState<GameDefinition[]>([]);
  const [aiLogs, setAiLogs] = useState<string[]>([]);
  
  const { language } = useI18n(); // For potential future use if App needs translations

  useEffect(() => {
    const root = window.document.documentElement;
    root.lang = language;

    const applyTheme = () => {
        const isDark =
            theme === Theme.Dark ||
            (theme === Theme.System &&
            window.matchMedia('(prefers-color-scheme: dark)').matches);
        
        root.classList.toggle('dark', isDark);
    };
    
    applyTheme();

    if (theme === Theme.System) {
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        
        const handleSystemThemeChange = () => {
            applyTheme();
        };

        mediaQuery.addEventListener('change', handleSystemThemeChange);

        return () => {
            mediaQuery.removeEventListener('change', handleSystemThemeChange);
        };
    }
  }, [theme, language]);

  const handleThemeChange = (newTheme: Theme) => {
    setTheme(newTheme);
    saveTheme(newTheme);
  };

  const handleAISettingsChange = (newSettings: AIProviderSettings) => {
    saveAIProviderSettings(newSettings);
    setAiSettings(newSettings);
  };

  useEffect(() => {
    const hash = window.location.hash;
    if (hash.startsWith('#game=')) {
        try {
            const compressedData = hash.substring('#game='.length);
            const jsonString = lz.decompressFromEncodedURIComponent(compressedData);
            if (jsonString) {
                const loadedGame: GameDefinition = JSON.parse(jsonString);
                // Backwards compatibility for old links
                if (!loadedGame.language) {
                    loadedGame.language = 'en';
                }
                if (loadedGame && loadedGame.theme && loadedGame.levels) {
                    const gameExists = availableGames.some(g => g.id === loadedGame.id);
                    if (!gameExists) {
                        const updatedGames = [...availableGames, loadedGame];
                        setAvailableGames(updatedGames);
                        saveAvailableGames(updatedGames);
                    }
                    setView(View.Player);
                    // We can't directly trigger playing the game, but we can land them on the player page
                    // where the new game will be listed.
                    window.history.replaceState(null, '', window.location.pathname + window.location.search);
                } else {
                    throw new Error("Invalid game data structure.");
                }
            } else {
                 throw new Error("Could not decompress game data.");
            }
        } catch (error) {
            console.error("Failed to load game from URL:", error);
            alert("The shared game link appears to be invalid or corrupted. Loading default view.");
            setGameHistory(loadGameHistory());
            setAvailableGames(loadAvailableGames());
            window.history.replaceState(null, '', window.location.pathname + window.location.search);
        }
    } else {
        setGameHistory(loadGameHistory());
        setAvailableGames(loadAvailableGames());
    }
  }, []);

  const addGameToHistory = useCallback((result: Omit<GameHistory, 'date'>) => {
    const newHistoryEntry: GameHistory = { ...result, date: new Date().toISOString() };
    const updatedHistory = [...gameHistory, newHistoryEntry];
    setGameHistory(updatedHistory);
    saveGameHistory(updatedHistory);
  }, [gameHistory]);

  const handleGameCreated = useCallback((newGameDefinition: GameDefinition) => {
      const updatedAvailableGames = [...availableGames, newGameDefinition];
      setAvailableGames(updatedAvailableGames);
      saveAvailableGames(updatedAvailableGames);
  }, [availableGames]);
  
  const handleGameEnd = useCallback((result: Omit<GameHistory, 'date'>) => {
    addGameToHistory(result);
  }, [addGameToHistory]);

  const handleClearData = () => {
    if (window.confirm("Are you sure you want to clear all application data? This will erase your game history, all saved games, and theme preference.")) {
      clearApplicationData();
      setGameHistory([]);
      setAvailableGames([]);
      setTheme(Theme.System);
      setAiSettings(loadAIProviderSettings()); // Reset to default
      // Note: language preference is not cleared to maintain user's language choice.
      setView(View.Maker);
    }
  };

  const handleNavigate = (targetView: View) => {
    if (view === targetView) return;
    // Simplified navigation: removed guards for a more direct user experience.
    // A future implementation could add confirmations if a game is in progress.
    setView(targetView);
  };
  
  const handleDeleteGame = useCallback((gameId: string) => {
    if (window.confirm("Are you sure you want to delete this game? This action cannot be undone.")) {
        const updatedGames = availableGames.filter(g => g.id !== gameId);
        setAvailableGames(updatedGames);
        saveAvailableGames(updatedGames);
    }
  }, [availableGames]);

  const handleShareGameFromList = (gameId: string): Promise<{ copied: boolean; error?: any }> => {
    const game = availableGames.find(g => g.id === gameId);
    if (!game) {
      return Promise.resolve({ copied: false, error: 'Game not found' });
    }
    
    const jsonString = JSON.stringify(game);
    const compressed = lz.compressToEncodedURIComponent(jsonString);
    const url = `${window.location.origin}${window.location.pathname}#game=${compressed}`;

    return navigator.clipboard.writeText(url).then(() => {
      return { copied: true };
    }).catch(err => {
      console.error('Failed to copy share link: ', err);
      return { copied: false, error: err };
    });
  };

  const toggleSidebar = () => {
    setIsSidebarCollapsed(!isSidebarCollapsed);
  };

  const renderView = () => {
    switch (view) {
      case View.Maker:
        return <MakerView onGameCreated={handleGameCreated} setLogs={setAiLogs} aiSettings={aiSettings} />;
      case View.Player:
        return (
          <PlayerView
            availableGames={availableGames}
            history={gameHistory}
            onDeleteGame={handleDeleteGame}
            onShareGame={handleShareGameFromList}
            onGameEnd={handleGameEnd}
            isSidebarCollapsed={isSidebarCollapsed}
          />
        );
      case View.Help:
        return <HelpView />;
      case View.Settings:
      default:
        return (
          <SettingsView
            aiLogs={aiLogs}
            onClearData={handleClearData}
            theme={theme}
            onThemeChange={handleThemeChange}
            aiSettings={aiSettings}
            onAISettingsChange={handleAISettingsChange}
          />
        );
    }
  };

  return (
    <div className="flex h-screen">
      <Sidebar 
        currentView={view} 
        onNavigate={handleNavigate}
        isCollapsed={isSidebarCollapsed}
        onToggle={toggleSidebar}
      />
      <main className="flex-grow p-4 overflow-y-auto">
        {renderView()}
      </main>
    </div>
  );
}
