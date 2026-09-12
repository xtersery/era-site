import type { RefObject } from 'react';

import { gsap, useGSAP } from '../gsap/register';

interface HorizontalPinOptions {
  /** The section that gets pinned. */
  readonly section: RefObject<HTMLElement | null>;
  /** The flex track that translates horizontally. */
  readonly track: RefObject<HTMLElement | null>;
  /** Number of panels (each 100vw wide). */
  readonly count: number;
  /** Only the `full` tier pins; phone and reduced motion stack vertically. */
  readonly enabled: boolean;
  /** Scrub progress 0..1 — for the mono index. Mutate DOM refs, not state. */
  readonly onProgress?: (progress: number) => void;
}

/**
 * Horizontal pinned scroll: the section pins for `(count - 1) * 100vw` of
 * vertical scroll while the track translates left. Guarded by
 * `gsap.matchMedia()` so it only exists on wide screens without a
 * reduced-motion preference; everywhere else the CSS stack is the layout and
 * this hook does nothing. Reverted on unmount by `useGSAP`.
 */
export function useHorizontalPin({
  section,
  track,
  count,
  enabled,
  onProgress,
}: HorizontalPinOptions) {
  useGSAP(
    () => {
      if (!enabled || count < 2 || !section.current || !track.current) return;

      const mm = gsap.matchMedia();

      mm.add('(min-width: 1024px) and (prefers-reduced-motion: no-preference)', () => {
        const trackEl = track.current;
        const sectionEl = section.current;
        if (!trackEl || !sectionEl) return;

        sectionEl.classList.add('is-pinned');

        const distance = () => trackEl.scrollWidth - window.innerWidth;

        gsap.to(trackEl, {
          x: () => -distance(),
          ease: 'none',
          scrollTrigger: {
            trigger: sectionEl,
            start: 'top top',
            end: () => `+=${distance()}`,
            pin: true,
            scrub: 1,
            anticipatePin: 1,
            invalidateOnRefresh: true,
            onUpdate: (self) => onProgress?.(self.progress),
          },
        });

        return () => {
          sectionEl.classList.remove('is-pinned');
        };
      });
    },
    { scope: section, dependencies: [enabled, count] },
  );
}
