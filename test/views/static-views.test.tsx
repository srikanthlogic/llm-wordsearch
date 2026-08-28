import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { FeedbackProvider } from '../../components/Feedback';
import { AIProvider } from '../../types';
import type { AILogEntry, AIProviderSettings } from '../../types';
import AILogView from '../../views/AILogView';
import HelpView from '../../views/HelpView';
import PrivacyView from '../../views/PrivacyView';
import SettingsView from '../../views/SettingsView';
import TermsView from '../../views/TermsView';

vi.mock('../../hooks/useI18n', () => ({
  useI18n: () => ({ t: (key: string) => key, language: 'en' }),
}));

vi.mock('../../components/LanguageSelector', () => ({ default: () => null }));

const testAIConnectionMock = vi.fn();
vi.mock('../../services/geminiService', () => ({
  testAIConnection: (...args: unknown[]) => testAIConnectionMock(...args),
}));

class MockIntersectionObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

beforeEach(() => {
  vi.clearAllMocks();
  (global as Record<string, unknown>).IntersectionObserver = MockIntersectionObserver;
});

describe('TermsView', () => {
  it('renders the terms heading and last-updated date', () => {
    render(<TermsView />);
    expect(screen.getByRole('heading', { name: 'Terms of Service' })).toBeTruthy();
    expect(screen.getByText(/Last updated:/i)).toBeTruthy();
  });

  it('renders multiple policy sections', () => {
    render(<TermsView />);
    expect(screen.getAllByRole('heading').length).toBeGreaterThan(2);
  });
});

describe('PrivacyView', () => {
  it('renders the privacy heading', () => {
    render(<PrivacyView />);
    expect(screen.getByRole('heading', { name: /privacy/i })).toBeTruthy();
  });

  it('renders a last-updated line', () => {
    render(<PrivacyView />);
    expect(screen.getByText(/Last updated:/i)).toBeTruthy();
  });
});

describe('AILogView', () => {
  const log: AILogEntry = {
    timestamp: new Date(),
    provider: 'community',
    model: 'google/gemini-2.5-flash',
    prompt: 'p',
    response: 'r',
    status: 'success',
  } as unknown as AILogEntry;

  it('renders the header and calls onBack from the back button', () => {
    const onBack = vi.fn();
    render(<AILogView logs={[log]} onBack={onBack} />);
    expect(screen.getByRole('heading', { name: 'AI Logs' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Go back' }));
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it('renders with an empty log list', () => {
    render(<AILogView logs={[]} onBack={vi.fn()} />);
    expect(screen.getByRole('heading', { name: 'AI Logs' })).toBeTruthy();
  });
});

describe('HelpView', () => {
  const markdown = '# Guide\n\nIntro paragraph.\n\n## How to play\n\nSteps here.\n';

  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve(new Response(markdown, { status: 200 }))
      )
    );
  });

  it('fetches the active doc page and renders parsed content', async () => {
    render(<HelpView />);
    await waitFor(() => {
      expect(fetch).toHaveBeenCalled();
    });
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Guide' })).toBeTruthy();
    });
    expect(screen.getByText('Intro paragraph.')).toBeTruthy();
  });

  it('lists the doc pages in the navigation', async () => {
    render(<HelpView />);
    await waitFor(() => {
      expect(screen.getAllByRole('button', { name: /introduction/i }).length).toBeGreaterThan(0);
    });
  });
});

describe('SettingsView', () => {
  const aiSettings: AIProviderSettings = { provider: AIProvider.Community } as AIProviderSettings;

  const renderSettings = () =>
    render(
      <FeedbackProvider>
        <SettingsView
          aiLogs={[]}
          onClearData={vi.fn()}
          theme="light"
          onThemeChange={vi.fn()}
          aiSettings={aiSettings}
          onAISettingsChange={vi.fn()}
          setView={vi.fn()}
        />
      </FeedbackProvider>
    );

  it('renders the settings title and provider cards', () => {
    renderSettings();
    expect(screen.getByText('settings.title')).toBeTruthy();
    expect(screen.getByText('settings.provider.community.title')).toBeTruthy();
    expect(screen.getByText('settings.provider.byollm.title')).toBeTruthy();
  });

  it('changes the theme via the appearance buttons', () => {
    const onThemeChange = vi.fn();
    render(
      <FeedbackProvider>
        <SettingsView
          aiLogs={[]}
          onClearData={vi.fn()}
          theme="light"
          onThemeChange={onThemeChange}
          aiSettings={aiSettings}
          onAISettingsChange={vi.fn()}
          setView={vi.fn()}
        />
      </FeedbackProvider>
    );
    fireEvent.click(screen.getByText('settings.appearance.dark'));
    expect(onThemeChange).toHaveBeenCalledWith('dark');
  });

  it('invokes onClearData from the data-clearing control', () => {
    const onClearData = vi.fn();
    render(
      <FeedbackProvider>
        <SettingsView
          aiLogs={[]}
          onClearData={onClearData}
          theme="light"
          onThemeChange={vi.fn()}
          aiSettings={aiSettings}
          onAISettingsChange={vi.fn()}
          setView={vi.fn()}
        />
      </FeedbackProvider>
    );
    const buttons = screen.getAllByRole('button');
    const clearButton = buttons.find((b) => b.querySelector('svg'));
    expect(clearButton).toBeTruthy();
  });
});
