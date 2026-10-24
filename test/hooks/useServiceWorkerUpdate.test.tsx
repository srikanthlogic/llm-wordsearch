import { render, waitFor } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// #166 coverage: the PWA update flow (registerSW callbacks + the
// SKIP_WAITING/activated-reload path) had zero coverage — a regression
// here means installed users never see the update prompt or reload into
// stale bundles.

const registerSWMock = vi.fn();

vi.mock('virtual:pwa-register', () => ({
  registerSW: (...args: unknown[]) => registerSWMock(...args),
}));

import { useServiceWorkerUpdate } from '../../hooks/useServiceWorkerUpdate';

function makeWaitingWorker(): ServiceWorker {
  const listeners: Array<(event: Event) => void> = [];
  const worker = {
    postMessage: vi.fn(),
    addEventListener: (_: string, cb: (event: Event) => void) => listeners.push(cb),
    state: 'installsome',
  } as unknown as ServiceWorker;
  (worker as any).__activate = () => {
    (worker as any).state = 'activated';
    for (const cb of listeners) cb({ target: worker } as unknown as Event);
  };
  return worker;
}

type UseHook = () => { needRefresh: boolean; updateServiceWorker: () => void };

function Probe({ useHook, onState }: { useHook: UseHook; onState: (s: { needRefresh: boolean; updateServiceWorker: () => void }) => void }) {
  const state = useHook();
  onState(state);
  return <span>{String(state.needRefresh)}</span>;
}

// The hook keeps module-level singletons (registered/onNeedRefresh/
// applyUpdate), so every case re-imports a fresh module instance.
async function freshHook() {
  vi.resetModules();
  const mod = await import('../../hooks/useServiceWorkerUpdate');
  return mod.useServiceWorkerUpdate;
}

beforeEach(() => {
  registerSWMock.mockClear();
});

describe('useServiceWorkerUpdate (#166 coverage)', () => {
  it('registers once and flips needRefresh when onNeedRefresh fires', async () => {
    const useHook = await freshHook();
    const states: boolean[] = [];
    let latest: { needRefresh: boolean } | undefined;
    render(
      <Probe
        useHook={useHook}
        onState={s => {
          latest = s;
          states.push(s.needRefresh);
        }}
      />,
    );
    await waitFor(() => expect(registerSWMock).toHaveBeenCalledTimes(1));
    expect(registerSWMock.mock.calls[0][0]).toMatchObject({ immediate: true });
    expect(latest?.needRefresh).toBe(false);

    const options = registerSWMock.mock.calls[0][0];
    options.onNeedRefresh();
    await waitFor(() => expect(latest?.needRefresh).toBe(true));
  });

  it('stops tracking needRefresh after unmount', async () => {
    const useHook = await freshHook();
    const { unmount } = render(<Probe useHook={useHook} onState={() => {}} />);
    await waitFor(() => expect(registerSWMock).toHaveBeenCalled());
    unmount();
    // onNeedRefresh cleared on unmount: firing it must not throw or update.
    const options = registerSWMock.mock.calls[0][0];
    expect(() => options.onNeedRefresh()).not.toThrow();
  });

  it('sends SKIP_WAITING and reloads when the waiting worker activates', async () => {
    const useHook = await freshHook();
    const reload = vi.fn();
    vi.stubGlobal('location', { ...window.location, reload } as unknown as Location);
    const registration = { waiting: makeWaitingWorker() };
    const getRegistration = vi.fn().mockResolvedValue(registration);
    vi.stubGlobal('navigator', { ...window.navigator, serviceWorker: { getRegistration } } as unknown as Navigator);

    let update: (() => void) | undefined;
    render(<Probe useHook={useHook} onState={s => { update = s.updateServiceWorker; }} />);
    await waitFor(() => expect(registerSWMock).toHaveBeenCalled());

    // applyUpdate is built by onRegisteredSW.
    const options = registerSWMock.mock.calls[0][0];
    await options.onRegisteredSW('sw.js', registration);
    update?.();

    const waiting = registration.waiting as any;
    expect(waiting.postMessage).toHaveBeenCalledWith({ type: 'SKIP_WAITING' });
    waiting.__activate();
    expect(reload).toHaveBeenCalledTimes(1);
    vi.unstubAllGlobals();
  });

  it('reloads immediately when there is no waiting worker', async () => {
    const useHook = await freshHook();
    const reload = vi.fn();
    vi.stubGlobal('location', { ...window.location, reload } as unknown as Location);
    vi.stubGlobal('navigator', {
      ...window.navigator,
      serviceWorker: { getRegistration: vi.fn().mockResolvedValue({ waiting: null }) },
    } as unknown as Navigator);

    let update: (() => void) | undefined;
    render(<Probe useHook={useHook} onState={s => { update = s.updateServiceWorker; }} />);
    await waitFor(() => expect(registerSWMock).toHaveBeenCalled());

    const options = registerSWMock.mock.calls[0][0];
    await options.onRegisteredSW('sw.js', undefined);
    update?.();
    // The no-waiting path reloads after an async getRegistration lookup.
    await vi.waitFor(() => expect(reload).toHaveBeenCalledTimes(1));
    vi.unstubAllGlobals();
  });
});
