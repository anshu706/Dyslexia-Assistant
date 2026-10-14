import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import fs from 'node:fs';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

function copyStaticDirs() {
  return {
    name: 'copy-static-dirs',
    closeBundle() {
      const rootDir = fileURLToPath(new URL('.', import.meta.url));
      const distDir = resolve(rootDir, 'dist');

      const copyDir = (src, dest) => {
        if (!fs.existsSync(src)) return;
        fs.mkdirSync(dest, { recursive: true });
        for (const item of fs.readdirSync(src)) {
          const sPath = resolve(src, item);
          const dPath = resolve(dest, item);
          if (fs.statSync(sPath).isDirectory()) {
            copyDir(sPath, dPath);
          } else {
            fs.copyFileSync(sPath, dPath);
          }
        }
      };

      copyDir(resolve(rootDir, 'js'), resolve(distDir, 'js'));
      copyDir(resolve(rootDir, 'css'), resolve(distDir, 'css'));
    }
  };
}

export default defineConfig({
  plugins: [react(), copyStaticDirs()],
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

