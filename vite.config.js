import { defineConfig } from 'vite';

export default defineConfig({
  base: '/mask/', // GitHub Pages base path
  server: {
    port: 3000
  },
  build: {
    target: 'esnext',
    assetsInlineLimit: 0 // Don't inline assets, keep them as separate files
  }
});
