import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { FeedbackProvider } from '../../components/Feedback';
import { AIProvider } from '../../types';
import type { Word, AIProviderSettings } from '../../types';
import MakerView from '../../views/MakerView';

const generateGameLevelsMock = vi.fn();
vi.mock('../../services/geminiService', () => ({
  generateGameLevels: (...args: unknown[]) => generateGameLevelsMock(...args),
}));

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
