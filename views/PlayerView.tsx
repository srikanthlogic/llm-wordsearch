import React, { useState, useEffect, useCallback } from 'react';

import AvailableGamesPanel from '../components/AvailableGamesPanel';
import { useFeedback } from '../components/Feedback';
import GameInfoPanel from '../components/GameInfoPanel';
import HistoryPanel from '../components/HistoryPanel';
import { ArrowLeftIcon } from '../components/Icons';
import PrintWorksheet from '../components/PrintWorksheet';
import StatusBar from '../components/StatusBar';
import WordSearchGrid from '../components/WordSearchGrid';
import { WORD_COLORS } from '../constants';
import { useI18n } from '../hooks/useI18n';
import { GameState, Grid, PlacedWord, GameDefinition, GameHistory } from '../types';
import { generatePuzzle } from '../utils/wordSearchGenerator';

interface PlayerViewProps {
  availableGames: GameDefinition[];
  /** Game decoded from a shared link: played immediately, not in the library. */
  sharedGame?: GameDefinition | null;
  history: GameHistory[];
  onDeleteGame: (gameId: string) => void;
  onShareGame: (gameId: string) => Promise<{ copied: boolean; error?: any }>;
  onGameEnd: (result: Omit<GameHistory, 'date'>) => void;
  isSidebarCollapsed?: boolean;
}

const GameBoard: React.FC<{
  gameDefinition: GameDefinition;
  onGameEnd: (result: Omit<GameHistory, 'date'>) => void;
  /** Logs the run result WITHOUT tearing the board down (victory actions). */
  onRunEnd: (result: Omit<GameHistory, 'date'>) => void;
  onVictoryDismiss: () => void;
  onExit: () => void;
  isSidebarCollapsed: boolean;
}> = ({ gameDefinition, onGameEnd, onRunEnd, onVictoryDismiss, onExit, isSidebarCollapsed }) => {
  const { t } = useI18n();
  const [gameState, setGameState] = useState<GameState>(GameState.Playing);
  const [currentLevelIndex, setCurrentLevelIndex] = useState(0);

  const [grid, setGrid] = useState<Grid | null>(null);
  const [words, setWords] = useState<PlacedWord[]>([]);
  const [timeLeft, setTimeLeft] = useState<number>(600);
  const [deadline, setDeadline] = useState<number>(0);

  const [isInfoPanelOpen, setIsInfoPanelOpen] = useState(false);
  const [setupError, setSetupError] = useState<string | null>(null);
  // #63: the completed run's result, held until the victory overlay's action
  // logs it — the board must stay mounted so the win is actually celebrated.
  const [finalResult, setFinalResult] = useState<Omit<GameHistory, 'date'> | null>(null);
  const [runStartedAt, setRunStartedAt] = useState<number>(() => Date.now());

  const handleTimeUp = useCallback(() => {
    if (gameState === GameState.Playing) {
      setGameState(GameState.Lost);
    }
  }, [gameState]);

  const setupLevel = useCallback((levelIndex: number) => {
    const level = gameDefinition.levels[levelIndex];
    if (!level) {
      throw new Error(`Level ${levelIndex + 1} is missing from this game.`);
    }

    const puzzle = generatePuzzle(level.words.map(w => w.word), level.gridSize, gameDefinition.language);
    const placedWordsWithHints = puzzle.placedWords.map((placedWord, index) => {
      const originalWord = level.words.find(gw => gw.word.toUpperCase() === placedWord.text.toUpperCase());
      return {
        ...placedWord,
        hint: originalWord?.hint || "No hint available.",
        found: false,
        color: WORD_COLORS[index % WORD_COLORS.length],
      };
    });

    setWords(placedWordsWithHints);
    setGrid(puzzle.grid);
    setCurrentLevelIndex(levelIndex);
    if (levelIndex === 0) {
      setRunStartedAt(Date.now());
    }
    setTimeLeft(level.timeLimitSeconds);
    setDeadline(Date.now() + level.timeLimitSeconds * 1000);
    setGameState(GameState.Playing);
    setIsInfoPanelOpen(false);
  }, [gameDefinition]);

  useEffect(() => {
    try {
      setupLevel(0);
    } catch (e) {
      // Never render a silently blank board: surface the failure so the
      // player can leave instead of staring at an empty game view.
      console.error('Failed to set up level 0:', e);
      setSetupError((e as Error)?.message ?? String(e));
    }
  }, [setupLevel]);

  useEffect(() => {
    if (gameState !== GameState.Playing || !deadline) return;

    const tick = () => {
      const remaining = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
      setTimeLeft(remaining);
      if (remaining <= 0) {
        handleTimeUp();
      }
    };

    tick();
    const timerId = setInterval(tick, 500);

    return () => clearInterval(timerId);
  }, [gameState, deadline, handleTimeUp]);

  const handleWordFound = (word: string) => {
    let anyWordFound = false;
    const newWords = words.map(w => {
      if (w.text.toUpperCase() === word.toUpperCase() && !w.found) {
        anyWordFound = true;
        return { ...w, found: true };
      }
      return w;
    });

    if (anyWordFound) {
      setWords(newWords);
    }
  };

  useEffect(() => {
    if (gameState !== GameState.Playing || words.length === 0 || !words.every(w => w.found)) {
        return;
    }

    const isLastLevel = currentLevelIndex >= gameDefinition.levels.length - 1;
    if (isLastLevel) {
      // #63: hold the result for the victory overlay's action buttons; the
      // run is logged once when the player picks one.
      setFinalResult({
        theme: gameDefinition.theme,
        language: gameDefinition.language,
        levelsCompleted: gameDefinition.levels.length,
        totalLevels: gameDefinition.levels.length,
        won: true,
      });
    }
    setGameState(GameState.Won);
  }, [words, gameState, currentLevelIndex, gameDefinition]);

  const handlePlayAgain = () => {
    if (finalResult) onRunEnd(finalResult);
    setFinalResult(null);
    setupLevel(0);
  };

  const handleVictoryExit = () => {
    if (finalResult) onRunEnd(finalResult);
    setFinalResult(null);
    onVictoryDismiss();
  };


  const showAnswers = () => {
    setGameState(GameState.ShowingAnswers);
    setIsInfoPanelOpen(false);
  };

  const renderLevelCompleteOverlay = () => {
    if (gameState !== GameState.Won || currentLevelIndex >= gameDefinition.levels.length - 1) return null;

    const handleEndGame = () => {
        onGameEnd({
            theme: gameDefinition.theme,
            language: gameDefinition.language,
            levelsCompleted: currentLevelIndex + 1,
            totalLevels: gameDefinition.levels.length,
            won: false,
        });
    };

    return (
      <div className="absolute inset-0 bg-slate-900/80 dark:bg-black/90 backdrop-blur-sm flex flex-col items-center justify-center z-20 gap-6 animate-fade-in">
        <div className="text-center">
          <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center shadow-xl animate-scale-in">
            <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-2 text-white">{t('game.levelComplete')}</h2>
          <p className="text-slate-300 dark:text-slate-400 text-lg">Level {currentLevelIndex + 1} of {gameDefinition.levels.length}</p>
        </div>
        <div className="flex gap-4">
          <button
            onClick={() => setupLevel(currentLevelIndex + 1)}
            className="px-8 py-4 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 rounded-2xl text-white font-bold text-lg transition-all duration-200 shadow-lg hover:shadow-xl hover:-translate-y-0.5 min-h-[56px]"
          >
            {t('game.nextLevel')}
          </button>
          <button
            onClick={handleEndGame}
            className="px-8 py-4 bg-slate-600 hover:bg-slate-700 dark:bg-slate-700 dark:hover:bg-slate-600 rounded-2xl text-white font-bold text-lg transition-all duration-200 shadow-lg hover:shadow-xl min-h-[56px]"
          >
            {t('game.endGame')}
          </button>
        </div>
      </div>
    );
  };

  const renderGameOverOverlay = () => {
    if (gameState !== GameState.Lost) return null;

    const handleExitAndLog = () => {
      onGameEnd({
        theme: gameDefinition.theme,
        language: gameDefinition.language,
        levelsCompleted: currentLevelIndex,
        totalLevels: gameDefinition.levels.length,
        won: false,
      });
    };

    return (
      <div className="absolute inset-0 bg-slate-900/80 dark:bg-black/90 backdrop-blur-sm flex flex-col items-center justify-center z-20 gap-6 animate-fade-in">
        <div className="text-center">
          <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-red-400 to-rose-500 flex items-center justify-center shadow-xl animate-scale-in">
            <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-2 text-white">{t('game.timesUp')}</h2>
          <p className="text-slate-300 dark:text-slate-400 text-lg">{t('game.answersRevealed')}</p>
        </div>
        <button
          onClick={handleExitAndLog}
          className="px-8 py-4 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 rounded-2xl text-white font-bold text-lg transition-all duration-200 shadow-lg hover:shadow-xl hover:-translate-y-0.5 min-h-[56px]"
        >
          {t('game.backToList')}
        </button>
      </div>
    );
  };

  // #63: full-run victory screen — the game ends here, celebrated.
  const renderVictoryOverlay = () => {
    if (gameState !== GameState.Won || !finalResult) return null;

    const elapsedSeconds = Math.max(0, Math.round((Date.now() - runStartedAt) / 1000));
    const minutes = String(Math.floor(elapsedSeconds / 60)).padStart(2, '0');
    const seconds = String(elapsedSeconds % 60).padStart(2, '0');

    return (
      <div className="absolute inset-0 bg-slate-900/80 dark:bg-black/90 backdrop-blur-sm flex flex-col items-center justify-center z-20 gap-6 animate-fade-in">
        <div className="text-center">
          <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-amber-300 to-yellow-500 flex items-center justify-center shadow-xl animate-scale-in">
            <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
            </svg>
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-2 text-white">{t('game.victory.title')}</h2>
          <p className="text-slate-300 dark:text-slate-400 text-lg">{t('game.victory.subtitle')}</p>
        </div>
        <div className="flex gap-3 text-center">
          <div className="px-6 py-3 rounded-xl bg-white/10 backdrop-blur">
            <p className="text-2xl font-bold text-white">{minutes}:{seconds}</p>
            <p className="text-xs uppercase tracking-wide text-slate-300 dark:text-slate-400">{t('game.victory.statTime')}</p>
          </div>
          <div className="px-6 py-3 rounded-xl bg-white/10 backdrop-blur">
            <p className="text-2xl font-bold text-white">{words.length}</p>
            <p className="text-xs uppercase tracking-wide text-slate-300 dark:text-slate-400">{t('game.victory.statWords')}</p>
          </div>
        </div>
        <div className="flex gap-4">
          <button
            onClick={handlePlayAgain}
            className="px-8 py-4 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 rounded-2xl text-white font-bold text-lg transition-all duration-200 shadow-lg hover:shadow-xl hover:-translate-y-0.5 min-h-[56px]"
          >
            {t('game.victory.playAgain')}
          </button>
          <button
            onClick={handleVictoryExit}
            className="px-8 py-4 bg-slate-600 hover:bg-slate-700 dark:bg-slate-700 dark:hover:bg-slate-600 rounded-2xl text-white font-bold text-lg transition-all duration-200 shadow-lg hover:shadow-xl min-h-[56px]"
          >
            {t('game.victory.backToGames')}
          </button>
        </div>
      </div>
    );
  };

  if (setupError) {
    return (
      <div
        role="alert"
        className="w-full max-w-md mx-auto mt-16 flex flex-col items-center text-center gap-4 card-elevated rounded-2xl shadow-xl p-8"
      >
        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-rose-400 to-red-500 flex items-center justify-center shadow-lg">
          <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">{t('game.setupError')}</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 break-words">{setupError}</p>
        <button
          onClick={onExit}
          className="px-6 py-3 bg-purple-600 hover:bg-purple-700 rounded-xl text-white font-semibold transition-colors min-h-[44px]"
        >
          {t('game.backToList')}
        </button>
      </div>
    );
  }

  if (!grid) {
    return null;
  }

  const wordsFoundCount = words.filter(w => w.found).length;

  return (
    <div className="w-full max-w-4xl mx-auto flex flex-col items-center h-full relative pb-20 pt-safe-top pb-safe-bottom">
      <header className="w-full text-center mb-6 relative">
        <button
          onClick={onExit}
          className="absolute left-0 top-1/2 -translate-y-1/2 p-3 text-slate-500 dark:text-slate-400 hover:text-purple-600 dark:hover:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 active:bg-purple-100 dark:active:bg-purple-900/30 rounded-xl transition-all min-h-[44px]"
          title={t('game.backToListAria')}
        >
          <ArrowLeftIcon />
        </button>
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-600 via-pink-500 to-purple-600 dark:from-purple-400 dark:via-pink-400 dark:to-purple-400">
          {gameDefinition.theme}
        </h1>
        <div className="flex items-center justify-center gap-2 mt-2">
          <span className="inline-flex items-center px-3 py-1 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 font-semibold text-sm">
            Level {currentLevelIndex + 1} of {gameDefinition.levels.length}
          </span>
        </div>
      </header>

      <div className="flex-grow flex items-center justify-center w-full">
        <WordSearchGrid
          grid={grid}
          words={words.map(w => w.text)}
          onWordFound={handleWordFound}
          showAnswers={gameState === GameState.ShowingAnswers || gameState === GameState.Lost}
          placedWords={words}
          language={gameDefinition.language}
        />
      </div>

      {renderLevelCompleteOverlay()}
      {renderGameOverOverlay()}
      {renderVictoryOverlay()}

      <StatusBar
        timeLeft={timeLeft}
        wordsFound={wordsFoundCount}
        totalWords={words.length}
        onClick={() => setIsInfoPanelOpen(true)}
        isSidebarCollapsed={isSidebarCollapsed}
      />

      <GameInfoPanel
        isOpen={isInfoPanelOpen}
        onClose={() => setIsInfoPanelOpen(false)}
        words={words}
        timeLeft={timeLeft}
        onNewGame={onExit}
        onShowAnswers={showAnswers}
        canShowAnswers={gameState === GameState.Playing}
        isSidebarCollapsed={isSidebarCollapsed}
      />
    </div>
  );
};


const PlayerView: React.FC<PlayerViewProps> = (props) => {
    const { confirm: confirmDialog } = useFeedback();
    const { t } = useI18n();
    // A shared-link game starts the session right away, even though it is
    // not part of availableGames.
    const [playingGame, setPlayingGame] = useState<GameDefinition | null>(props.sharedGame ?? null);
    const [worksheetGame, setWorksheetGame] = useState<GameDefinition | null>(null);
    const [activeTab, setActiveTab] = useState<'games' | 'history'>('games');

    const handlePlayGame = (gameId: string) => {
        const gameToPlay = props.availableGames.find(g => g.id === gameId);
        if (gameToPlay) {
            setPlayingGame(gameToPlay);
        }
    };

    const handlePrepareWorksheet = (gameId: string) => {
        const gameToPrepare = props.availableGames.find(g => g.id === gameId);
        if (gameToPrepare) {
            setWorksheetGame(gameToPrepare);
        }
    };

    const handleGameEnd = (result: Omit<GameHistory, 'date'>) => {
        props.onGameEnd(result);
        setPlayingGame(null);
    };

    const handleExitGame = async () => {
        if (await confirmDialog({ title: t('game.exitConfirm'), danger: true })) {
             props.onGameEnd({
                theme: playingGame!.theme,
                language: playingGame!.language,
                levelsCompleted: 0,
                totalLevels: playingGame!.levels.length,
                won: false,
            });
            setPlayingGame(null);
        }
    };

    if (worksheetGame) {
        return <PrintWorksheet game={worksheetGame} onBack={() => setWorksheetGame(null)} />;
    }

    if (playingGame) {
        return (
            <GameBoard
                gameDefinition={playingGame}
                onGameEnd={handleGameEnd}
                onRunEnd={props.onGameEnd}
                onVictoryDismiss={() => setPlayingGame(null)}
                onExit={handleExitGame}
                isSidebarCollapsed={props.isSidebarCollapsed}
            />
        );
    }

    return (
        <div className="w-full max-w-4xl mx-auto flex flex-col h-full overflow-x-hidden animate-fade-in">
            <header className="w-full text-center mb-6">
                <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-600 via-pink-500 to-purple-600 dark:from-purple-400 dark:via-pink-400 dark:to-purple-400">
                    {t('player.title')}
                </h1>
                <p className="text-slate-600 dark:text-slate-400 mt-2">{t('player.subtitle')}</p>
            </header>

            <div className="card-elevated rounded-2xl shadow-xl flex flex-col flex-grow min-h-0 animate-fade-in-up">
                <div className="flex border-b border-slate-200 dark:border-slate-700">
                    <button
                      onClick={() => setActiveTab('games')}
                      className={`flex-1 py-4 px-6 text-sm font-semibold transition-all duration-200 min-h-[48px] relative ${
                        activeTab === 'games'
                          ? 'text-purple-600 dark:text-purple-400'
                          : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
                      }`}
                    >
                        {t('player.tabs.games')}
                        {activeTab === 'games' && (
                          <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full" />
                        )}
                    </button>
                    <button
                      onClick={() => setActiveTab('history')}
                      className={`flex-1 py-4 px-6 text-sm font-semibold transition-all duration-200 min-h-[48px] relative ${
                        activeTab === 'history'
                          ? 'text-purple-600 dark:text-purple-400'
                          : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
                      }`}
                    >
                        {t('player.tabs.history')}
                        {activeTab === 'history' && (
                          <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full" />
                        )}
                    </button>
                </div>
                <div className="flex-grow min-h-0 p-4 sm:p-6">
                    {activeTab === 'games' && (
                        <AvailableGamesPanel
                            games={props.availableGames}
                            onPlay={handlePlayGame}
                            onDelete={props.onDeleteGame}
                            onShare={props.onShareGame}
                            onPrepareWorksheet={handlePrepareWorksheet}
                        />
                    )}
                    {activeTab === 'history' && <HistoryPanel history={props.history} />}
                </div>
            </div>
        </div>
    );
};

export default PlayerView;
