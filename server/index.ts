import fs from 'fs';
import path from 'path';

import { serve } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';
import { Hono } from 'hono';

import { validateCorpusDomain } from '../services/corpusService';
import { renderDomainMd, renderLlmsTxt, renderVocabJson, renderVocabMd } from '../services/vocabArtifacts';
import { CorpusDomain, InstanceMode, WordKeyConfig } from '../types';

// v2 reposition spec §7.1: the self-host server. One small Hono app serving
// the built bundle, the owner's volume-mounted corpus, and request-time agent
// artifacts rendered by the SAME module the build script uses — no LLM, no
// DB, no auth on the serving path.

export interface ServerOptions {
  staticDir: string;
  corpusDir: string;
  version: string;
}

const SECURITY_HEADERS: Record<string, string> = {
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
};

function loadConfig(corpusDir: string): WordKeyConfig {
  const fallback: WordKeyConfig = {
    mode: InstanceMode.Serve,
    title: 'WordKey',
    owner: '',
    blurb: '',
    locale: 'en',
    links: [],
    levels: { perDomain: 3, wordsPerLevel: 8 },
    progression: { sequentialLevels: true },
  };
  try {
    const raw = JSON.parse(fs.readFileSync(path.join(corpusDir, 'wordkey.config.json'), 'utf8'));
    return { ...fallback, ...raw };
  } catch {
    return fallback;
  }
}

function loadDomains(corpusDir: string): CorpusDomain[] {
  const manifestPath = path.join(corpusDir, 'manifest.json');
  try {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    const slugs: string[] = Array.isArray(manifest?.domains)
      ? manifest.domains.filter((s: unknown): s is string => typeof s === 'string')
      : [];
    const domains: CorpusDomain[] = [];
    for (const slug of slugs) {
      try {
        const { data } = validateCorpusDomain(JSON.parse(fs.readFileSync(path.join(corpusDir, `${slug}.json`), 'utf8')));
        if (data) domains.push(data);
      } catch (error) {
        console.warn(`[wordkey] corpus/${slug}.json skipped (unreadable or invalid).`, error);
      }
    }
    return domains;
  } catch {
    return [];
  }
}

export function createApp(options: ServerOptions): Hono {
  const app = new Hono();
  const { staticDir, corpusDir, version } = options;

  const hasMountedCorpus = fs.existsSync(path.join(corpusDir, 'manifest.json'));

  app.use('*', async (c, next) => {
    for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
      c.header(key, value);
    }
    await next();
  });

  app.get('/api/health', c =>
    c.json({
      status: 'ok',
      corpus: hasMountedCorpus ? loadDomains(corpusDir).length : 0,
    }),
  );

  // Agent artifacts: rendered per request from the mounted corpus so updating
  // the vocabulary is a file replace, not a rebuild.
  const renderArtifacts = (c: any) => {
    const config = loadConfig(corpusDir);
    const domains = loadDomains(corpusDir);
    const meta = { version, generatedAt: new Date().toISOString() };
    switch (c.req.path) {
      case '/vocab.md':
        return c.body(renderVocabMd(config, domains, meta), 200, { 'Content-Type': 'text/markdown; charset=utf-8' });
      case '/vocab.json':
        return c.body(renderVocabJson(config, domains, meta), 200, { 'Content-Type': 'application/json; charset=utf-8' });
      case '/llms.txt':
        return c.body(renderLlmsTxt(config, domains, meta), 200, { 'Content-Type': 'text/plain; charset=utf-8' });
      default: {
        const slug = c.req.path.replace('/vocab/', '').replace(/\.md$/, '');
        const domain = domains.find(d => d.domain === slug);
        if (!domain) return c.notFound();
        return c.body(renderDomainMd(config, domain, meta), 200, { 'Content-Type': 'text/markdown; charset=utf-8' });
      }
    }
  };

  const artifactsReady = hasMountedCorpus && loadDomains(corpusDir).length > 0;
  if (artifactsReady) {
    app.get('/vocab.md', renderArtifacts);
    app.get('/vocab.json', renderArtifacts);
    app.get('/llms.txt', renderArtifacts);
    app.get('/vocab/:domain.md', renderArtifacts);

    // The owner's corpus and config override whatever was baked at build time.
    app.get('/corpus/*', serveStatic({ root: corpusDir, rewriteRequestPath: p => p.replace(/^\/corpus/, '') }));
    app.get('/wordkey.config.json', (c) => {
      const file = path.join(corpusDir, 'wordkey.config.json');
      if (!fs.existsSync(file)) return c.notFound();
      return c.body(fs.readFileSync(file, 'utf8'), 200, { 'Content-Type': 'application/json; charset=utf-8' });
    });
  }

  app.use('*', serveStatic({ root: staticDir }));
  // SPA fallback: hash-routed views and deep links land on the shell.
  app.get('*', (c) => {
    const index = path.join(staticDir, 'index.html');
    if (fs.existsSync(index)) {
      return c.body(fs.readFileSync(index, 'utf8'), 200, { 'Content-Type': 'text/html; charset=utf-8' });
    }
    return c.notFound();
  });

  return app;
}

function main(): void {
  const repoRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
  const staticDir = process.env.WORDKEY_STATIC_DIR || path.join(repoRoot, 'dist');
  const corpusDir = process.env.WORDKEY_CORPUS_DIR || path.join(repoRoot, 'corpus');
  const version = JSON.parse(fs.readFileSync(path.join(repoRoot, 'package.json'), 'utf8')).version ?? '0.0.0';
  const port = Number(process.env.PORT) || 8080;

  const server = serve({ fetch: createApp({ staticDir, corpusDir, version }).fetch, port });
  console.log(`[wordkey] serving ${staticDir} (corpus: ${corpusDir}) on http://localhost:${port}`);
  server.listen();
}

// tsx server/index.ts (or node dist-server/index.mjs after the Docker
// bundle) → run; import → library use (tests, future adapters).
const entry = process.argv[1] ?? '';
if (entry.endsWith('server/index.ts') || entry.endsWith('index.mjs')) {
  main();
}
