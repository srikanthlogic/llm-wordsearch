import React from 'react';

import { useI18n } from '../hooks/useI18n';
import { useServiceWorkerUpdate } from '../hooks/useServiceWorkerUpdate';

// v2 reposition spec §8: explicit update flow. The service worker waits for
// user confirmation (registerType: 'prompt') — no silent skipWaiting races.
const UpdatePrompt: React.FC = () => {
  const { t } = useI18n();
  const { needRefresh, updateServiceWorker } = useServiceWorkerUpdate();

  if (!needRefresh) return null;

  return (
    <div
      role="status"
      className="fixed bottom-20 md:bottom-4 left-1/2 -translate-x-1/2 z-[60] card-elevated px-4 py-3 flex items-center gap-3 animate-fade-in-up"
    >
      <span className="text-sm text-ink whitespace-nowrap">{t('pwa.updateReady')}</span>
      <button
        onClick={() => updateServiceWorker()}
        className="text-sm rounded-lg bg-ink text-paper px-3 py-1.5 font-display font-semibold whitespace-nowrap"
      >
        {t('pwa.reload')}
      </button>
    </div>
  );
};

export default UpdatePrompt;
