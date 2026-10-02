import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { FeedbackProvider } from '../../components/Feedback';
import { extractErrorReason } from '../../services/geminiService';
import { AIProvider } from '../../types';
import type { Word, AIProviderSettings } from '../../types';
import MakerView from '../../views/MakerView';

const generateGameLevelsMock = vi.fn();
vi.mock('../../services/geminiService', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../services/geminiService')>();
  return {
    ...actual,
    generateGameLevels: (...args: unknown[]) => generateGameLevelsMock(...args),
  };
});

vi.mock('../../hooks/useI18n', () => ({
  useI18n: () => ({ t: (key: string) => key }),
}));

vi.mock('../../components/LanguageSelector', () => ({ default: () => null }));

const aiSettings: AIProviderSettings = { provider: AIProvider.Community };

const words = (prefix: string, count: number): Word[] =>
  Array.from({ length: count }, (_, i) => ({ word: `${prefix}${i}`, hint: `hint ${i}` }));

const renderMaker = () =>
  render(
    <FeedbackProvider>
      <MakerView
        onGameCreated={vi.fn()}
        setLogs={vi.fn()}
        aiSettings={aiSettings}
      />
    </FeedbackProvider>
  );

describe('MakerView level generation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    generateGameLevelsMock.mockResolvedValue([words('A', 5)]);
  });

  it('requests all levels in one batched call', async () => {
    generateGameLevelsMock.mockResolvedValue([words('A', 5), words('B', 5)]);

    renderMaker();
    fireEvent.change(screen.getByLabelText('maker.levelsLabel'), { target: { value: '2' } });
    fireEvent.change(screen.getByLabelText('maker.themeLabel'), { target: { value: 'space' } });
    fireEvent.click(screen.getByRole('button', { name: /maker\.generateButton/i }));

    await waitFor(() => {
      expect(generateGameLevelsMock).toHaveBeenCalledTimes(1);
    });
    expect(generateGameLevelsMock).toHaveBeenCalledWith(
      expect.objectContaining({ theme: 'space', levelCount: 2 })
    );
  });

  it('tops up missing levels with follow-up single-level calls', async () => {
    generateGameLevelsMock
      .mockResolvedValueOnce([words('A', 5)])
      .mockResolvedValue([words('B', 5)]);

    renderMaker();
    fireEvent.change(screen.getByLabelText('maker.levelsLabel'), { target: { value: '3' } });
    fireEvent.change(screen.getByLabelText('maker.themeLabel'), { target: { value: 'space' } });
    fireEvent.click(screen.getByRole('button', { name: /maker\.generateButton/i }));

    await waitFor(() => {
      expect(generateGameLevelsMock).toHaveBeenCalledTimes(3);
    });
    expect(generateGameLevelsMock).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ levelCount: 3 })
    );
    expect(generateGameLevelsMock).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ levelCount: 1 })
    );
    expect(generateGameLevelsMock).toHaveBeenNthCalledWith(
      3,
      expect.objectContaining({ levelCount: 1 })
    );
  });
});

// #65: a failed generation must leave a persistent, accurate diagnostics
// path — an "Open AI Log" action near the Generate button, not just a toast.
describe('MakerView generation error diagnostics (#65)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderMakerWithNav = (onOpenAiLogs = vi.fn()) => {
    render(
      <FeedbackProvider>
        <MakerView
          onGameCreated={vi.fn()}
          setLogs={vi.fn()}
          aiSettings={aiSettings}
          onOpenAiLogs={onOpenAiLogs}
        />
      </FeedbackProvider>
    );
    return onOpenAiLogs;
  };

  const submitTheme = () => {
    const input = screen.getByPlaceholderText(/theme/i) ?? screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'Space' } });
    fireEvent.click(screen.getByRole('button', { name: /maker.generateButton/i }));
  };

  it('shows the Open AI Log action after a failure and navigates on click', async () => {
    generateGameLevelsMock.mockRejectedValue(new Error('API request failed with status 400. Model "x" is not allowed.'));
    const onOpenAiLogs = renderMakerWithNav();
    submitTheme();

    await waitFor(() => expect(screen.getByRole('button', { name: /maker.error.openAiLogs/i })).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /maker.error.openAiLogs/i }));
    expect(onOpenAiLogs).toHaveBeenCalledTimes(1);
  });

  it('hides the action again once a regeneration succeeds', async () => {
    generateGameLevelsMock.mockRejectedValueOnce(new Error('boom'));
    generateGameLevelsMock.mockResolvedValue([words('A', 5)]);
    renderMakerWithNav();
    submitTheme();
    await waitFor(() => expect(screen.getByRole('button', { name: /maker.error.openAiLogs/i })).toBeInTheDocument());

    submitTheme();
    await waitFor(() => expect(screen.queryByRole('button', { name: /maker.error.openAiLogs/i })).toBeNull());
  });
});

// #65: proxy error bodies must be distilled into a short, user-safe reason.
describe('extractErrorReason (#65)', () => {
  it('extracts the proxy error field from a JSON body', () => {
    const body = JSON.stringify({ error: 'Model "gpt-9" is not allowed. Permitted models: a, b' });
    expect(extractErrorReason(400, body)).toBe(
      'API request failed with status 400. Model "gpt-9" is not allowed. Permitted models: a, b'
    );
  });

  it('falls back to the generic status line for non-JSON or empty bodies', () => {
    expect(extractErrorReason(500, '<html>gateway junk</html>')).toBe('API request failed with status 500.');
    expect(extractErrorReason(502, '')).toBe('API request failed with status 502.');
  });

  it('truncates oversized reasons to keep toasts readable', () => {
    const body = JSON.stringify({ error: 'x'.repeat(500) });
    const message = extractErrorReason(400, body);
    expect(message.startsWith('API request failed with status 400. ')).toBe(true);
    expect(message.length).toBeLessThan(250);
  });
});
