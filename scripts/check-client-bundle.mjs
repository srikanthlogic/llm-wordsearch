import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

const SECRET_PATTERNS = [
  [/sk-or-v1-[A-Za-z0-9_-]{16,}/, 'OpenRouter key'],
  [/sk-ant-[A-Za-z0-9_-]{16,}/, 'Anthropic key'],
  [/\bsk-[A-Za-z0-9_-]{32,}\b/, 'OpenAI-style key'],
  [/AIza[0-9A-Za-z_-]{30,}/, 'Google API key'],
  [/ghp_[A-Za-z0-9]{30,}/, 'GitHub PAT'],
  [/xox[baprs]-[A-Za-z0-9-]{10,}/, 'Slack token'],
];

async function* walk(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(full);
    else yield full;
  }
}

const distDir = path.resolve('dist');
let hits = 0;
try {
  for await (const file of walk(distDir)) {
    if (!/\.(js|html|css|mjs)$/.test(file)) continue;
    const content = await readFile(file, 'utf8').catch(() => '');
    for (const [pattern, label] of SECRET_PATTERNS) {
      const match = content.match(pattern);
      if (match) {
        console.error(`[check:bundle] LEAK (${label}) in ${file}: ${match[0].slice(0, 12)}...`);
        hits += 1;
      }
    }
  }
} catch (err) {
  if (err.code === 'ENOENT') {
    console.error('[check:bundle] dist/ not found — run `npm run build` first.');
    process.exit(1);
  }
  throw err;
}

if (hits > 0) {
  console.error(`[check:bundle] FAILED — ${hits} potential secret(s) found in client bundle.`);
  process.exit(1);
}
console.log('[check:bundle] OK — no secrets detected in client bundle.');
