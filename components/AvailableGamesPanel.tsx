
import React, { useState } from 'react';
import type { GameDefinition } from '../types';
import { PlayIcon, TrashIcon, ShareIcon, DownloadIcon } from './Icons';
import { useI18n } from '../hooks/useI18n';

interface AvailableGamesPanelProps {
  games: GameDefinition[];
  onPlay: (gameId: string) => void;
  onDelete: (gameId: string) => void;
  onShare: (gameId: string) => Promise<{ copied: boolean; error?: any }>;
  onPrepareWorksheet: (gameId: string) => void;
}

const GameCard: React.FC<{
  game: GameDefinition;
  onPlay: () => void;
  onDelete: () => void;
  onShare: () => void;
  onPrepareWorksheet: () => void;
  isCopied: boolean;
  copiedLabel: string;
  playAria: string;
  downloadAria: string;
  shareAria: string;
  deleteAria: string;
}> = ({ game, onPlay, onDelete, onShare, onPrepareWorksheet, isCopied, copiedLabel, playAria, downloadAria, shareAria, deleteAria }) => {
  const getLevelsText = (levels: number) => {
    return levels === 1 ? `${levels} level` : `${levels} levels`;
  };

  return (
    <li className="group animate-fade-in-up">
      <div className="card-elevated rounded-2xl p-4 transition-all duration-200 hover:shadow-lg">
        <div className="flex justify-between items-start sm:items-center gap-3">
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-lg text-slate-900 dark:text-slate-100 truncate pr-2">
              {game.theme}
            </h3>
            <div className="flex items-center gap-2 mt-1.5 text-sm">
              <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 font-medium">
                {getLevelsText(game.levels.length)}
              </span>
              <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-600"></span>
              <span className="text-slate-500 dark:text-slate-400 font-medium uppercase text-xs tracking-wide">
                {game.language}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={onPrepareWorksheet}
              className="p-2.5 text-slate-500 dark:text-slate-400 hover:text-purple-600 dark:hover:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-xl transition-all duration-200 group/btn"
              title={downloadAria}
            >
              <DownloadIcon className="w-4 h-4 transition-transform group-hover/btn:scale-110" />
            </button>
            <button
              onClick={onShare}
              className="p-2.5 text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-xl transition-all duration-200 relative group/btn"
              title={shareAria}
            >
              <ShareIcon className="w-4 h-4 transition-transform group-hover/btn:scale-110" />
              {isCopied && (
                <span className="absolute -top-10 left-1/2 -translate-x-1/2 whitespace-nowrap text-xs font-medium bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-2.5 py-1 rounded-lg shadow-xl animate-scale-in">
                  {copiedLabel}
                </span>
              )}
            </button>
            <button
              onClick={onDelete}
              className="p-2.5 text-slate-500 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all duration-200 group/btn"
              title={deleteAria}
            >
              <TrashIcon className="w-4 h-4 transition-transform group-hover/btn:scale-110" />
            </button>
            <button
              onClick={onPlay}
              className="ml-1 p-2.5 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white rounded-xl transition-all duration-200 shadow-md hover:shadow-lg group/btn"
              title={playAria}
            >
              <PlayIcon className="w-4 h-4 transition-transform group-hover/btn:scale-110" />
            </button>
          </div>
        </div>
      </div>
    </li>
  );
};

const EmptyState: React.FC<{ message: string }> = ({ message }) => (
  <div className="flex-grow flex flex-col items-center justify-center text-center px-6 animate-fade-in">
    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-100 to-pink-100 dark:from-purple-900/30 dark:to-pink-900/30 flex items-center justify-center mb-4">
      <svg className="w-8 h-8 text-purple-500 dark:text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
      </svg>
    </div>
    <p className="text-slate-500 dark:text-slate-400 font-medium">{message}</p>
  </div>
);

const AvailableGamesPanel: React.FC<AvailableGamesPanelProps> = ({ games, onPlay, onDelete, onShare, onPrepareWorksheet }) => {
  const { t } = useI18n();
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const sortedGames = [...games].sort((a, b) => (a.id < b.id ? 1 : -1));

  const handleShare = (gameId: string) => {
    onShare(gameId).then(result => {
      if (result.copied) {
        setCopiedId(gameId);
        setTimeout(() => setCopiedId(null), 2000);
      } else {
        alert(t('player.available.copyFailed'));
      }
    });
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl sm:text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-500 dark:from-purple-400 dark:to-pink-400">
          {t('player.available.title')}
        </h2>
        <span className="text-sm font-medium px-3 py-1 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300">
          {sortedGames.length}
        </span>
      </div>

      {sortedGames.length > 0 ? (
        <ul className="space-y-3 overflow-y-auto pr-2 -mr-2 flex-grow pb-2">
          {sortedGames.map((game, index) => (
            <GameCard
              key={game.id}
              game={game}
              onPlay={() => onPlay(game.id)}
              onDelete={() => onDelete(game.id)}
              onShare={() => handleShare(game.id)}
              onPrepareWorksheet={() => onPrepareWorksheet(game.id)}
              isCopied={copiedId === game.id}
              copiedLabel={t('player.available.copied')}
              playAria={t('player.available.playAria')}
              downloadAria={t('player.available.downloadAria')}
              shareAria={t('player.available.shareAria')}
              deleteAria={t('player.available.deleteAria')}
            />
          ))}
        </ul>
      ) : (
        <EmptyState message={t('player.available.noGames')} />
      )}
    </div>
  );
};

export default AvailableGamesPanel;
