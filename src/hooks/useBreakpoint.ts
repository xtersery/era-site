import { up, type Breakpoint } from '@/styles/tokens/tokens';

import { useMediaQuery } from './useMediaQuery';

/** True at or above the named breakpoint. */
export const useBreakpointUp = (name: Breakpoint): boolean => useMediaQuery(up(name));

/**
 * Coarse device tier used to decide whether a scene is worth mounting at all.
 * Layout decisions should use CSS; this is for *behavioural* branches only.
 */
export const useIsDesktop = (): boolean => useBreakpointUp('lg');
