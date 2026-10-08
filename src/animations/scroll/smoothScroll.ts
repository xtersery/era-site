import Lenis from 'lenis';

import { isDev } from '@/lib/env';

import { gsap, ScrollTrigger } from '../gsap/register';

/**
 * Smooth-scroll integration point.
 *
 * DECISION: Lenis is installed (docs/ARCHITECTURE.md §2) because the approved
 * direction has two scrubbed, pinned sequences whose feel depends on eased
 * scroll position — the manifesto lens pass and the Specialists horizontal
 * scroll. It stays behind this interface so the rest of the app never imports
 * it, and so reduced-motion / low-tier visitors get the native scroller.
 *
 * Lenis keeps the *native* scroll position (no transform), so ScrollTrigger
 * needs no `scrollerProxy` and `pin` works with the default `pinType`.
 */

export interface SmoothScroll {
  /** Which implementation is live. Useful for QA and for the visual-tier hook. */
  readonly kind: 'native' | 'lenis';
  /** Current scroll position in pixels. */
  readonly scrollY: () => number;
  /** Scroll to a target: a selector, an element, or an absolute offset. */
  readonly scrollTo: (target: string | Element | number, options?: ScrollToOptions) => void;
  /** Subscribe to scroll updates. Returns an unsubscribe function. */
  readonly onScroll: (handler: (scrollY: number) => void) => () => void;
  /** Freeze/unfreeze the scroller — used by overlays and page transitions. */
  readonly setLocked: (locked: boolean) => void;
  readonly destroy: () => void;
}

export interface ScrollToOptions {
  readonly offset?: number;
  readonly immediate?: boolean;
  /**
   * Move even while the scroller is locked. For the owner of the lock only —
   * a transition that holds the page and repositions it under its own cover.
   */
  readonly force?: boolean;
}

const resolveTarget = (target: string | Element | number): Element | number | null =>
  typeof target === 'string' ? document.querySelector(target) : target;

/** Native-scroller implementation. Zero dependencies, zero latency. */
export function createNativeScroll(): SmoothScroll {
  const handlers = new Set<(scrollY: number) => void>();

  const onNativeScroll = () => {
    const y = window.scrollY;
    for (const handler of handlers) handler(y);
  };

  window.addEventListener('scroll', onNativeScroll, { passive: true });

  return {
    kind: 'native',
    scrollY: () => window.scrollY,

    scrollTo: (target, options = {}) => {
      const offset = options.offset ?? 0;
      const resolved = resolveTarget(target);
      if (resolved === null) return;
      const top =
        typeof resolved === 'number'
          ? resolved + offset
          : window.scrollY + resolved.getBoundingClientRect().top + offset;

      window.scrollTo({ top, behavior: options.immediate ? 'auto' : 'smooth' });
    },

    onScroll: (handler) => {
      handlers.add(handler);
      return () => handlers.delete(handler);
    },

    setLocked: (locked) => {
      document.documentElement.classList.toggle('is-scroll-locked', locked);
    },

    destroy: () => {
      window.removeEventListener('scroll', onNativeScroll);
      handlers.clear();
    },
  };
}

/**
 * Lenis-backed implementation.
 *
 * - `lenis.raf` is driven by `gsap.ticker` so GSAP and the scroller share one
 *   clock; `lagSmoothing(0)` stops GSAP from pausing the ticker under load,
 *   which would freeze scrolling.
 * - `ScrollTrigger.update` runs on every Lenis scroll event so pinned and
 *   scrubbed triggers track the eased position.
 */
export function createLenisScroll(): SmoothScroll {
  const lenis = new Lenis({
    // Deliberately light easing — the audience should never feel the page
    // fighting the wheel. Tune in the motion phase, not here.
    lerp: 0.1,
    wheelMultiplier: 1,
    touchMultiplier: 1.2,
    smoothWheel: true,
    syncTouch: false,
    anchors: false, // anchors go through scrollTo() so both implementations agree
  });

  // Dev-only handle for QA scripts (`window.__lenis`). Never shipped.
  if (isDev) (window as Window & { __lenis?: Lenis }).__lenis = lenis;

  const handlers = new Set<(scrollY: number) => void>();

  lenis.on('scroll', ({ scroll }: { scroll: number }) => {
    ScrollTrigger.update();
    for (const handler of handlers) handler(scroll);
  });

  const tick = (time: number) => lenis.raf(time * 1000);
  gsap.ticker.add(tick);
  gsap.ticker.lagSmoothing(0);

  return {
    kind: 'lenis',
    scrollY: () => lenis.scroll,

    scrollTo: (target, options = {}) => {
      const resolved = resolveTarget(target);
      if (resolved === null) return;
      // Lenis derives an element target from its own `animatedScroll`, which is
      // stale right after a native scroll (keyboard, find-in-page, a test
      // runner's scrollIntoView). Resolve the absolute position from the real
      // scroll offset and re-sync Lenis before animating.
      const top =
        typeof resolved === 'number'
          ? resolved
          : window.scrollY + resolved.getBoundingClientRect().top;
      if (Math.abs(lenis.animatedScroll - window.scrollY) > 1) {
        lenis.scrollTo(window.scrollY, { immediate: true, force: true });
      }
      lenis.scrollTo(Math.round(top + (options.offset ?? 0)), {
        immediate: options.immediate ?? false,
        force: options.force ?? false,
      });
    },

    onScroll: (handler) => {
      handlers.add(handler);
      return () => handlers.delete(handler);
    },

    setLocked: (locked) => {
      if (locked) lenis.stop();
      else lenis.start();
      document.documentElement.classList.toggle('is-scroll-locked', locked);
    },

    destroy: () => {
      gsap.ticker.remove(tick);
      lenis.destroy();
      handlers.clear();
    },
  };
}
