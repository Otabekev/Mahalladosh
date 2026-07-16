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
      manifest: {
        name: 'Mahalladosh',
        short_name: 'Mahalladosh',
        description: "Mahallangiz bilan bog'laning — qo'shnilar, oilalar, yordam",
        theme_color: '#111827',
        background_color: '#f7f7f8',
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
