import { loadEnv, type Plugin } from 'vite';

import { createLeadHandler } from './lead/handler.ts';
import { MemoryRateLimit } from './lead/rateLimit.ts';
import { toNodeListener } from './node.ts';

/**
 * `/api/lead` inside the Vite dev server (`npm run dev`) and the preview
 * server (`npm run preview`) — the real handler, the real Telegram call.
 *
 * The secrets are read here, in Node, from `.env.local` / `.env` / the
 * process environment. They are not `VITE_`-prefixed, so Vite never puts them
 * into the client bundle. This plugin only exists in the dev/preview server;
 * `vite build` emits static files and no endpoint — production needs one of
 * the adapters in `server/README.md`.
 */
export function leadApi(): Plugin {
  let listener: ReturnType<typeof toNodeListener> | null = null;
  return {
    name: 'era-lead-api',
    configResolved(config) {
      const env = loadEnv(config.mode, config.envDir || config.root, '');
      listener = toNodeListener(
        createLeadHandler({
          env: {
            TELEGRAM_BOT_TOKEN: env['TELEGRAM_BOT_TOKEN'],
            TELEGRAM_CHAT_ID: env['TELEGRAM_CHAT_ID'],
            TELEGRAM_API_BASE: env['TELEGRAM_API_BASE'],
            LEAD_ALLOWED_ORIGINS: env['LEAD_ALLOWED_ORIGINS'],
          },
          // one long-lived process: memory is exact here
          rateLimit: new MemoryRateLimit(),
        }),
      );
    },
    configureServer(server) {
      server.middlewares.use('/api/lead', (req, res) => void listener?.(req, res));
    },
    configurePreviewServer(server) {
      server.middlewares.use('/api/lead', (req, res) => void listener?.(req, res));
    },
  };
}
