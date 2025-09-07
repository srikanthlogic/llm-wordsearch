import React, { useRef, useEffect, useState, useMemo } from 'react';
import { AILogEntry, AILogType, AILogStatus } from '../types';
import AILogCard from './AILogCard';
import AILogDrawer from './AILogDrawer';
import AILogHeader from './AILogHeader';

interface AILogProps {
  logs: string[] | AILogEntry[];
}

const AILog: React.FC<AILogProps> = ({ logs }) => {
  const [selectedEntry, setSelectedEntry] = useState<AILogEntry | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<AILogType | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<AILogStatus | 'all'>('all');

  const logContainerRef = useRef<HTMLDivElement>(null);

  // Convert string logs to AILogEntry for backward compatibility
  const structuredLogs: AILogEntry[] = useMemo(() => {
    if (logs.length === 0) return [];

    if (typeof logs[0] === 'string') {
      // Convert string logs
      return (logs as string[]).map((log, index) => {
        let type = AILogType.Info;
        let status = AILogStatus.Success;

        if (log.startsWith('ERROR:')) {
          type = AILogType.Error;
          status = AILogStatus.Error;
        } else if (log.includes('RESPONSE')) {
          type = AILogType.Response;
        } else if (log.includes('PROVIDER') || log.includes('ENDPOINT') || log.includes('MODEL')) {
          type = AILogType.Request;
        }

        return {
          id: `legacy-${index}`,
          timestamp: new Date(),
          type,
          status,
          message: log,
        };
      });
    }

    return logs as AILogEntry[];
  }, [logs]);

  // Filter logs based on search and filters
  const filteredLogs = useMemo(() => {
    return structuredLogs.filter(entry => {
      const matchesSearch = searchQuery === '' ||
        entry.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (entry.details && entry.details.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesType = typeFilter === 'all' || entry.type === typeFilter;
      const matchesStatus = statusFilter === 'all' || entry.status === statusFilter;

      return matchesSearch && matchesType && matchesStatus;
    });
  }, [structuredLogs, searchQuery, typeFilter, statusFilter]);

  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [filteredLogs]);

  const handleCardClick = (entry: AILogEntry) => {
    setSelectedEntry(entry);
    setIsDrawerOpen(true);
  };

  const handleCloseDrawer = () => {
    setIsDrawerOpen(false);
    setSelectedEntry(null);
  };

  return (
    <div className="flex-grow flex flex-col min-h-0">
      <AILogHeader
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        typeFilter={typeFilter}
        onTypeFilterChange={setTypeFilter}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
      />

      <div
        ref={logContainerRef}
        className="bg-white dark:bg-slate-900 p-4 overflow-y-auto flex-grow border border-slate-200 dark:border-slate-700"
      >
        {filteredLogs.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-slate-500 dark:text-slate-400">
              {structuredLogs.length === 0
                ? "Generate a game to see AI interactions."
                : "No logs match your filters."
              }
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredLogs.map((entry) => (
              <AILogCard
                key={entry.id}
                entry={entry}
                onClick={handleCardClick}
                isSelected={selectedEntry?.id === entry.id}
              />
            ))}
          </div>
        )}
      </div>

      <AILogDrawer
        entry={selectedEntry}
        isOpen={isDrawerOpen}
        onClose={handleCloseDrawer}
      />
    </div>
  );
};

export default AILog;