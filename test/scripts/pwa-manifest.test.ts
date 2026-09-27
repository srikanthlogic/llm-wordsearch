import fs from 'fs';
import os from 'os';
import path from 'path';

import { describe, expect, it } from 'vitest';

import { buildPwaManifest } from '../../scripts/pwa-manifest';

describe('buildPwaManifest', () => {
  it('falls back to the template identity without a config', () => {
    const manifest = buildPwaManifest({ publicDir: '/nonexistent' });
    expect(manifest.name).toBe('WordKey');
    expect(manifest.short_name).toBe('WordKey');
  });

  it('derives name + description from a configured instance', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'wordkey-pwa-'));
    fs.writeFileSync(
      path.join(dir, 'wordkey.config.json'),
      JSON.stringify({ title: 'WordKey — cashlessconsumer', blurb: 'My cashless vocabulary.' }),
    );
    const manifest = buildPwaManifest({ publicDir: dir });
    expect(manifest.name).toBe('WordKey — cashlessconsumer');
    expect(manifest.short_name).toBe('WordKey');
    expect(manifest.description).toBe('My cashless vocabulary.');
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it('includes 192/512 icons plus a maskable 512', () => {
    const manifest = buildPwaManifest({ publicDir: '/nonexistent' });
    const sizes = manifest.icons.map(i => `${i.sizes}:${i.purpose ?? 'any'}`);
    expect(sizes).toContain('192x192:any');
    expect(sizes).toContain('512x512:any');
    expect(sizes).toContain('512x512:maskable');
  });

  it('offers Play and vocab.md shortcuts', () => {
    const manifest = buildPwaManifest({ publicDir: '/nonexistent' });
    expect(manifest.shortcuts.map(s => s.url)).toEqual(['/', '/vocab.md']);
  });
});
