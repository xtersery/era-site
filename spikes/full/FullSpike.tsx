import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useCallback, useEffect } from 'react';

import { ScrollProvider } from '@/animations/scroll';
import { InquiryProvider } from '@/lib/inquiry';

import { FlowPage } from '../flow/FlowSpike';
import { HeroStage } from '../hero-stone/HeroStoneSpike';
import { PerfHud, wantsPerfHud } from '../perf/PerfHud';

/**
 * The whole experience, one page — every approved spike in the approved
 * order, on the project's one scroller:
 *
 *   00 Главная → 01 Манифест        `spikes/hero-stone/` — the hero on onyx, the
 *                                    descent (pass 13 gateway + film, pass 16
 *                                    ground), then Манифест → Услуги as a normal
 *                                    scroll (pass 15's trigger); all inside
 *                                    `HeroStage`, untouched
 *   02 Услуги → 04 Кейсы → 05 Специалисты → 06 Основатель → 07 Отзывы →
 *   08 Адрес → 09 Заявка              `spikes/flow/` — `FlowPage` with all of its
 *                                    blends, the pass-19 passage, the corridor
 *                                    and the price layer, untouched
 *   03 Стоимость                      the `#pricing` layer, from the navigation
 *                                    only — never in the document
 *
 * Composition: `FlowPage`'s `head` slot takes `HeroStage`, which puts the
 * flow's own driven Услуги node into its `.sv-frame` — so the Манифест →
 * Услуги trigger and the Услуги pin see exactly the element they were built
 * against. One `ScrollProvider` (Lenis on the live tiers, native otherwise —
 * `initTier()` runs once at module scope in each spike, resolving the same
 * tier), one `InquiryProvider`, no second RAF loop.
 *
 * THE TWO HEADERS. The hero has its own approved header (`.hh`, absolute in
 * the section: the mark, the name, «Стоимость», «Меню» with the index) and
 * the descent fades it out over the film's first tenth. The flow's fixed bar
 * (`.flowbar`, `difference` over any room) is the navigation everywhere
 * else. So the bar is held at nothing while the hero's header is up and
 * comes in with the descent's last frames (`onPassage`: 0.86 → 1), leaving
 * again on the way back; without the film (reduced motion, no WebGL) it
 * comes in as the still manifesto room passes the middle of the screen.
 */
export function FullSpike() {
  return (
    <InquiryProvider>
      <ScrollProvider>
        <FullPage />
        {/* `?perfDebug=1` — the performance readout (dev only) */}
        {wantsPerfHud() && <PerfHud />}
      </ScrollProvider>
    </InquiryProvider>
  );
}

const smoothstep = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

// Written on the bar itself, the one element that reads these — not on the
// page root, where a per-frame custom-property write recalculates the style of
// every element on the page (measured: up to 35 ms a frame over the film's
// last tenth, while the bar comes in).
function setBar(k: number) {
  const bar = document.querySelector<HTMLElement>('.flowbar');
  if (!bar) return;
  bar.style.setProperty('--bar', k.toFixed(3));
  bar.style.setProperty('--bar-visibility', k > 0.02 ? 'visible' : 'hidden');
}

function FullPage() {
  // the bar follows the descent: nothing while the hero's header is up, in over the film's last frames
  const onPassage = useCallback((t: number) => setBar(smoothstep(0.86, 1, t)), []);

  // without the film the manifesto is a still room after the hero: the bar comes in as it arrives
  useEffect(() => {
    setBar(0);
    const room = document.querySelector<HTMLElement>('.mf-room');
    if (!room) return;
    const st = ScrollTrigger.create({
      trigger: room,
      start: 'top 60%',
      onEnter: () => setBar(1),
      onLeaveBack: () => setBar(0),
    });
    return () => st.kill();
  }, []);

  return (
    <FlowPage
      home="#hero"
      head={(services) => <HeroStage services={services} onPassage={onPassage} />}
    />
  );
}
