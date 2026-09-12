import { lazy, Suspense, useEffect, useState } from 'react';

import { useVisualTier } from '@/hooks';
import { afterLoad, isLiveTier, startFpsAuthority, whenIdle } from '@/lib/stage';

/**
 * The persistent canvas — lifecycle shell (docs/ARCHITECTURE.md §0.8).
 *
 * This module imports NOTHING from three: the canvas subtree is a lazy chunk
 * loaded only after `load` + idle (with fallback and a 2 s ceiling), only for
 * live tiers. Never before LCP.
 *
 * - `position: fixed`, behind the DOM, `pointer-events: none`, transparent —
 *   glass rooms let it show through; opaque rooms cover it.
 * - `frameloop="demand"`: renders only when the stage is invalidated.
 * - Context loss → tier `none` for the session (stills take over).
 * - The FPS authority runs while the canvas is live.
 */
const StageCanvasInner = lazy(() => import('./StageCanvasInner'));

export function StageCanvas() {
  const tier = useVisualTier();
  const live = isLiveTier(tier);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!live) return;
    let cancel: (() => void) | undefined;
    let cancelled = false;
    void afterLoad().then(() => {
      if (cancelled) return;
      cancel = whenIdle(() => setReady(true));
    });
    return () => {
      cancelled = true;
      cancel?.();
    };
  }, [live]);

  useEffect(() => {
    if (!ready || !live) return;
    return startFpsAuthority();
  }, [ready, live]);

  if (!live || !ready) return null;

  return (
    <Suspense fallback={null}>
      <StageCanvasInner />
    </Suspense>
  );
}
