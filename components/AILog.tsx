import React, { useRef, useEffect } from 'react';

interface AILogProps {
  logs: string[];
}

const AILog: React.FC<AILogProps> = ({ logs }) => {
  const logContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs]);

  return (
    <div className="flex-grow flex flex-col min-h-0">
      <div ref={logContainerRef} className="bg-white dark:bg-slate-900 p-3 rounded-md overflow-y-auto h-48 flex-grow border border-slate-200 dark:border-slate-700">
        {logs.map((log, index) => (
          <div key={index} className="mb-2 border-b border-slate-200 dark:border-slate-700 pb-2 last:border-b-0">
            <pre className="text-xs text-slate-600 dark:text-slate-400 whitespace-pre-wrap font-mono">
              {log}
            </pre>
          </div>
        ))}
        {logs.length === 0 && <p className="text-sm text-slate-500">Generate a game to see AI interactions.</p>}
      </div>
    </div>
  );
};

export default AILog;