import { render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { FeedbackProvider } from '../../components/Feedback';
import { InstanceConfigProvider } from '../../hooks/useInstanceConfig';
import { clearCorpusCache } from '../../services/corpusLoader';
import VocabView from '../../views/VocabView';

vi.mock('../../hooks/useI18n', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../hooks/useI18n')>();
  return {
    ...actual,
    useI18n: () => ({
      language: 'en',
      setLanguage: vi.fn(),
      t: (key: string, replacements?: Record<string, string | number>) =>
        replacements && 'count' in replacements ? `${key}:${replacements.count}` : key,
    }),
  };
});

function stubCorpus() {
  global.fetch = vi.fn().mockImplementation((url: string) => {
    if (url.includes('wordkey.config.json')) {
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ mode: 'serve' }) });
    }
    if (url.includes('corpus/manifest.json')) {
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ domains: ['payments'] }) });
    }
    if (url.includes('/payments.json')) {
      return Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            domain: 'payments',
            title: 'Payments & Cashless Living',
            blurb: 'How money moves without cash.',
            locale: 'en',
            entries: [
              {
                term: 'interchange',
                gloss: 'Fee merchant bank pays cardholder bank.',
                context: 'Policy flashpoint under zero MDR.',
                usage: 'Explain interchange vs MDR.',
                related: ['MDR'],
              },
              {
                term: 'mandate',
                gloss: 'Standing debit instruction.',
                context: 'Auto-pay in banking; collection rail in lending.',
                usage: 'Walk through a failed mandate retry.',
                related: [],
              },
              {
                term: 'settlement',
                gloss: 'Money movement between banks after clearing.',
                context: 'Spendable in dashboards; netting at the central bank.',
                usage: 'Explain the two-day settlement gap.',
                related: [],
              },
              {
                term: 'chargeback',
                gloss: 'Forced reversal initiated by the cardholder bank.',
                context: 'Consumer protection; merchant dispute cost.',
                usage: 'Draft a pre-chargeback email.',
                related: [],
              },
            ],
          }),
      });
    }
    return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
  }) as any;
}

afterEach(() => {
  vi.restoreAllMocks();
  clearCorpusCache();
});

describe('VocabView (#104)', () => {
  it('renders every domain and entry as a readable glossary', async () => {
    stubCorpus();
    render(
      <InstanceConfigProvider>
        <FeedbackProvider>
          <VocabView onBack={vi.fn()} />
        </FeedbackProvider>
      </InstanceConfigProvider>,
    );
    expect(await screen.findByText('Payments & Cashless Living')).toBeInTheDocument();
    expect(screen.getByText('Policy flashpoint under zero MDR.')).toBeInTheDocument();
    expect(screen.getByText('mandate')).toBeInTheDocument();
    expect(screen.getByText('vocab.entriesCount:4')).toBeInTheDocument();
  });

  it('navigates back', async () => {
    stubCorpus();
    const onBack = vi.fn();
    render(
      <InstanceConfigProvider>
        <FeedbackProvider>
          <VocabView onBack={onBack} />
        </FeedbackProvider>
      </InstanceConfigProvider>,
    );
    await screen.findByText('Payments & Cashless Living');
    screen.getByLabelText('vocab.back').click();
    expect(onBack).toHaveBeenCalled();
  });

  it('shows the empty state when no corpus is available', async () => {
    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes('wordkey.config.json')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ mode: 'serve' }) });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    }) as any;
    render(
      <InstanceConfigProvider>
        <FeedbackProvider>
          <VocabView onBack={vi.fn()} />
        </FeedbackProvider>
      </InstanceConfigProvider>,
    );
    await waitFor(() => expect(screen.getByText('vocab.empty')).toBeInTheDocument());
  });
});
