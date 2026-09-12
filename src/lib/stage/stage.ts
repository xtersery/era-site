import { useSyncExternalStore } from 'react';

import type { SectionId } from '@/lib/constants/sections';

/**
 * The stage state — the one mutable object of the immersive layer
 * (docs/ARCHITECTURE.md §0.8).
 *
 * Continuous fields are written by ScrollTrigger, the global timeline, the
 * scroller and the pointer handler, and READ BY REFS in `useFrame` / the GSAP
 * ticker — never through React render. The few discrete fields React needs
 * (tier, chapter, active ids) go through `useStageValue`, which only notifies
 * when a discrete write happens. One writer per field.
 *
 * Deliberately not a store library: if middleware is ever needed, Zustand's
 * vanilla store has the same shape.
 */

export type Tier = 'high' | 'mid' | 'reduced' | 'none';
export type GlassBody = 'lens' | 'disc' | 'ring' | 'window' | 'droplet' | 'none';

export interface StageState {
  tier: Tier;
  chapter: SectionId;
  chapterProgress: number;
  scroll: { y: number; velocity: number };
  pointer: { nx: number; ny: number; active: boolean };
  camera: { z: number; fov: number };
  room: { tone: number };
  glass: {
    body: GlassBody;
    /** 0 = refracting pole, 1 = clear pole; drives ior, dispersion, attenuation together. */
    clarity: number;
    veinPhase: number;
    x: number;
    y: number;
    scale: number;
  };
  services: { activeId: string | null; wheelAngle: number };
  cases: { activeIndex: number; arcAngle: number; reveal: { mix: number; cx: number; cy: number } };
  form: { clarity: number };
}

export const stage: StageState = {
  tier: 'none',
  chapter: 'hero',
  chapterProgress: 0,
  scroll: { y: 0, velocity: 0 },
  pointer: { nx: 0, ny: 0, active: false },
  camera: { z: 5, fov: 35 },
  room: { tone: 0 },
  glass: { body: 'none', clarity: 0, veinPhase: 0, x: 0, y: 0, scale: 1 },
  services: { activeId: null, wheelAngle: 0 },
  cases: { activeIndex: 0, arcAngle: 0, reveal: { mix: 0, cx: 0.5, cy: 0.5 } },
  form: { clarity: 0 },
};

type Listener = () => void;
const listeners = new Set<Listener>();
let version = 0;

/** Subscribe to DISCRETE changes (tier, chapter, active ids). */
export function subscribeStage(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Call after a discrete write so React consumers re-read. */
export function notifyStage(): void {
  version += 1;
  for (const listener of listeners) listener();
}

/** Invalidation hook the canvas registers so a state write can request a frame. */
let requestFrame: (() => void) | null = null;
export const setFrameRequester = (fn: (() => void) | null): void => {
  requestFrame = fn;
};
/** Ask the stage to render one frame (no-op when no canvas is mounted). */
export const invalidateStage = (): void => {
  requestFrame?.();
};

/**
 * Read a discrete slice of the stage from React. The selector must return a
 * primitive or a stable reference — it is compared by `Object.is`.
 */
export function useStageValue<T>(selector: (s: StageState) => T): T {
  return useSyncExternalStore(
    subscribeStage,
    () => selector(stage),
    () => selector(stage),
  );
}

/** Live tiers mount the canvas and the eased scroller. */
export const isLiveTier = (tier: Tier): boolean => tier === 'high' || tier === 'mid';

/** Exposed for QA scripts only. */
export const stageVersion = (): number => version;
