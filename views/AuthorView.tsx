import React, { useState } from 'react';

import { useFeedback } from '../components/Feedback';
import { useI18n } from '../hooks/useI18n';
import { useInstanceConfig } from '../hooks/useInstanceConfig';
import { exportCorpusDomainJson, validateCorpusDomain } from '../services/corpusService';
import {
  deleteDraftDomain,
  loadDraftCorpus,
  saveDraftDomain,
} from '../services/corpusStorageService';
import { proposeCorpusEntries } from '../services/geminiService';
import { AIProviderSettings, AILogEntry, CorpusEntry, CorpusDomain } from '../types';
import { downloadJson } from '../utils/download';

interface AuthorViewProps {
  setLogs: React.Dispatch<React.SetStateAction<AILogEntry[]>>;
  aiSettings: AIProviderSettings;
  onOpenAiLogs: () => void;
}

interface DraftForm {
  domain: string;
  title: string;
  blurb: string;
}

const EMPTY_FORM: DraftForm = { domain: '', title: '', blurb: '' };
const BLANK_ENTRY: CorpusEntry = { term: '', gloss: '', context: '', usage: '', related: [] };

// v2 reposition spec §4: author mode. The owner proposes (LLM) or hand-writes
// structured entries, edits them with inline validation, keeps a device-local
// draft corpus, and exports corpus/<slug>.json + a config template for their
// deployment. Validation is the same strict shared validator that M3 serving
// and the M5b admin API use.
const AuthorView: React.FC<AuthorViewProps> = ({ setLogs, aiSettings, onOpenAiLogs }) => {
  const { t } = useI18n();
  const { config } = useInstanceConfig();
  const { toast, confirm: confirmDialog } = useFeedback();

  const [form, setForm] = useState<DraftForm>(EMPTY_FORM);
  const [count, setCount] = useState(12);
  const [entries, setEntries] = useState<CorpusEntry[]>([]);
  const [proposing, setProposing] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [drafts, setDrafts] = useState<CorpusDomain[]>(() => loadDraftCorpus());

  const slugify = (value: string) =>
    value.toLowerCase().trim().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '');

  const updateEntry = (index: number, field: keyof CorpusEntry, value: string) => {
    setEntries(prev =>
      prev.map((entry, i) =>
        i === index
          ? { ...entry, [field]: field === 'related' ? value.split(',').map(s => s.trim()).filter(Boolean) : value }
          : entry,
      ),
    );
  };

  const handlePropose = async () => {
    if (!form.title.trim()) {
      toast(t('author.error.needTitle'), 'error');
      return;
    }
    setProposing(true);
    setErrors([]);
    setWarnings([]);
    const proposals = await proposeCorpusEntries({
      theme: form.title.trim(),
      locale: config.locale || 'en',
      count,
      onLog: setLogs,
      aiSettings,
    });
    setProposing(false);
    if (!form.domain.trim()) setForm(prev => ({ ...prev, domain: slugify(prev.title) }));
    if (!proposals.length) {
      toast(t('author.error.noProposals'), 'error');
      return;
    }
    setEntries(proposals);
    toast(t('author.proposed', { count: proposals.length }), 'success');
  };

  const handleSave = () => {
    const { data, errors: validationErrors, warnings: validationWarnings } = validateCorpusDomain({
      domain: form.domain,
      title: form.title,
      blurb: form.blurb,
      locale: config.locale || 'en',
      provenance: 'owner-authored',
      entries,
    });
    setErrors(validationErrors);
    setWarnings(validationWarnings);
    if (!data) {
      toast(t('author.error.invalid'), 'error');
      return;
    }
    const result = saveDraftDomain(data);
    if (!result.ok) {
      toast(t('author.error.saveFailed'), 'error');
      return;
    }
    setDrafts(loadDraftCorpus());
    toast(t('author.saved'), 'success');
  };

  const handleLoadDraft = (slug: string) => {
    const draft = drafts.find(d => d.domain === slug);
    if (!draft) return;
    setForm({ domain: draft.domain, title: draft.title, blurb: draft.blurb });
    setEntries(draft.entries);
    setErrors([]);
    setWarnings([]);
  };

  const handleDeleteDraft = async (slug: string) => {
    const confirmed = await confirmDialog({
      title: t('author.drafts.deleteConfirmTitle'),
      message: t('author.drafts.deleteConfirmMessage'),
      confirmLabel: t('author.drafts.deleteConfirmButton'),
      danger: true,
    });
    if (confirmed) {
      deleteDraftDomain(slug);
      setDrafts(loadDraftCorpus());
    }
  };

  const handleExport = (slug: string) => {
    const draft = drafts.find(d => d.domain === slug);
    if (!draft) return;
    downloadJson(`corpus/${slug}.json`, exportCorpusDomainJson(draft));
    toast(t('author.exported'), 'success');
  };

  const handleExportConfigTemplate = () => {
    const template = {
      mode: 'serve',
      title: config.title || form.title || '',
      owner: config.owner,
      blurb: form.blurb || config.blurb,
      locale: config.locale || 'en',
      links: config.links,
      levels: config.levels,
      progression: config.progression,
    };
    downloadJson('wordkey.config.json', JSON.stringify(template, null, 2) + '\n');
    toast(t('author.exported'), 'success');
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-ink">{t('author.title')}</h1>
          <p className="text-sm text-ink-soft mt-1">{t('author.subtitle')}</p>
        </div>
        <button onClick={onOpenAiLogs} className="text-sm text-ink-soft hover:text-ink underline">
          {t('author.aiLogs')}
        </button>
      </div>

      <section className="card-elevated p-5 sm:p-6 space-y-4">
        <div className="grid sm:grid-cols-2 gap-4">
          <label className="block">
            <span className="text-sm font-medium text-ink">{t('author.domain.title')}</span>
            <input
              value={form.title}
              onChange={e => setForm(prev => ({ ...prev, title: e.target.value }))}
              maxLength={80}
              className="mt-1 w-full rounded-lg border border-ink/15 bg-white/60 dark:bg-ink/10 px-3 py-2 text-ink"
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-ink">{t('author.domain.slug')}</span>
            <input
              value={form.domain}
              onChange={e => setForm(prev => ({ ...prev, domain: slugify(e.target.value) }))}
              placeholder="payments"
              maxLength={40}
              className="mt-1 w-full rounded-lg border border-ink/15 bg-white/60 dark:bg-ink/10 px-3 py-2 text-ink font-mono text-sm"
            />
          </label>
        </div>
        <label className="block">
          <span className="text-sm font-medium text-ink">{t('author.domain.blurb')}</span>
          <input
            value={form.blurb}
            onChange={e => setForm(prev => ({ ...prev, blurb: e.target.value }))}
            maxLength={280}
            className="mt-1 w-full rounded-lg border border-ink/15 bg-white/60 dark:bg-ink/10 px-3 py-2 text-ink"
          />
        </label>

        <div className="flex flex-wrap items-end gap-3">
          <label className="block w-28">
            <span className="text-sm font-medium text-ink">{t('author.proposeCount')}</span>
            <input
              type="number"
              min={4}
              max={40}
              value={count}
              onChange={e => setCount(Math.min(40, Math.max(4, Number(e.target.value) || 12)))}
              className="mt-1 w-full rounded-lg border border-ink/15 bg-white/60 dark:bg-ink/10 px-3 py-2 text-ink"
            />
          </label>
          <button
            onClick={handlePropose}
            disabled={proposing}
            className="rounded-xl bg-ink text-white px-4 py-2 font-display font-semibold disabled:opacity-50"
          >
            {proposing ? t('author.proposing') : t('author.propose')}
          </button>
        </div>
      </section>

      {errors.length > 0 && (
        <section className="card-elevated p-4 border-red-400/50">
          <h2 className="font-display font-semibold text-red-600 dark:text-red-400">{t('author.validation.errorHeading')}</h2>
          <ul className="list-disc pl-5 text-sm text-ink-soft mt-2 space-y-1">
            {errors.map((error, i) => <li key={i}>{error}</li>)}
          </ul>
        </section>
      )}
      {warnings.length > 0 && (
        <section className="card-elevated p-4">
          <h2 className="font-display font-semibold text-ink">{t('author.validation.warningHeading')}</h2>
          <ul className="list-disc pl-5 text-sm text-ink-soft mt-2 space-y-1">
            {warnings.map((warning, i) => <li key={i}>{warning}</li>)}
          </ul>
        </section>
      )}

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-bold text-ink">{t('author.entries.heading')} ({entries.length})</h2>
          <button
            onClick={() => setEntries(prev => [...prev, { ...BLANK_ENTRY }])}
            className="text-sm rounded-lg border border-ink/20 px-3 py-1.5 text-ink hover:bg-ink/5"
          >
            {t('author.entry.add')}
          </button>
        </div>
        {entries.map((entry, index) => (
          <div key={index} className="card-elevated p-4 space-y-3">
            <div className="flex gap-3">
              <input
                value={entry.term}
                onChange={e => updateEntry(index, 'term', e.target.value)}
                maxLength={24}
                aria-label={t('author.entry.term')}
                placeholder="term"
                className="w-44 rounded-lg border border-ink/15 bg-white/60 dark:bg-ink/10 px-3 py-2 text-ink font-mono text-sm"
              />
              <input
                value={entry.gloss}
                onChange={e => updateEntry(index, 'gloss', e.target.value)}
                maxLength={200}
                aria-label={t('author.entry.gloss')}
                placeholder={t('author.entry.gloss')}
                className="flex-1 rounded-lg border border-ink/15 bg-white/60 dark:bg-ink/10 px-3 py-2 text-ink text-sm"
              />
              <button
                onClick={() => setEntries(prev => prev.filter((_, i) => i !== index))}
                aria-label={t('author.entry.remove')}
                className="text-ink-soft hover:text-red-500 px-2"
              >
                ✕
              </button>
            </div>
            <input
              value={entry.context}
              onChange={e => updateEntry(index, 'context', e.target.value)}
              maxLength={300}
              aria-label={t('author.entry.context')}
              placeholder={t('author.entry.context')}
              className="w-full rounded-lg border border-ink/15 bg-white/60 dark:bg-ink/10 px-3 py-2 text-ink text-sm"
            />
            <div className="flex gap-3">
              <input
                value={entry.usage}
                onChange={e => updateEntry(index, 'usage', e.target.value)}
                maxLength={200}
                aria-label={t('author.entry.usage')}
                placeholder={t('author.entry.usage')}
                className="flex-1 rounded-lg border border-ink/15 bg-white/60 dark:bg-ink/10 px-3 py-2 text-ink text-sm"
              />
              <input
                value={entry.related.join(', ')}
                onChange={e => updateEntry(index, 'related', e.target.value)}
                aria-label={t('author.entry.related')}
                placeholder={t('author.entry.related')}
                className="w-44 rounded-lg border border-ink/15 bg-white/60 dark:bg-ink/10 px-3 py-2 text-ink text-sm"
              />
            </div>
          </div>
        ))}
        {entries.length > 0 && (
          <button
            onClick={handleSave}
            className="rounded-xl bg-ink text-white px-5 py-2.5 font-display font-semibold"
          >
            {t('author.save')}
          </button>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-lg font-bold text-ink">{t('author.drafts.heading')}</h2>
        {drafts.length === 0 ? (
          <p className="text-sm text-ink-soft">{t('author.drafts.empty')}</p>
        ) : (
          <ul className="space-y-2">
            {drafts.map(draft => (
              <li key={draft.domain} className="card-elevated p-4 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium text-ink truncate">{draft.title}</p>
                  <p className="text-xs text-ink-soft font-mono truncate">
                    {draft.domain} · {draft.entries.length} {t('author.entries.countSuffix')}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button onClick={() => handleLoadDraft(draft.domain)} className="text-sm text-ink-soft hover:text-ink px-2 py-1">
                    {t('author.drafts.load')}
                  </button>
                  <button onClick={() => handleExport(draft.domain)} className="text-sm text-ink-soft hover:text-ink px-2 py-1">
                    {t('author.export')}
                  </button>
                  <button onClick={() => handleDeleteDraft(draft.domain)} className="text-sm text-red-500 hover:text-red-600 px-2 py-1">
                    {t('author.drafts.delete')}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
        <button onClick={handleExportConfigTemplate} className="text-sm text-ink-soft hover:text-ink underline">
          {t('author.configExport')}
        </button>
      </section>
    </div>
  );
};

export default AuthorView;
