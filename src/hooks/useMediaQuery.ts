import { useSyncExternalStore } from 'react';

import { isBrowser } from '@/lib/env';

// One subscribe function per query: `useSyncExternalStore` re-subscribes
// whenever the function's identity changes, i.e. on every render otherwise.
const subscribers = new Map<string, (onChange: () => void) => () => void>();
const subscribe = (query: string) => {
  let fn = subscribers.get(query);
  if (!fn) {
    fn = (onChange: () => void) => {
      if (!isBrowser) return () => {};
      const list = window.matchMedia(query);
      list.addEventListener('change', onChange);
      return () => list.removeEventListener('change', onChange);
    };
    subscribers.set(query, fn);
  }
  return fn;
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
