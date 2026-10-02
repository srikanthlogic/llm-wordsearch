import { isSupportedLocale } from '../hooks/useI18n';
import { DomainLink, InstanceMode, WordKeyConfig } from '../types';

// v2 reposition spec §3.1. Served at /wordkey.config.json: a static asset in
// Vite builds, the volume-mounted file in the M5 Hono server. Missing or
// invalid config degrades to author mode = today's v1 behavior.
export const CONFIG_URL = '/wordkey.config.json';

export const DEFAULT_INSTANCE_CONFIG: WordKeyConfig = {
  mode: InstanceMode.Author,
  title: '',
  owner: '',
  blurb: '',
  locale: 'en',
  links: [],
  levels: { perDomain: 3, wordsPerLevel: 8 },
  progression: { sequentialLevels: true },
};

function clampString(value: unknown, max: number): string {
  if (typeof value !== 'string') return '';
  return value.trim().slice(0, max);
}

function clampInt(value: unknown, min: number, max: number, fallback: number): number {
  const n = typeof value === 'number' && Number.isFinite(value) ? Math.floor(value) : fallback;
  return Math.min(max, Math.max(min, n));
}

function clampLink(raw: unknown): DomainLink | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const candidate = raw as { label?: unknown; url?: unknown };
  const label = clampString(candidate.label, 40);
  const url = typeof candidate.url === 'string' ? candidate.url.trim() : '';
  if (!label || !/^https?:\/\//i.test(url)) return null;
  return { label, url };
}

export function normalizeConfig(raw: unknown): WordKeyConfig {
  if (typeof raw !== 'object' || raw === null) return DEFAULT_INSTANCE_CONFIG;
  const source = raw as Record<string, unknown>;

  const mode = source.mode === InstanceMode.Serve ? InstanceMode.Serve : InstanceMode.Author;
  const locale =
    typeof source.locale === 'string' && isSupportedLocale(source.locale) ? source.locale : 'en';
  const links = Array.isArray(source.links)
    ? source.links.map(clampLink).filter((l): l is DomainLink => l !== null).slice(0, 5)
    : [];
  const levels =
    typeof source.levels === 'object' && source.levels !== null
      ? (source.levels as Record<string, unknown>)
      : {};
  const progression =
    typeof source.progression === 'object' && source.progression !== null
      ? (source.progression as Record<string, unknown>)
      : {};

  return {
    mode,
    title: clampString(source.title, 80),
    owner: clampString(source.owner, 80),
    blurb: clampString(source.blurb, 280),
    locale,
    links,
    levels: {
      perDomain: clampInt(levels.perDomain, 1, 10, DEFAULT_INSTANCE_CONFIG.levels.perDomain),
      wordsPerLevel: clampInt(
        levels.wordsPerLevel,
        4,
        16,
        DEFAULT_INSTANCE_CONFIG.levels.wordsPerLevel,
      ),
    },
    progression: { sequentialLevels: progression.sequentialLevels !== false },
  };
}

export async function fetchInstanceConfig(
  fetchImpl: typeof fetch = fetch,
): Promise<WordKeyConfig> {
  try {
    const response = await fetchImpl(CONFIG_URL);
    if (!response.ok) {
      console.warn(`Instance config unavailable (HTTP ${response.status}); using defaults.`);
      return DEFAULT_INSTANCE_CONFIG;
    }
    return normalizeConfig(await response.json());
  } catch (error) {
    console.warn('Instance config could not be loaded; using defaults.', error);
    return DEFAULT_INSTANCE_CONFIG;
  }
}
