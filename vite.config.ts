import path from 'path';

import { defineConfig, loadEnv } from 'vite';
/// <reference types="vitest" />

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      // Security: API_KEY must NEVER appear here. It is a server-side secret
      // consumed only by /api/llm-proxy at runtime on Vercel. Community
      // provider requests are always routed through the proxy.
      define: {
        'process.env.COMMUNITY_MODEL_NAME': JSON.stringify(env.COMMUNITY_MODEL_NAME),
        'process.env.LANGUAGE_MODEL_MAP': JSON.stringify(env.LANGUAGE_MODEL_MAP),
        'process.env.LLM_PROXY_URL': JSON.stringify(env.LLM_PROXY_URL)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      },
      server: {
        host: '0.0.0.0',
        port: 5173,
        allowedHosts: ['5173--01990b2f-6a34-772b-942a-da3545ccb791.us-east-1-01.gitpod.dev'],
        fs: {
          strict: false,
          allow: ['..']
        }
      },
      publicDir: 'public',
      test: {
        globals: true,
        environment: 'jsdom',
        setupFiles: ['./test/setup.ts']
      }
    };
});
