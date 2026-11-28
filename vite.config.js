import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import fs from 'node:fs';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * copyStaticDirs — copies vanilla JS workspace assets into dist/ at build time.
 * This keeps the workspace JS, CSS, vendor, and fonts available at their
 * expected paths (/js/, /css/, /vendor/, /fonts/) so the React WorkspaceApp
 * shell can load them via dynamic <script> injection.
 */
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

      // Workspace JS modules
      copyDir(resolve(rootDir, 'js'), resolve(distDir, 'js'));
      // Workspace CSS (fonts, styles, accessibility, animations)
      copyDir(resolve(rootDir, 'css'), resolve(distDir, 'css'));
      // Vendored parsers (pdf.js, mammoth)
      copyDir(resolve(rootDir, 'vendor'), resolve(distDir, 'vendor'));

      // Service worker (must be at root scope)
      const swSrc = resolve(rootDir, 'sw.js');
      if (fs.existsSync(swSrc)) {
        fs.copyFileSync(swSrc, resolve(distDir, 'sw.js'));
      }

      // Keep app.html in dist for the E2E test that navigates to /app.html
      // (The test will be updated to use /app, but we keep it for safety)
      const appHtmlSrc = resolve(rootDir, 'app.html');
      if (fs.existsSync(appHtmlSrc)) {
        fs.copyFileSync(appHtmlSrc, resolve(distDir, 'app.html'));
      }
    }
  };
}

export default defineConfig({
  // Use '/' (absolute) so React Router and all asset paths resolve correctly
  base: '/',
  plugins: [react(), copyStaticDirs()],
  server: {
    port: 5173,
    strictPort: false,
    // SPA fallback: serve index.html for all unknown paths so React Router works
    historyApiFallback: true,
    headers: {
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Permissions-Policy': 'camera=(), microphone=(self), geolocation=()'
    }
  },
  preview: {
    port: 4173,
    headers: {
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Permissions-Policy': 'camera=(), microphone=(self), geolocation=()'
    }
  },
  build: {
    rollupOptions: {
      input: {
        // Single entry point — the React SPA handles all routes
        landing: resolve(fileURLToPath(new URL('.', import.meta.url)), 'index.html')
      }
    }
  }
});
