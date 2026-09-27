import path from 'path';

import { defineConfig, loadEnv } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
/// <reference types="vitest" />

import { buildPwaManifest } from './scripts/pwa-manifest';

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
      plugins: [
        // v2 reposition spec §8: installable + offline corpus play. The SW
        // precaches the build; runtime caching covers corpus/locales/config.
        VitePWA({
          registerType: 'prompt',
          manifest: buildPwaManifest(),
          includeAssets: ['favicon.svg', 'favicon.ico', 'apple-touch-icon.png', 'wordkey.config.json', 'corpus/**', 'locales/**'],
          workbox: {
            navigateFallback: '/index.html',
            globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
            runtimeCaching: [
              {
                // Corpus + config + locales: content is versioned by file
                // replace on the server; SWR keeps offline play fresh.
                urlPattern: /\/(corpus|locales)\/.+\.(json|md)$|\/wordkey\.config\.json$/,
                handler: 'StaleWhileRevalidate',
                options: { cacheName: 'wordkey-content', expiration: { maxEntries: 64, maxAgeSeconds: 60 * 60 * 24 * 14 } },
              },
              {
                urlPattern: /\/vocab(\.md|\.json|\/.+\.md)?$|\/llms\.txt$/,
                handler: 'CacheFirst',
                options: { cacheName: 'wordkey-vocab', expiration: { maxEntries: 32, maxAgeSeconds: 60 * 60 * 24 * 14 } },
              },
            ],
          },
        }),
      ],
      test: {
        globals: true,
        environment: 'jsdom',
        setupFiles: ['./test/setup.ts']
      }
    };
});
