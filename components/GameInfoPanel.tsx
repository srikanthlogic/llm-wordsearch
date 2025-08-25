
import React from 'react';
import Timer from './Timer';
import WordList from './WordList';
import { RefreshCwIcon, EyeIcon, XIcon } from './Icons';
import type { PlacedWord } from '../types';
import { useI18n } from '../hooks/useI18n';

interface GameInfoPanelProps {
  isOpen: boolean;
  onClose: () => void;
  words: PlacedWord[];
  timeLeft: number;
  onNewGame: () => void;
  onShowAnswers: () => void;
  canShowAnswers: boolean;
  isSidebarCollapsed: boolean;
}

const GameInfoPanel: React.FC<GameInfoPanelProps> = ({
  isOpen,
  onClose,
  words,
  timeLeft,
  onNewGame,
  onShowAnswers,
  canShowAnswers,
  isSidebarCollapsed
}) => {
  const { t } = useI18n();
  const sidebarWidth = isSidebarCollapsed ? '5rem' : '16rem'; // w-20 or w-64

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed top-0 bottom-0 right-0 bg-black bg-opacity-50 z-30 transition-opacity duration-300 ease-in-out ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
        aria-hidden="true"
        style={{ left: sidebarWidth }}
      ></div>

      {/* Panel */}
      <aside
        className={`fixed top-0 right-0 h-full w-full max-w-sm bg-slate-100 dark:bg-slate-800 shadow-2xl z-40 transform transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="game-info-panel-title"
      >
        <div className="p-6 h-full flex flex-col">
          <div className="flex justify-between items-center mb-4">
            <h2 id="game-info-panel-title" className="text-2xl font-bold text-purple-500 dark:text-purple-400">
              {t('gameInfo.title')}
            </h2>
            <div className="flex gap-2 items-center text-slate-500 dark:text-slate-400">
                <button 
                  onClick={onNewGame} 
                  className="p-2 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition" 
                  title={t('gameInfo.newGameAria')}
                >
                  <RefreshCwIcon />
                </button>
                {canShowAnswers && (
                  <button 
                    onClick={onShowAnswers} 
                    className="p-2 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition" 
                    title={t('gameInfo.showAnswersAria')}
                  >
                    <EyeIcon />
                  </button>
                )}
                 <button 
                  onClick={onClose} 
                  className="p-2 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition" 
                  title={t('gameInfo.closeAria')}
                  aria-label={t('gameInfo.closeAria')}
                >
                  <XIcon />
                </button>
            </div>
          </div>
          <Timer seconds={timeLeft} />
          <div className="border-t border-slate-200 dark:border-slate-700 my-4"></div>
          <WordList words={words} />
        </div>
      </aside>
    </>
  );
};

export default GameInfoPanel;
