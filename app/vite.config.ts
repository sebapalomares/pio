import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import basicSsl from '@vitejs/plugin-basic-ssl';
import { VitePWA } from 'vite-plugin-pwa';

// HTTPS en desarrollo: la cámara, el GPS y la brújula solo funcionan con HTTPS
// cuando abres la app desde el móvil en la red local.
export default defineConfig({
  plugins: [
    react(),
    basicSsl(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icons/*.png', 'brand/*.svg', 'fonts/*.woff2'],
      manifest: {
        name: 'Pío',
        short_name: 'Pío',
        description: 'Descubre los lugares de la Sierra de Cazorla con realidad aumentada, rutas y códigos QR',
        lang: 'es',
        start_url: '/',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#F6F4EE',
        theme_color: '#1B6E8A',
        icons: [
          { src: '/icons/pio-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/icons/pio-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: '/icons/pio-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          { src: '/favicon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
        ],
      },
      workbox: { globPatterns: ['**/*.{js,css,html,svg,png,woff2}'] },
    }),
  ],
  server: { host: true },
});
