import { useEffect, useState } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

// v2 reposition spec §8: install UX. The beforeinstallprompt event is
// captured once at module level (browsers fire it early); consumers get a
// reactive "can install" flag plus the deferred prompt action.
let captured: BeforeInstallPromptEvent | null = null;
const listeners = new Set<(available: boolean) => void>();

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', event => {
    event.preventDefault();
    captured = event as BeforeInstallPromptEvent;
    listeners.forEach(listener => listener(true));
  });
  window.addEventListener('appinstalled', () => {
    captured = null;
    listeners.forEach(listener => listener(false));
  });
}

export function useInstallPrompt(): { canInstall: boolean; promptInstall: () => Promise<boolean> } {
  const [canInstall, setCanInstall] = useState(captured !== null);

  useEffect(() => {
    const listener = (available: boolean) => setCanInstall(available);
    listeners.add(listener);
    setCanInstall(captured !== null);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  return {
    canInstall,
    promptInstall: async () => {
      if (!captured) return false;
      await captured.prompt();
      const { outcome } = await captured.userChoice;
      if (outcome === 'accepted') {
        captured = null;
        listeners.forEach(listener => listener(false));
      }
      return outcome === 'accepted';
    },
  };
}
