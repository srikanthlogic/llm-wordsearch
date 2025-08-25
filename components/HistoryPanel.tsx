
import React from 'react';
import type { GameHistory } from '../types';
import { useI18n } from '../hooks/useI18n';

interface HistoryPanelProps {
  history: GameHistory[];
}

const HistoryPanel: React.FC<HistoryPanelProps> = ({ history }) => {
  const { t } = useI18n();
  const sortedHistory = [...history].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <div className="flex flex-col h-full">
      <h2 className="text-2xl font-bold text-purple-500 dark:text-purple-400 mb-4">{t('player.history.title')}</h2>
      {sortedHistory.length > 0 ? (
        <ul className="space-y-3 overflow-y-auto pr-2 -mr-2 flex-grow">
          {sortedHistory.map((item, index) => (
            <li key={index} className="bg-slate-200/50 dark:bg-slate-700/50 p-3 rounded-lg flex justify-between items-center">
              <div>
                <p className="font-bold text-lg text-slate-900 dark:text-slate-100">{item.theme}</p>
                <div className="text-sm text-slate-600 dark:text-slate-400 flex items-center gap-2">
                   <span>{t('player.history.levels', { completed: item.levelsCompleted, total: item.totalLevels })}</span>
                   <span className="text-slate-400 dark:text-slate-500">&middot;</span>
                   <span>{formatDate(item.date)}</span>
                   <span className="text-slate-400 dark:text-slate-500">&middot;</span>
                   <span className="font-bold uppercase">{item.language}</span>
                </div>
              </div>
              <span
                className={`px-3 py-1 text-sm font-bold rounded-full ${
                  item.won ? 'bg-green-500/20 text-green-600 dark:text-green-300' : 'bg-red-500/20 text-red-600 dark:text-red-300'
                }`}
              >
                {item.won ? t('player.history.won') : t('player.history.lost')}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <div className="flex-grow flex items-center justify-center">
          <p className="text-slate-500">{t('player.history.noGames')}</p>
        </div>
      )}
    </div>
  );
};

export default HistoryPanel;
