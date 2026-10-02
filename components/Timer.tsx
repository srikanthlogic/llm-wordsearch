
import React from 'react';

import { useI18n } from '../hooks/useI18n';
import { formatTime } from '../utils/formatters';

interface TimerProps {
  seconds: number;
}

const Timer: React.FC<TimerProps> = ({ seconds }) => {
  const { t } = useI18n();
  const timeColorClass = seconds < 60 ? 'text-error' : 'text-ink';

  return (
    <div className="text-center">
      <p className="text-ink-soft text-sm">{t('timer.title')}</p>
      <p className={`text-2xl sm:text-3xl md:text-4xl font-mono font-bold ${timeColorClass}`}>
        {formatTime(seconds)}
      </p>
    </div>
  );
};

export default Timer;
