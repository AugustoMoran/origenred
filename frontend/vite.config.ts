import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['logooficialdefinitivo.png', 'origenred-logo.png'],
      manifest: {
        name: 'OrigenRed — Marketplace',
        short_name: 'OrigenRed',
        description: 'Compra y vende en el marketplace argentino OrigenRed',
        theme_color: '#1e3a5f',
        background_color: '#ffffff',
        display: 'standalone',
        lang: 'es-AR',
        start_url: '/',
        icons: [
          {
            src: '/logooficialdefinitivo.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/logooficialdefinitivo.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
      },
      workbox: {
        navigateFallback: '/index.html',
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
            },
          },
        ],
      },
    }),
  ],
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
      '/sitemap.xml': {
        target: 'http://localhost:4000',
        changeOrigin: true,
        rewrite: () => '/api/marketplace/sitemap.xml',
      },
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-redux': ['react-redux', '@reduxjs/toolkit'],
        },
      },
    },
    chunkSizeWarningLimit: 600,
  },
});
