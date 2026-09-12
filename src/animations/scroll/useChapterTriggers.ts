import { SECTION_IDS, type SectionId } from '@/lib/constants/sections';
import { invalidateStage, notifyStage, stage } from '@/lib/stage';

import { gsap, ScrollTrigger, useGSAP } from '../gsap/register';

/**
 * One ScrollTrigger per room writes `stage.chapter` and `stage.chapterProgress`
 * (docs/ARCHITECTURE.md §0.8). Progress is 0 when the room's top reaches the
 * viewport bottom and 1 when its bottom leaves the top — the same measure a
 * pinned passage uses inside its pin. The "current" chapter is the room whose
 * top is nearest above the viewport centre.
 */
export function useChapterTriggers(enabled: boolean) {
  useGSAP(
    () => {
      if (!enabled) return;
      const sections = SECTION_IDS.map((id) => document.getElementById(id)).filter(
        (el): el is HTMLElement => el !== null,
      );
      if (sections.length === 0) return;

      const triggers = sections.map((el) =>
        ScrollTrigger.create({
          trigger: el,
          start: 'top bottom',
          end: 'bottom top',
          onUpdate: (self) => {
            if (stage.chapter !== el.id) return;
            stage.chapterProgress = self.progress;
            invalidateStage();
          },
        }),
      );

      // Current chapter: the last room whose top has passed the viewport centre.
      const resolve = () => {
        const mid = window.innerHeight * 0.5;
        let next: SectionId = SECTION_IDS[0];
        for (const el of sections) {
          if (el.getBoundingClientRect().top <= mid) next = el.id as SectionId;
        }
        if (next !== stage.chapter || document.documentElement.dataset.chapter !== next) {
          stage.chapter = next;
          document.documentElement.dataset.chapter = next;
          notifyStage();
          invalidateStage();
        }
      };

      const current = ScrollTrigger.create({ start: 0, end: 'max', onUpdate: resolve });
      gsap.delayedCall(0, resolve);

      return () => {
        for (const t of triggers) t.kill();
        current.kill();
      };
    },
    { dependencies: [enabled] },
  );
}
