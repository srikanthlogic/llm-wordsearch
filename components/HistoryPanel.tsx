
import React from 'react';
import type { GameHistory } from '../types';
import { useI18n } from '../hooks/useI18n';

interface HistoryPanelProps {
  history: GameHistory[];
}

const HistoryCard: React.FC<{
  item: GameHistory;
  levelsText: string;
  formattedDate: string;
  wonLabel: string;
  lostLabel: string;
}> = ({ item, levelsText, formattedDate, wonLabel, lostLabel }) => {
  return (
    <li className="group animate-fade-in-up">
      <div className="card-elevated rounded-2xl p-4 transition-all duration-200 hover:shadow-lg">
        <div className="flex justify-between items-start sm:items-center gap-3">
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-lg text-slate-900 dark:text-slate-100 truncate pr-2">
              {item.theme}
            </h3>
            <div className="flex flex-wrap items-center gap-2 mt-1.5 text-sm">
              <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-700/50 text-slate-600 dark:text-slate-400 font-medium">
                {levelsText}
              </span>
              <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-600"></span>
              <span className="text-slate-500 dark:text-slate-400">{formattedDate}</span>
              <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-600"></span>
              <span className="text-slate-500 dark:text-slate-400 font-medium uppercase text-xs tracking-wide">
                {item.language}
              </span>
            </div>
          </div>

          <span
            className={`shrink-0 inline-flex items-center px-3 py-1.5 text-sm font-semibold rounded-xl transition-all duration-200 ${
              item.won
                ? 'bg-gradient-to-r from-green-500/10 to-emerald-500/10 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800'
                : 'bg-gradient-to-r from-red-500/10 to-rose-500/10 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800'
            }`}
          >
            {item.won ? (
              <svg className="w-4 h-4 mr-1.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            ) : (
              <svg className="w-4 h-4 mr-1.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            )}
            {item.won ? wonLabel : lostLabel}
          </span>
        </div>
      </div>
    </li>
  );
};

const EmptyState: React.FC<{ message: string }> = ({ message }) => (
  <div className="flex-grow flex flex-col items-center justify-center text-center px-6 animate-fade-in">
    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700 flex items-center justify-center mb-4">
      <svg className="w-8 h-8 text-slate-400 dark:text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    </div>
    <p className="text-slate-500 dark:text-slate-400 font-medium">{message}</p>
  </div>
);

const HistoryPanel: React.FC<HistoryPanelProps> = ({ history }) => {
  const { t } = useI18n();
  const sortedHistory = [...history].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return t('player.history.today') || 'Today';
    } else if (diffDays === 1) {
      return t('player.history.yesterday') || 'Yesterday';
    } else if (diffDays < 7) {
      return date.toLocaleDateString(undefined, { weekday: 'long' });
    } else {
      return date.toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl sm:text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-500 dark:from-purple-400 dark:to-pink-400">
          {t('player.history.title')}
        </h2>
        <span className="text-sm font-medium px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-700/50 text-slate-600 dark:text-slate-400">
          {sortedHistory.length}
        </span>
      </div>

      {sortedHistory.length > 0 ? (
        <ul className="space-y-3 overflow-y-auto pr-2 -mr-2 flex-grow pb-2">
          {sortedHistory.map((item, index) => (
            <HistoryCard
              key={index}
              item={item}
              levelsText={t('player.history.levels', { completed: item.levelsCompleted, total: item.totalLevels })}
              formattedDate={formatDate(item.date)}
              wonLabel={t('player.history.won')}
              lostLabel={t('player.history.lost')}
            />
          ))}
        </ul>
      ) : (
        <EmptyState message={t('player.history.noGames')} />
      )}
    </div>
  );
};

export default HistoryPanel;
