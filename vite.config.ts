import path from 'path';
import { defineConfig, loadEnv } from 'vite';
/// <reference types="vitest" />

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      define: {
        'process.env.API_KEY': JSON.stringify(env.API_KEY),
        'process.env.COMMUNITY_MODEL_NAME': JSON.stringify(env.COMMUNITY_MODEL_NAME),
        'process.env.LANGUAGE_MODEL_MAP': JSON.stringify(env.LANGUAGE_MODEL_MAP),
        'process.env.USE_LLM_PROXY': JSON.stringify(env.USE_LLM_PROXY),
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
