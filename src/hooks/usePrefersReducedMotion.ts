import { useMediaQuery } from './useMediaQuery';

/**
 * Reactive reduced-motion preference.
 *
 * Every JS-driven animation must consult this. CSS is already covered by the
 * global `@media (prefers-reduced-motion: reduce)` block, but GSAP and WebGL
 * are not — see `.claude/skills/gsap-motion`.
 */
export const usePrefersReducedMotion = (): boolean =>
  useMediaQuery('(prefers-reduced-motion: reduce)');
