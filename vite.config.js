import { defineConfig } from 'vite';

export default defineConfig({
  base: process.env.NODE_ENV === 'production' ? '/mask/' : './', // Change '/mask/' to your repo name
  server: {
    port: 3000
  },
  build: {
    target: 'esnext',
    assetsInlineLimit: 0 // Don't inline assets, keep them as separate files
  }
});
