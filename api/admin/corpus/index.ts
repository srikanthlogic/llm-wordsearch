// Vercel Edge Function: /api/admin/corpus (v2 reposition spec §7.2).
// Thin mount — all logic lives in services/adminCorpusService.ts, shared
// with the Netlify function and the self-host Hono server.
export const config = { runtime: 'edge' };

import { handleAdminCorpus } from '../../../services/adminCorpusService';

export default async function handler(request: Request): Promise<Response> {
  return handleAdminCorpus(request, {
    adminToken: process.env.ADMIN_TOKEN,
    githubToken: process.env.GITHUB_TOKEN,
    githubRepo: process.env.GITHUB_REPO,
    githubBranch: process.env.GITHUB_BRANCH,
    // Edge has no filesystem — publishing uses the git backend.
  });
}
