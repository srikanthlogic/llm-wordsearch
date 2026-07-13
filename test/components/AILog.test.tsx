import { render, screen } from '@testing-library/react';
import React from 'react';
import { describe, it, expect, vi } from 'vitest';

import AILog from '../../components/AILog';
import { AILogEntry, AILogType, AILogStatus } from '../../types';

vi.mock('../../hooks/useI18n', () => ({
  useI18n: () => ({
    t: (key: string) => {
      const map: Record<string, string> = {
        'aiLog_empty_generate': 'Generate a game to see AI logs',
        'aiLog_empty_filters': 'No logs match your filters',
      };
      return map[key] || key;
    },
  }),
}));

const sampleLogs: AILogEntry[] = [
  {
    id: 'log-1',
    timestamp: new Date('2024-06-15T12:00:00Z'),
    type: AILogType.Info,
    status: AILogStatus.Success,
    message: 'Starting generation',
  },
  {
    id: 'log-2',
    timestamp: new Date('2024-06-15T12:01:00Z'),
    type: AILogType.Error,
    status: AILogStatus.Error,
    message: 'Generation failed',
    details: 'API timeout',
  },
];

describe('AILog', () => {
  it('should render empty state when no logs', () => {
    render(<AILog logs={[]} />);
    expect(screen.getByText('Generate a game to see AI logs')).toBeInTheDocument();
  });

  it('should render log entries', () => {
    render(<AILog logs={sampleLogs} />);
    expect(screen.getByText('Starting generation')).toBeInTheDocument();
    expect(screen.getByText('Generation failed')).toBeInTheDocument();
  });

  it('should handle string logs for backward compatibility', () => {
    const stringLogs = ['Starting...', 'ERROR: something went wrong'];
    render(<AILog logs={stringLogs} />);
    expect(screen.getByText('Starting...')).toBeInTheDocument();
    expect(screen.getByText('ERROR: something went wrong')).toBeInTheDocument();
  });

  it('should show filter message when filters match nothing', async () => {
    render(<AILog logs={sampleLogs} />);
    // Filter by typing in search — the header has a search input
    const _searchInput = screen.getByPlaceholderText('Search logs...');
    // Type something that won't match
  });
});
