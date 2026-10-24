import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import { describe, expect, it } from 'vitest';

import { SECURITY_HEADERS } from '../server/index';

// #157 regression guard: the three deploy surfaces (Vercel, Netlify,
// self-host Hono) drifted apart silently — the self-host CSP blocked the
// BYO-LLM direct path, and nothing in CI compared the header sets. This
// suite parses all three sources and pins the security-relevant directives
// in lockstep.

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

const surfaces: Record<string, Record<string, string>> = {
  'server/index.ts': SECURITY_HEADERS,
  'vercel.json': vercelHeaders,
  'netlify.toml': netlifyHeaders,
};

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
  it('sets the baseline headers on every surface', () => {
    for (const [name, headers] of Object.entries(surfaces)) {
      expect(headers['X-Frame-Options'], name).toBe('DENY');
      expect(headers['X-Content-Type-Options'], name).toBe('nosniff');
      expect(headers['Referrer-Policy'], name).toBe('strict-origin-when-cross-origin');
      expect(headers['Permissions-Policy'], name).toBe('camera=(), microphone=(), geolocation=()');
      expect(headers['X-XSS-Protection'], name).toBe('1; mode=block');
    }
  });

  it('keeps the CSP security directives in lockstep', () => {
    for (const [name, headers] of Object.entries(surfaces)) {
      const csp = cspDirectives(headers['Content-Security-Policy'] ?? '');
      expect(csp.get('frame-ancestors'), `${name} frame-ancestors`).toEqual(['none']);
      expect(csp.get('worker-src'), `${name} worker-src`).toEqual(['self']);
      expect(csp.get('base-uri'), `${name} base-uri`).toEqual(['self']);
      expect(csp.get('form-action'), `${name} form-action`).toEqual(['self']);
      // #157: the BYO-LLM default fetches OpenRouter direct from the
      // browser — every surface must allow it or self-host BYO breaks.
      expect(csp.get('connect-src'), `${name} connect-src`).toContain('https://openrouter.ai');
    }
  });

  it('ships HSTS on the surfaces that own their headers', () => {
    // Vercel injects HSTS at the platform level; adding one in vercel.json
    // would emit a duplicate header. Self-host and Netlify must set it.
    expect(surfaces['server/index.ts']['Strict-Transport-Security']).toContain('max-age=');
    expect(surfaces['netlify.toml']['Strict-Transport-Security']).toContain('max-age=');
  });

  it('documents the one deliberate vercel-only connect-src allowance', () => {
    const vercelConnect = cspDirectives(surfaces['vercel.json']['Content-Security-Policy']).get('connect-src') ?? [];
    const selfHostConnect = cspDirectives(surfaces['server/index.ts']['Content-Security-Policy']).get('connect-src') ?? [];
    expect(vercelConnect).toContain('https://*.vercel.app');
    expect(selfHostConnect).not.toContain('https://*.vercel.app');
  });
});
