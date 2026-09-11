/** Environment probes. All of these are safe to call during render. */

export const isBrowser = typeof window !== 'undefined' && typeof document !== 'undefined';

export const isDev = import.meta.env.DEV;

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
