import React, { useMemo } from 'react';

import { useFeedback } from '../components/Feedback';
import { ArrowLeftIcon, TrophyIcon } from '../components/Icons';
import { useI18n } from '../hooks/useI18n';
import { useInstanceConfig } from '../hooks/useInstanceConfig';
import { BADGE_CATALOG, badgeDefById, loadBadgeState, serializeBadgeShare } from '../services/badgeService';
import { BadgeDef } from '../types';

interface TrophiesViewProps {
  onBack: () => void;
}

// v2 reposition spec §5.1: the trophy shelf — earned badges with dates,
// locked badges showing their unlock condition. Sharing is stateless.
const TrophiesView: React.FC<TrophiesViewProps> = ({ onBack }) => {
  const { t, language } = useI18n();
  const { config } = useInstanceConfig();
  const { toast } = useFeedback();
  const state = useMemo(() => loadBadgeState(), []);

  const earnedDefs: { def: BadgeDef; earnedAt: number }[] = (
    Object.entries(state.earned) as [string, number][]
  )
    .sort(([, a], [, b]) => b - a)
    .map(([id, earnedAt]) => ({ def: badgeDefById(id), earnedAt }));
  const lockedDefs = BADGE_CATALOG.filter(def => !state.earned[def.id]);

  const earnedTitle = (def: BadgeDef) =>
    def.id.startsWith('domain-master-')
      ? t(def.titleKey, { domain: def.id.slice('domain-master-'.length) })
      : t(def.titleKey);

  const formatDate = (ts: number) =>
    new Date(ts).toLocaleDateString(language === 'en' ? 'en-US' : language, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });

  const handleShare = () => {
    const compressed = serializeBadgeShare(config.title, config.owner, state);
    const url = `${window.location.origin}${window.location.pathname}#badges=${compressed}`;
    navigator.clipboard
      .writeText(url)
      .then(() => toast(t('trophies.shared'), 'success'))
      .catch(err => console.error('Failed to copy badge link:', err));
  };

  return (
    <div className="w-full max-w-3xl mx-auto animate-fade-in">
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={onBack}
          className="p-3 text-ink-soft hover:text-ink hover:bg-ink/5 rounded-xl transition-all min-h-[44px]"
          aria-label={t('vocab.back')}
        >
          <ArrowLeftIcon />
        </button>
        <h1 className="font-display text-2xl sm:text-3xl font-bold text-ink">{t('trophies.title')}</h1>
      </div>

      <section className="mb-8">
        <h2 className="font-display text-lg font-bold text-ink mb-3">{t('trophies.earned')}</h2>
        {earnedDefs.length === 0 ? (
          <p className="text-sm text-ink-soft">{t('trophies.lockedHint')}</p>
        ) : (
          <ul className="grid sm:grid-cols-2 gap-3">
            {earnedDefs.map(({ def, earnedAt }) => (
              <li key={def.id} className="card-elevated p-4 flex items-start gap-3">
                <span className="text-2xl" aria-hidden="true">{def.icon}</span>
                <div>
                  <p className="font-display font-semibold text-ink">{earnedTitle(def)}</p>
                  <p className="text-xs text-ink-soft mt-0.5">{formatDate(earnedAt)}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {lockedDefs.length > 0 && (
        <section className="mb-8">
          <h2 className="font-display text-lg font-bold text-ink mb-3">{t('trophies.locked')}</h2>
          <ul className="grid sm:grid-cols-2 gap-3">
            {lockedDefs.map(def => (
              <li key={def.id} className="card-elevated p-4 flex items-start gap-3 opacity-60">
                <span className="text-2xl grayscale" aria-hidden="true">{def.icon}</span>
                <div>
                  <p className="font-display font-semibold text-ink">{t(def.titleKey)}</p>
                  <p className="text-xs text-ink-soft mt-0.5">{t(def.descriptionKey)}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <button
        onClick={handleShare}
        className="flex items-center gap-2 rounded-xl bg-ink text-white px-5 py-2.5 font-display font-semibold"
      >
        <TrophyIcon />
        {t('trophies.share')}
      </button>
    </div>
  );
};

export default TrophiesView;
