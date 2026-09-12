import { useEffect } from 'react';

import { initTier, stage, useStageValue, type Tier } from '@/lib/stage';

/**
 * The live device tier (docs/ARCHITECTURE.md §0.6): `high` · `mid` · `reduced`
 * · `none`. Resolved once from capability (never `deviceMemory`), then owned by
 * the FPS authority. Reactive to a live reduced-motion change.
 */
export type VisualTier = Tier;

let initialised = false;

export function useVisualTier(): VisualTier {
  useEffect(() => {
    if (initialised) return;
    initialised = true;
    initTier();
    const mql = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onChange = () => {
      initialised = false;
      initTier();
      initialised = true;
    };
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, []);

  return useStageValue((s) => s.tier) ?? stage.tier;
}
