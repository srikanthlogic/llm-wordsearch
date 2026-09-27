import React, { useEffect, useState } from 'react';

import { ArrowLeftIcon } from '../components/Icons';
import { useI18n } from '../hooks/useI18n';
import { fetchCorpusDomains } from '../services/corpusLoader';
import { CorpusDomain } from '../types';

interface VocabViewProps {
  onBack: () => void;
}

// v2 reposition spec §5: the human rendering of vocab.md — the same corpus,
// readable without playing.
const VocabView: React.FC<VocabViewProps> = ({ onBack }) => {
  const { t } = useI18n();
  const [domains, setDomains] = useState<CorpusDomain[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchCorpusDomains().then(result => {
      if (!cancelled) setDomains(result.domains);
    });
    return () => {
      cancelled = true;
    };
  }, []);

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
        <h1 className="font-display text-2xl sm:text-3xl font-bold text-ink">{t('vocab.title')}</h1>
      </div>

      {domains === null ? (
        <p className="text-ink-soft">{t('serve.loading')}</p>
      ) : domains.length === 0 ? (
        <p className="text-ink-soft">{t('vocab.empty')}</p>
      ) : (
        <div className="space-y-8">
          {domains.map(domain => (
            <section key={domain.domain} className="card-elevated p-5 sm:p-6">
              <h2 className="font-display text-xl font-bold text-ink">{domain.title}</h2>
              {domain.blurb && <p className="text-sm text-ink-soft mt-1">{domain.blurb}</p>}
              <p className="text-xs text-ink-soft mt-1">
                {t('vocab.entriesCount', { count: domain.entries.length })}
              </p>
              <dl className="mt-4 space-y-4">
                {domain.entries.map(entry => (
                  <div key={entry.term} className="border-t border-ink/10 pt-3">
                    <dt className="font-display font-semibold text-ink">{entry.term}</dt>
                    <dd className="text-sm text-ink mt-1">{entry.gloss}</dd>
                    <dd className="text-sm text-ink-soft mt-1.5">{entry.context}</dd>
                    <dd className="text-xs text-ink-soft mt-1.5 font-mono bg-ink/5 rounded px-2 py-1.5 inline-block">
                      {entry.usage}
                    </dd>
                  </div>
                ))}
              </dl>
            </section>
          ))}
        </div>
      )}
    </div>
  );
};

export default VocabView;
