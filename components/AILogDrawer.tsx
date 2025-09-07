import React from 'react';
import { AILogEntry, AILogType, AILogStatus } from '../types';
import { XIcon, InfoIcon, CheckCircle2Icon, XCircleIcon, TimerIcon, Wand2Icon } from './Icons';

interface AILogDrawerProps {
  entry: AILogEntry | null;
  isOpen: boolean;
  onClose: () => void;
}

const AILogDrawer: React.FC<AILogDrawerProps> = ({ entry, isOpen, onClose }) => {
  if (!entry || !isOpen) return null;

  const getTypeIcon = (type: AILogType) => {
    switch (type) {
      case AILogType.Info:
        return <InfoIcon className="w-5 h-5" />;
      case AILogType.Error:
        return <XCircleIcon className="w-5 h-5" />;
      case AILogType.Warning:
        return <InfoIcon className="w-5 h-5" />;
      case AILogType.Request:
        return <Wand2Icon className="w-5 h-5" />;
      case AILogType.Response:
        return <CheckCircle2Icon className="w-5 h-5" />;
      default:
        return <InfoIcon className="w-5 h-5" />;
    }
  };

  const getStatusColor = (status: AILogStatus) => {
    switch (status) {
      case AILogStatus.Success:
        return 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20';
      case AILogStatus.Error:
        return 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20';
      case AILogStatus.Pending:
        return 'text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/20';
      case AILogStatus.InProgress:
        return 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20';
      default:
        return 'text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-900/20';
    }
  };

  const formatTimestamp = (timestamp: Date) => {
    return timestamp.toLocaleString();
  };

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="relative ml-auto w-full max-w-md bg-white dark:bg-slate-900 shadow-xl">
        <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            Log Details
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <XIcon className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-4 max-h-[calc(100vh-80px)] overflow-y-auto">
          {/* Header */}
          <div className="flex items-start gap-3">
            <div className={`p-2 rounded-lg ${getStatusColor(entry.status)}`}>
              {getTypeIcon(entry.type)}
            </div>
            <div className="flex-grow">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                  {entry.type}
                </span>
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(entry.status)}`}>
                  {entry.status.replace('_', ' ')}
                </span>
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                {formatTimestamp(entry.timestamp)}
              </p>
            </div>
          </div>

          {/* Message */}
          <div>
            <h3 className="text-sm font-medium text-slate-900 dark:text-slate-100 mb-2">
              Message
            </h3>
            <p className="text-sm text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800 p-3 rounded-lg whitespace-pre-wrap">
              {entry.message}
            </p>
          </div>

          {/* Details */}
          {entry.details && (
            <div>
              <h3 className="text-sm font-medium text-slate-900 dark:text-slate-100 mb-2">
                Details
              </h3>
              <pre className="text-xs text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800 p-3 rounded-lg overflow-x-auto whitespace-pre-wrap font-mono">
                {entry.details}
              </pre>
            </div>
          )}

          {/* Metadata */}
          {entry.metadata && Object.keys(entry.metadata).length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-slate-900 dark:text-slate-100 mb-2">
                Metadata
              </h3>
              <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded-lg">
                <pre className="text-xs text-slate-600 dark:text-slate-400 whitespace-pre-wrap font-mono">
                  {JSON.stringify(entry.metadata, null, 2)}
                </pre>
              </div>
            </div>
          )}

          {/* ID */}
          <div>
            <h3 className="text-sm font-medium text-slate-900 dark:text-slate-100 mb-2">
              Log ID
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-mono bg-slate-50 dark:bg-slate-800 p-2 rounded">
              {entry.id}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AILogDrawer;