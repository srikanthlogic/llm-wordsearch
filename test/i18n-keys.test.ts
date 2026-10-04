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

// #164 regression guard: cross-locale integrity. The en-only checks above
// passed green while game.setupError was missing from all six other locales
// (users saw the English sentence through the per-key fallback), and the
// {{token}}-drift class is the file-side twin of the #140 {{domain}} bug.
const localeFiles = fs
  .readdirSync(path.join(repoRoot, 'public/locales'))
  .filter(f => f.endsWith('.json'))
  .sort();

const locales = new Map<string, Record<string, string>>(
  localeFiles.map(f => [
    f.replace(/\.json$/, ''),
    JSON.parse(fs.readFileSync(path.join(repoRoot, 'public/locales', f), 'utf8')),
  ]),
);

const placeholderPattern = /\{\{([^}]+)\}\}/g;

function placeholders(value: string): string[] {
  return [...value.matchAll(placeholderPattern)].map(m => m[1]).sort();
}

describe('i18n cross-locale parity (#164 regression guard)', () => {
  it('ships exactly the locales useI18n supports', () => {
    // Keep this list in lockstep with AVAILABLE_LOCALES in hooks/useI18n.tsx.
    expect([...locales.keys()]).toEqual(['bn', 'de', 'en', 'es', 'fr', 'hi', 'ta']);
  });

  it('has every non-English locale contain every en.json key', () => {
    const problems: string[] = [];
    for (const [loc, dict] of locales) {
      if (loc === 'en') continue;
      for (const key of Object.keys(en)) {
        if (!Object.prototype.hasOwnProperty.call(dict, key)) {
          problems.push(`${loc}.json missing "${key}"`);
        }
      }
    }
    expect(problems).toEqual([]);
  });

  it('has no locale shipping keys that en.json lacks', () => {
    const problems: string[] = [];
    for (const [loc, dict] of locales) {
      if (loc === 'en') continue;
      for (const key of Object.keys(dict)) {
        if (!Object.prototype.hasOwnProperty.call(en, key)) {
          problems.push(`${loc}.json has extra key "${key}"`);
        }
      }
    }
    expect(problems).toEqual([]);
  });

  it('keeps {{placeholder}} tokens identical to en.json for every locale', () => {
    const problems: string[] = [];
    for (const [loc, dict] of locales) {
      if (loc === 'en') continue;
      for (const [key, value] of Object.entries(dict)) {
        const enValue = en[key];
        // en-parity is asserted above; here a missing en key would make the
        // token comparison meaningless, so skip gracefully.
        if (typeof enValue !== 'string') continue;
        if (JSON.stringify(placeholders(value)) !== JSON.stringify(placeholders(enValue))) {
          problems.push(
            `${loc}.json "${key}" tokens [${placeholders(value).join(', ')}] != en [${placeholders(enValue).join(', ')}]`,
          );
        }
      }
    }
    expect(problems).toEqual([]);
  });
});
