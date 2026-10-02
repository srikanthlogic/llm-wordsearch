import { render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { InstanceConfigProvider, useInstanceConfig } from '../../hooks/useInstanceConfig';
import { InstanceMode } from '../../types';

function Probe() {
  const { config, loading } = useInstanceConfig();
  return (
    <div>
      <span>{loading ? 'loading' : 'ready'}</span>
      <span data-testid="mode">{config.mode}</span>
      <span data-testid="title">{config.title || '(none)'}</span>
    </div>
  );
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('InstanceConfigProvider', () => {
  it('exposes the fetched config and clears loading', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ mode: 'serve', title: 'WordKey — cashlessconsumer' }),
    }) as any;
    render(
      <InstanceConfigProvider>
        <Probe />
      </InstanceConfigProvider>,
    );
    await waitFor(() => expect(screen.getByText('ready')).toBeInTheDocument());
    expect(screen.getByTestId('mode')).toHaveTextContent(InstanceMode.Serve);
    expect(screen.getByTestId('title')).toHaveTextContent('WordKey — cashlessconsumer');
  });

  it('falls back to defaults when the config is missing', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 404 }) as any;
    render(
      <InstanceConfigProvider>
        <Probe />
      </InstanceConfigProvider>,
    );
    await waitFor(() => expect(screen.getByText('ready')).toBeInTheDocument());
    expect(screen.getByTestId('mode')).toHaveTextContent(InstanceMode.Author);
  });

  it('throws outside a provider', () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({}) }) as any;
    // Silence the expected error so the test output stays clean.
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<Probe />)).toThrow(/useInstanceConfig/);
    spy.mockRestore();
  });
});
