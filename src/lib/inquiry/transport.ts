/**
 * Where the inquiry goes and how long the browser waits — pure, so it is
 * tested under Node (`transport.test.ts`) without Vite's `import.meta.env`.
 *
 * Production (Yandex Object Storage: static files, no runtime env) bakes
 * `VITE_LEAD_API_URL` in at build time from `.env.production` — the public
 * REG.RU relay, `https://api.era-cosmetology.ru/lead/` (`deploy/regru-api/`).
 * Without it — `npm run dev`, `npm run preview` — the page posts to its own
 * `/api/lead` (`server/vite.ts`).
 */

export const LOCAL_LEAD_ENDPOINT = '/api/lead';

/**
 * Longer than the relay's own 15 s upstream timeout, so the relay's
 * `502 delivery` reaches the page before the browser gives up.
 */
export const LEAD_TIMEOUT_MS = 20_000;

export function resolveLeadEndpoint(configured: string | undefined): string {
  const url = configured?.trim();
  return url ? url : LOCAL_LEAD_ENDPOINT;
}
