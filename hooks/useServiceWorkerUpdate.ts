import { useCallback, useEffect, useState } from 'react';
// eslint-disable-next-line import/no-unresolved -- virtual module from vite-plugin-pwa
import { registerSW } from 'virtual:pwa-register';

// Thin React wrapper over the plugin's vanilla `virtual:pwa-register`
// module (the react-specific virtual module isn't registered by this
// plugin version). Tracks the service-worker lifecycle via its callbacks.
let onNeedRefresh: (() => void) | null = null;
let applyUpdate: ((reloadPage?: boolean) => Promise<void>) | null = null;

let registered = false;
function ensureRegistered(): void {
  if (registered || typeof window === 'undefined') return;
  registered = true;
  registerSW({
    immediate: true,
    onNeedRefresh() {
      onNeedRefresh?.();
    },
    onRegisteredSW(_, registration) {
      applyUpdate = async () => {
        const reg = registration ?? (await navigator.serviceWorker.getRegistration());
        const waiting = reg?.waiting;
        if (waiting) {
          waiting.postMessage({ type: 'SKIP_WAITING' });
          // workbox's prompt flow reloads once the waiting worker activates.
          waiting.addEventListener('statechange', (event: Event) => {
            if ((event.target as ServiceWorker).state === 'activated') window.location.reload();
          });
        } else {
          window.location.reload();
        }
      };
    },
  });
}

export function useServiceWorkerUpdate(): { needRefresh: boolean; updateServiceWorker: () => void } {
  const [needRefresh, setNeedRefresh] = useState(false);

  useEffect(() => {
    ensureRegistered();
    onNeedRefresh = () => setNeedRefresh(true);
    return () => {
      onNeedRefresh = null;
    };
  }, []);

  const updateServiceWorker = useCallback(() => {
    applyUpdate?.();
  }, []);

  return { needRefresh, updateServiceWorker };
}
