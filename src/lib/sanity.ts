import type { SanityClient } from '@sanity/client';

/**
 * The Sanity client — the site's one connection to the CMS.
 *
 * Credentials come from the environment only (`.env.example`):
 *   VITE_SANITY_PROJECT_ID  the project id (Studio: `sanity.config.ts`)
 *   VITE_SANITY_DATASET     the dataset, `production` by default
 *
 * Without a project id there is no client — `getSanityClient()` resolves to
 * `null` and every reader falls back on its own terms. The package itself is
 * loaded on first use (a dynamic import), so the CMS is not in the initial
 * chunk: the first room to ask for content pays for it, not the hero.
 *
 * Reads only — the client carries no token and uses the public CDN. Writing
 * happens in the Studio (`../studio-era`), never from the site.
 */
export const SANITY_API_VERSION = '2026-09-01';
const REQUEST_TIMEOUT_MS = 8_000;

const env = import.meta.env;

export const sanityConfig = {
  projectId: (env['VITE_SANITY_PROJECT_ID'] as string | undefined)?.trim() || undefined,
  dataset: (env['VITE_SANITY_DATASET'] as string | undefined)?.trim() || 'production',
} as const;

export const isSanityConfigured = (): boolean => Boolean(sanityConfig.projectId);

let clientPromise: Promise<SanityClient | null> | null = null;

export function getSanityClient(): Promise<SanityClient | null> {
  if (!sanityConfig.projectId) return Promise.resolve(null);
  clientPromise ??= import('@sanity/client')
    .then(({ createClient }) =>
      createClient({
        projectId: sanityConfig.projectId,
        dataset: sanityConfig.dataset,
        apiVersion: SANITY_API_VERSION,
        useCdn: true,
        perspective: 'published',
        // one retry and a short timeout: when the CMS is down the room falls
        // back within a breath instead of holding an empty stage for seconds
        maxRetries: 1,
        timeout: REQUEST_TIMEOUT_MS,
      }),
    )
    .catch(() => {
      clientPromise = null; // let a later call try again
      return null;
    });
  return clientPromise;
}
