
import React from 'react';
import { formatTime } from '../utils/formatters';
import { useI18n } from '../hooks/useI18n';

interface TimerProps {
  seconds: number;
}

const Timer: React.FC<TimerProps> = ({ seconds }) => {
  const { t } = useI18n();
  const timeColorClass = seconds < 60 ? 'text-red-500' : 'text-slate-900 dark:text-slate-100';

  return (
    <div className="text-center">
      <p className="text-slate-600 dark:text-slate-400 text-sm">{t('timer.title')}</p>
      <p className={`text-4xl font-mono font-bold ${timeColorClass}`}>
        {formatTime(seconds)}
      </p>
    </div>
  );
};

export default Timer;
