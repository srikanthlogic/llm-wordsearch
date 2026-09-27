import { CorpusDomain, WordKeyConfig } from '../types';

// v2 reposition spec §6: one shared renderer produces every agent-facing
// artifact. Pure and dependency-free — the build script (static hosts) and
// the M5 Hono server (request-time from a mounted corpus) call the same
// functions, so the format cannot drift between deployment targets.

export interface ArtifactMeta {
  version: string;
  generatedAt: string;
}

function corpusProvenance(domains: CorpusDomain[]): string {
  const kinds = new Set(domains.map(d => d.provenance ?? 'owner-authored'));
  if (kinds.size === 1) return [...kinds][0];
  // Mixed corpora state the union honestly (e.g. samples still shipped
  // alongside owner domains).
  return [...kinds].sort().join('+');
}

function headerLines(config: WordKeyConfig, domains: CorpusDomain[], meta: ArtifactMeta, extra?: string): string[] {
  const lines: string[] = [];
  lines.push(`# ${config.title}`);
  if (config.owner) lines.push(`by ${config.owner}`);
  if (config.blurb) lines.push('', config.blurb);
  lines.push(
    '',
    `> Generated ${meta.generatedAt} · v${meta.version} · provenance: ${corpusProvenance(domains)}`,
  );
  if (extra) lines.push(extra);
  return lines;
}

function entryBlock(term: string, gloss: string, context: string, usage: string, related: string[]): string {
  const lines = [`### ${term}`, '', gloss, '', `**Context shift:** ${context}`, '', `**Try in a prompt:** ${usage}`];
  if (related.length) lines.push('', `**Related:** ${related.join(', ')}`);
  return lines.join('\n');
}

export function renderVocabMd(config: WordKeyConfig, domains: CorpusDomain[], meta: ArtifactMeta): string {
  const parts = headerLines(config, domains, meta);
  for (const domain of domains) {
    parts.push('', `## ${domain.title}`, '', domain.blurb);
    for (const entry of domain.entries) {
      parts.push('', entryBlock(entry.term, entry.gloss, entry.context, entry.usage, entry.related));
    }
  }
  return parts.join('\n') + '\n';
}

export function renderVocabJson(config: WordKeyConfig, domains: CorpusDomain[], meta: ArtifactMeta): string {
  const payload = {
    meta: { ...meta, provenance: corpusProvenance(domains) },
    config: { title: config.title, owner: config.owner, blurb: config.blurb, locale: config.locale },
    domains,
  };
  return JSON.stringify(payload, null, 2) + '\n';
}

export function renderLlmsTxt(config: WordKeyConfig, domains: CorpusDomain[], meta: ArtifactMeta): string {
  const lines: string[] = [];
  lines.push(`# ${config.title}`);
  if (config.blurb) lines.push('', config.blurb);
  lines.push(
    '',
    `> Machine-readable vocabulary for agents. Generated ${meta.generatedAt} · v${meta.version}.`,
    '',
    '## Vocabulary artifacts',
    '',
    '- [Full vocabulary (markdown)](/vocab.md)',
    '- [Full vocabulary (JSON)](/vocab.json)',
  );
  for (const domain of domains) {
    lines.push(`- [${domain.title}](/vocab/${domain.domain}.md)`);
  }
  lines.push('', '## Humans', '', '- [Play the vocabulary as a puzzle](/)');
  return lines.join('\n') + '\n';
}

export function renderDomainMd(config: WordKeyConfig, domain: CorpusDomain, meta: ArtifactMeta): string {
  const parts = headerLines(config, [domain], meta, `Part of [the full vocabulary](/vocab.md).`);
  parts.push('', `## ${domain.title}`, '', domain.blurb);
  for (const entry of domain.entries) {
    parts.push('', entryBlock(entry.term, entry.gloss, entry.context, entry.usage, entry.related));
  }
  return parts.join('\n') + '\n';
}
