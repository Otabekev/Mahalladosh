import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'node:path'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        runtimeCaching: [
          {
            // Uploaded images: immutable content, serve from cache when we have it.
            urlPattern: ({ url, request, sameOrigin }) =>
              sameOrigin && request.method === 'GET' && url.pathname.startsWith('/api/uploads/'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'md-images',
              expiration: { maxEntries: 200, maxAgeSeconds: 30 * 24 * 3600 },
            },
          },
          {
            // Other API GETs: fresh when the network answers, last-known data offline.
            urlPattern: ({ url, request, sameOrigin }) =>
              sameOrigin && request.method === 'GET' && url.pathname.startsWith('/api/'),
            handler: 'NetworkFirst',
            options: {
              cacheName: 'md-api',
              networkTimeoutSeconds: 4,
              expiration: { maxEntries: 100, maxAgeSeconds: 24 * 3600 },
            },
          },
        ],
      },
      manifest: {
        name: 'Mahalladosh',
        short_name: 'Mahalladosh',
        description: "Mahallangiz bilan bog'laning — qo'shnilar, oilalar, yordam",
        theme_color: '#B23A28',
        background_color: '#F4E9D3',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
  resolve: {
    alias: { '@': path.resolve(__dirname, 'src') },
  },
  server: {
    host: true,
    // The dev launcher assigns a free port via PORT; 5174 is the manual-run fallback.
    port: Number(process.env.PORT) || 5174,
    proxy: { '/api': 'http://localhost:8000' },
    // The dev launcher starts vite via an 8.3 short path (spaces in the user dir);
    // strict fs matching rejects it as "outside" the long-path root.
    fs: { strict: false },
  },
})
