import fs from 'fs';
import os from 'os';
import path from 'path';

import { describe, expect, it } from 'vitest';

import { generateArtifacts } from '../../scripts/generate-vocab-artifacts';

const repoRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..', '..');

// #115: the build step must turn the SHIPPED corpus into artifacts — this
// doubles as a CI guard that the sample corpus generates cleanly.
describe('generateArtifacts (build step)', () => {
  it('writes vocab.md, vocab.json, llms.txt and per-domain files', () => {
    const outDir = fs.mkdtempSync(path.join(os.tmpdir(), 'wordkey-artifacts-'));
    const { written } = generateArtifacts(
      path.join(repoRoot, 'public', 'corpus'),
      outDir,
      path.join(repoRoot, 'public', 'wordkey.config.json'),
      '1.0.0',
      '2026-09-27T10:00:00Z',
    );

    expect(written).toEqual(
      expect.arrayContaining(['vocab.md', 'vocab.json', 'llms.txt', 'vocab/payments.md', 'vocab/ai-basics.md']),
    );
    const vocabMd = fs.readFileSync(path.join(outDir, 'vocab.md'), 'utf8');
    expect(vocabMd).toContain('# WordKey');
    expect(vocabMd).toContain('provenance: sample');
    expect(vocabMd).toContain('### interchange');
    const parsed = JSON.parse(fs.readFileSync(path.join(outDir, 'vocab.json'), 'utf8'));
    expect(parsed.domains).toHaveLength(2);
    fs.rmSync(outDir, { recursive: true, force: true });
  });

  it('no-ops (no throw) when the corpus manifest is missing', () => {
    const emptyDir = fs.mkdtempSync(path.join(os.tmpdir(), 'wordkey-empty-'));
    const { written } = generateArtifacts(emptyDir, emptyDir, path.join(emptyDir, 'absent-config.json'), '1.0.0');
    expect(written).toEqual([]);
    fs.rmSync(emptyDir, { recursive: true, force: true });
  });
});
