import { fileURLToPath, URL } from 'node:url';

import { runnerImport, type Connect, type Plugin } from 'vite';

/**
 * /ceny/ — the price page, prerendered into its own HTML (`ceny/index.html`).
 *
 * The shell holds two markers; this plugin fills them with the markup and the
 * JSON-LD from `spikes/ceny/CenyPage.tsx`, loaded through Vite's module
 * runner (aliases and TSX as in the app) — at build time into
 * `dist/ceny/index.html`, in the dev server on every request, so the page is
 * always the current `src/data/priceList.ts`. Nothing else is prerendered:
 * the main page stays the SPA it is. No dependency: `react-dom/server` and
 * `vite` are already here.
 */
const BODY = '<!--ceny:body-->';
const JSON_LD = '<!--ceny:jsonld-->';

const resolvePath = (segment: string) => fileURLToPath(new URL(segment, import.meta.url));

/* typed here: the node project does not compile the app's TSX */
interface CenyModule {
  renderCeny(): { body: string; jsonLd: string };
}

/*
 * One URL: `/ceny` → 308 → `/ceny/` (the canonical), in the dev and preview
 * servers — what Caddy's `file_server` does on its own for a directory with
 * an index (its canonical URIs). Production is the host's; this only keeps the
 * local servers honest.
 */
const toSlash: Connect.NextHandleFunction = (req, res, next) => {
  const [path, query] = (req.url ?? '').split(/\?(.*)/s);
  if (path !== '/ceny') return next();
  res.writeHead(308, { Location: `/ceny/${query ? `?${query}` : ''}` }).end();
};

export function cenyPage(): Plugin {
  return {
    name: 'era-ceny-page',
    configureServer(server) {
      server.middlewares.use(toSlash);
    },
    configurePreviewServer(server) {
      server.middlewares.use(toSlash);
    },
    transformIndexHtml: {
      order: 'pre',
      async handler(html) {
        if (!html.includes(BODY)) return html;
        const { module } = await runnerImport<CenyModule>(resolvePath('../spikes/ceny/CenyPage.tsx'), {
          configFile: false,
          logLevel: 'error',
          resolve: { alias: { '@': resolvePath('../src') } },
        });
        const { body, jsonLd } = module.renderCeny();
        // a function replacement, so `$` in a price or a name is never a pattern
        return html.replace(BODY, () => body).replace(JSON_LD, () => jsonLd);
      },
    },
  };
}
