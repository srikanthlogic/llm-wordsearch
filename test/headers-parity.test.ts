import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';

import { describe, expect, it } from 'vitest';

import { createApp } from '../server/index';

// #157 regression guard: the three deploy surfaces (Vercel, Netlify,
// self-host Hono) drifted apart silently — the self-host CSP blocked the
// BYO-LLM direct path, and nothing in CI compared the header sets. This
// suite pins the security-relevant directives in lockstep with the
// alignment landed in #177. The self-host surface is read from a real
// request through createApp, so it exercises the actual header wiring.

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const vercelJson = JSON.parse(fs.readFileSync(path.join(repoRoot, 'vercel.json'), 'utf8'));
const vercelHeaders: Record<string, string> = Object.fromEntries(
  vercelJson.headers[0].headers.map((h: { key: string; value: string }) => [h.key, h.value]),
);

// Minimal parse of the netlify [[headers]] block — key = "value" pairs.
const netlifyToml = fs.readFileSync(path.join(repoRoot, 'netlify.toml'), 'utf8');
const netlifyHeaders: Record<string, string> = {};
const valuesBlock = netlifyToml.split('[headers.values]')[1] ?? '';
for (const line of valuesBlock.split('\n')) {
  const match = /^(\s*)([A-Za-z-]+)\s*=\s*"(.*)"\s*$/.exec(line);
  if (match) netlifyHeaders[match[2]] = match[3];
}

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'wordkey-headers-'));

// Headers are applied by the global middleware on every response, so no
// static fixture is needed — any request carries the full set.
const app = createApp({ staticDir: root, corpusDir: root, version: 'test' });

const serverResponseHeaders = (async () => {
  const res = await app.request('http://localhost/');
  return Object.fromEntries(res.headers.entries());
})();

function at(headers: Record<string, string>, name: string): string | undefined {
  // Server headers arrive lowercase via Headers.entries(); configs use
  // canonical casing.
  return headers[name] ?? headers[name.toLowerCase()];
}

function cspDirectives(csp: string): Map<string, string[]> {
  const map = new Map<string, string[]>();
  for (const part of csp.split(';')) {
    const tokens = part.trim().split(/\s+/);
    if (tokens[0]) {
      map.set(
        tokens[0],
        // Strip CSP quoting ('self', 'none') so comparisons are on values.
        tokens.slice(1).map(t => t.replace(/^'(.*)'$/, '$1')),
      );
    }
  }
  return map;
}

describe('security header parity across deploy surfaces (#157)', () => {
  it('sets the baseline headers on every surface', async () => {
    const server = await serverResponseHeaders;
    const surfaces: Record<string, Record<string, string>> = {
      'server/index.ts': server,
      'vercel.json': vercelHeaders,
      'netlify.toml': netlifyHeaders,
    };
    for (const [name, headers] of Object.entries(surfaces)) {
      expect(at(headers, 'X-Frame-Options'), name).toBe('DENY');
      expect(at(headers, 'X-Content-Type-Options'), name).toBe('nosniff');
      expect(at(headers, 'Referrer-Policy'), name).toBe('strict-origin-when-cross-origin');
      expect(at(headers, 'Permissions-Policy'), name).toBe('camera=(), microphone=(), geolocation=()');
      // Deprecated no-op: all three surfaces send the same safe "off" value.
      expect(at(headers, 'X-XSS-Protection'), name).toBe('0');
    }
  });

  it('keeps the CSP security directives in lockstep', async () => {
    const server = await serverResponseHeaders;
    const surfaces: Record<string, Record<string, string>> = {
      'server/index.ts': server,
      'vercel.json': vercelHeaders,
      'netlify.toml': netlifyHeaders,
    };
    for (const [name, headers] of Object.entries(surfaces)) {
      const csp = cspDirectives(at(headers, 'Content-Security-Policy') ?? '');
      expect(csp.get('frame-ancestors'), `${name} frame-ancestors`).toEqual(['none']);
      expect(csp.get('worker-src'), `${name} worker-src`).toEqual(['self']);
      expect(csp.get('base-uri'), `${name} base-uri`).toEqual(['self']);
      expect(csp.get('form-action'), `${name} form-action`).toEqual(['self']);
      // #157: the BYO-LLM default fetches OpenRouter direct from the
      // browser — every surface must allow it or managed BYO breaks.
      expect(csp.get('connect-src'), `${name} connect-src`).toContain('https://openrouter.ai');
    }
  });

  it('keeps the deliberate connect-src shape: self-host scheme-wide TLS, managed surfaces narrow', async () => {
    const server = await serverResponseHeaders;
    const serverConnect = cspDirectives(at(server, 'Content-Security-Policy') ?? '').get('connect-src') ?? [];
    const vercelConnect = cspDirectives(vercelHeaders['Content-Security-Policy']).get('connect-src') ?? [];
    // Self-host serves arbitrary BYO-LLM base URLs, so it allows any HTTPS
    // endpoint (scheme source); the managed surfaces keep the known defaults.
    expect(serverConnect).toContain('https:');
    expect(vercelConnect).not.toContain('https:');
    expect(vercelConnect).toContain('https://*.vercel.app');
  });

  it('ships HSTS only where the surface owns TLS termination', async () => {
    const server = await serverResponseHeaders;
    // Vercel/Netlify inject HSTS at the platform edge; the Hono server is
    // the only surface that terminates TLS itself.
    expect(at(server, 'Strict-Transport-Security')).toContain('max-age=');
    expect(vercelHeaders['Strict-Transport-Security']).toBeUndefined();
    expect(netlifyHeaders['Strict-Transport-Security']).toBeUndefined();
  });
});
