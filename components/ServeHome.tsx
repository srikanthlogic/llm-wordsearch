import React, { useEffect, useState } from 'react';

import { useI18n } from '../hooks/useI18n';
import { useInstanceConfig } from '../hooks/useInstanceConfig';
import { fetchCorpusDomains } from '../services/corpusLoader';
import { deriveGameDefinition } from '../services/levelDerivation';
import { CorpusDomain, GameDefinition } from '../types';

interface ServeHomeProps {
  onPlay: (game: GameDefinition) => void;
}

// v2 reposition spec §5: in serve mode the visitor's landing is the owner's
// domains. Puzzles are derived in-browser from the corpus — no LLM, no key.
const ServeHome: React.FC<ServeHomeProps> = ({ onPlay }) => {
  const { t } = useI18n();
  const { config } = useInstanceConfig();
  const [domains, setDomains] = useState<CorpusDomain[] | null>(null);
  const [loadErrors, setLoadErrors] = useState<string[]>([]);

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

  const handlePlay = (domain: CorpusDomain) => {
    onPlay(deriveGameDefinition(domain, config));
  };

  return (
    <div className="w-full max-w-4xl mx-auto flex flex-col h-full overflow-x-hidden animate-fade-in">
      <header className="w-full text-center mb-6">
        <h1 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold text-ink">
          {t('serve.home')}
        </h1>
        {config.blurb && <p className="text-ink-soft mt-2">{config.blurb}</p>}
      </header>

      {domains === null ? (
        <p className="text-ink-soft text-center">{t('serve.loading')}</p>
      ) : domains.length === 0 ? (
        <p className="text-ink-soft text-center">{t('serve.empty')}</p>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4 animate-fade-in-up">
          {domains.map(domain => (
            <button
              key={domain.domain}
              onClick={() => handlePlay(domain)}
              className="card-elevated p-5 text-left group transition-all duration-200 hover:-translate-y-0.5"
              aria-label={t('serve.domainPlay', { domain: domain.title })}
            >
              <h2 className="font-display text-xl font-bold text-ink group-hover:text-ink-soft transition-colors">
                {domain.title}
              </h2>
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
