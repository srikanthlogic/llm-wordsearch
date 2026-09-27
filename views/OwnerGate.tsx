import React, { useEffect, useState } from 'react';

import { useFeedback } from '../components/Feedback';
import { useI18n } from '../hooks/useI18n';
import { AIProviderSettings, AILogEntry } from '../types';
import AuthorView from '../views/AuthorView';

const OWNER_TOKEN_KEY = 'wordkey.ownerToken';

export { OWNER_TOKEN_KEY };

interface OwnerGateProps {
  setLogs: React.Dispatch<React.SetStateAction<AILogEntry[]>>;
  aiSettings: AIProviderSettings;
  onOpenAiLogs: () => void;
}

type GateState = 'form' | 'checking' | 'unlocked' | 'invalid' | 'disabled';

// v2 reposition spec §7.2: the hidden owner route on deployed instances.
// The token lives in sessionStorage (same discipline as the BYOLLM key);
// the endpoint itself stays fail-closed — this gate is UX, not security.

export function getOwnerToken(): string | null {
  try {
    return window.sessionStorage.getItem(OWNER_TOKEN_KEY);
  } catch {
    return null;
  }
}
const OwnerGate: React.FC<OwnerGateProps> = ({ setLogs, aiSettings, onOpenAiLogs }) => {
  const { t } = useI18n();
  const { toast } = useFeedback();
  const [state, setState] = useState<GateState>('form');
  const [token, setToken] = useState('');

  useEffect(() => {
    const stored = getOwnerToken();
    if (!stored) return;
    setState('checking');
    fetch('/api/admin/corpus', { headers: { Authorization: `Bearer ${stored}` } })
      .then(async res => {
        if (res.ok) {
          setState('unlocked');
        } else if (res.status === 404) {
          setState('disabled');
        } else {
          window.sessionStorage.removeItem(OWNER_TOKEN_KEY);
          setState('form');
        }
      })
      .catch(() => setState('form'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleUnlock = () => {
    if (!token.trim()) return;
    setState('checking');
    fetch('/api/admin/corpus', { headers: { Authorization: `Bearer ${token.trim()}` } })
      .then(async res => {
        if (res.ok) {
          window.sessionStorage.setItem(OWNER_TOKEN_KEY, token.trim());
          setState('unlocked');
          toast(t('owner.unlocked'), 'success');
        } else if (res.status === 404) {
          setState('disabled');
        } else {
          setState('invalid');
        }
      })
      .catch(() => {
        setState('invalid');
      });
  };

  if (state === 'unlocked') {
    return <AuthorView setLogs={setLogs} aiSettings={aiSettings} onOpenAiLogs={onOpenAiLogs} publishToken={getOwnerToken() ?? undefined} />;
  }

  if (state === 'disabled') {
    return (
      <div className="max-w-md mx-auto card-elevated p-8 text-center animate-fade-in">
        <h1 className="font-display text-xl font-bold text-ink">{t('owner.disabledTitle')}</h1>
        <p className="text-sm text-ink-soft mt-2">{t('owner.disabledCopy')}</p>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto card-elevated p-8 animate-fade-in">
      <h1 className="font-display text-xl font-bold text-ink">{t('owner.title')}</h1>
      <p className="text-sm text-ink-soft mt-2">{t('owner.description')}</p>
      <label className="block mt-4">
        <span className="text-sm font-medium text-ink">{t('owner.tokenLabel')}</span>
        <input
          type="password"
          value={token}
          onChange={e => setToken(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleUnlock()}
          className="mt-1 w-full rounded-lg border border-ink/15 bg-white/60 dark:bg-ink/10 px-3 py-2 text-ink"
          autoComplete="off"
        />
      </label>
      {state === 'invalid' && <p className="text-sm text-red-500 mt-2">{t('owner.invalid')}</p>}
      <button
        onClick={handleUnlock}
        disabled={state === 'checking'}
        className="mt-4 w-full rounded-xl bg-ink text-white px-4 py-2.5 font-display font-semibold disabled:opacity-50"
      >
        {t('owner.unlock')}
      </button>
    </div>
  );
};

export default OwnerGate;
