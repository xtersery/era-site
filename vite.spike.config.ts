import { fileURLToPath, URL } from 'node:url';

import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

/**
 * Builds ONE spike page into a self-contained bundle (`dist-spike/`) so it can
 * be published as a review artifact: every asset — fonts, images — is inlined.
 * Dev-only tooling; nothing here affects the production build.
 *
 *   SPIKE=radial npx vite build --config vite.spike.config.ts
 *   node scripts/inline-spike.mjs radial   → dist-spike/radial.html
 */
const spike = process.env['SPIKE'] ?? 'radial';
const resolvePath = (segment: string) => fileURLToPath(new URL(segment, import.meta.url));

export default defineConfig({
  plugins: [react()],
  base: './',
  resolve: {
    alias: {
      '@': resolvePath('./src'),
      '@components': resolvePath('./src/components'),
      '@lib': resolvePath('./src/lib'),
      '@styles': resolvePath('./src/styles'),
      '@data': resolvePath('./src/data'),
      '@types': resolvePath('./src/types'),
    },
  },
  build: {
    outDir: 'dist-spike',
    emptyOutDir: true,
    sourcemap: false,
    target: 'es2022',
    assetsInlineLimit: 1_000_000_000,
    cssCodeSplit: false,
    chunkSizeWarningLimit: 10_000,
    rollupOptions: {
      input: resolvePath(`./spikes/${spike}/index.html`),
      output: { codeSplitting: { groups: [] } },
    },
  },
});
