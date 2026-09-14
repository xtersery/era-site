import gsap from 'gsap';

/**
 * The assisted scroll — one intentional gesture plays the passage.
 *
 *   idle → armed → playing → completed → released
 *
 * `idle`      the section is not aligned with the viewport
 * `armed`     the section fills the viewport and the passage can be played
 *             (forward from t 0, back from t 1)
 * `playing`   one tween drives t; the document is locked; input is ignored
 * `completed` t reached its end; the lock is lifted on the next tick
 * `released`  normal scrolling; re-arms when the section is aligned again
 *
 * One source of truth (`state`), one tween at a time, no render loop of its
 * own: it only writes t through `apply`, which the scene reads on its frame.
 */
export type TransitionStatus = 'idle' | 'armed' | 'playing' | 'completed' | 'released';

export interface TransitionState {
  status: TransitionStatus;
  /** the timeline, 0 … 1 */
  progress: number;
  /** whether the passage has been played at least once */
  triggered: boolean;
  /** the document is held in place */
  locked: boolean;
  /** +1 forward · −1 back, for the playback in flight */
  direction: 1 | -1;
}

export interface ControllerOptions {
  section: HTMLElement;
  /** writes t to the scene and the DOM — the only way the timeline moves */
  apply: (t: number) => void;
  initial?: number;
  /** wheel pixels (or touch pixels) that count as intent */
  threshold?: number;
  /**
   * the cinematic rhythm: (seconds, t) keys the playback passes through, in
   * order, and a hold on the last frame. Between keys the motion is a
   * monotone cubic — continuous in speed, slow at the ends of every phase.
   */
  rhythm?: { keys: readonly (readonly [number, number])[]; hold: number };
  /** the way back is not the film: one eased return, this long */
  returnDuration?: number;
  returnEase?: string;
  /** reduced motion: land on the end state at once */
  reduced?: boolean;
  onChange?: (state: TransitionState) => void;
}

export interface PassageController {
  readonly state: TransitionState;
  /** plays from the current t to 1 (or 0), if armed */
  play: (direction: 1 | -1) => void;
  /** review: set t by hand — kills any playback, releases the lock */
  scrub: (t: number) => void;
  destroy: () => void;
}

const ALIGN_PX = 6;

/**
 * The film's rhythm, as briefed: recognition (the mineral, a slow dolly) ·
 * immersion (into the material) · geological transformation · reveal, then a
 * held frame. 8.5 s of motion + 1 s hold. t is the scene's timeline.
 */
export const CINEMATIC_RHYTHM = {
  keys: [
    [0, 0],        // A · at rest
    [2.5, 0.44],   // recognition: the dolly, the facets fill the view (2.5 s)
    [4.0, 0.62],   // immersion: through the face, inside, among the planes (1.5 s — not a stay)
    [7.0, 0.9],    // transformation: the structure becomes mineral, then slab; the shell settles (3 s)
    [8.5, 1],      // reveal: the wall (1.5 s)
  ],
  hold: 1,
} as const;

/** a monotone cubic through (x, y) keys — Fritsch–Carlson — with slow ends */
function monotone(keys: readonly (readonly [number, number])[]) {
  const n = keys.length;
  const xs = keys.map((k) => k[0]), ys = keys.map((k) => k[1]);
  const d = Array.from({ length: n - 1 }, (_, i) => (ys[i + 1]! - ys[i]!) / (xs[i + 1]! - xs[i]!));
  const m = new Array<number>(n).fill(0);
  for (let i = 1; i < n - 1; i++) m[i] = d[i - 1]! * d[i]! <= 0 ? 0 : (d[i - 1]! + d[i]!) / 2;
  m[0] = 0; m[n - 1] = 0; // the film starts and ends at rest
  for (let i = 0; i < n - 1; i++) {
    if (d[i] === 0) { m[i] = 0; m[i + 1] = 0; continue; }
    const a = m[i]! / d[i]!, b = m[i + 1]! / d[i]!;
    const h = a * a + b * b;
    if (h > 9) { const tt = 3 / Math.sqrt(h); m[i] = tt * a * d[i]!; m[i + 1] = tt * b * d[i]!; }
  }
  return (x: number) => {
    if (x <= xs[0]!) return ys[0]!;
    if (x >= xs[n - 1]!) return ys[n - 1]!;
    let i = 0;
    while (x > xs[i + 1]!) i++;
    const h = xs[i + 1]! - xs[i]!, u = (x - xs[i]!) / h;
    const u2 = u * u, u3 = u2 * u;
    return (2 * u3 - 3 * u2 + 1) * ys[i]! + (u3 - 2 * u2 + u) * h * m[i]! + (-2 * u3 + 3 * u2) * ys[i + 1]! + (u3 - u2) * h * m[i + 1]!;
  };
}
/** a gesture this close to alignment still plays — the lock brings the section to the top */
const PLAY_PX = 48;

export function createPassageController({
  section, apply, initial = 0, threshold = 20, rhythm = CINEMATIC_RHYTHM, returnDuration = 4, returnEase = 'power2.inOut', reduced = false, onChange,
}: ControllerOptions): PassageController {
  const state: TransitionState = { status: 'idle', progress: initial, triggered: false, locked: false, direction: 1 };
  const proxy = { t: initial, time: 0 };
  const film = monotone(rhythm.keys);
  const filmLength = rhythm.keys[rhythm.keys.length - 1]![0];
  /** the film's clock for a given t, so a passage can resume from where it stands */
  const timeOf = (t: number) => { let lo = 0, hi = filmLength; for (let i = 0; i < 40; i++) { const mid = (lo + hi) / 2; if (film(mid) < t) lo = mid; else hi = mid; } return (lo + hi) / 2; };
  let tween: gsap.core.Tween | null = null;
  let lockY = 0;
  let touchY: number | null = null;
  let touchUsed = false;

  const emit = () => onChange?.({ ...state });
  const set = (patch: Partial<TransitionState>) => { Object.assign(state, patch); emit(); };

  /** the section's top sits on the viewport's top */
  const aligned = (px = ALIGN_PX) => Math.abs(section.getBoundingClientRect().top) <= px;
  const atEnd = () => state.progress >= 0.999;
  const atStart = () => state.progress <= 0.001;

  /** re-evaluates idle / armed / released from where the page is */
  const settle = () => {
    if (state.status === 'playing' || state.status === 'completed') return;
    const next: TransitionStatus = aligned() && (atStart() || atEnd()) ? 'armed' : state.triggered || !atStart() ? 'released' : 'idle';
    if (next !== state.status) set({ status: next });
  };

  const lock = () => {
    lockY = Math.round(section.getBoundingClientRect().top + window.scrollY);
    set({ locked: true });
    if (Math.abs(window.scrollY - lockY) > 1) window.scrollTo({ top: lockY, behavior: 'auto' });
  };
  const unlock = () => set({ locked: false });

  const finish = () => {
    tween = null;
    set({ status: 'completed', progress: state.direction === 1 ? 1 : 0 });
    // the lock lifts on the next tick so the gesture that finished cannot leak into the page
    window.setTimeout(() => { unlock(); set({ status: 'released' }); settle(); }, 60);
  };

  const play = (direction: 1 | -1) => {
    if (state.status === 'playing' || state.status === 'completed') return;
    if (!aligned(PLAY_PX)) return;
    if (direction === 1 && atEnd()) return;
    if (direction === -1 && atStart()) return;
    set({ status: 'playing', direction, triggered: true });
    lock();
    const to = direction === 1 ? 1 : 0;
    proxy.t = state.progress;
    tween?.kill();
    if (reduced) {
      proxy.t = to; apply(to); set({ progress: to }); finish();
      return;
    }
    if (direction === 1) {
      // the film: its own rhythm, then the held frame
      proxy.time = timeOf(proxy.t);
      tween = gsap.to(proxy, {
        time: filmLength + rhythm.hold,
        duration: filmLength + rhythm.hold - proxy.time,
        ease: 'none',
        overwrite: true,
        onUpdate: () => { const v = film(proxy.time); if (v !== proxy.t) { proxy.t = v; apply(v); state.progress = v; emit(); } },
        onComplete: finish,
      });
    } else {
      // the way back: one eased return
      tween = gsap.to(proxy, {
        t: 0,
        duration: returnDuration * proxy.t,
        ease: returnEase,
        overwrite: true,
        onUpdate: () => { apply(proxy.t); state.progress = proxy.t; emit(); },
        onComplete: finish,
      });
    }
  };

  const scrub = (t: number) => {
    tween?.kill(); tween = null;
    proxy.t = t; apply(t);
    set({ status: 'released', progress: t, locked: false, triggered: true });
    settle();
  };

  /**
   * a gesture with a direction — wheel, touch, keys — becomes a play or is
   * swallowed. While armed, input in the direction that would play is held
   * (the page must not creep out of alignment on noise); input the other
   * way passes to the page. Wheel deltas accumulate over a short window, so
   * a trackpad's many small ticks count as one gesture and a single tick
   * does not.
   */
  let acc = 0;
  let accTimer = 0;
  const wouldPlay = (direction: 1 | -1) => (direction === 1 && atStart()) || (direction === -1 && atEnd());
  const intent = (delta: number, e: Event, accumulate = false) => {
    if (state.locked) { e.preventDefault(); return; }
    if (delta === 0) return;
    if (state.status !== 'armed') { if (aligned(PLAY_PX) && (atStart() || atEnd())) set({ status: 'armed' }); else return; }
    const direction: 1 | -1 = delta > 0 ? 1 : -1;
    if (!wouldPlay(direction)) return;
    e.preventDefault();
    if (accumulate) {
      acc = Math.sign(acc) === Math.sign(delta) ? acc + delta : delta;
      window.clearTimeout(accTimer);
      accTimer = window.setTimeout(() => { acc = 0; }, 220);
      if (Math.abs(acc) < threshold) return;
      acc = 0;
    } else if (Math.abs(delta) < threshold) return;
    play(direction);
  };

  const onWheel = (e: WheelEvent) => { settle(); intent(e.deltaY, e, true); };
  const onTouchStart = (e: TouchEvent) => { touchY = e.touches[0]?.clientY ?? null; touchUsed = false; settle(); };
  const onTouchMove = (e: TouchEvent) => {
    if (state.locked) { e.preventDefault(); return; }
    if (touchY === null || touchUsed) return;
    const y = e.touches[0]?.clientY ?? touchY;
    const delta = touchY - y; // finger up = scroll down
    if (Math.abs(delta) >= threshold) { touchUsed = true; intent(delta, e); }
  };
  const onKey = (e: KeyboardEvent) => {
    const down = ['ArrowDown', 'PageDown', ' ', 'End'].includes(e.key);
    const up = ['ArrowUp', 'PageUp', 'Home'].includes(e.key);
    if (!down && !up) return;
    if (state.locked) { e.preventDefault(); return; }
    settle();
    intent(down ? threshold : -threshold, e);
  };
  const onScroll = () => {
    if (state.locked) { if (Math.abs(window.scrollY - lockY) > 0) window.scrollTo({ top: lockY, behavior: 'auto' }); return; }
    settle();
  };

  const opts: AddEventListenerOptions = { passive: false };
  window.addEventListener('wheel', onWheel, opts);
  window.addEventListener('touchstart', onTouchStart, { passive: true });
  window.addEventListener('touchmove', onTouchMove, opts);
  window.addEventListener('keydown', onKey);
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', settle);
  apply(initial);
  settle();

  return {
    state,
    play,
    scrub,
    destroy: () => {
      tween?.kill();
      window.removeEventListener('wheel', onWheel);
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', settle);
    },
  };
}
