import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { FeedbackProvider } from '../../components/Feedback';
import { InstanceConfigProvider } from '../../hooks/useInstanceConfig';
import { AIProvider } from '../../types';
import type { AIProviderSettings } from '../../types';
import AuthorView from '../../views/AuthorView';

const proposeMock = vi.fn();
vi.mock('../../services/geminiService', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../services/geminiService')>();
  return {
    ...actual,
    proposeCorpusEntries: (...args: unknown[]) => proposeMock(...args),
  };
});

// Keep the real module exports (corpusService consumes isSupportedLocale)
// and only stub the hook.
vi.mock('../../hooks/useI18n', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../hooks/useI18n')>();
  return {
    ...actual,
    useI18n: () => ({
      t: (key: string, replacements?: Record<string, string | number>) =>
        replacements && 'count' in replacements ? `${key}:${replacements.count}` : key,
    }),
  };
});

const aiSettings: AIProviderSettings = { provider: AIProvider.Community };

const proposal = (term: string) => ({
  term,
  gloss: `Gloss for ${term}.`,
  context: `Context for ${term}.`,
  usage: `Use ${term}.`,
  related: [],
});

function renderAuthor() {
  return render(
    <InstanceConfigProvider>
      <FeedbackProvider>
        <AuthorView setLogs={vi.fn()} aiSettings={aiSettings} onOpenAiLogs={vi.fn()} />
      </FeedbackProvider>
    </InstanceConfigProvider>,
  );
}

beforeEach(() => {
  window.localStorage.clear();
  proposeMock.mockReset();
});

describe('AuthorView', () => {
  it('renders the domain form and empty drafts list', () => {
    renderAuthor();
    expect(screen.getByText('author.title')).toBeInTheDocument();
    expect(screen.getByText('author.drafts.empty')).toBeInTheDocument();
  });

  it('blocks proposing without a domain title', () => {
    renderAuthor();
    fireEvent.click(screen.getByText('author.propose'));
    expect(proposeMock).not.toHaveBeenCalled();
  });

  it('fills the entry editor with proposals and slugifies the domain', async () => {
    proposeMock.mockResolvedValue([proposal('interchange'), proposal('mandate')]);
    renderAuthor();
    fireEvent.change(screen.getByLabelText('author.domain.title'), {
      target: { value: 'Payments & Cashless Living' },
    });
    fireEvent.click(screen.getByText('author.propose'));
    await waitFor(() =>
      expect(screen.getAllByLabelText('author.entry.term')).toHaveLength(2),
    );
    expect(screen.getByLabelText('author.domain.slug')).toHaveValue('payments-cashless-living');
    expect(screen.getByText('author.proposed:2')).toBeInTheDocument();
  });

  it('rejects an invalid domain (too few entries) without persisting', () => {
    renderAuthor();
    fireEvent.change(screen.getByLabelText('author.domain.title'), { target: { value: 'Payments' } });
    fireEvent.click(screen.getByText('author.entry.add'));
    fireEvent.click(screen.getByText('author.save'));
    expect(screen.getByText('author.validation.errorHeading')).toBeInTheDocument();
    expect(screen.getByText('author.drafts.empty')).toBeInTheDocument();
  });

  it('saves a valid domain to the draft corpus', async () => {
    proposeMock.mockResolvedValue([
      proposal('interchange'), proposal('mandate'), proposal('settlement'), proposal('upi'),
    ]);
    renderAuthor();
    fireEvent.change(screen.getByLabelText('author.domain.title'), { target: { value: 'Payments' } });
    fireEvent.click(screen.getByText('author.propose'));
    await waitFor(() => expect(screen.getByText('author.save')).toBeInTheDocument());
    fireEvent.click(screen.getByText('author.save'));
    // The drafts list re-renders with the saved domain (not the empty state).
    expect(screen.queryByText('author.drafts.empty')).not.toBeInTheDocument();
    expect(screen.getByText('Payments')).toBeInTheDocument();
  });

  it('exports a domain via a JSON download', async () => {
    const clickSpy = vi.fn();
    const createObjectURLSpy = vi.fn(() => 'blob:mock');
    vi.stubGlobal('URL', Object.assign(URL, { createObjectURL: createObjectURLSpy, revokeObjectURL: vi.fn() }));
    HTMLAnchorElement.prototype.click = clickSpy;

    proposeMock.mockResolvedValue([
      proposal('interchange'), proposal('mandate'), proposal('settlement'), proposal('upi'),
    ]);
    renderAuthor();
    fireEvent.change(screen.getByLabelText('author.domain.title'), { target: { value: 'Payments' } });
    fireEvent.click(screen.getByText('author.propose'));
    await waitFor(() => expect(screen.getByText('author.save')).toBeInTheDocument());
    fireEvent.click(screen.getByText('author.save'));
    fireEvent.click(screen.getByText('author.export'));

    expect(clickSpy).toHaveBeenCalled();
    expect(createObjectURLSpy).toHaveBeenCalled();
    vi.unstubAllGlobals();
  });
});
