import { render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { FeedbackProvider } from '../../components/Feedback';
import { AIProvider, Theme, View, type AIProviderSettings } from '../../types';

const getAllowedCommunityModels = vi.fn();

vi.mock('../../services/modelAllowlist', () => ({
  getAllowedCommunityModels: (...args: unknown[]) => getAllowedCommunityModels(...args),
}));

import SettingsView from '../../views/SettingsView';

vi.mock('../../hooks/useI18n', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../hooks/useI18n')>();
  return {
    ...actual,
    useI18n: () => ({
      language: 'en',
      setLanguage: vi.fn(),
      t: (key: string) => key,
    }),
  };
});

const baseSettings: AIProviderSettings = {
  provider: AIProvider.Community,
  communityModel: 'vendor/saved-model:free',
  byollm: { providerName: 'OpenRouter', apiKey: '', baseURL: 'https://openrouter.ai/api/v1', modelName: '' },
};

function renderSettings() {
  render(
    <FeedbackProvider>
      <SettingsView
        aiLogs={[]}
        onClearData={vi.fn()}
        theme={Theme.System}
        onThemeChange={vi.fn()}
        aiSettings={baseSettings}
        onAISettingsChange={vi.fn()}
        setView={vi.fn()}
      />
    </FeedbackProvider>,
  );
}

afterEach(() => {
  getAllowedCommunityModels.mockReset();
  window.localStorage.clear();
});

// #142: when /allowed-models cannot be reached the community dropdown used
// to show "Loading models…" forever. It must fall back to the saved model.
describe('SettingsView community model dropdown (#142)', () => {
  it('falls back to the saved model when the allowlist fetch fails', async () => {
    getAllowedCommunityModels.mockResolvedValue(null);
    renderSettings();
    await waitFor(() => {
      expect(screen.getByRole('option', { name: 'vendor/saved-model:free' })).toBeTruthy();
    });
    expect(screen.queryByRole('option', { name: 'settings.byollm.modelsLoading' })).toBeNull();
  });

  it('offers the server allowlist when the fetch succeeds', async () => {
    getAllowedCommunityModels.mockResolvedValue({
      models: ['vendor/b', 'vendor/a'],
      default: 'vendor/a',
    });
    renderSettings();
    await waitFor(() => {
      expect(screen.getByRole('option', { name: 'vendor/b' })).toBeTruthy();
    });
    expect(screen.getByRole('option', { name: 'vendor/a' })).toBeTruthy();
  });
});
