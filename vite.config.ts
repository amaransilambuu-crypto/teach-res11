import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig(() => {
  return {
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: [
          'favicon.ico',
          'apple-touch-icon.png',
          'icon.svg',
          'thumbnails/*.png',
          'thumbnails/*.svg',
        ],
        manifest: {
          id: '/',
          name: 'Teacher Resource Hub',
          short_name: 'ResourceHub',
          description: 'A professional, secure, and responsive centralized cloud platform for teachers to upload, organize, access, preview, and download teaching resources across desktop and mobile devices.',
          theme_color: '#4f46e5',
          background_color: '#0b1120',
          display: 'standalone',
          start_url: '/',
          scope: '/',
          icons: [
            {
              src: '/pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: '/pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: '/pwa-maskable-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable',
            },
          ],
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,webp,jpg,jpeg,woff,woff2}'],
          additionalManifestEntries: [
            { url: '/thumbnails/sample_cs_lesson_1.png', revision: '1' },
            { url: '/thumbnails/sample_cs_lesson_1.svg', revision: '1' },
            { url: '/thumbnails/sample_network_topologies.png', revision: '1' },
            { url: '/thumbnails/sample_network_topologies.svg', revision: '1' },
            { url: '/thumbnails/sample_unit_test_pdf.png', revision: '1' },
            { url: '/thumbnails/sample_unit_test_pdf.svg', revision: '1' },
            { url: '/thumbnails/default_pdf_thumbnail.png', revision: '1' },
            { url: '/thumbnails/default_pdf_thumbnail.svg', revision: '1' },
            { url: '/thumbnails/default_image_thumbnail.png', revision: '1' },
            { url: '/thumbnails/default_image_thumbnail.svg', revision: '1' },
          ],
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/cdnjs\.cloudflare\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'cdn-libraries-cache',
                expiration: {
                  maxEntries: 20,
                  maxAgeSeconds: 60 * 60 * 24 * 365,
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
            {
              urlPattern: /^https:\/\/fonts\.(?:googleapis|gstatic)\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'fonts-cache',
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 24 * 365,
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
            // Workbox caching for small-sized resource thumbnails (CacheFirst for instant offline availability)
            {
              urlPattern: /\/api\/files\/(?:[a-zA-Z0-9_-]+)\/thumbnail/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'teacher-resource-thumbnails',
                expiration: {
                  maxEntries: 150,
                  maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
            // Static thumbnail assets cache
            {
              urlPattern: /\/thumbnails\/.*\.(?:png|svg|webp|jpg|jpeg)$/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'precached-thumbnails',
                expiration: {
                  maxEntries: 60,
                  maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
            {
              urlPattern: /\/api\/files\/(?:[a-zA-Z0-9_-]+)\/(?:preview|download)/i,
              handler: 'StaleWhileRevalidate',
              options: {
                cacheName: 'teacher-resource-previews',
                expiration: {
                  maxEntries: 50,
                  maxAgeSeconds: 60 * 60 * 24 * 7, // 7 days
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
          ],
          maximumFileSizeToCacheInBytes: 10 * 1024 * 1024,
        },
        devOptions: {
          enabled: false,
        },
      }),
    ],
    build: {
      chunkSizeWarningLimit: 3000,
      rollupOptions: {
        output: {
          manualChunks: {
            'vendor-excel': ['xlsx'],
            'vendor-word': ['mammoth'],
            'vendor-pdf': ['pdfjs-dist'],
            'vendor-firebase': ['firebase/app', 'firebase/firestore', 'firebase/auth'],
          },
        },
      },
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    optimizeDeps: {
      include: [
        'react',
        'react-dom',
        'lucide-react',
        'firebase/app',
        'firebase/firestore',
        'firebase/auth',
        'xlsx',
        'mammoth',
      ],
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      // Explicitly ignore data, uploads, and database files so backend database writes never trigger browser page reloads.
      watch: process.env.DISABLE_HMR === 'true' ? null : {
        ignored: [
          '**/data/**',
          '**/uploads/**',
          '**/dist/**',
          '**/*.tmp*',
          '**/data/db.json',
          '**/db.json',
          /[/\\]data[/\\]/,
          /[/\\]uploads[/\\]/,
          /[/\\]dist[/\\]/,
          /db\.json$/,
        ],
      },
    },
  };
});
