import React from 'react';

import AILog from '../components/AILog';
import { ArrowLeftIcon } from '../components/Icons';
import { AILogEntry } from '../types';

interface AILogViewProps {
  logs: AILogEntry[];
  onBack: () => void;
}

const AILogView: React.FC<AILogViewProps> = ({ logs, onBack }) => {
  return (
    <div className="flex flex-col h-full">
      <header className="flex items-center p-4 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
        <button
          onClick={onBack}
          className="mr-4 p-2 rounded hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
          aria-label="Go back"
        >
          <ArrowLeftIcon />
        </button>
        <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">AI Logs</h1>
      </header>
      <AILog logs={logs} />
    </div>
  );
};

export default AILogView;