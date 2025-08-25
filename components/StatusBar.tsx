
import React from 'react';
import { TimerIcon, ListChecksIcon } from './Icons';
import { formatTime } from '../utils/formatters';
import { useI18n } from '../hooks/useI18n';

interface StatusBarProps {
  timeLeft: number;
  wordsFound: number;
  totalWords: number;
  onClick: () => void;
  isSidebarCollapsed: boolean;
}

const StatusBar: React.FC<StatusBarProps> = ({ timeLeft, wordsFound, totalWords, onClick, isSidebarCollapsed }) => {
  const { t } = useI18n();
  const timeColorClass = timeLeft < 60 ? 'text-red-500' : 'text-slate-800 dark:text-slate-200';
  const sidebarWidth = isSidebarCollapsed ? '5rem' : '16rem'; // w-20 or w-64

  return (
    <div
      className="fixed bottom-0 right-0 bg-slate-100/80 dark:bg-slate-800/80 backdrop-blur-sm border-t border-slate-200 dark:border-slate-700 h-16 flex items-center justify-around px-4 cursor-pointer hover:bg-slate-200/80 dark:hover:bg-slate-700/80 transition-colors z-20"
      onClick={onClick}
      style={{ left: sidebarWidth }}
    >
      <div className="flex items-center gap-2">
        <TimerIcon className="w-6 h-6 text-slate-500 dark:text-slate-400" />
        <span className={`text-lg font-mono font-bold ${timeColorClass}`}>
          {formatTime(timeLeft)}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <ListChecksIcon className="w-6 h-6 text-slate-500 dark:text-slate-400" />
        <span className="text-lg font-mono font-bold text-slate-800 dark:text-slate-200">
          {wordsFound} / {totalWords}
        </span>
        <span className="text-sm text-slate-600 dark:text-slate-400 hidden sm:inline">{t('statusbar.wordsFound')}</span>
      </div>
    </div>
  );
};

export default StatusBar;
