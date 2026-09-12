import { gsap } from '@/animations/gsap';
import { CustomEase } from 'gsap/CustomEase';
import { Draggable } from 'gsap/Draggable';
import { InertiaPlugin } from 'gsap/InertiaPlugin';

/**
 * The wheel's motion language — "turning a precisely balanced optical
 * instrument": slow initial resistance, controlled acceleration, heavy late
 * settle, no bounce, no overshoot, no chatter.
 *
 * Spike-local plugin registration (production registers in gsap/register.ts).
 * No wheel-to-rotate: page scroll stays natural. Drag/touch + the DOM index.
 */
gsap.registerPlugin(Draggable, InertiaPlugin, CustomEase);

export const SEGMENTS = 7;
/** One segment of the large arc — matches RING.stepDeg. */
export const STEP_DEG = 13;
const DEG_PER_PX = 0.075;

const mineral = CustomEase.create('era-mineral', 'M0,0 C0.36,0 0.12,1 1,1');

export interface WheelMotion {
  turnTo: (index: number) => void;
  preTurn: (direction: -1 | 0 | 1) => void;
  angleDeg: () => number;
  activeIndex: () => number;
  destroy: () => void;
}

interface Options {
  grip: HTMLElement;
  onAngle: (deg: number) => void;
  onActive: (index: number) => void;
  onStart?: () => void;
}

const MIN_DEG = -(SEGMENTS - 1) * STEP_DEG;
const clampDeg = (d: number) => Math.min(0, Math.max(MIN_DEG, d));

export function createWheelMotion({ grip, onAngle, onActive, onStart }: Options): WheelMotion {
  const s = { base: 0, pre: 0 };
  let tween: gsap.core.Tween | null = null;
  const apply = () => onAngle(s.base + s.pre);
  const indexFor = (deg: number) => Math.min(SEGMENTS - 1, Math.max(0, Math.round(-clampDeg(deg) / STEP_DEG)));

  const turnTo = (index: number) => {
    tween?.kill();
    onStart?.();
    const target = -index * STEP_DEG;
    const delta = target - s.base;
    const steps = Math.max(1, Math.abs(delta) / STEP_DEG);
    tween = gsap.to(s, {
      base: s.base + delta,
      pre: 0,
      duration: 0.72 + 0.16 * steps,
      ease: mineral,
      onUpdate: apply,
      onComplete: () => onActive(index),
    });
  };

  const preTurn = (direction: -1 | 0 | 1) => {
    // 6–8° of a full ring ≈ half a step here; keep the same *felt* amount: 0.2 of a segment.
    gsap.to(s, { pre: direction * STEP_DEG * 0.2, duration: 0.55, ease: mineral, onUpdate: apply, overwrite: 'auto' });
  };

  // Drag on a proxy: horizontal pixels → degrees. Inertia with heavy resistance,
  // snapped to a segment, zero overshoot tolerance.
  const proxy = document.createElement('div');
  let startBase = 0;
  let startX = 0;
  const angleFromX = (x: number) => startBase + (x - startX) * DEG_PER_PX;
  const draggable = Draggable.create(proxy, {
    type: 'x',
    trigger: grip,
    inertia: true,
    dragResistance: 0.28,
    throwResistance: 2600,
    overshootTolerance: 0,
    cursor: 'grab',
    activeCursor: 'grabbing',
    onPress() {
      tween?.kill();
      onStart?.();
      gsap.killTweensOf(s);
      s.pre = 0;
      startBase = s.base;
      startX = this.x;
    },
    onDrag() {
      s.base = clampDeg(angleFromX(this.x));
      apply();
    },
    snap: {
      x: (x: number) => {
        const deg = clampDeg(angleFromX(x));
        const snapped = Math.round(deg / STEP_DEG) * STEP_DEG;
        return startX + (snapped - startBase) / DEG_PER_PX;
      },
    },
    onThrowUpdate() {
      s.base = clampDeg(angleFromX(this.x));
      apply();
    },
    onThrowComplete() {
      s.base = Math.round(s.base / STEP_DEG) * STEP_DEG;
      apply();
      onActive(indexFor(s.base));
    },
    onDragEnd() {
      if (!this.tween) {
        // No throw: settle to the nearest segment with the mineral ease.
        const target = Math.round(s.base / STEP_DEG) * STEP_DEG;
        tween = gsap.to(s, { base: target, duration: 0.6, ease: mineral, onUpdate: apply, onComplete: () => onActive(indexFor(target)) });
      }
    },
  })[0]!;

  return {
    turnTo,
    preTurn,
    angleDeg: () => s.base + s.pre,
    activeIndex: () => indexFor(s.base),
    destroy: () => {
      tween?.kill();
      gsap.killTweensOf(s);
      draggable.kill();
    },
  };
}
