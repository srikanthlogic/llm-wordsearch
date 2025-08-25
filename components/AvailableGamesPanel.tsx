
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

  const getLevelsText = (game: GameDefinition) => {
    const count = game.levels.length;
    return count > 1 
      ? t('player.available.levels_plural', { count })
      : t('player.available.levels_singular', { count });
  };

  return (
    <div className="flex flex-col h-full">
      <h2 className="text-2xl font-bold text-purple-500 dark:text-purple-400 mb-4">{t('player.available.title')}</h2>
      {sortedGames.length > 0 ? (
        <ul className="space-y-3 overflow-y-auto pr-2 -mr-2 flex-grow">
          {sortedGames.map((game) => (
            <li key={game.id} className="bg-slate-200/50 dark:bg-slate-700/50 p-3 rounded-lg flex justify-between items-center">
              <div>
                <p className="font-bold text-lg text-slate-900 dark:text-slate-100">{game.theme}</p>
                <div className="text-sm text-slate-600 dark:text-slate-400 flex items-center gap-2">
                  <span>{getLevelsText(game)}</span>
                  <span className="text-slate-400 dark:text-slate-500">&middot;</span>
                  <span className="font-bold uppercase">{game.language}</span>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => onPlay(game.id)}
                  className="p-2 text-green-500 hover:text-green-600 dark:text-green-400 dark:hover:text-green-300 hover:bg-green-500/10 dark:hover:bg-green-900/50 rounded-full transition-colors"
                  title={t('player.available.playAria')}
                >
                  <PlayIcon />
                </button>
                 <button
                  onClick={() => onPrepareWorksheet(game.id)}
                  className="p-2 text-slate-500 hover:text-slate-600 dark:text-slate-400 dark:hover:text-slate-300 hover:bg-slate-500/10 dark:hover:bg-slate-900/50 rounded-full transition-colors"
                  title={t('player.available.downloadAria')}
                >
                  <DownloadIcon className="w-4 h-4" />
                </button>
                 <button
                  onClick={() => handleShare(game.id)}
                  className="p-2 text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 hover:bg-blue-500/10 dark:hover:bg-blue-900/50 rounded-full transition-colors relative"
                  title={t('player.available.shareAria')}
                >
                  <ShareIcon />
                  {copiedId === game.id && (
                    <span className="absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap text-xs bg-white dark:bg-slate-900 text-slate-900 dark:text-white px-2 py-1 rounded shadow-lg border border-slate-200 dark:border-slate-700">
                      {t('player.available.copied')}
                    </span>
                  )}
                </button>
                <button
                  onClick={() => onDelete(game.id)}
                  className="p-2 text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300 hover:bg-red-500/10 dark:hover:bg-red-900/50 rounded-full transition-colors"
                  title={t('player.available.deleteAria')}
                >
                  <TrashIcon />
                </button>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <div className="flex-grow flex items-center justify-center">
          <p className="text-slate-500">{t('player.available.noGames')}</p>
        </div>
      )}
    </div>
  );
};

export default AvailableGamesPanel;
