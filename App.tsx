
import lz from 'lz-string';
import React, { useState, useEffect, useCallback } from 'react';

import BottomTabBar from './components/BottomTabBar';
import { useFeedback } from './components/Feedback';
import Sidebar from './components/Sidebar';
import { useI18n } from './hooks/useI18n';
import { loadGameHistory, saveGameHistory, clearApplicationData, saveAvailableGames, loadAvailableGames, saveTheme, loadTheme, loadAIProviderSettings, saveAIProviderSettings, MAX_GAME_HISTORY, MAX_SAVED_GAMES } from './services/storageService';
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
  // Shared-link game: held in memory only (never persisted, never merged
  // into the library) and handed straight to the player session.
  const [sharedGame, setSharedGame] = useState<GameDefinition | null>(null);
  const [aiLogs, setAiLogs] = useState<AILogEntry[]>([]);

  const { language, t } = useI18n();
  const { toast, confirm: confirmDialog } = useFeedback();

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
                    // Play the shared game in-memory only. We deliberately do NOT
                    // merge it into `availableGames` or persist it to localStorage:
                    // a shared link is an invite to play once, not an opt-in to
                    // keep the game around forever. Users who want to keep it can
                    // use the in-app Save action after the session starts.
                    setSharedGame(loadedGame);
                    setGameHistory(loadGameHistory());
                    setAvailableGames(loadAvailableGames());
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
            toast(t('share.error.invalidLink'), 'error');
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
    const updatedHistory = [...gameHistory, newHistoryEntry].slice(-MAX_GAME_HISTORY);
    setGameHistory(updatedHistory);
    saveGameHistory(updatedHistory);
  }, [gameHistory]);

  const handleGameCreated = useCallback((newGameDefinition: GameDefinition) => {
      const updatedAvailableGames = [...availableGames, newGameDefinition].slice(-MAX_SAVED_GAMES);
      setAvailableGames(updatedAvailableGames);
      saveAvailableGames(updatedAvailableGames);
  }, [availableGames]);

  const handleGameEnd = useCallback((result: Omit<GameHistory, 'date'>) => {
    addGameToHistory(result);
    // The shared-link session is over — drop it so returning to the Player
    // view shows the library instead of restarting the shared game.
    setSharedGame(null);
  }, [addGameToHistory]);

  const handleClearData = async () => {
    const confirmed = await confirmDialog({
      title: t('settings.data.clearConfirmTitle'),
      message: t('settings.data.clearConfirmMessage'),
      confirmLabel: t('settings.data.clearConfirmButton'),
      danger: true,
    });
    if (confirmed) {
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

  const handleDeleteGame = useCallback(async (gameId: string) => {
    const confirmed = await confirmDialog({
      title: t('player.available.deleteConfirmTitle'),
      message: t('player.available.deleteConfirmMessage'),
      confirmLabel: t('player.available.deleteConfirmButton'),
      danger: true,
    });
    if (confirmed) {
        const updatedGames = availableGames.filter(g => g.id !== gameId);
        setAvailableGames(updatedGames);
        saveAvailableGames(updatedGames);
    }
  }, [availableGames, confirmDialog]);

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
              sharedGame={sharedGame}
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
