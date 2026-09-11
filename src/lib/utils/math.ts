/** Small maths helpers shared by motion and WebGL code. */

export const clamp = (value: number, min = 0, max = 1): number =>
  Math.min(Math.max(value, min), max);

export const lerp = (from: number, to: number, t: number): number => from + (to - from) * t;

/** Inverse lerp: where does `value` sit between `from` and `to`, as 0..1. */
export const inverseLerp = (from: number, to: number, value: number): number =>
  from === to ? 0 : (value - from) / (to - from);

/** Remap a value from one range to another, clamped by default. */
export const mapRange = (
  value: number,
  inMin: number,
  inMax: number,
  outMin: number,
  outMax: number,
  clamped = true,
): number => {
  const t = inverseLerp(inMin, inMax, value);
  return lerp(outMin, outMax, clamped ? clamp(t) : t);
};

/**
 * Frame-rate independent lerp. Use this instead of raw `lerp` inside
 * `useFrame`, otherwise smoothing speed changes with refresh rate.
 *
 * @param smoothing fraction of the remaining distance left after 1 second (0..1).
 */
export const damp = (from: number, to: number, smoothing: number, delta: number): number =>
  lerp(from, to, 1 - Math.pow(smoothing, delta));

export const smoothstep = (edge0: number, edge1: number, x: number): number => {
  const t = clamp(inverseLerp(edge0, edge1, x));
  return t * t * (3 - 2 * t);
};
