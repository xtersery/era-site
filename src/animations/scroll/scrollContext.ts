import { createContext, useContext } from 'react';

import type { SmoothScroll } from './smoothScroll';

export const ScrollContext = createContext<{ readonly current: SmoothScroll | null } | null>(null);

/** The live scroller, or `null` before the provider's effect has run. */
export function useSmoothScroll(): SmoothScroll | null {
  const ctx = useContext(ScrollContext);
  if (!ctx) throw new Error('useSmoothScroll must be used inside <ScrollProvider>');
  return ctx.current;
}
