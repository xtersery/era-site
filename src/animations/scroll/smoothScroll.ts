/**
 * Smooth-scroll integration point.
 *
 * DECISION (open): no smooth-scroll library is installed yet.
 *
 * Native scrolling is the correct default. A library (Lenis is the current
 * front-runner: ~3 kB gzip, RAF-driven, no scroll hijack, good ScrollTrigger
 * story) is only justified once we actually have a scrubbed, pinned sequence
 * whose feel depends on eased scroll position. Adding it earlier buys nothing
 * and costs input latency plus an accessibility risk on trackpads.
 *
 * This module exists so that decision is a one-file change instead of a
 * refactor: everything that needs scroll state talks to `SmoothScroll`, and
 * today it is backed by the native scroller.
 *
 * When Lenis is adopted:
 *   1. `npm i lenis`
 *   2. implement `createLenisScroll()` below,
 *   3. wire `ScrollTrigger.scrollerProxy` + `lenis.on('scroll', ScrollTrigger.update)`
 *      and drive `lenis.raf` from `gsap.ticker`,
 *   4. bail out to `createNativeScroll()` when `prefersReducedMotion()` is true.
 */

export interface SmoothScroll {
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
}

/** Native-scroller implementation. Zero dependencies, zero latency. */
export function createNativeScroll(): SmoothScroll {
  const handlers = new Set<(scrollY: number) => void>();

  const onNativeScroll = () => {
    const y = window.scrollY;
    for (const handler of handlers) handler(y);
  };

  window.addEventListener('scroll', onNativeScroll, { passive: true });

  return {
    scrollY: () => window.scrollY,

    scrollTo: (target, options = {}) => {
      const offset = options.offset ?? 0;
      const top =
        typeof target === 'number'
          ? target + offset
          : ((typeof target === 'string'
              ? document.querySelector(target)
              : target
            )?.getBoundingClientRect().top ?? 0);

      window.scrollTo({
        top: typeof target === 'number' ? top : window.scrollY + top + offset,
        behavior: options.immediate ? 'auto' : 'smooth',
      });
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
