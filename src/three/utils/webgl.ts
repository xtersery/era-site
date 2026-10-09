import {
  deviceMemoryGb,
  hardwareConcurrency,
  hasCoarsePointer,
  isBrowser,
  webglForcedOff,
} from '@/lib/env';

let cachedSupport: boolean | null = null;

/**
 * Does this browser actually give us a WebGL2 context?
 *
 * Cached, because creating a probe context is not free and some browsers cap
 * the number of live contexts. Every scene entry point must gate on this and
 * render a static fallback when it returns false.
 */
export function hasWebGL(): boolean {
  if (cachedSupport !== null) return cachedSupport;
  if (!isBrowser || webglForcedOff()) return (cachedSupport = false);

  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2');
    cachedSupport = Boolean(gl);
    // release the probe: a live context per probe counts against the phone's GPU budget
    gl?.getExtension('WEBGL_lose_context')?.loseContext();
  } catch {
    cachedSupport = false;
  }

  return cachedSupport;
}

export type DeviceTier = 'low' | 'mid' | 'high';

/**
 * Coarse device tier, used to choose scene complexity — not to choose layout.
 *
 * This is a heuristic, deliberately pessimistic: being wrong towards "low"
 * costs some visual richness, being wrong towards "high" costs a dropped-frame
 * hero on a mid-range Android. Runtime measurement (see `AdaptiveDpr` in drei,
 * or a rolling FPS sampler) should override this once the scene is live.
 */
export function detectDeviceTier(): DeviceTier {
  if (!isBrowser || !hasWebGL()) return 'low';

  const memory = deviceMemoryGb();
  const cores = hardwareConcurrency();
  const coarse = hasCoarsePointer();

  if (memory !== null && memory <= 4) return 'low';
  if (cores !== null && cores <= 4) return 'low';
  if (coarse) return 'mid';
  if (memory !== null && memory >= 8 && cores !== null && cores >= 8) return 'high';

  return 'mid';
}

/**
 * Device-pixel-ratio range handed to R3F's `<Canvas dpr={[min, max]}>`.
 *
 * Never pass `window.devicePixelRatio` directly: a 3x phone screen means 9x the
 * fragment work for a difference almost nobody can see.
 */
export function dprRange(tier: DeviceTier = detectDeviceTier()): [number, number] {
  switch (tier) {
    case 'low':
      return [1, 1];
    case 'mid':
      return [1, 1.5];
    case 'high':
      return [1, 2];
  }
}
