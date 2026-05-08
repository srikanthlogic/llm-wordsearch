import React from 'react';

import { AILogEntry, AILogType, AILogStatus } from '../types';

import { InfoIcon, CheckCircle2Icon, XCircleIcon, Wand2Icon } from './Icons';

interface AILogCardProps {
  entry: AILogEntry;
  onClick: (entry: AILogEntry) => void;
  isSelected?: boolean;
}

const AILogCard: React.FC<AILogCardProps> = ({ entry, onClick, isSelected = false }) => {
  const getTypeIcon = (type: AILogType) => {
    switch (type) {
      case AILogType.Info:
        return <InfoIcon className="w-4 h-4" />;
      case AILogType.Error:
        return <XCircleIcon className="w-4 h-4" />;
      case AILogType.Warning:
        return <InfoIcon className="w-4 h-4" />;
      case AILogType.Request:
        return <Wand2Icon className="w-4 h-4" />;
      case AILogType.Response:
        return <CheckCircle2Icon className="w-4 h-4" />;
      default:
        return <InfoIcon className="w-4 h-4" />;
    }
  };

  const getStatusColor = (status: AILogStatus) => {
    switch (status) {
      case AILogStatus.Success:
        return 'text-green-600 dark:text-green-400';
      case AILogStatus.Error:
        return 'text-red-600 dark:text-red-400';
      case AILogStatus.Pending:
        return 'text-yellow-600 dark:text-yellow-400';
      case AILogStatus.InProgress:
        return 'text-blue-600 dark:text-blue-400';
      default:
        return 'text-slate-600 dark:text-slate-400';
    }
  };

  const formatTimestamp = (timestamp: Date) => {
    return timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onClick(entry);
    }
  };

  return (
    <div
      className={`p-2 sm:p-4 rounded-lg border cursor-pointer transition-all hover:shadow-md min-h-[44px] ${
        isSelected
          ? 'bg-purple-50 dark:bg-purple-900/20 border-purple-300 dark:border-purple-600'
          : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
      }`}
      onClick={() => onClick(entry)}
      onKeyDown={handleKeyDown}
      role="button"
      tabIndex={0}
    >
      <div className="flex items-start gap-2 sm:gap-3">
        <div className={`flex-shrink-0 mt-0.5 ${getStatusColor(entry.status)}`}>
          {getTypeIcon(entry.type)}
        </div>
        <div className="flex-grow min-w-0">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">
              {entry.type}
            </span>
            <span className="text-xs text-slate-400 dark:text-slate-500">
              {formatTimestamp(entry.timestamp)}
            </span>
          </div>
          <p className="text-sm text-slate-900 dark:text-slate-100 line-clamp-2">
            {entry.message}
          </p>
          {entry.details && (
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-1">
              {entry.details}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default AILogCard;