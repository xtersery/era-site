import { fileURLToPath, URL } from 'node:url';

import react from '@vitejs/plugin-react';
import { visualizer } from 'rollup-plugin-visualizer';
import { defineConfig } from 'vite';

import { leadApi } from './server/vite.ts';

const resolvePath = (segment: string) => fileURLToPath(new URL(segment, import.meta.url));

/**
 * Vite configuration.
 *
 * Notes for future work:
 * - GLSL is imported with Vite's built-in `?raw` suffix (see src/three/shaders/README.md).
 *   No shader plugin is installed — add one only if `#include` preprocessing becomes necessary.
 * - `codeSplitting.groups` keeps three.js/R3F/postprocessing out of the initial
 *   bundle so the non-WebGL shell can paint before the renderer is fetched.
 *   Scenes must still be lazy-imported via React.lazy at their usage site.
 * - `rollup-plugin-visualizer` writes `dist/stats.html` on every build — the
 *   proof that `three` is not in the initial chunk (docs/ARCHITECTURE.md §6).
 */
export default defineConfig({
  plugins: [
    react(),
    // POST /api/lead → Telegram, in the dev and preview servers (server/README.md)
    leadApi(),
    // the bundle report is for the desk — never in a deployed `dist/` (Vercel sets `VERCEL=1`)
    ...(process.env['VERCEL']
      ? []
      : [
          visualizer({
            filename: 'dist/stats.html',
            gzipSize: true,
            brotliSize: true,
            template: 'treemap',
            open: false,
          }),
        ]),
  ],
  resolve: {
    alias: {
      '@': resolvePath('./src'),
      '@components': resolvePath('./src/components'),
      '@sections': resolvePath('./src/sections'),
      '@three': resolvePath('./src/three'),
      '@animations': resolvePath('./src/animations'),
      '@hooks': resolvePath('./src/hooks'),
      '@lib': resolvePath('./src/lib'),
      '@styles': resolvePath('./src/styles'),
      '@data': resolvePath('./src/data'),
      '@types': resolvePath('./src/types'),
      '@assets': resolvePath('./src/assets'),
    },
  },
  build: {
    target: 'es2022',
    sourcemap: true,
    // Three.js is large by nature; the warning is noise once it is split out.
    chunkSizeWarningLimit: 1_000,
    rollupOptions: {
      output: {
        // Vite 8 runs on Rolldown: chunking is `codeSplitting.groups`, not
        // Rollup's object-form `manualChunks` (function-only here) and not the
        // now-deprecated `advancedChunks`.
        codeSplitting: {
          groups: [
            { name: 'react', test: /[\\/]node_modules[\\/](react|react-dom|scheduler)[\\/]/ },
            { name: 'three', test: /[\\/]node_modules[\\/]three[\\/]/ },
            { name: 'r3f', test: /[\\/]node_modules[\\/]@react-three[\\/](fiber|drei)[\\/]/ },
            {
              name: 'postfx',
              test: /[\\/]node_modules[\\/](postprocessing|@react-three[\\/]postprocessing)[\\/]/,
            },
            { name: 'gsap', test: /[\\/]node_modules[\\/](gsap|@gsap)[\\/]/ },
            { name: 'lenis', test: /[\\/]node_modules[\\/]lenis[\\/]/ },
          ],
        },
      },
    },
  },
  server: {
    port: 5173,
    host: true,
  },
});
