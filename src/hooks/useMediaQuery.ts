import { useSyncExternalStore } from 'react';

import { isBrowser } from '@/lib/env';

const subscribe = (query: string) => (onChange: () => void) => {
  if (!isBrowser) return () => {};
  const list = window.matchMedia(query);
  list.addEventListener('change', onChange);
  return () => list.removeEventListener('change', onChange);
};

/**
 * Reactive media query. Backed by `useSyncExternalStore` so it is
 * tear-free under concurrent rendering and correct on the very first paint.
 */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    subscribe(query),
    () => (isBrowser ? window.matchMedia(query).matches : false),
    () => false,
  );
}
