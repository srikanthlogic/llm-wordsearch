import React from 'react';
import { AILogType, AILogStatus } from '../types';

interface AILogHeaderProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  typeFilter: AILogType | 'all';
  onTypeFilterChange: (type: AILogType | 'all') => void;
  statusFilter: AILogStatus | 'all';
  onStatusFilterChange: (status: AILogStatus | 'all') => void;
}

const AILogHeader: React.FC<AILogHeaderProps> = ({
  searchQuery,
  onSearchChange,
  typeFilter,
  onTypeFilterChange,
  statusFilter,
  onStatusFilterChange,
}) => {
  return (
    <div className="flex flex-col sm:flex-row gap-4 p-4 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
      {/* Search */}
      <div className="flex-1">
        <input
          type="text"
          placeholder="Search logs..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-slate-100 placeholder-slate-500 dark:placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
        />
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        <select
          value={typeFilter}
          onChange={(e) => onTypeFilterChange(e.target.value as AILogType | 'all')}
          className="px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-purple-500"
        >
          <option value="all">All Types</option>
          <option value={AILogType.Info}>Info</option>
          <option value={AILogType.Error}>Error</option>
          <option value={AILogType.Warning}>Warning</option>
          <option value={AILogType.Request}>Request</option>
          <option value={AILogType.Response}>Response</option>
        </select>

        <select
          value={statusFilter}
          onChange={(e) => onStatusFilterChange(e.target.value as AILogStatus | 'all')}
          className="px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-purple-500"
        >
          <option value="all">All Status</option>
          <option value={AILogStatus.Success}>Success</option>
          <option value={AILogStatus.Error}>Error</option>
          <option value={AILogStatus.Pending}>Pending</option>
          <option value={AILogStatus.InProgress}>In Progress</option>
        </select>
      </div>
    </div>
  );
};

export default AILogHeader;