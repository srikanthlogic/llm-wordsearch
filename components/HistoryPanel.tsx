
import React from 'react';

import { useI18n } from '../hooks/useI18n';
import type { GameHistory } from '../types';

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
            <h3 className="font-bold text-lg text-ink truncate pr-2">
              {item.theme}
            </h3>
            <div className="flex flex-wrap items-center gap-2 mt-1.5 text-sm">
              <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-ink/5 text-ink-soft font-medium">
                {levelsText}
              </span>
              <span className="w-1 h-1 rounded-full bg-ink/25"></span>
              <span className="text-ink-soft">{formattedDate}</span>
              <span className="w-1 h-1 rounded-full bg-ink/25"></span>
              <span className="text-ink-soft font-medium text-xs">
                {item.language}
              </span>
            </div>
          </div>

          <span
            className={`shrink-0 inline-flex items-center px-3 py-1.5 text-sm font-semibold rounded-xl transition-all duration-200 ${
              item.won
                ? 'bg-success/10 text-success border border-success/30'
                : 'bg-error/10 text-error border border-error/30'
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
    <div className="w-16 h-16 rounded-2xl bg-ink/5 border border-ink/10 flex items-center justify-center mb-4">
      <svg className="w-8 h-8 text-ink-faint" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    </div>
    <p className="text-ink-soft font-medium">{message}</p>
  </div>
);

const HistoryPanel: React.FC<HistoryPanelProps> = ({ history }) => {
  const { t } = useI18n();
  const sortedHistory = [...history].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();

    // #59: bucket by calendar day, not elapsed-ms rounding. Math.ceil on the
    // raw difference made "Today" unreachable — a game played seconds ago
    // rounded up to a 1-day diff and showed as "Yesterday". Aligning both
    // timestamps to local midnight gives an exact whole-day diff.
    const dayDiff = Math.round(
      (new Date(now.toDateString()).getTime() - new Date(date.toDateString()).getTime()) /
        (1000 * 60 * 60 * 24)
    );

    if (dayDiff === 0) {
      return t('player.history.today');
    } else if (dayDiff === 1) {
      return t('player.history.yesterday');
    } else if (dayDiff > 1 && dayDiff < 7) {
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
        <h2 className="text-xl sm:text-2xl font-bold font-display text-ink">
          {t('player.history.title')}
        </h2>
        <span className="text-sm font-medium px-3 py-1 rounded-full bg-ink/5 text-ink-soft">
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
