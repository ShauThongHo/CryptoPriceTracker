import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  server: {
    host: true,       // 开启局域网 IP
    port: 5173,       // 锁定端口
    strictPort: true, // 严禁换端口
  },
  optimizeDeps: {
    esbuildOptions: {
      define: {
        global: 'globalThis'
      }
    },
    exclude: ['ccxt'] // Exclude CCXT from pre-bundling
  },
  build: {
    rollupOptions: {
      external: [
        // Externalize Node.js built-ins that CCXT tries to use
        'events',
        'net',
        'tls',
        'dns',
        'http',
        'https',
        'url',
        'assert',
        'stream',
        'buffer',
        'util',
        'zlib',
        // Node.js prefixed versions
        'node:events',
        'node:net', 
        'node:tls',
        'node:dns',
        'node:http',
        'node:https',
        'node:url',
        'node:assert',
        'node:stream',
        'node:buffer',
        'node:util',
        'node:zlib'
      ],
      output: {
        globals: {
          // Provide empty implementations for externalized modules
          events: '{}',
          net: '{}',
          tls: '{}',
          dns: '{}',
          http: '{}',
          https: '{}',
          url: '{}',
          assert: '{}',
          stream: '{}',
          buffer: '{}',
          util: '{}',
          zlib: '{}'
        }
      }
    }
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'mask-icon.svg'],
      manifest: {
        name: 'Crypto Portfolio Tracker',
        short_name: 'CryptoTracker',
        description: 'Local-first cryptocurrency portfolio tracker',
        theme_color: '#2563eb',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        icons: [
          {
            src: 'pwa-64x64.png',
            sizes: '64x64',
            type: 'image/png'
          },
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: 'maskable-icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          }
        ]
      },
      workbox: {
        maximumFileSizeToCacheInBytes: 10 * 1024 * 1024, // 10 MB limit for CCXT
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webmanifest}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/api\.coingecko\.com\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'coingecko-api-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 5 * 60, // 5 minutes
              },
              networkTimeoutSeconds: 10,
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365 // 1 year
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          }
        ]
      },
      devOptions: {
        enabled: true,
        type: 'module'
      }
    })
  ],
})
