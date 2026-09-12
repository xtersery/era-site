import { useEffect, useRef, type ReactNode } from 'react';

import { useVisualTier } from '@/hooks';
import { invalidateStage, isLiveTier, stage } from '@/lib/stage';

import { ScrollTrigger } from '../gsap/register';
import { ScrollContext } from './scrollContext';
import { createLenisScroll, createNativeScroll, type SmoothScroll } from './smoothScroll';
import { useChapterTriggers } from './useChapterTriggers';

/** Header height is read from the token so anchors land below the fixed bar. */
const headerOffset = (): number => {
  const raw = getComputedStyle(document.documentElement).getPropertyValue('--header-height');
  const px = Number.parseFloat(raw);
  return Number.isFinite(px) ? -px : 0;
};

/**
 * Owns the one scroller for the page.
 *
 * Lenis for the `full` tier; the native scroller for `reduced` and `none`.
 * Also owns in-page anchor navigation (`<a href="#services">`) so both
 * implementations behave identically and the fixed header is accounted for.
 */
export function ScrollProvider({ children }: { readonly children: ReactNode }) {
  const tier = useVisualTier();
  const scrollRef = useRef<SmoothScroll | null>(null);

  useEffect(() => {
    const scroll = isLiveTier(tier) ? createLenisScroll() : createNativeScroll();
    scrollRef.current = scroll;
    document.documentElement.dataset.scroll = scroll.kind;

    // Scroll → stage (velocity is per frame, damped by the readers).
    let lastY = scroll.scrollY();
    const offScroll = scroll.onScroll((y) => {
      stage.scroll.velocity = y - lastY;
      stage.scroll.y = y;
      lastY = y;
      invalidateStage();
    });

    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey) return;
      const anchor = (event.target as Element | null)?.closest<HTMLAnchorElement>('a[href^="#"]');
      if (!anchor) return;
      const hash = anchor.getAttribute('href');
      if (!hash || hash === '#') return;
      const id = hash.slice(1).split('?')[0] ?? '';
      const target = document.getElementById(id);
      if (!target) return;

      event.preventDefault();
      history.pushState(null, '', hash);
      scroll.scrollTo(target, { offset: headerOffset() });
      // Move focus for keyboard and screen-reader users without scrolling twice.
      target.focus({ preventScroll: true });
    };

    document.addEventListener('click', onClick);

    // Deep link on load.
    if (location.hash.length > 1) {
      const id = location.hash.slice(1).split('?')[0] ?? '';
      const target = document.getElementById(id);
      if (target) scroll.scrollTo(target, { offset: headerOffset(), immediate: true });
    }

    ScrollTrigger.refresh();

    return () => {
      offScroll();
      document.removeEventListener('click', onClick);
      scroll.destroy();
      scrollRef.current = null;
      delete document.documentElement.dataset.scroll;
    };
  }, [tier]);

  useChapterTriggers(true);

  return <ScrollContext.Provider value={scrollRef}>{children}</ScrollContext.Provider>;
}
