import fs from 'fs';
import path from 'path';

// v2 reposition spec §8: the PWA manifest carries the instance identity.
// This reads the build-time `public/wordkey.config.json` (the same file the
// runtime fetches) so an installed instance is named after its owner, not
// the template. Deployments that swap the config before build (fork-edit)
// get their own name automatically; the M5 server's runtime config override
// does not affect the manifest (documented: rebuild or override config in
// the fork to rename an install).

export interface PwaManifestOptions {
  publicDir?: string;
  fallbackTitle?: string;
}

export interface PwaManifest {
  name: string;
  short_name: string;
  description: string;
  start_url: string;
  scope: string;
  display: 'standalone';
  background_color: string;
  theme_color: string;
  icons: { src: string; sizes: string; type: string; purpose?: string }[];
  shortcuts: { name: string; url: string }[];
}

export function buildPwaManifest(options: PwaManifestOptions = {}): PwaManifest {
  const { publicDir = path.resolve(process.cwd(), 'public'), fallbackTitle = 'WordKey' } = options;

  let title = fallbackTitle;
  let description = 'Your vocabulary, playable and loadable.';
  try {
    const configPath = path.join(publicDir, 'wordkey.config.json');
    const raw = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    if (typeof raw.title === 'string' && raw.title.trim()) title = raw.title.trim();
    if (typeof raw.blurb === 'string' && raw.blurb.trim()) description = raw.blurb.trim();
  } catch {
    // No config or unreadable — the fallback identity is fine for dev.
  }

  return {
    name: title,
    short_name: title.split('—')[0].trim() || title,
    description,
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: '#fafaf6',
    theme_color: '#fafaf6',
    icons: [
      { src: '/icons/pwa-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icons/pwa-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/icons/pwa-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
    shortcuts: [
      { name: 'Play', url: '/' },
      { name: 'vocab.md', url: '/vocab.md' },
    ],
  };
}
