import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';

import { duration, ease } from '@/styles/tokens/tokens';

let registered = false;

/**
 * Single registration point for every GSAP plugin used by the app.
 *
 * Call this once, as early as possible (see `src/main.tsx`). Registering in
 * more than one module is how plugin-not-registered bugs and duplicated
 * ScrollTrigger instances happen.
 *
 * `ScrollTrigger` and `useGSAP` both ship inside the packages we already
 * depend on — no extra install. Club-only plugins (SplitText, MorphSVG,
 * DrawSVG, CustomEase, Flip, Inertia) are NOT available; do not import them
 * without adding the paid package first.
 */
export function registerGsap(): void {
  if (registered) return;
  registered = true;

  gsap.registerPlugin(useGSAP, ScrollTrigger);

  // House defaults, so a bare gsap.to() already looks like the rest of the site.
  gsap.defaults({
    duration: duration.base,
    ease: ease.out,
  });

  // Sub-pixel transforms cost nothing here and remove shimmer on pinned text.
  gsap.config({ force3D: true });

  // ScrollTrigger has to be told when the smooth-scroll proxy changes.
  // See `src/animations/scroll/smoothScroll.ts`.
  ScrollTrigger.config({ ignoreMobileResize: true });
}

export { gsap, ScrollTrigger, useGSAP };
