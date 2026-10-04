import { CorpusDomain } from '../types';

import { validateCorpusDomain } from './corpusService';

// v2 reposition spec §7.2: owner-only corpus publishing. The handler is
// platform-neutral (Web Request/Response) so Vercel Edge, Netlify Functions,
// and the self-host Hono server mount the exact same logic.
//
// Fail closed: without ADMIN_TOKEN the endpoint does not exist (404) — an
// instance without the secret has no admin surface at all. With it, the
// publish backend is GitHub (git-backed corpus + auto-redeploy) when
// GITHUB_TOKEN + GITHUB_REPO are set, otherwise a direct write to the local
// corpus directory (Docker volume, injected writeFile — Edge runtimes have
// no filesystem and always use the git backend).

const WINDOW_MS = 60_000;
const MAX_POSTS_PER_WINDOW = 10;
const postTimestamps: number[] = [];

export interface AdminEnv {
  adminToken?: string;
  githubToken?: string;
  githubRepo?: string;
  githubBranch?: string;
  corpusDir?: string;
}

export interface AdminRuntime {
  version: string;
  /** Node mounts only (Hono server, Netlify). Edge runtimes omit it and use
   *  the git backend. */
  writeFile?: (path: string, content: string) => void;
}

function constantTimeEqual(a: string, b: string): boolean {
  // XOR-accumulate over both strings padded to the same length so the
  // iteration count leaks nothing; portable across Node and Edge runtimes.
  const max = Math.max(a.length, b.length);
  let diff = a.length ^ b.length;
  for (let i = 0; i < max; i++) {
    diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  }
  return diff === 0;
}

function toBase64(text: string): string {
  // Edge-safe base64 of UTF-8 content (Buffer is not guaranteed there);
  // chunked because String.fromCharCode spread has an argument-count limit.
  const bytes = new TextEncoder().encode(text);
  let binary = '';
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(binary);
}

function backendFor(env: AdminEnv, runtime: AdminRuntime): 'github' | 'local' | null {
  if (env.githubToken && env.githubRepo) return 'github';
  if (env.corpusDir && runtime.writeFile) return 'local';
  return null;
}

function rateLimited(): boolean {
  const now = Date.now();
  while (postTimestamps.length && now - postTimestamps[0] > WINDOW_MS) {
    postTimestamps.shift();
  }
  if (postTimestamps.length >= MAX_POSTS_PER_WINDOW) return true;
  postTimestamps.push(now);
  return false;
}

/** Test seam: clear the in-memory rate-limit window. */
export function resetRateLimit(): void {
  postTimestamps.length = 0;
}

async function publishToGithub(env: AdminEnv, domain: CorpusDomain): Promise<Response> {
  const branch = env.githubBranch || 'main';
  const apiPath = `repos/${env.githubRepo}/contents/corpus/${domain.domain}.json`;
  const base = `https://api.github.com/${apiPath}`;
  const headers = {
    Authorization: `Bearer ${env.githubToken}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'Content-Type': 'application/json',
  };

  // Optimistic concurrency: fetch the existing blob sha (null = new file).
  let sha: string | undefined;
  try {
    const current = await fetch(`${base}?ref=${branch}`, { headers });
    if (current.ok) {
      sha = ((await current.json()) as { sha?: string }).sha;
    }
  } catch {
    // Fall through to the PUT; GitHub rejects a missing sha on an existing
    // file, which surfaces as an explicit conflict below.
  }

  const put = await fetch(base, {
    method: 'PUT',
    headers,
    body: JSON.stringify({
      message: `wordkey: publish corpus/${domain.domain} via admin`,
      content: toBase64(JSON.stringify(domain, null, 2) + '\n'),
      branch,
      ...(sha ? { sha } : {}),
    }),
  });

  if (put.status === 409) {
    return Response.json(
      { error: 'conflict', message: 'The file changed remotely — reload and republish.' },
      { status: 409 },
    );
  }
  if (!put.ok) {
    const body = await put.text();
    console.error('[admin] GitHub publish failed:', put.status, body);
    return Response.json({ error: 'github', message: `GitHub publish failed (${put.status}).` }, { status: 502 });
  }
  return Response.json({ ok: true, backend: 'github', path: `corpus/${domain.domain}.json` });
}

function publishToLocal(env: AdminEnv, domain: CorpusDomain, runtime: AdminRuntime): Response {
  const target = `${env.corpusDir}/${domain.domain}.json`;
  try {
    runtime.writeFile!(target, JSON.stringify(domain, null, 2) + '\n');
    return Response.json({ ok: true, backend: 'local', path: target });
  } catch (error) {
    console.error('[admin] local publish failed:', error);
    return Response.json({ error: 'local', message: 'Could not write the corpus directory.' }, { status: 500 });
  }
}

export function checkAdminEnabled(env: AdminEnv, runtime: AdminRuntime = { version: '0' }): { enabled: boolean; backend: 'github' | 'local' | null } {
  const backend = env.adminToken ? backendFor(env, runtime) : null;
  return { enabled: backend !== null, backend };
}

export async function handleAdminCorpus(
  request: Request,
  env: AdminEnv,
  runtime: AdminRuntime = { version: '0' },
): Promise<Response> {
  const { enabled, backend } = checkAdminEnabled(env, runtime);
  if (!enabled) {
    // Fail closed: an instance without the secret has no admin surface.
    return new Response('Not found', { status: 404 });
  }

  if (request.method === 'GET') {
    return Response.json({ enabled: true, backend });
  }

  if (request.method !== 'POST') {
    return Response.json({ error: 'method' }, { status: 405 });
  }

  const auth = request.headers.get('Authorization') ?? '';
  const provided = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  // #161: verify the token BEFORE the rate limiter — the limiter counts
  // every POST it sees, so running it first let ~10 unauthenticated POSTs
  // per minute lock the owner out of publishing. Only authenticated
  // attempts consume the window now.
  if (!provided || !constantTimeEqual(provided, env.adminToken!)) {
    return Response.json({ error: 'auth', message: 'Invalid admin token.' }, { status: 401 });
  }

  if (rateLimited()) {
    return Response.json({ error: 'rate', message: 'Too many publishes — wait a minute.' }, { status: 429 });
  }

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return Response.json({ error: 'json', message: 'Body must be JSON.' }, { status: 400 });
  }

  const { data, errors } = validateCorpusDomain(raw);
  if (!data) {
    return Response.json({ error: 'invalid', errors }, { status: 400 });
  }

  if (backend === 'github') {
    return publishToGithub(env, data);
  }
  return publishToLocal(env, data, runtime);
}
