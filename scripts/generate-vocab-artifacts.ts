import fs from 'fs';
import path from 'path';

import { validateCorpusDomain } from '../services/corpusService';
import { renderDomainMd, renderLlmsTxt, renderVocabJson, renderVocabMd } from '../services/vocabArtifacts';
import { CorpusDomain, InstanceMode, WordKeyConfig } from '../types';

// v2 reposition spec §6: build-time artifact generation for static hosts.
// The M5 Hono server renders the same artifacts per request from the mounted
// corpus via the same renderer module. A missing corpus is not an error —
// a fresh fork without corpus files must still build.

const FALLBACK_CONFIG: WordKeyConfig = {
  mode: InstanceMode.Serve,
  title: 'WordKey',
  owner: '',
  blurb: '',
  locale: 'en',
  links: [],
  levels: { perDomain: 3, wordsPerLevel: 8 },
  progression: { sequentialLevels: true },
};

export function generateArtifacts(
  corpusDir: string,
  outDir: string,
  configPath: string,
  version: string,
  generatedAt = new Date().toISOString(),
): { written: string[] } {
  const written: string[] = [];
  const manifestPath = path.join(corpusDir, 'manifest.json');
  if (!fs.existsSync(manifestPath)) {
    console.warn(`[vocab-artifacts] No corpus manifest at ${manifestPath}; skipping artifact generation.`);
    return { written };
  }

  let config = FALLBACK_CONFIG;
  if (fs.existsSync(configPath)) {
    try {
      const raw = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      config = {
        ...FALLBACK_CONFIG,
        ...raw,
        levels: { ...FALLBACK_CONFIG.levels, ...(raw.levels ?? {}) },
        progression: { ...FALLBACK_CONFIG.progression, ...(raw.progression ?? {}) },
        links: Array.isArray(raw.links) ? raw.links : [],
      };
    } catch (error) {
      console.warn(`[vocab-artifacts] Config at ${configPath} is invalid; using defaults.`, error);
    }
  }

  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const slugs: string[] = Array.isArray(manifest?.domains)
    ? manifest.domains.filter((s: unknown): s is string => typeof s === 'string')
    : [];

  const domains: CorpusDomain[] = [];
  for (const slug of slugs) {
    const file = path.join(corpusDir, `${slug}.json`);
    try {
      const { data, errors } = validateCorpusDomain(JSON.parse(fs.readFileSync(file, 'utf8')));
      if (data) domains.push(data);
      else console.warn(`[vocab-artifacts] corpus/${slug}.json is invalid, skipped: ${errors.join('; ')}`);
    } catch (error) {
      console.warn(`[vocab-artifacts] corpus/${slug}.json could not be read, skipped.`, error);
    }
  }

  const meta = { version, generatedAt };
  fs.mkdirSync(path.join(outDir, 'vocab'), { recursive: true });
  const outputs: [string, string][] = [
    ['vocab.md', renderVocabMd(config, domains, meta)],
    ['vocab.json', renderVocabJson(config, domains, meta)],
    ['llms.txt', renderLlmsTxt(config, domains, meta)],
    ...domains.map((d): [string, string] => [`vocab/${d.domain}.md`, renderDomainMd(config, d, meta)]),
  ];
  for (const [name, content] of outputs) {
    const file = path.join(outDir, name);
    fs.writeFileSync(file, content);
    written.push(name);
  }
  return { written };
}

function main(): void {
  const repoRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
  const { written } = generateArtifacts(
    path.join(repoRoot, 'public', 'corpus'),
    path.join(repoRoot, 'public'),
    path.join(repoRoot, 'public', 'wordkey.config.json'),
    JSON.parse(fs.readFileSync(path.join(repoRoot, 'package.json'), 'utf8')).version ?? '0.0.0',
  );
  console.log(`[vocab-artifacts] wrote ${written.length} artifact(s): ${written.join(', ') || 'none'}`);
}

// tsx scripts/generate-vocab-artifacts.ts → run; import → library use.
if (process.argv[1] && process.argv[1].endsWith('generate-vocab-artifacts.ts')) {
  main();
}
