import { render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

import { useInstallPrompt } from '../../hooks/useInstallPrompt';

function fireBeforeInstallPrompt(): void {
  const event = new Event('beforeinstallprompt');
  (event as any).prompt = vi.fn().mockResolvedValue(undefined);
  (event as any).userChoice = Promise.resolve({ outcome: 'accepted' });
  window.dispatchEvent(event);
}

function Probe({ onState }: { onState: (s: { canInstall: boolean }) => void }) {
  const { canInstall } = useInstallPrompt();
  onState({ canInstall });
  return <span data-testid="can">{String(canInstall)}</span>;
}

describe('useInstallPrompt (#127)', () => {
  it('starts not-installable and flips when beforeinstallprompt fires', async () => {
    const states: boolean[] = [];
    render(<Probe onState={s => states.push(s.canInstall)} />);
    expect(screen.getByTestId('can').textContent).toBe('false');
    fireBeforeInstallPrompt();
    await waitFor(() => expect(screen.getByTestId('can').textContent).toBe('true'));
    expect(states.at(-1)).toBe(true);
  });

  it('resets to not-installable after appinstalled', async () => {
    render(<Probe onState={() => {}} />);
    fireBeforeInstallPrompt();
    await waitFor(() => expect(screen.getByTestId('can').textContent).toBe('true'));
    window.dispatchEvent(new Event('appinstalled'));
    await waitFor(() => expect(screen.getByTestId('can').textContent).toBe('false'));
  });
});
