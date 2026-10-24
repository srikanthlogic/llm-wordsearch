import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { FeedbackProvider } from '../../components/Feedback';
import { InstanceConfigProvider } from '../../hooks/useInstanceConfig';
import OwnerGate, { OWNER_TOKEN_KEY } from '../../views/OwnerGate';

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

vi.mock('../../services/geminiService', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../services/geminiService')>();
  return { ...actual, proposeCorpusEntries: vi.fn() };
});

function renderGate() {
  return render(
    <InstanceConfigProvider>
      <FeedbackProvider>
        <OwnerGate setLogs={vi.fn()} aiSettings={{ provider: 'community' as any }} onOpenAiLogs={vi.fn()} />
      </FeedbackProvider>
    </InstanceConfigProvider>,
  );
}

afterEach(() => {
  vi.restoreAllMocks();
  window.sessionStorage.clear();
});

describe('OwnerGate (#123)', () => {
  it('shows the token form when no token is stored', () => {
    renderGate();
    expect(screen.getByText('owner.title')).toBeInTheDocument();
  });

  it('shows the disabled copy when the endpoint does not exist (404)', async () => {
    global.fetch = vi.fn().mockResolvedValue(new Response('Not found', { status: 404 })) as any;
    renderGate();
    fireEvent.change(screen.getByLabelText('owner.tokenLabel'), { target: { value: 'whatever' } });
    fireEvent.click(screen.getByText('owner.unlock'));
    await screen.findByText('owner.disabledTitle');
    expect(screen.queryByText('owner.unlocked')).not.toBeInTheDocument();
  });

  it('unlocks with a valid token and renders the AuthorView', async () => {
    global.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ enabled: true, backend: 'local' }), { status: 200 }),
    ) as any;
    renderGate();
    fireEvent.change(screen.getByLabelText('owner.tokenLabel'), { target: { value: 'secret' } });
    fireEvent.click(screen.getByText('owner.unlock'));
    await screen.findByText('author.title');
    expect(window.sessionStorage.getItem(OWNER_TOKEN_KEY)).toBe('secret');
  });

  it('rejects a bad token without storing it', async () => {
    global.fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: 'auth' }), { status: 401 })) as any;
    renderGate();
    fireEvent.change(screen.getByLabelText('owner.tokenLabel'), { target: { value: 'wrong' } });
    fireEvent.click(screen.getByText('owner.unlock'));
    await waitFor(() => expect(screen.getByText('owner.invalid')).toBeInTheDocument());
    expect(window.sessionStorage.getItem(OWNER_TOKEN_KEY)).toBeNull();
  });

  // #156: a 5xx (e.g. the production /api/admin/corpus outage) says nothing
  // about the token — the gate must say "server problem" instead of "token
  // not accepted", and the boot check must not destroy a possibly-valid
  // stored token.
  it('shows the service-error state, not "invalid", when the endpoint 500s', async () => {
    global.fetch = vi.fn().mockResolvedValue(new Response('boom', { status: 500 })) as any;
    renderGate();
    fireEvent.change(screen.getByLabelText('owner.tokenLabel'), { target: { value: 'good-token' } });
    fireEvent.click(screen.getByText('owner.unlock'));
    await waitFor(() => expect(screen.getByText('owner.serviceError')).toBeInTheDocument());
    expect(screen.queryByText('owner.invalid')).not.toBeInTheDocument();
    expect(window.sessionStorage.getItem(OWNER_TOKEN_KEY)).toBeNull();
  });

  it('keeps a stored token when the boot check hits a 5xx', async () => {
    window.sessionStorage.setItem(OWNER_TOKEN_KEY, 'stored-token');
    global.fetch = vi.fn().mockResolvedValue(new Response('boom', { status: 503 })) as any;
    renderGate();
    await waitFor(() => expect(screen.getByText('owner.serviceError')).toBeInTheDocument());
    expect(window.sessionStorage.getItem(OWNER_TOKEN_KEY)).toBe('stored-token');
  });

  it('shows the service-error state when the network fails', async () => {
    global.fetch = vi.fn().mockRejectedValue(new TypeError('Failed to fetch')) as any;
    renderGate();
    fireEvent.change(screen.getByLabelText('owner.tokenLabel'), { target: { value: 'good-token' } });
    fireEvent.click(screen.getByText('owner.unlock'));
    await waitFor(() => expect(screen.getByText('owner.serviceError')).toBeInTheDocument());
  });
});
