import { describe, expect, it } from 'vitest';

import { validateCorpusDomain } from '../../services/corpusService';
import {
  renderDomainMd,
  renderLlmsTxt,
  renderVocabJson,
  renderVocabMd,
} from '../../services/vocabArtifacts';
import { CorpusDomain, WordKeyConfig, InstanceMode } from '../../types';

const config: WordKeyConfig = {
  mode: InstanceMode.Serve,
  title: 'WordKey — cashlessconsumer',
  owner: 'Srikanth',
  blurb: 'The vocabulary I use when I write about cashless living.',
  locale: 'en',
  links: [],
  levels: { perDomain: 3, wordsPerLevel: 8 },
  progression: { sequentialLevels: true },
};

const meta = { version: '2.0.0', generatedAt: '2026-09-27T10:00:00Z' };

function makeDomain(slug: string, title: string, terms: [string, string, string, string] = ['interchange', 'mandate', 'settlement', 'chargeback']): CorpusDomain {
  const contents: Record<string, [string, string, string, string[]]> = {
    interchange: ['Fee merchant bank pays cardholder bank.', 'Policy flashpoint under zero MDR.', 'Explain interchange vs MDR.', ['MDR', 'issuer']],
    mandate: ['Standing debit instruction.', 'Auto-pay in banking; collection rail in lending.', 'Walk through a failed mandate retry.', []],
    settlement: ['Money movement between banks after clearing.', 'Spendable in dashboards; netting at the central bank.', 'Explain the two-day gap.', []],
    chargeback: ['Forced reversal initiated by the cardholder bank.', 'Consumer protection; merchant dispute cost.', 'Draft a pre-chargeback email.', []],
    sip: ['A fixed recurring investment into a fund.', 'Automation in retail talk; rupee-cost-averaging in theory.', 'Compare a monthly SIP with a lump sum.', []],
    expense: ['A ratio fund tracking a broad market index cheaply.', 'Passive in product talk; market-cap weighting in construction.', 'Explain what an expense ratio costs over 20 years.', []],
    dividend: ['A company payout to shareholders from profits.', 'Income in retirement talk; signal of maturity in analysis.', 'Explain dividend taxation versus capital gains.', []],
    volatility: ['How much a price swings around its trend.', 'Risk in portfolio talk; opportunity in trading talk.', 'Explain why volatility is not the same as risk.', []],
  };
  const { data } = validateCorpusDomain({
    domain: slug,
    title,
    blurb: `Blurb for ${title}.`,
    locale: 'en',
    provenance: 'owner-authored',
    entries: terms.map(term => ({
      term,
      gloss: contents[term][0],
      context: contents[term][1],
      usage: contents[term][2],
      related: contents[term][3],
    })),
  });
  return data!;
}

const domains = [makeDomain('payments', 'Payments & Cashless Living'), makeDomain('investing', 'Investing Notes', ['sip', 'expense', 'dividend', 'volatility'])];

describe('renderVocabMd', () => {
  const md = renderVocabMd(config, domains, meta);

  it('renders the provenance header', () => {
    expect(md).toContain('# WordKey — cashlessconsumer');
    expect(md).toContain('by Srikanth');
    expect(md).toContain('The vocabulary I use when I write about cashless living.');
    expect(md).toContain('v2.0.0');
    expect(md).toContain('2026-09-27T10:00:00Z');
    expect(md).toContain('owner-authored');
  });

  it('renders one section per domain and structured entry blocks', () => {
    expect(md).toContain('## Payments & Cashless Living');
    expect(md).toContain('## Investing Notes');
    expect(md.match(/### interchange/g)).toHaveLength(1);
    expect(md).toContain('**Context shift:** Policy flashpoint under zero MDR.');
    expect(md).toContain('**Try in a prompt:** Explain interchange vs MDR.');
    expect(md).toContain('**Related:** MDR, issuer');
  });
});

describe('renderVocabJson', () => {
  it('produces parseable JSON with meta, config, and verbatim domains', () => {
    const parsed = JSON.parse(renderVocabJson(config, domains, meta));
    expect(parsed.meta).toEqual({ ...meta, provenance: 'owner-authored' });
    expect(parsed.config.title).toBe('WordKey — cashlessconsumer');
    expect(parsed.domains).toHaveLength(2);
    expect(parsed.domains[0].entries[0].term).toBe('interchange');
  });
});

describe('renderLlmsTxt', () => {
  it('links the artifacts and every per-domain file', () => {
    const txt = renderLlmsTxt(config, domains, meta);
    expect(txt).toContain('# WordKey — cashlessconsumer');
    expect(txt).toContain('(/vocab.md)');
    expect(txt).toContain('(/vocab.json)');
    expect(txt).toContain('(/vocab/payments.md)');
    expect(txt).toContain('(/vocab/investing.md)');
  });
});

describe('renderDomainMd', () => {
  it('renders a single domain with the same header discipline', () => {
    const md = renderDomainMd(config, domains[0], meta);
    expect(md).toContain('# Payments & Cashless Living');
    expect(md).toContain('owner-authored');
    expect(md).toContain('### mandate');
    expect(md).not.toContain('## Investing Notes');
  });
});
