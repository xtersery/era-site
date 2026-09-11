/**
 * JavaScript mirror of the CSS design tokens.
 *
 * Only the subset that motion / WebGL code genuinely needs lives here — GSAP
 * cannot read a CSS custom property without a DOM lookup, and media-query logic
 * needs real numbers. Everything else stays CSS-only.
 *
 * These values MUST stay in sync with `motion.css` and `breakpoints.css`.
 */

/** Durations in **seconds** — GSAP's unit, not CSS's. */
export const duration = {
  instant: 0.12,
  fast: 0.24,
  base: 0.42,
  slow: 0.72,
  slower: 1.1,
  cinematic: 1.8,
} as const;

/**
 * Easings as GSAP-compatible cubic-bezier control points.
 * Kept as tuples so they can be handed to both GSAP (`CustomEase`-free via
 * `gsap.parseEase`) and the Web Animations API.
 */
export const easeBezier = {
  out: [0.22, 1, 0.36, 1],
  inOut: [0.65, 0, 0.35, 1],
  in: [0.55, 0, 1, 0.45],
} as const satisfies Record<string, readonly [number, number, number, number]>;

/** GSAP string easings for the same curves. */
export const ease = {
  out: 'power3.out',
  inOut: 'power2.inOut',
  in: 'power3.in',
  none: 'none',
} as const;

/** Stagger baselines in seconds. */
export const stagger = {
  tight: 0.03,
  base: 0.06,
  loose: 0.12,
} as const;

/** Breakpoints in pixels. Mirrors `breakpoints.css`. */
export const breakpoint = {
  xs: 380,
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
} as const;

export type Breakpoint = keyof typeof breakpoint;

/** `min-width` media query string for a named breakpoint. */
export const up = (name: Breakpoint): string => `(min-width: ${breakpoint[name]}px)`;

/** `max-width` media query string for a named breakpoint (exclusive). */
export const down = (name: Breakpoint): string => `(max-width: ${breakpoint[name] - 0.02}px)`;

/** Z-index scale. Mirrors `z-index.css`. Never hard-code a z-index. */
export const zIndex = {
  below: -1,
  base: 0,
  canvas: 1,
  content: 10,
  sticky: 20,
  header: 30,
  overlay: 40,
  modal: 50,
  cursor: 60,
  transition: 70,
  debug: 100,
} as const;
