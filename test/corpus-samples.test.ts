import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import { describe, expect, it } from 'vitest';

import { validateCorpusDomain } from '../services/corpusService';

// v2 reposition spec §3.3: shipped corpus samples are the template owners
// start from — the same strict validator that gates authoring gates them in
// CI (pattern: the i18n key regression guard from #60).

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const corpusDir = path.join(repoRoot, 'public', 'corpus');

describe('shipped corpus samples', () => {
  const manifest = JSON.parse(fs.readFileSync(path.join(corpusDir, 'manifest.json'), 'utf8'));

  it('lists at least one domain', () => {
    expect(Array.isArray(manifest.domains)).toBe(true);
    expect(manifest.domains.length).toBeGreaterThan(0);
  });

  it('every manifest-listed domain file exists and passes strict validation', () => {
    for (const slug of manifest.domains) {
      const file = path.join(corpusDir, `${slug}.json`);
      expect(fs.existsSync(file), `missing file: corpus/${slug}.json`).toBe(true);
      const raw = JSON.parse(fs.readFileSync(file, 'utf8'));
      const { data, errors } = validateCorpusDomain(raw);
      expect(errors, `corpus/${slug}.json validation errors`).toEqual([]);
      expect(data?.entries.length).toBeGreaterThanOrEqual(4);
    }
  });

  it('every sample entry carries context and usage (the differentiating fields)', () => {
    for (const slug of manifest.domains) {
      const raw = JSON.parse(fs.readFileSync(path.join(corpusDir, `${slug}.json`), 'utf8'));
      for (const entry of raw.entries) {
        expect(entry.context?.length ?? 0).toBeGreaterThan(0);
        expect(entry.usage?.length ?? 0).toBeGreaterThan(0);
      }
    }
  });
});
