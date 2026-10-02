import React, { useEffect, useMemo, useState } from 'react';

import { useI18n } from '../hooks/useI18n';
import { useInstanceConfig } from '../hooks/useInstanceConfig';
import { badgeTitle, maybeAwardCompletionist, loadBadgeState } from '../services/badgeService';
import { fetchCorpusDomains } from '../services/corpusLoader';
import { deriveGameDefinition } from '../services/levelDerivation';
import { loadProgress } from '../services/progressionService';
import { CorpusDomain, GameDefinition } from '../types';

import { useFeedback } from './Feedback';

interface ServeHomeProps {
  onPlay: (game: GameDefinition) => void;
}

// v2 reposition spec §5: in serve mode the visitor's landing is the owner's
// domains. Puzzles are derived in-browser from the corpus — no LLM, no key.
// §5.1: cards show the visitor's device-local level progress.
const ServeHome: React.FC<ServeHomeProps> = ({ onPlay }) => {
  const { t } = useI18n();
  const { config } = useInstanceConfig();
  const { toast } = useFeedback();
  const [domains, setDomains] = useState<CorpusDomain[] | null>(null);
  const [loadErrors, setLoadErrors] = useState<string[]>([]);
  const [progressVersion, setProgressVersion] = useState(0);

  useEffect(() => {
    let cancelled = false;
    fetchCorpusDomains().then(result => {
      if (cancelled) return;
      setDomains(result.domains);
      setLoadErrors(result.errors);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // #109: completing the last corpus domain awards Completionist.
  useEffect(() => {
    if (!domains || domains.length === 0) return;
    const { newlyEarned } = maybeAwardCompletionist(loadBadgeState(), domains.length);
    newlyEarned.forEach(def => toast(t('toast.badgeEarned', { badge: badgeTitle(def, t) }), 'success'));
  }, [domains]);

  // progressVersion changes when a run ends and the visitor returns here.
  const domainStats = useMemo(() => {
    void progressVersion;
    if (!domains) return [];
    const progressMap = loadProgress();
    return domains.map(domain => {
      const totalLevels = deriveGameDefinition(domain, config).levels.length;
      const done = progressMap[domain.domain]?.completedLevels.length ?? 0;
      return { domain, totalLevels, done };
    });
  }, [domains, config, progressVersion]);

  useEffect(() => {
    // Re-read progress when returning from a finished game.
    const onShow = () => setProgressVersion(v => v + 1);
    window.addEventListener('focus', onShow);
    return () => window.removeEventListener('focus', onShow);
  }, []);

  const overall = useMemo(() => {
    if (domainStats.length === 0) return { done: 0, total: 0 };
    return domainStats.reduce(
      (acc, s) => ({ done: acc.done + s.done, total: acc.total + s.totalLevels }),
      { done: 0, total: 0 },
    );
  }, [domainStats]);

  const handlePlay = (domain: CorpusDomain) => {
    onPlay(deriveGameDefinition(domain, config));
  };

  const ringPercent = overall.total === 0 ? 0 : Math.round((overall.done / overall.total) * 100);

  return (
    <div className="w-full max-w-4xl mx-auto flex flex-col h-full overflow-x-hidden animate-fade-in">
      <header className="w-full text-center mb-6">
        <h1 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold text-ink">
          {t('serve.home')}
        </h1>
        {config.blurb && <p className="text-ink-soft mt-2">{config.blurb}</p>}
        {overall.total > 0 && (
          <div className="mt-3 inline-flex items-center gap-2" aria-label={t('serve.overallCompletion', { percent: ringPercent })}>
            <svg width="28" height="28" viewBox="0 0 36 36" className="-rotate-90">
              <circle cx="18" cy="18" r="15" fill="none" stroke="currentColor" className="text-ink/10" strokeWidth="4" />
              <circle
                cx="18" cy="18" r="15" fill="none" stroke="currentColor" className="text-accent transition-all duration-500"
                strokeWidth="4" strokeDasharray={`${(ringPercent / 100) * 94.2} 94.2`} strokeLinecap="round"
              />
            </svg>
            <span className="text-sm text-ink-soft">{t('serve.overallCompletion', { percent: ringPercent })}</span>
          </div>
        )}
      </header>

      {domains === null ? (
        <p className="text-ink-soft text-center">{t('serve.loading')}</p>
      ) : domains.length === 0 ? (
        <p className="text-ink-soft text-center">{t('serve.empty')}</p>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4 animate-fade-in-up">
          {domainStats.map(({ domain, totalLevels, done }) => (
            <button
              key={domain.domain}
              onClick={() => handlePlay(domain)}
              className="card-elevated p-5 text-left group transition-all duration-200 hover:-translate-y-0.5"
              aria-label={t('serve.domainPlay', { domain: domain.title })}
            >
              <div className="flex items-start justify-between gap-2">
                <h2 className="font-display text-xl font-bold text-ink group-hover:text-ink-soft transition-colors">
                  {domain.title}
                </h2>
                {done > 0 && (
                  <span className="text-xs font-semibold text-ink-soft bg-ink/5 rounded-full px-2 py-1 flex-shrink-0">
                    {t('serve.levelsDone', { done, total: totalLevels })}
                  </span>
                )}
              </div>
              {domain.blurb && <p className="text-sm text-ink-soft mt-1">{domain.blurb}</p>}
              <p className="text-xs text-ink-soft mt-3">
                {t('serve.entriesCount', { count: domain.entries.length })}
              </p>
            </button>
          ))}
        </div>
      )}

      {loadErrors.length > 0 && domains !== null && domains.length === 0 && (
        <p className="text-sm text-ink-soft text-center mt-4">{t('serve.loadError')}</p>
      )}
    </div>
  );
};

export default ServeHome;
