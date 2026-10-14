import { gsap } from '@/animations/gsap';
import type { SmoothScroll } from '@/animations/scroll/smoothScroll';
import { debugQuery } from '@/lib/env';

/**
 * The gateway — one intentional gesture plays the passage Hero → Манифест.
 *
 *   idle → armed → playing → completed → released
 *
 * `idle`      the page is not at either rest
 * `armed`     the page rests at the hero's top (t 0) or at the manifesto (t 1)
 * `playing`   one tween drives t along the film's clock; the document is held;
 *             every gesture is swallowed
 * `completed` t reached its end; the hold lifts on the next tick
 * `released`  normal scrolling; re-arms at either rest
 *
 * Adapted from `spikes/mineral/passageController.ts` for a page that scrolls
 * through Lenis with a pinned ScrollTrigger as the activation boundary:
 *
 * - The pin gives the document two rests, `start` and `end` (one viewport
 *   apart); the section is at the top of the viewport at both, so moving the
 *   document between them is invisible. While t < `cover` the document sits at
 *   `start`; from `cover` on — once the film's canvas is opaque — it sits at
 *   `end`. So when the hold lifts the page is already where the frame says.
 * - Gestures are read in the CAPTURE phase and stopped before Lenis sees
 *   them; the hold needs no `overflow: hidden` (which would drop the
 *   scrollbar and shift the layout). A stray scroll under the hold is put back.
 * - Between the rests (a dragged scrollbar) the trigger scrubs t as a
 *   fallback; a lerp that overshoots the manifesto's rest is clamped to it.
 *
 * One source of truth (`state`), one tween at a time, no frame loop of its own:
 * it writes t only through `apply`.
 */
export type GatewayStatus = 'idle' | 'armed' | 'playing' | 'completed' | 'released';

export interface GatewayState {
  status: GatewayStatus;
  /** the timeline, 0 … 1 */
  progress: number;
  /** +1 forward · −1 back, for the playback in flight or the last one */
  direction: 1 | -1;
  /** the document is held in place */
  locked: boolean;
  /** which rest the document sits at while held */
  side: 'start' | 'end';
  /** whether the passage has been played at least once */
  triggered: boolean;
}

export interface GatewayOptions {
  /** the page's scroller — repositions the document under the hold */
  scroller: () => SmoothScroll | null;
  /** the two rests, in document px (the pin's start and end) */
  bounds: () => { start: number; end: number };
  /** writes t to the timeline and the scene — the only way t moves */
  apply: (t: number) => void;
  /** t at which the document changes rests under the opaque cover */
  cover?: number;
  /**
   * which rest the document sits on for a given t — the default is the cover
   * rule; a passage whose document must stay on `start` for the whole film and
   * step to `end` only on its last frame passes `(t) => (t >= 1 ? 'end' : 'start')`
   */
  sideFor?: (t: number) => 'start' | 'end';
  /** after the hold is taken, before the document is placed and the tween starts */
  onStart?: (direction: 1 | -1) => void;
  /** the end frame is written; before the document is placed on its rest */
  onBeforeRest?: (side: 'start' | 'end') => void;
  /** the hold has lifted on that rest */
  onRest?: (side: 'start' | 'end') => void;
  /** wheel (or touch) pixels that count as intent */
  threshold?: number;
  /** the film's clock: (seconds, t) keys, monotone, then a hold on the last frame */
  rhythm?: Rhythm;
  /** the way back runs the same clock, this much faster (1 = the same) */
  returnSpeed?: number;
  /** the id whose in-page links lead through this gateway (play, or go to its end) */
  anchor?: string;
  /** reduced motion: land on the end state at once */
  reduced?: boolean;
  /**
   * whether the film can be drawn yet (its scene loads after the hero's
   * pictures); a play asked for before then waits — the page held on its
   * rest, as at any rest — and starts the moment `filmReady()` is called, or
   * after `maxWait` ms at most, without the film's frames (the page's own
   * transition, as when WebGL is missing). The visitor never waits longer.
   */
  ready?: () => boolean;
  /** the longest a gesture is held for the film, in ms */
  maxWait?: number;
  onChange?: (state: GatewayState) => void;
}

export interface Rhythm {
  keys: readonly (readonly [number, number])[];
  hold: number;
}

export interface PassageGateway {
  readonly state: GatewayState;
  /** plays from the current t to 1 (or 0), if at the matching rest */
  play: (direction: 1 | -1) => void;
  /** the trigger's progress while the document is free (scrollbar, deep link) */
  sync: (t: number) => void;
  /** re-reads the rests and the page position (resize, refresh) */
  settle: () => void;
  /** after a refresh moved the rests: a page that was on one is put back on it */
  realign: () => void;
  /** the film can be drawn now: a play that was asked for meanwhile starts */
  filmReady: () => void;
  destroy: () => void;
}

/**
 * The film's clock: prepare · descent · the membrane · the reveal · landing.
 * ~6.4 s of motion and a short held frame — one breath, slow at both ends.
 */
export const DESCENT_RHYTHM: Rhythm = {
  keys: [
    [0, 0], // A · the hero, intact
    [1.0, 0.12], // the interface quiets; the world is about to move
    [2.8, 0.42], // B · the descent — the layers rise at their own speeds
    [4.4, 0.7], // C · the membrane crosses the frame
    [5.6, 0.9], // D · the ground and the words
    [6.4, 1], // E · at rest
  ],
  hold: 0.35,
};

/** a monotone cubic through (x, y) keys — Fritsch–Carlson — at rest at both ends */
function monotone(keys: readonly (readonly [number, number])[]) {
  const n = keys.length;
  const xs = keys.map((k) => k[0]);
  const ys = keys.map((k) => k[1]);
  const d = Array.from({ length: n - 1 }, (_, i) => (ys[i + 1]! - ys[i]!) / (xs[i + 1]! - xs[i]!));
  const m = new Array<number>(n).fill(0);
  for (let i = 1; i < n - 1; i++) m[i] = d[i - 1]! * d[i]! <= 0 ? 0 : (d[i - 1]! + d[i]!) / 2;
  m[0] = 0;
  m[n - 1] = 0;
  for (let i = 0; i < n - 1; i++) {
    if (d[i] === 0) {
      m[i] = 0;
      m[i + 1] = 0;
      continue;
    }
    const a = m[i]! / d[i]!;
    const b = m[i + 1]! / d[i]!;
    const h = a * a + b * b;
    if (h > 9) {
      const tt = 3 / Math.sqrt(h);
      m[i] = tt * a * d[i]!;
      m[i + 1] = tt * b * d[i]!;
    }
  }
  return (x: number) => {
    if (x <= xs[0]!) return ys[0]!;
    if (x >= xs[n - 1]!) return ys[n - 1]!;
    let i = 0;
    while (x > xs[i + 1]!) i++;
    const h = xs[i + 1]! - xs[i]!;
    const u = (x - xs[i]!) / h;
    const u2 = u * u;
    const u3 = u2 * u;
    return (
      (2 * u3 - 3 * u2 + 1) * ys[i]! +
      (u3 - 2 * u2 + u) * h * m[i]! +
      (-2 * u3 + 3 * u2) * ys[i + 1]! +
      (u3 - u2) * h * m[i + 1]!
    );
  };
}

/** `?transitionDebug=1` — the diagnostics overlay (dev tooling, never the page's UI) */
export const wantsGatewayHud = (): boolean =>
  debugQuery().get('transitionDebug') === '1';

/** a gesture this close to a rest still plays — the hold brings the page onto it */
const REST_PX = 48;
/** the hold lifts this long after the end frame, so the finishing gesture cannot leak */
const RELEASE_MS = 80;

const isEditable = (el: EventTarget | null) =>
  el instanceof HTMLElement && (el.isContentEditable || /^(input|textarea|select)$/i.test(el.tagName));

/** every live gateway — while one holds the page, none of the others may read a gesture */
const live = new Set<GatewayState>();
const anyHeld = () => {
  for (const g of live) if (g.locked) return true;
  return false;
};

export function createPassageGateway({
  scroller,
  bounds,
  apply,
  cover = 0.12,
  sideFor = (t) => (t < cover ? 'start' : 'end'),
  onStart,
  onBeforeRest,
  onRest,
  threshold = 24,
  rhythm = DESCENT_RHYTHM,
  returnSpeed = 1.15,
  anchor,
  reduced = false,
  ready = () => true,
  maxWait = 700,
  onChange,
}: GatewayOptions): PassageGateway {
  /** a play asked for before the film could be drawn — started by `filmReady()`, or by the wait's end */
  let pending: 1 | -1 | null = null;
  let pendingTimer = 0;
  const state: GatewayState = {
    status: 'idle',
    progress: 0,
    direction: 1,
    locked: false,
    side: 'start',
    triggered: false,
  };
  const film = monotone(rhythm.keys);
  const filmLength = rhythm.keys[rhythm.keys.length - 1]![0];
  /** the film's clock for a given t, so a passage resumes from where it stands */
  const timeOf = (t: number) => {
    let lo = 0;
    let hi = filmLength;
    for (let i = 0; i < 40; i++) {
      const mid = (lo + hi) / 2;
      if (film(mid) < t) lo = mid;
      else hi = mid;
    }
    return (lo + hi) / 2;
  };
  const proxy = { time: 0 };
  let tween: gsap.core.Tween | null = null;
  let release = 0;
  let touchY: number | null = null;
  let touchUsed = false;

  const emit = () => onChange?.({ ...state });
  const set = (patch: Partial<GatewayState>) => {
    Object.assign(state, patch);
    emit();
  };
  const write = (t: number) => {
    if (t === state.progress) return;
    state.progress = t;
    apply(t);
    emit();
  };

  const y = () => window.scrollY;
  const nearStart = () => Math.abs(y() - bounds().start) <= REST_PX;
  const nearEnd = () => Math.abs(y() - bounds().end) <= REST_PX;
  const busy = () => state.status === 'playing' || state.status === 'completed';

  /** puts the document on a rest — under the hold, the section is pinned, so nothing moves on screen */
  const moveTo = (side: 'start' | 'end') => {
    const target = bounds()[side];
    state.side = side;
    const s = scroller();
    if (s) s.scrollTo(target, { immediate: true, force: true });
    else window.scrollTo({ top: target, behavior: 'auto' });
  };

  /** re-evaluates idle / armed / released from where the page is */
  const settle = () => {
    if (busy()) return;
    const next: GatewayStatus =
      (nearStart() && state.progress < 0.999) || (nearEnd() && state.progress > 0.001)
        ? 'armed'
        : state.triggered
          ? 'released'
          : 'idle';
    if (next !== state.status) set({ status: next });
  };

  const realign = () => {
    if (busy() || (state.progress > 0.001 && state.progress < 0.999)) return;
    const target = bounds()[state.side];
    const d = Math.abs(y() - target);
    if (d > REST_PX && d < window.innerHeight * 0.6) moveTo(state.side);
    settle();
  };

  const finish = () => {
    tween = null;
    const to = state.direction === 1 ? 1 : 0;
    write(to);
    const side = sideFor(to);
    onBeforeRest?.(side);
    if (state.side !== side) moveTo(side);
    set({ status: 'completed' });
    release = window.setTimeout(() => {
      set({ status: 'released', locked: false });
      onRest?.(side);
      settle();
    }, RELEASE_MS);
  };

  const play = (direction: 1 | -1, waited = false) => {
    if (busy()) return;
    if (direction === 1 ? !nearStart() || state.progress >= 0.999 : !nearEnd() || state.progress <= 0.001) return;
    if (!reduced && !waited && !ready()) {
      // held as for a play — every further gesture swallowed, a stray scroll put back — for `maxWait` at most
      if (pending === null) {
        pending = direction;
        state.side = sideFor(state.progress);
        set({ locked: true });
        pendingTimer = window.setTimeout(() => {
          const d = pending;
          pending = null;
          if (d !== null) play(d, true);
        }, maxWait);
      }
      return;
    }
    pending = null;
    window.clearTimeout(pendingTimer);
    set({ status: 'playing', direction, triggered: true, locked: true });
    onStart?.(direction);
    // the hold: the document onto the rest that matches the film about to run
    // (for the way back, the rest of the interval just below t)
    moveTo(sideFor(direction === 1 ? state.progress : Math.max(0, state.progress - 1e-6)));
    tween?.kill();
    if (reduced) {
      write(direction === 1 ? 1 : 0);
      finish();
      return;
    }
    proxy.time = timeOf(state.progress);
    const to = direction === 1 ? filmLength + rhythm.hold : 0;
    const duration = Math.abs(to - proxy.time) / (direction === 1 ? 1 : returnSpeed);
    tween = gsap.to(proxy, {
      time: to,
      duration,
      ease: 'none',
      overwrite: true,
      onUpdate: () => {
        const v = film(proxy.time);
        write(v);
        // the document changes rests under the opaque cover, once per playback
        const side = sideFor(v);
        if (side !== state.side) moveTo(side);
      },
      onComplete: finish,
    });
  };

  /** the trigger's progress while the document is free */
  const sync = (t: number) => {
    if (state.locked) return;
    write(t);
    state.side = sideFor(t);
    settle();
  };

  /**
   * a gesture with a direction — wheel, touch, keys — becomes a play or is
   * swallowed. At a rest, input in the direction that would play is held
   * (the page must not creep off the rest on noise) and never reaches Lenis;
   * input the other way passes to the page. Wheel deltas accumulate over a
   * short window, so a trackpad's many small ticks count as one gesture and
   * a single tick does not.
   */
  let acc = 0;
  let accTimer = 0;
  const swallow = (e: Event) => {
    if (e.cancelable) e.preventDefault();
    e.stopImmediatePropagation();
  };
  const wouldPlay = (direction: 1 | -1) =>
    direction === 1 ? nearStart() && state.progress < 0.999 : nearEnd() && state.progress > 0.001;
  const intent = (delta: number, e: Event, accumulate = false) => {
    if (anyHeld()) {
      swallow(e);
      return;
    }
    if (delta === 0) return;
    const direction: 1 | -1 = delta > 0 ? 1 : -1;
    if (!wouldPlay(direction)) return;
    swallow(e);
    if (accumulate) {
      acc = Math.sign(acc) === Math.sign(delta) ? acc + delta : delta;
      window.clearTimeout(accTimer);
      accTimer = window.setTimeout(() => {
        acc = 0;
      }, 220);
      if (Math.abs(acc) < threshold) return;
      acc = 0;
    } else if (Math.abs(delta) < threshold) return;
    play(direction);
  };

  const onWheel = (e: WheelEvent) => {
    settle();
    intent(e.deltaY, e, true);
  };
  const onTouchStart = (e: TouchEvent) => {
    touchY = e.touches[0]?.clientY ?? null;
    touchUsed = false;
    settle();
  };
  const onTouchMove = (e: TouchEvent) => {
    if (anyHeld()) {
      swallow(e);
      return;
    }
    if (touchY === null || touchUsed) return;
    const yy = e.touches[0]?.clientY ?? touchY;
    const delta = touchY - yy; // finger up = scroll down
    if (Math.abs(delta) >= threshold) {
      touchUsed = true;
      intent(delta, e);
    }
  };
  const onKey = (e: KeyboardEvent) => {
    if (isEditable(e.target)) return;
    const down = ['ArrowDown', 'PageDown', ' ', 'End'].includes(e.key);
    const up = ['ArrowUp', 'PageUp', 'Home'].includes(e.key);
    if (!down && !up) return;
    if (anyHeld()) {
      swallow(e);
      return;
    }
    settle();
    intent(down ? threshold : -threshold, e);
  };
  /** the section's anchor goes through the gateway, not past it */
  const onClick = (e: MouseEvent) => {
    if (!anchor || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey) return;
    const a = (e.target as Element | null)?.closest<HTMLAnchorElement>('a[href^="#"]');
    if (!a) return;
    const id = (a.getAttribute('href') ?? '').slice(1).split('?')[0];
    if (id !== anchor) return;
    swallow(e);
    if (anyHeld()) return;
    history.pushState(null, '', `#${anchor}`);
    if (wouldPlay(1)) play(1);
    else scroller()?.scrollTo(bounds().end);
  };
  const onScroll = () => {
    const { end } = bounds();
    if (state.locked) {
      // a stray scroll under the hold is put back
      const target = bounds()[state.side];
      if (Math.abs(y() - target) > 0.5) moveTo(state.side);
      return;
    }
    // the manifesto's rest is a wall for the way up: a lerp that carries the
    // page a few px past it is put back, and the next gesture plays the film
    if (state.side === 'end' && state.progress > 0.999 && y() < end && end - y() < window.innerHeight * 0.5) {
      moveTo('end');
    }
    settle();
  };

  const capture: AddEventListenerOptions = { passive: false, capture: true };
  window.addEventListener('wheel', onWheel, capture);
  window.addEventListener('touchstart', onTouchStart, { passive: true, capture: true });
  window.addEventListener('touchmove', onTouchMove, capture);
  window.addEventListener('keydown', onKey, capture);
  document.addEventListener('click', onClick, true);
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', settle);
  live.add(state);
  settle();

  return {
    state,
    play,
    sync,
    settle,
    realign,
    filmReady: () => {
      if (pending === null) return;
      const d = pending;
      pending = null;
      window.clearTimeout(pendingTimer);
      play(d);
    },
    destroy: () => {
      live.delete(state);
      window.clearTimeout(pendingTimer);
      tween?.kill();
      window.clearTimeout(release);
      window.clearTimeout(accTimer);
      window.removeEventListener('wheel', onWheel, capture);
      window.removeEventListener('touchstart', onTouchStart, { capture: true });
      window.removeEventListener('touchmove', onTouchMove, capture);
      window.removeEventListener('keydown', onKey, capture);
      document.removeEventListener('click', onClick, true);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', settle);
    },
  };
}
