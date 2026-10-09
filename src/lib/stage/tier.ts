import {
  isBrowser,
  prefersReducedData,
  prefersReducedMotion,
  webglForcedOff,
  hardwareConcurrency,
  hasCoarsePointer,
} from '@/lib/env';

import { invalidateStage, notifyStage, stage, type Tier } from './stage';

/**
 * Device tiering (docs/ARCHITECTURE.md §0.6).
 *
 * The initial tier comes from CAPABILITY only — WebGL2, max texture size,
 * reduced-motion, save-data, DPR/viewport class, pointer type, and
 * `hardwareConcurrency` where reported. `navigator.deviceMemory` is never read.
 * Measured FPS is the final authority: `startFpsAuthority()` may promote
 * `mid → high` once in the first 5 s and may demote at any time, one way per
 * session.
 */

interface Capability {
  webgl2: boolean;
  maxTextureSize: number;
}

let capability: Capability | null = null;

function probe(): Capability {
  if (capability) return capability;
  if (!isBrowser || webglForcedOff()) return (capability = { webgl2: false, maxTextureSize: 0 });
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2');
    capability = gl
      ? { webgl2: true, maxTextureSize: gl.getParameter(gl.MAX_TEXTURE_SIZE) as number }
      : { webgl2: false, maxTextureSize: 0 };
    gl?.getExtension('WEBGL_lose_context')?.loseContext();
  } catch {
    capability = { webgl2: false, maxTextureSize: 0 };
  }
  return capability;
}

export function resolveInitialTier(): Tier {
  if (!isBrowser) return 'none';
  if (prefersReducedMotion()) return 'reduced';
  const cap = probe();
  if (!cap.webgl2 || prefersReducedData()) return 'none';

  const cores = hardwareConcurrency();
  const small = window.innerWidth < 1024;
  const coarse = hasCoarsePointer();
  const lowTexture = cap.maxTextureSize < 4096;
  if (coarse || small || lowTexture || (cores !== null && cores <= 4)) return 'mid';
  return 'high';
}

const order: Tier[] = ['none', 'reduced', 'mid', 'high'];
let promotionLocked = false;

function setTier(next: Tier): void {
  if (stage.tier === next) return;
  stage.tier = next;
  document.documentElement.dataset.tier = next;
  notifyStage();
  invalidateStage();
}

/** Demote one step (or to `none`). Never goes back up. */
export function demoteTier(to?: Tier): void {
  const current = order.indexOf(stage.tier);
  const target = to ?? order[Math.max(0, current - 1)];
  if (!target || order.indexOf(target) >= current) return;
  promotionLocked = true;
  setTier(target);
}

export function initTier(): Tier {
  const tier = resolveInitialTier();
  setTier(tier);
  return tier;
}

/**
 * Rolling FPS authority. Call once the canvas is live; returns a stop function.
 * Windows are 2 s; the median of instantaneous frame rates decides:
 *   ≥ 58 within the first 5 s  → promote mid → high (once)
 *   < 45 for one window        → demote high → mid
 *   < 24 for two windows       → demote → none (stills)
 */
export function startFpsAuthority(): () => void {
  if (!isBrowser) return () => {};
  const start = performance.now();
  let last = start;
  let samples: number[] = [];
  let lowWindows = 0;
  let raf = 0;

  const tick = (now: number) => {
    const dt = now - last;
    last = now;
    if (dt > 0 && dt < 1000) samples.push(1000 / dt);
    raf = requestAnimationFrame(tick);
  };

  const evaluate = () => {
    if (samples.length < 20) return;
    const sorted = [...samples].sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)] ?? 60;
    samples = [];
    const elapsed = performance.now() - start;

    if (stage.tier === 'mid' && !promotionLocked && elapsed < 5000 && median >= 58) {
      promotionLocked = true;
      setTier('high');
      return;
    }
    if (stage.tier === 'high' && median < 45) {
      demoteTier('mid');
      return;
    }
    if (stage.tier === 'mid') {
      lowWindows = median < 24 ? lowWindows + 1 : 0;
      if (lowWindows >= 2) demoteTier('none');
    }
  };

  raf = requestAnimationFrame(tick);
  const interval = window.setInterval(evaluate, 2000);
  return () => {
    cancelAnimationFrame(raf);
    clearInterval(interval);
  };
}
