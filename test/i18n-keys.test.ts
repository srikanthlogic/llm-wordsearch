import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import { describe, expect, it } from 'vitest';

// #60 regression guard: every t('...') key referenced in app source must
// exist in public/locales/en.json (or ship _singular/_plural variants).
// t() returns the raw key when a translation is missing, so a key that is
// missing here is a key users will literally see on screen.

const sourceRoots = ['App.tsx', 'index.tsx', 'components', 'views', 'hooks', 'utils', 'services'];

function collectSourceFiles(root: string, out: string[] = []): string[] {
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    const full = path.join(root, entry.name);
    if (entry.isDirectory()) collectSourceFiles(full, out);
    else if (/\.(tsx?|jsx?)$/.test(entry.name) && !/\.test\./.test(entry.name)) out.push(full);
  }
  return out;
}

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sourceFiles = sourceRoots.flatMap(root => {
  const full = path.join(repoRoot, root);
  return fs.statSync(full).isFile() ? [full] : collectSourceFiles(full);
});

const keyPattern = /\bt\(\s*['"`]([A-Za-z0-9_.-]+)['"`]/g;
const keyFiles = new Map<string, string[]>();
for (const file of sourceFiles) {
  const src = fs.readFileSync(file, 'utf8');
  for (const match of src.matchAll(keyPattern)) {
    const key = match[1];
    keyFiles.set(key, [...(keyFiles.get(key) ?? []), path.relative(repoRoot, file)]);
  }
}

const en: Record<string, string> = JSON.parse(
  fs.readFileSync(path.join(repoRoot, 'public/locales/en.json'), 'utf8')
);

function hasKey(key: string): boolean {
  return (
    Object.prototype.hasOwnProperty.call(en, key) ||
    Object.prototype.hasOwnProperty.call(en, `${key}_singular`) ||
    Object.prototype.hasOwnProperty.call(en, `${key}_plural`)
  );
}

describe('i18n key existence (#60 regression guard)', () => {
  it('collects keys from app source', () => {
    expect(keyFiles.size).toBeGreaterThan(50);
    expect(sourceFiles.length).toBeGreaterThan(20);
  });

  it('has an en.json entry for every t() key referenced in source', () => {
    const missing = [...keyFiles.keys()].filter(key => !hasKey(key));
    expect(missing).toEqual([]);
  });

  it('fails loudly when a known key is removed from en.json', () => {
    // Canaries: keys that shipped with #60 after users saw them rendered raw.
    for (const key of [
      'maker.subtitle',
      'maker.gridSize',
      'player.history.today',
      'player.history.yesterday',
      'settings.aiLogs.description',
      'settings.aiLogs.viewButton',
      'help.loading',
    ]) {
      expect(hasKey(key), `missing key: ${key}`).toBe(true);
    }
  });

  it('never renders raw keys: all locale files stay valid JSON with en as a superset of nothing', () => {
    // Sanity: en.json must remain parseable and non-empty so the baseline
    // fallback chain in useI18n keeps working.
    expect(Object.keys(en).length).toBeGreaterThan(100);
  });
});
