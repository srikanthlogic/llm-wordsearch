import React, { useState, useEffect, useCallback } from 'react';
import { GameState, Grid, PlacedWord, GameDefinition, GameHistory } from '../types';
import { generatePuzzle } from '../utils/wordSearchGenerator';
import { WORD_COLORS } from '../constants';
import WordSearchGrid from '../components/WordSearchGrid';
import GameInfoPanel from '../components/GameInfoPanel';
import StatusBar from '../components/StatusBar';
import HistoryPanel from '../components/HistoryPanel';
import AvailableGamesPanel from '../components/AvailableGamesPanel';
import { ArrowLeftIcon } from '../components/Icons';
import PrintWorksheet from '../components/PrintWorksheet';
import { useI18n } from '../hooks/useI18n';

interface PlayerViewProps {
  availableGames: GameDefinition[];
  history: GameHistory[];
  onDeleteGame: (gameId: string) => void;
  onShareGame: (gameId: string) => Promise<{ copied: boolean; error?: any }>;
  onGameEnd: (result: Omit<GameHistory, 'date'>) => void;
  isSidebarCollapsed: boolean;
}

const GameBoard: React.FC<{
  gameDefinition: GameDefinition;
  onGameEnd: (result: Omit<GameHistory, 'date'>) => void;
  onExit: () => void;
  isSidebarCollapsed: boolean;
}> = ({ gameDefinition, onGameEnd, onExit, isSidebarCollapsed }) => {
  const { t } = useI18n();
  const [gameState, setGameState] = useState<GameState>(GameState.Playing);
  const [currentLevelIndex, setCurrentLevelIndex] = useState(0);

  const [grid, setGrid] = useState<Grid | null>(null);
  const [words, setWords] = useState<PlacedWord[]>([]);
  const [timeLeft, setTimeLeft] = useState<number>(600);
  
  const [isInfoPanelOpen, setIsInfoPanelOpen] = useState(false);

  const handleTimeUp = useCallback(() => {
    if (gameState === GameState.Playing) {
      setGameState(GameState.Lost);
    }
  }, [gameState]);

  const setupLevel = useCallback((levelIndex: number) => {
    const level = gameDefinition.levels[levelIndex];
    if (!level) return;

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
    setTimeLeft(level.timeLimitSeconds);
    setGameState(GameState.Playing);
    setIsInfoPanelOpen(false);
  }, [gameDefinition]);

  useEffect(() => {
    setupLevel(0);
  }, [setupLevel]);

  useEffect(() => {
    if (gameState !== GameState.Playing) return;

    if (timeLeft <= 0) {
      handleTimeUp();
      return;
    }

    const timerId = setInterval(() => {
      setTimeLeft(prevTime => prevTime - 1);
    }, 1000);

    return () => clearInterval(timerId);
  }, [gameState, timeLeft, handleTimeUp]);

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
      onGameEnd({
        theme: gameDefinition.theme,
        language: gameDefinition.language,
        levelsCompleted: gameDefinition.levels.length,
        totalLevels: gameDefinition.levels.length,
        won: true,
      });
      setGameState(GameState.Won); // Set final win state
    } else {
      setGameState(GameState.Won); // This is for level complete, not game complete
    }
  }, [words, gameState, currentLevelIndex, gameDefinition, onGameEnd]);


  const showAnswers = () => {
    setGameState(GameState.ShowingAnswers);
    setIsInfoPanelOpen(false);
  };

  const renderLevelCompleteOverlay = () => {
    // Show only if a level is won and it's not the final level
    if (gameState !== GameState.Won || currentLevelIndex >= gameDefinition.levels.length - 1) return null;

    const handleEndGame = () => {
        onGameEnd({
            theme: gameDefinition.theme,
            language: gameDefinition.language,
            levelsCompleted: currentLevelIndex + 1,
            totalLevels: gameDefinition.levels.length,
            won: false, // Not a full game win
        });
    };

    return (
      <div className="absolute inset-0 bg-black bg-opacity-70 flex flex-col items-center justify-center z-20 gap-4">
        <h2 className="text-6xl font-bold mb-4 text-white">{t('game.levelComplete')}</h2>
        <div className="flex gap-4">
            <button
              onClick={() => setupLevel(currentLevelIndex + 1)}
              className="px-6 py-3 bg-green-600 hover:bg-green-700 rounded-lg text-white font-bold text-xl transition-transform transform hover:scale-105"
            >
              {t('game.nextLevel')}
            </button>
            <button
              onClick={handleEndGame}
              className="px-6 py-3 bg-slate-600 hover:bg-slate-700 rounded-lg text-white font-bold text-xl transition-transform transform hover:scale-105"
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
      <div className="absolute inset-0 bg-black bg-opacity-70 flex flex-col items-center justify-center z-20 gap-4">
        <h2 className="text-6xl font-bold mb-4 text-white">{t('game.timesUp')}</h2>
        <p className="text-xl text-slate-300 mb-4">{t('game.answersRevealed')}</p>
        <button
          onClick={handleExitAndLog}
          className="px-6 py-3 bg-purple-600 hover:bg-purple-700 rounded-lg text-white font-bold text-xl transition-transform transform hover:scale-105"
        >
          {t('game.backToList')}
        </button>
      </div>
    );
  };

  if (!grid) {
    return null;
  }
  
  const wordsFoundCount = words.filter(w => w.found).length;

  return (
    <div className="w-full max-w-4xl mx-auto flex flex-col items-center h-full relative pb-20">
      <header className="w-full text-center mb-4 relative">
         <button 
            onClick={onExit} 
            className="absolute left-0 top-1/2 -translate-y-1/2 p-2 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition"
            title={t('game.backToListAria')}
        >
            <ArrowLeftIcon />
        </button>
        <h1 className="text-4xl md:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-500 to-pink-600">
          {gameDefinition.theme}
        </h1>
        <p className="text-slate-600 dark:text-slate-400">{t('game.levelOf', { current: currentLevelIndex + 1, total: gameDefinition.levels.length })}</p>
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
}


const PlayerView: React.FC<PlayerViewProps> = (props) => {
    const { t } = useI18n();
    const [playingGame, setPlayingGame] = useState<GameDefinition | null>(null);
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
        setPlayingGame(null); // Return to the list view
    };
    
    const handleExitGame = () => {
        if (window.confirm(t('game.exitConfirm'))) {
             props.onGameEnd({
                theme: playingGame!.theme,
                language: playingGame!.language,
                levelsCompleted: 0, // Assuming they exited without completing the current level
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
                onExit={handleExitGame}
                isSidebarCollapsed={props.isSidebarCollapsed}
            />
        );
    }
    
    const tabButtonClasses = (tabName: 'games' | 'history') => `px-4 py-2 text-sm font-medium rounded-t-lg transition-colors focus:outline-none ${
      activeTab === tabName
        ? 'border-b-2 border-purple-500 text-slate-900 dark:text-white'
        : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
    }`;


    return (
        <div className="w-full max-w-4xl mx-auto flex flex-col h-full">
            {worksheetGame && <PrintWorksheet game={worksheetGame} onBack={() => setWorksheetGame(null)} />}
            <header className="w-full text-center mb-4">
                <h1 className="text-4xl md:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-500 to-pink-600">
                    {t('player.title')}
                </h1>
                <p className="text-slate-600 dark:text-slate-400">{t('player.subtitle')}</p>
            </header>
            <div className="bg-slate-100 dark:bg-slate-800 rounded-lg shadow-2xl p-6 flex flex-col flex-grow min-h-0">
                <div className="flex border-b border-slate-200 dark:border-slate-700 -mx-6 px-6">
                    <button onClick={() => setActiveTab('games')} className={tabButtonClasses('games')}>
                        {t('player.tabs.games')}
                    </button>
                    <button onClick={() => setActiveTab('history')} className={tabButtonClasses('history')}>
                        {t('player.tabs.history')}
                    </button>
                </div>
                <div className="flex-grow min-h-0 mt-4">
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