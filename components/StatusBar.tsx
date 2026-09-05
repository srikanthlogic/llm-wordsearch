
import React from 'react';

import { useI18n } from '../hooks/useI18n';
import { formatTime } from '../utils/formatters';

import { TimerIcon, ListChecksIcon } from './Icons';

interface StatusBarProps {
  timeLeft: number;
  wordsFound: number;
  totalWords: number;
  onClick: () => void;
  isSidebarCollapsed: boolean;
}

const StatusBar: React.FC<StatusBarProps> = ({ timeLeft, wordsFound, totalWords, onClick, isSidebarCollapsed }) => {
  const { t } = useI18n();
  const timeColorClass = timeLeft < 60 ? 'text-error' : 'text-ink';
  const sidebarWidth = isSidebarCollapsed ? '5rem' : '16rem'; // w-20 or w-64

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onClick();
    }
  };

  return (
    <div
      className="fixed bottom-0 right-0 bg-sheet/85 backdrop-blur-sm border-t border-ink/10 h-12 sm:h-16 flex items-center justify-around px-2 sm:px-4 cursor-pointer hover:bg-ink/10 transition-colors z-20 pb-safe-bottom"
      onClick={onClick}
      onKeyDown={handleKeyDown}
      role="button"
      tabIndex={0}
      aria-label="Open status bar"
      style={{
        left: isSidebarCollapsed ? '0px' : sidebarWidth,
        bottom: isSidebarCollapsed ? 'calc(60px + env(safe-area-inset-bottom))' : 'env(safe-area-inset-bottom)'
      }}
    >
      <div className="flex items-center gap-1 sm:gap-2">
        <TimerIcon className="w-6 h-6 text-ink-soft" />
        <span className={`text-base sm:text-lg font-mono font-bold ${timeColorClass}`}>
          {formatTime(timeLeft)}
        </span>
      </div>
      <div className="flex items-center gap-1 sm:gap-2">
        <ListChecksIcon className="w-6 h-6 text-ink-soft" />
        <span className="text-base sm:text-lg font-mono font-bold text-ink">
          {wordsFound} / {totalWords}
        </span>
        <span className="text-sm text-ink-soft hidden sm:inline">{t('statusbar.wordsFound')}</span>
      </div>
    </div>
  );
};

export default StatusBar;
