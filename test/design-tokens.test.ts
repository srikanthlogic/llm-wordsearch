import { readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

/**
 * Design-token regression: #139 fixed text on solid bg-ink fills, #159 covers
 * the translucent bg-ink overlays, bg-ink/5 icon chips, bg-accent chips and
 * the saturated bg-success fill.
 *
 * Ratios are computed from the RGB triplet variables in index.css, compositing
 * Tailwind's alpha modifiers over the surface each token actually sits on.
 * Source assertions are a guard because a contrast formula cannot know which
 * utility class a component chose.
 */

type Rgb = [number, number, number];

const readSource = (file: string) => readFileSync(path.join(process.cwd(), file), 'utf8');
const css = readSource('index.css');

function parseVars(block: string): Record<string, Rgb> {
  const vars: Record<string, Rgb> = {};
  for (const match of block.matchAll(/--([\w-]+)-rgb:\s*(\d+)\s+(\d+)\s+(\d+)\s*;/g)) {
    vars[match[1]] = [Number(match[2]), Number(match[3]), Number(match[4])];
  }
  return vars;
}

const rootBlock = css.match(/:root\s*\{([\s\S]*?)\}/)?.[1];
const darkBlock = css.match(/\.dark\s*\{([\s\S]*?)\}/)?.[1];
if (!rootBlock || !darkBlock) throw new Error('index.css is missing :root or .dark token blocks');

const rootVars = parseVars(rootBlock);
const themes: Record<'light' | 'dark', Record<string, Rgb>> = {
  // .dark only overrides the variables that flip; the rest inherit :root.
  light: rootVars,
  dark: { ...rootVars, ...parseVars(darkBlock) },
};

const composite = (fg: Rgb, alpha: number, bg: Rgb): Rgb =>
  fg.map((channel, i) => alpha * channel + (1 - alpha) * bg[i]) as Rgb;

function luminance(rgb: Rgb): number {
  const [r, g, b] = rgb.map((channel) => {
    const c = channel / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: Rgb, b: Rgb): number {
  const [lighter, darker] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (lighter + 0.05) / (darker + 0.05);
}

const modeNames = ['light', 'dark'] as const;

describe('design tokens: computed contrast', () => {
  it.each(modeNames)('keeps overlay text readable on bg-ink/85 in %s mode', (mode) => {
    const t = themes[mode];
    // The overlay sits on a sheet surface; bg-ink/85 composites over it.
    const overlay = composite(t.ink, 0.85, t.sheet);

    expect(contrast(t.paper, overlay)).toBeGreaterThanOrEqual(4.5);
    // text-paper/70 is the theme-aware equivalent of text-white/70.
    expect(contrast(composite(t.paper, 0.7, overlay), overlay)).toBeGreaterThanOrEqual(4.5);
  });

  it.each(modeNames)('keeps icons readable on bg-ink/5 chips in %s mode', (mode) => {
    const t = themes[mode];
    const chip = composite(t.ink, 0.05, t.sheet);
    expect(contrast(t['ink-soft'], chip)).toBeGreaterThanOrEqual(4.5);
  });

  it.each(modeNames)('keeps the bg-accent chip icon readable in %s mode', (mode) => {
    const t = themes[mode];
    expect(contrast(t['ink-on-accent'], t.accent)).toBeGreaterThanOrEqual(4.5);
  });

  it.each(modeNames)('keeps the saturated bg-success fill readable in %s mode', (mode) => {
    const t = themes[mode];
    // Publish / play-again buttons are bold large text and the level-complete
    // icon is a non-text graphic: WCAG AA requires 3:1 for both.
    expect(contrast(t.paper, t.success)).toBeGreaterThanOrEqual(3);
  });

  it('fixes the dark-mode bg-success regression (was white at 1.74:1)', () => {
    const t = themes.dark;
    expect(contrast(t.paper, t.success)).toBeGreaterThanOrEqual(4.5);
  });
});

describe('design tokens: component usage', () => {
  it('maps the theme CSS variables into Tailwind utilities', () => {
    const tailwind = readSource('tailwind.config.js');
    expect(tailwind).toMatch(/paper:\s*'rgb\(var\(--paper-rgb\)/);
    expect(tailwind).toMatch(/onAccent:\s*'rgb\(var\(--ink-on-accent-rgb\)/);
  });

  const player = readSource('views/PlayerView.tsx');
  const overlays = player.slice(
    player.indexOf('const renderLevelCompleteOverlay'),
    player.indexOf('if (setupError)')
  );

  it('uses text-paper (and paper/70) throughout the three bg-ink/85 overlays', () => {
    expect(overlays.match(/bg-ink\/85/g)).toHaveLength(3);
    expect(overlays).toContain('text-paper');
    expect(overlays).toContain('text-paper/70');
    expect(overlays).not.toMatch(/\btext-white\b/);
  });

  it('uses an ink-derived icon color in the five bg-ink/5 SettingsView chips', () => {
    const settings = readSource('views/SettingsView.tsx');
    const chips = settings.match(
      /bg-ink\/5 border border-ink\/10 flex items-center justify-center[\s\S]*?<\/div>/g
    ) ?? [];
    expect(chips).toHaveLength(5);
    for (const chip of chips) expect(chip).toContain('text-ink-soft');
    expect(settings).not.toMatch(/\btext-white\b/);
  });

  it('uses text-ink-onAccent inside every PrivacyView bg-accent chip', () => {
    const privacy = readSource('views/PrivacyView.tsx');
    expect(privacy.match(/text-ink-onAccent/g)).toHaveLength(6); // container + 5 icons
    expect(privacy).not.toMatch(/\btext-white\b/);
  });

  it('keeps fixed white off every saturated bg-success surface', () => {
    for (const file of [
      'views/PlayerView.tsx',
      'components/AvailableGamesPanel.tsx',
      'views/AuthorView.tsx',
    ]) {
      const source = readSource(file);
      for (const tag of source.match(/className="[^"]*bg-success[^"]*"/g) ?? []) {
        expect(tag).not.toContain('text-white');
      }
    }
  });
});
