/** Environment probes. All of these are safe to call during render. */

export const isBrowser = typeof window !== 'undefined' && typeof document !== 'undefined';

export const isDev = import.meta.env.DEV;

/**
 * Debug tooling — HUDs, diagnostic panels, frozen states from the query
 * string (`?hud=1`, `?diag=1`, `?k=2`, `?transitionDebug=1` …), `window.__*`
 * probes for the capture scripts. On in the dev server and in review-artifact
 * builds (`vite.spike.config.ts` sets `VITE_ERA_DEBUG`); off in the
 * production build, where the page ignores the query string entirely.
 */
export const debugTools = import.meta.env.DEV || import.meta.env['VITE_ERA_DEBUG'] === '1';

/** the query string for debug params — empty in production, so a stray `?k=2` freezes nothing */
export const debugQuery = (): URLSearchParams =>
  new URLSearchParams(debugTools && typeof location !== 'undefined' ? location.search : '');

/**
 * `?noWebgl=1` — every WebGL capability probe answers «no», so the page takes
 * its no-WebGL path (the `none` tier: CSS stills, native scroll, no renderer).
 * Read in production on purpose, unlike `debugQuery()`: it is how a visitor's
 * own device tells whether WebGL is what fails on it. It can only take effects
 * away and shows nothing of its own.
 */
export const webglForcedOff = (): boolean =>
  isBrowser && new URLSearchParams(location.search).get('noWebgl') === '1';

/**
 * Static, one-shot read of the reduced-motion preference.
 * Prefer the reactive `usePrefersReducedMotion()` hook inside components — use
 * this only from module scope or imperative code that cannot subscribe.
 */
export const prefersReducedMotion = (): boolean =>
  isBrowser && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Coarse pointer — a real signal for "drop the hover choreography". */
export const hasCoarsePointer = (): boolean =>
  isBrowser && window.matchMedia('(pointer: coarse)').matches;

/** Device memory in GB where the browser exposes it, otherwise `null`. */
export const deviceMemoryGb = (): number | null => {
  if (!isBrowser) return null;
  const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
  return typeof memory === 'number' ? memory : null;
};

export const hardwareConcurrency = (): number | null =>
  isBrowser && typeof navigator.hardwareConcurrency === 'number'
    ? navigator.hardwareConcurrency
    : null;

/** `navigator.connection.saveData`, when the browser reports it. */
export const prefersReducedData = (): boolean => {
  if (!isBrowser) return false;
  const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
  return connection?.saveData === true;
};
