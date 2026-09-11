import type gsapType from 'gsap';

import { duration, ease, stagger } from '@/styles/tokens/tokens';

/**
 * Shared timeline vocabulary.
 *
 * The point of this file is consistency, not convenience: when every reveal in
 * the site is built from the same handful of primitives, the motion reads as a
 * system rather than as seven developers' preferences.
 *
 * IMPORTANT: these are building blocks, not a menu to apply everywhere.
 * A page where everything animates has no hierarchy. Choose one or two moments
 * per section and let the rest arrive quietly.
 */

export type RevealTarget = gsapType.TweenTarget;

export interface RevealOptions {
  /** Seconds. Defaults to the `slow` token. */
  readonly duration?: number;
  /** Seconds between elements when `target` resolves to multiple nodes. */
  readonly stagger?: number;
  /** Delay before the first element, in seconds. */
  readonly delay?: number;
}

/**
 * Masked line reveal: the text slides up from behind its own overflow clip.
 *
 * Requires each line to sit inside an element with `overflow: hidden`.
 * This is the house entrance for display typography — prefer it over opacity
 * fades, which read as generic.
 */
export const maskedLinesIn = (
  gsap: typeof gsapType,
  target: RevealTarget,
  options: RevealOptions = {},
): gsapType.core.Tween =>
  gsap.from(target, {
    yPercent: 110,
    duration: options.duration ?? duration.slow,
    ease: ease.out,
    stagger: options.stagger ?? stagger.base,
    delay: options.delay ?? 0,
  });

/**
 * Clip-path wipe for imagery. Cheaper than a WebGL transition and, at this
 * scale, visually indistinguishable — reach for a shader only when the
 * transition itself is the idea.
 */
export const clipReveal = (
  gsap: typeof gsapType,
  target: RevealTarget,
  options: RevealOptions = {},
): gsapType.core.Tween =>
  gsap.fromTo(
    target,
    { clipPath: 'inset(0% 0% 100% 0%)' },
    {
      clipPath: 'inset(0% 0% 0% 0%)',
      duration: options.duration ?? duration.slower,
      ease: ease.inOut,
      stagger: options.stagger ?? 0,
      delay: options.delay ?? 0,
    },
  );

/**
 * Reduced-motion equivalent of any reveal: state change without travel.
 * Call this instead of the tween above when `usePrefersReducedMotion()` is true
 * — never simply skip the animation, or elements left in a `from` state stay
 * invisible.
 */
export const reducedMotionSettle = (
  gsap: typeof gsapType,
  target: RevealTarget,
): gsapType.core.Tween =>
  gsap.set(target, { clearProps: 'all', opacity: 1, yPercent: 0, clipPath: 'none' });
