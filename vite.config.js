import { defineConfig } from 'vite';

export default defineConfig({
  base: './', // Use relative paths for build
  server: {
    port: 3000
  },
  build: {
    target: 'esnext'
  }
});
