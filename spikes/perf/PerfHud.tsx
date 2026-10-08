import { useEffect, useRef } from 'react';

import { ScrollTrigger } from '@/animations/gsap';
import { isDev } from '@/lib/env';
import { stage } from '@/lib/stage';

import './perf-hud.css';

/**
 * `?perfDebug=1` — the performance readout, dev only. Reads everything through
 * refs on a 250 ms clock and writes text nodes: it never sets React state.
 *
 *   FPS · frame time (p50 / max over the last second) · ScrollTriggers (pins)
 *   · canvases · transition state · scroll lock · visual tier · DPR · heap
 *   · the section under the viewport's centre · every R3F scene (`data-scene`
 *   on its canvas) with its frame loop, and whether it is on screen
 */
export const wantsPerfHud = (): boolean =>
  isDev && typeof location !== 'undefined' && new URLSearchParams(location.search).get('perfDebug') === '1';

interface Transition {
  status: string;
  progress: number;
  direction: 1 | -1;
  locked: boolean;
}

/** the room under the viewport's centre — a room that has let go (opacity 0, the specialists over the founder) is skipped */
const activeSection = (): string => {
  for (const e of document.elementsFromPoint(window.innerWidth / 2, window.innerHeight / 2)) {
    const room = e.closest<HTMLElement>('section[id]');
    if (room && getComputedStyle(room).opacity !== '0') return room.id;
  }
  return '—';
};

/** every R3F scene: its frame loop (`always` draws, `demand` is parked, `advance` is driven by the film) and whether it is on screen */
const scenes = (): string =>
  [...document.querySelectorAll<HTMLElement>('[data-scene]')]
    .map((el) => {
      const r = el.getBoundingClientRect();
      const seen = r.bottom > 0 && r.top < window.innerHeight && getComputedStyle(el).visibility !== 'hidden';
      return `${el.dataset['scene']} ${el.dataset['frameloop']}${seen ? '' : ' (off)'}`;
    })
    .join(', ') || '—';

export function PerfHud() {
  const out = useRef<HTMLPreElement>(null);

  useEffect(() => {
    const el = out.current;
    if (!el) return;
    const frames: number[] = [];
    let last = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      frames.push(now - last);
      last = now;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    const write = () => {
      const f = frames.splice(0);
      const sorted = [...f].sort((a, b) => a - b);
      const p50 = sorted[Math.floor(sorted.length / 2)] ?? 0;
      const max = sorted[sorted.length - 1] ?? 0;
      const fps = f.length ? 1000 / (f.reduce((a, b) => a + b, 0) / f.length) : 0;
      const all = ScrollTrigger.getAll();
      const pins = all.filter((t) => t.pin).length;
      const canvases = document.querySelectorAll('canvas').length;
      const w = window as Window & { __transition?: Transition; __lenis?: { isStopped?: boolean } };
      const t = w.__transition;
      const lockedClass = document.documentElement.classList.contains('is-scroll-locked');
      const memory = (performance as Performance & { memory?: { usedJSHeapSize: number } }).memory;
      const heap = memory ? ` · heap ${Math.round(memory.usedJSHeapSize / 1048576)} MB` : '';
      el.textContent =
        `fps ${fps.toFixed(0)} · frame ${p50.toFixed(1)} / ${max.toFixed(0)} ms\n` +
        `ScrollTrigger ${all.length} (pins ${pins}) · canvas ${canvases}\n` +
        `transition ${t ? `${t.status} ${t.progress.toFixed(2)} ${t.direction > 0 ? '↓' : '↑'}` : '—'}\n` +
        `lock ${t?.locked ? 'gateway' : lockedClass || w.__lenis?.isStopped ? 'page' : 'free'} · tier ${stage.tier} · dpr ${window.devicePixelRatio}${heap}\n` +
        `section ${activeSection()} · scenes ${scenes()}`;
      el.dataset['bad'] = max > 100 ? '1' : '';
    };
    write();
    const timer = window.setInterval(write, 250);
    return () => {
      cancelAnimationFrame(raf);
      window.clearInterval(timer);
    };
  }, []);

  return <pre ref={out} className="perf-hud" aria-hidden="true" />;
}
