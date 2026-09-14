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
  duration?: number;
  ease?: string;
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
/** a gesture this close to alignment still plays — the lock brings the section to the top */
const PLAY_PX = 48;

export function createPassageController({
  section, apply, initial = 0, threshold = 20, duration = 1.55, ease = 'power2.inOut', reduced = false, onChange,
}: ControllerOptions): PassageController {
  const state: TransitionState = { status: 'idle', progress: initial, triggered: false, locked: false, direction: 1 };
  const proxy = { t: initial };
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
    tween = gsap.to(proxy, {
      t: to,
      duration: duration * Math.abs(to - proxy.t), // a partial passage takes proportionally less
      ease,
      overwrite: true,
      onUpdate: () => { apply(proxy.t); state.progress = proxy.t; emit(); },
      onComplete: finish,
    });
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
