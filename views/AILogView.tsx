import React from 'react';

import AILog from '../components/AILog';
import { ArrowLeftIcon } from '../components/Icons';
import { useI18n } from '../hooks/useI18n';
import { AILogEntry } from '../types';

interface AILogViewProps {
  logs: AILogEntry[];
  onBack: () => void;
}

const AILogView: React.FC<AILogViewProps> = ({ logs, onBack }) => {
  const { t } = useI18n();
  return (
    <div className="flex flex-col h-full">
      <header className="flex items-center p-4 bg-sheet border-b border-ink/10">
        <button
          onClick={onBack}
          className="mr-4 p-2 rounded hover:bg-ink/5 transition-colors"
          aria-label={t('vocab.back')}
        >
          <ArrowLeftIcon />
        </button>
        <h1 className="text-xl font-semibold text-ink">{t('settings.aiLogs.title')}</h1>
      </header>
      <AILog logs={logs} />
    </div>
  );
};

export default AILogView;