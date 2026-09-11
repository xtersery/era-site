import { useEffect, useLayoutEffect } from 'react';

import { isBrowser } from '@/lib/env';

/**
 * `useLayoutEffect` in the browser, `useEffect` on the server.
 *
 * GSAP setup belongs in a layout effect so the first painted frame is already
 * in its "from" state — otherwise reveals flash their final position.
 */
export const useIsomorphicLayoutEffect = isBrowser ? useLayoutEffect : useEffect;
