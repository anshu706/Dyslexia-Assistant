import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: false
  },
  build: {
    rollupOptions: {
      input: {
        landing: resolve(fileURLToPath(new URL('.', import.meta.url)), 'index.html'),
        workspace: resolve(fileURLToPath(new URL('.', import.meta.url)), 'app.html')
      }
    }
  }
});
