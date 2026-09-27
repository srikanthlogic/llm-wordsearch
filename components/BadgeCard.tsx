import React from 'react';

import { useI18n } from '../hooks/useI18n';
import { badgeDefById } from '../services/badgeService';

interface BadgeCardProps {
  title: string;
  owner: string;
  earnedIds: string[];
  onClose: () => void;
}

// v2 reposition spec §5.1: the read-only rendering of a shared badge link.
// Deliberately self-reported — the link says "here is what I earned", not
// "here is proof".
const BadgeCard: React.FC<BadgeCardProps> = ({ title, owner, earnedIds, onClose }) => {
  const { t } = useI18n();

  return (
    <div className="w-full max-w-xl mx-auto mt-10 sm:mt-16 animate-fade-in-up">
      <div className="card-elevated p-6 sm:p-8 text-center">
        <p className="text-sm text-ink-soft">{t('badgecard.title')}</p>
        <h1 className="font-display text-2xl sm:text-3xl font-bold text-ink mt-1">
          {title || (owner ? t('badgecard.by', { owner }) : 'WordKey')}
        </h1>
        {owner && title && <p className="text-sm text-ink-soft mt-1">{t('badgecard.by', { owner })}</p>}

        <ul className="mt-6 grid grid-cols-2 sm:grid-cols-3 gap-3">
          {earnedIds.map(id => {
            const def = badgeDefById(id);
            return (
              <li key={id} className="rounded-xl bg-ink/5 p-3">
                <span className="text-2xl" aria-hidden="true">{def.icon}</span>
                <p className="text-xs font-display font-semibold text-ink mt-1">
                  {def.id.startsWith('domain-master-')
                    ? t(def.titleKey, { domain: def.id.slice('domain-master-'.length) })
                    : t(def.titleKey)}
                </p>
              </li>
            );
          })}
        </ul>

        <button
          onClick={onClose}
          className="mt-8 rounded-xl bg-ink text-white px-5 py-2.5 font-display font-semibold"
        >
          {t('badgecard.done')}
        </button>
      </div>
    </div>
  );
};

export default BadgeCard;
