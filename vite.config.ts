/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';
import { viteSingleFile } from 'vite-plugin-singlefile';

// `--mode single` produces one self-contained index.html (used for the hosted preview).
export default defineConfig(({ mode }) => {
  const single = mode === 'single';
  return {
    base: './',
    define: { __SINGLE_FILE__: JSON.stringify(single) },
    plugins: [
      react(),
      tailwindcss(),
      single
        ? viteSingleFile()
        : VitePWA({
            registerType: 'autoUpdate',
            includeAssets: ['icon.svg'],
            manifest: {
              name: 'Skipper Sailing Simulator',
              short_name: 'Skipper Sim',
              description: 'סימולטור אימון למשיט 30 — Skipper training simulator',
              lang: 'he',
              dir: 'rtl',
              display: 'fullscreen',
              orientation: 'landscape',
              background_color: '#0b1d2e',
              theme_color: '#0b1d2e',
              start_url: './',
              icons: [
                { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
                { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
                { src: 'icon.svg', sizes: 'any', type: 'image/svg+xml' },
              ],
            },
            workbox: { maximumFileSizeToCacheInBytes: 5 * 1024 * 1024 },
          }),
    ],
    build: { outDir: single ? 'dist-single' : 'dist', chunkSizeWarningLimit: 2000 },
    test: { include: ['src/**/*.test.ts'], environment: 'node' },
  };
});
