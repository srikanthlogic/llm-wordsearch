import { CorpusDomain } from '../types';

import { validateCorpusDomain } from './corpusService';

// v2 reposition spec §3.3: the serve-mode corpus is static content under
// /corpus/ — an owner replaces the files (or mounts a volume over them in
// the M5 container). Cached per session; deployment updates arrive on reload.
const cache = new Map<string, { domains: CorpusDomain[]; errors: string[] }>();

export async function fetchCorpusDomains(
  manifestUrl: string = '/corpus/manifest.json',
  forceReload = false,
): Promise<{ domains: CorpusDomain[]; errors: string[] }> {
  if (!forceReload && cache.has(manifestUrl)) {
    return cache.get(manifestUrl)!;
  }

  const result = await loadAll(manifestUrl);
  cache.set(manifestUrl, result);
  return result;
}

async function loadAll(manifestUrl: string): Promise<{ domains: CorpusDomain[]; errors: string[] }> {
  const errors: string[] = [];
  let slugs: string[] = [];
  try {
    const response = await fetch(manifestUrl);
    if (!response.ok) {
      return { domains: [], errors: [`corpus manifest unavailable (HTTP ${response.status})`] };
    }
    const manifest = await response.json();
    slugs = Array.isArray(manifest?.domains) ? manifest.domains.filter((s: unknown): s is string => typeof s === 'string') : [];
  } catch (error) {
    return { domains: [], errors: [`corpus manifest could not be loaded: ${error instanceof Error ? error.message : String(error)}`] };
  }

  const domains: CorpusDomain[] = [];
  await Promise.all(
    slugs.map(async slug => {
      try {
        const response = await fetch(`/corpus/${slug}.json`);
        if (!response.ok) {
          errors.push(`corpus/${slug}.json unavailable (HTTP ${response.status})`);
          return;
        }
        const { data, errors: domainErrors } = validateCorpusDomain(await response.json());
        if (data) domains.push(data);
        else errors.push(`corpus/${slug}.json is invalid: ${domainErrors.join('; ')}`);
      } catch (error) {
        errors.push(`corpus/${slug}.json could not be loaded: ${error instanceof Error ? error.message : String(error)}`);
      }
    }),
  );
  return { domains, errors };
}
