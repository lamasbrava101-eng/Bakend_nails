import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['Logo_imagen-1.jpg', 'apple-touch-icon.png'],
      manifest: {
        name: 'Nb_nails Estudio de Uñas',
        short_name: 'Nb_nails',
        description: 'Catálogo, cotizador y reservas - Nb_nails Estudio de Uñas',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'portrait',
        theme_color: '#FAF5F0',
        background_color: '#FAF5F0',
        lang: 'es',
        icons: [
          {
            src: '/pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: '/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: '/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
      },
      devOptions: {
        enabled: true,
      },
    }),
  ],
  server: {
    host: true,
    allowedHosts: ['convergence-christ-theatre-pichunter.trycloudflare.com', '.trycloudflare.com', 'trycloudflare.com', '.loca.lt', '.ngrok-free.app', 'localhost'],
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
});