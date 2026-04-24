
import lz from 'lz-string';
import React, { useState, useEffect, useCallback } from 'react';

import BottomTabBar from './components/BottomTabBar';
import Sidebar from './components/Sidebar';
import { useI18n } from './hooks/useI18n';
import { loadGameHistory, saveGameHistory, clearApplicationData, saveAvailableGames, loadAvailableGames, saveTheme, loadTheme, loadAIProviderSettings, saveAIProviderSettings } from './services/storageService';
import { View, GameDefinition, GameHistory, Theme, AIProviderSettings, AILogEntry } from './types';
import AILogView from './views/AILogView';
import HelpView from './views/HelpView';
import MakerView from './views/MakerView';
import PlayerView from './views/PlayerView';
import PrivacyView from './views/PrivacyView';
import SettingsView from './views/SettingsView';


export default function App() {
  const [view, setView] = useState<View>(View.Maker);
  const [theme, setTheme] = useState<Theme>(loadTheme());
  const [aiSettings, setAiSettings] = useState<AIProviderSettings>(loadAIProviderSettings());
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // History and Library State
  const [gameHistory, setGameHistory] = useState<GameHistory[]>([]);
  const [availableGames, setAvailableGames] = useState<GameDefinition[]>([]);
  const [aiLogs, setAiLogs] = useState<AILogEntry[]>([]);

  const { language } = useI18n();

  useEffect(() => {
    const root = window.document.documentElement;
    root.lang = language;

    const applyTheme = () => {
        const isDark =
            theme === Theme.Dark ||
            (theme === Theme.System &&
            window.matchMedia('(prefers-color-scheme: dark)').matches);

        root.classList.toggle('dark', isDark);

        document.body.classList.toggle('dark', isDark);
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
    if (hash === '#privacy') {
      setView(View.Privacy);
      window.history.replaceState(null, '', window.location.pathname + window.location.search);
    } else if (hash.startsWith('#game=')) {
        try {
            const compressedData = hash.substring('#game='.length);
            const jsonString = lz.decompressFromEncodedURIComponent(compressedData);
            if (jsonString) {
                const loadedGame: GameDefinition = JSON.parse(jsonString);
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
      setAiSettings(loadAIProviderSettings());
      setView(View.Maker);
    }
  };

  const handleNavigate = (targetView: View) => {
    if (view === targetView) return;
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


  const renderView = () => {
    const viewClass = "animate-fade-in";
    switch (view) {
      case View.Maker:
        return <div key="maker" className={viewClass}><MakerView onGameCreated={handleGameCreated} setLogs={setAiLogs} aiSettings={aiSettings} /></div>;
      case View.Player:
        return (
          <div key="player" className={viewClass}>
            <PlayerView
              availableGames={availableGames}
              history={gameHistory}
              onDeleteGame={handleDeleteGame}
              onShareGame={handleShareGameFromList}
              onGameEnd={handleGameEnd}
              isSidebarCollapsed={isSidebarCollapsed}
            />
          </div>
        );
      case View.Help:
        return <div key="help" className={viewClass}><HelpView /></div>;
      case View.AILog:
        return <div key="ailog" className={viewClass}><AILogView logs={aiLogs} onBack={() => setView(View.Settings)} /></div>;
      case View.Privacy:
        return <div key="privacy" className={viewClass}><PrivacyView /></div>;
      case View.Settings:
      default:
        return (
          <div key="settings" className={viewClass}>
            <SettingsView
              aiLogs={aiLogs}
              onClearData={handleClearData}
              theme={theme}
              onThemeChange={handleThemeChange}
              aiSettings={aiSettings}
              onAISettingsChange={handleAISettingsChange}
              setView={setView}
            />
          </div>
        );
    }
  };

  return (
    <div className="flex flex-col md:flex-row h-screen overflow-hidden bg-gradient-to-br from-slate-50 via-white to-purple-50 dark:from-slate-950 dark:via-slate-900 dark:to-purple-950">
      {/* Desktop Sidebar */}
      <div className="hidden md:flex">
        <Sidebar
          currentView={view}
          onNavigate={handleNavigate}
          isCollapsed={isSidebarCollapsed}
          onToggle={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        />
      </div>

      {/* Mobile Bottom Tab Bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 safe-area-inset-bottom">
        <BottomTabBar
          currentView={view}
          onNavigate={handleNavigate}
          orientation="horizontal"
        />
      </div>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto overflow-x-hidden p-3 sm:p-4 lg:p-6 pb-24 md:pb-6 pt-safe-top">
        <div className="max-w-full">
          {renderView()}
        </div>
      </main>
    </div>
  );
}
