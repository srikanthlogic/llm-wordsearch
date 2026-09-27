// Netlify Function (v2 style): /api/admin/corpus (v2 reposition spec §7.2).
// Thin mount — all logic lives in services/adminCorpusService.ts, shared
// with the Vercel Edge function and the self-host Hono server.
import { handleAdminCorpus } from '../../services/adminCorpusService';
import fs from 'node:fs';

export default async (request: Request) => {
  return handleAdminCorpus(request, {
    adminToken: process.env.ADMIN_TOKEN,
    githubToken: process.env.GITHUB_TOKEN,
    githubRepo: process.env.GITHUB_REPO,
    githubBranch: process.env.GITHUB_BRANCH,
    corpusDir: process.env.WORDKEY_CORPUS_DIR,
  }, {
    version: process.env.WORDKEY_VERSION ?? '0',
    writeFile: (p, c) => fs.writeFileSync(p, c, 'utf8'),
  });
};

export const config = { path: '/api/admin/corpus' };
