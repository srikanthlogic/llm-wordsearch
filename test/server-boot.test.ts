// @vitest-environment node
import { spawn, type ChildProcess } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import http from 'node:http';
import { tmpdir } from 'node:os';
import path, { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { afterAll, describe, expect, it } from 'vitest';

// #137 regression smoke: the self-host server must boot and answer
// /api/health. This runs the real entrypoint (the double-listen crash in
// main() only fires when the module is executed, not when it is imported).
// Uses node:http because the shared test setup stubs global fetch.
const PORT = 8137;
const BASE = `http://localhost:${PORT}`;
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const staticDir = mkdtempSync(join(tmpdir(), 'wordkey-boot-static-'));
writeFileSync(join(staticDir, 'index.html'), '<!doctype html><title>boot</title>');
const corpusDir = mkdtempSync(join(tmpdir(), 'wordkey-boot-corpus-'));

let child: ChildProcess | undefined;

function start(): ChildProcess {
  // Resolve tsx directly (npx is not on the spawned PATH in CI sandboxes).
  const tsxCli = join(repoRoot, 'node_modules', 'tsx', 'dist', 'cli.mjs');
  return spawn(process.execPath, [tsxCli, 'server/index.ts'], {
    cwd: repoRoot,
    stdio: 'pipe',
    env: {
      ...process.env,
      PORT: String(PORT),
      WORDKEY_STATIC_DIR: staticDir,
      WORDKEY_CORPUS_DIR: corpusDir,
    },
  });
}

function get(url: string): Promise<{ status: number; body: string }> {
  return new Promise((resolve, reject) => {
    http
      .get(url, res => {
        let body = '';
        res.on('data', chunk => (body += chunk));
        res.on('end', () => resolve({ status: res.statusCode ?? 0, body }));
      })
      .on('error', reject);
  });
}

async function waitForHealth(timeoutMs = 30_000): Promise<{ status: number; body: string }> {
  const deadline = Date.now() + timeoutMs;
  let lastError: unknown;
  while (Date.now() < deadline) {
    try {
      const res = await get(`${BASE}/api/health`);
      if (res.status === 200) return res;
      lastError = new Error(`health returned ${res.status}`);
    } catch (error) {
      lastError = error;
    }
    await new Promise(resolve => setTimeout(resolve, 250));
  }
  throw lastError ?? new Error('server did not become healthy in time');
}

afterAll(() => {
  child?.kill('SIGTERM');
});

describe('self-host server boot (#137)', () => {
  it('boots via tsx and serves /api/health', async () => {
    child = start();
    child.stderr?.on('data', chunk => process.stderr.write(`[server] ${chunk}`));
    const res = await waitForHealth();
    const body = JSON.parse(res.body) as { status?: string };
    expect(body.status).toBe('ok');
  }, 60_000);

  it('serves the SPA shell from the static dir', async () => {
    const res = await get(BASE);
    expect(res.status).toBe(200);
    expect(res.body).toContain('<!doctype html>');
  }, 15_000);
});
