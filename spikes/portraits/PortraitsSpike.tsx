import gsap from 'gsap';
import { CustomEase } from 'gsap/CustomEase';
import { ScrollToPlugin } from 'gsap/ScrollToPlugin';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { lazy, Suspense, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

import { cta } from '@/data/copy';
import { InquiryContext } from '@/lib/inquiry/context';
import { subIndex } from '@/lib/utils';
import { useNearViewport } from '@/hooks';
import { debugQuery, debugTools, webglForcedOff } from '@/lib/env';
import { afterFirstScreen, whenIdle } from '@/lib/stage';
import { SceneBoundary } from '@/three/components/SceneBoundary';

import { beat, Founder, OPEN } from '../founder/Founder';
import { PORTRAIT_ASPECT, sitters as desktopSitters, sittersPhone } from './people';
import type { SceneDiag, ShardState, StonePlace } from './scene/ShardScene';
import { PASSAGE } from './scene/passage';

// the scene (and three.js with it) is fetched only when the room comes near — see `sceneNear`
const loadWater = () => import('./scene/WaterScene');
const WaterScene = lazy(() => loadWater().then((m) => ({ default: m.WaterScene })));

/** the frame's box and the light's place (the centre of its band, x), in fractions of the section */
const LAYOUT = {
  desktop: { frame: { x: 0.44, y: 0, w: 0.56, h: 1 }, place: { x: PASSAGE.field.desktop.x, y: 0.5, h: 1, narrow: 1 } as StonePlace },
  phone: { frame: { x: 0, y: 0, w: 1, h: 0.55 }, place: { x: PASSAGE.field.phone.x, y: 0.5, h: 1, narrow: 1 } as StonePlace },
} as const;

/**
 * The passage's scroll: the pin's last `EXIT` + `OPEN` vh are scrubbed by the
 * page's own scroll — `EXIT` vh in which the light becomes the wall, then
 * `OPEN` vh (the founder's `OPEN`, shared with that room's own pin) in which
 * the founder's room opens on it — and FINISHED softly: one deliberate scroll
 * past `AUTO_FINISH` of the water stage and the page carries the scene to
 * its end — the opened room — on its own (or back to the rest, if the scroll
 * stopped short); slow, eased, never a snap. The visitor keeps the wheel at
 * every moment; nothing is captured. From the opened room, a short scroll up
 * re-opens it; one past `AUTO_RETURN` of the opening brings the scene home
 * the same way, through the wall and the water.
 */
const EXIT = 130; // vh of scroll for the passage: the light becomes the wall
const AUTO_FINISH = 0.22; // fraction of the water stage (EXIT) after which the page finishes the passage; before it, returns to the rest
const AUTO_RETURN = 0.5; // fraction of the opening (OPEN) the visitor scrolls back up through before the page carries the scene home; short of it, the room re-opens
const FINISH = { min: 1.6, max: 3.4 }; // seconds the finish takes (proportional to the distance)

/** what a visitor's browser can do, probed once */
function probeWebGL(): { webgl2: boolean; webgl: boolean; renderer: string } {
  if (webglForcedOff()) return { webgl2: false, webgl: false, renderer: 'off (?noWebgl=1)' };
  try {
    const c = document.createElement('canvas');
    const gl2 = c.getContext('webgl2');
    const gl = gl2 ?? c.getContext('webgl');
    if (!gl) return { webgl2: false, webgl: false, renderer: 'none' };
    const info = gl.getExtension('WEBGL_debug_renderer_info');
    const renderer = info ? String(gl.getParameter(info.UNMASKED_RENDERER_WEBGL)) : 'masked';
    // release the probe: a live context per probe counts against the phone's GPU budget
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return { webgl2: !!gl2, webgl: true, renderer };
  } catch (e) {
    return { webgl2: false, webgl: false, renderer: `error: ${String(e)}` };
  }
}

/**
 * Specialists — «Сеанс», the pinned portrait gallery (Spike D, pass 1).
 *
 * THE IDEA: one wall of a light room, one portrait at a time at the scale of a
 * person. The visitor never browses a staff list; she meets a specialist and
 * reads her label. At rest a calibration hairline — the FOCAL LINE — runs from
 * the typeset name across the wall to the eyes of the woman in the portrait.
 * Between specialists a SHARD of ERA Mineral Glass — a real body: extruded,
 * roughened, refracting — turns slowly across the frame and carries the next
 * portrait in: the incoming portrait is seen refracted through the stone's
 * volume, and lies clear behind it where it has passed. (Pass 17: the stone
 * and the plate are gone — the accent is a thin veil of water on the same
 * boundary, `scene/WaterScene.tsx`; the change still comes out of it.) Right
 * to left, the direction the light has in every room of this site; the words
 * leave and arrive the same way. Nothing slides, nothing fades, nothing is a
 * card.
 *
 * DRIVEN BY: the page's own scroll. The section is pinned for (N − 1) × 100 vh
 * plus EXIT + OPEN vh; progress maps to a position t on the row of
 * specialists; k = ⌊t⌋ is the one being met, f = t − k the transition to the
 * next; ScrollTrigger snaps to whole states so every resting state is a
 * complete editorial page. The pin's last EXIT + OPEN vh is the passage,
 * scrubbed by the same scroll with a soft finish (pass 18–19: the water's
 * light settles into the hero's onyx, and the founder's room —
 * `spikes/founder/`, pinned under this one for the same OPEN vh — opens on
 * it) — no gesture, no hold, the visitor in control.
 *
 * `?k=0..3&f=0..1` freezes a state (f > 0 is mid-transition) · `?hud=1`.
 */
gsap.registerPlugin(CustomEase, ScrollTrigger, ScrollToPlugin);
const MINERAL = CustomEase.create('mineral', 'M0,0 C0.52,0 0.18,1 1,1');

const INDEX = '05';
const N = desktopSitters.length;
const PER = 100; // vh of scroll per transition
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
const smooth = (t: number) => { const s = clamp(t, 0, 1); return s * s * (3 - 2 * s); };
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

function readParams() {
  const q = debugQuery();
  const k = q.get('k');
  const f = q.get('f');
  const e = q.get('e');
  const o = q.get('o');
  return {
    k: k === null ? null : clamp(Number(k), 0, N - 1),
    f: f === null ? 0 : clamp(Number(f), 0, 1),
    e: e === null ? 0 : clamp(Number(e), 0, 1),
    /** `?o=` freezes the founder's opening alone (the room as its own page) */
    o: o === null ? null : clamp(Number(o), 0, 1),
    hud: q.get('hud') === '1',
  };
}

/** where the sitter's eye lands on screen for a cover-fitted 4 : 5 image in the frame */
function eyeOnScreen(frame: DOMRect, eye: { x: number; y: number }, anchorY: number) {
  const iw = 4, ih = 5;
  const s = Math.max(frame.width / iw, frame.height / ih);
  const w = iw * s, h = ih * s;
  const ox = (frame.width - w) * 0.5;
  const oy = (frame.height - h) * anchorY;
  return { x: frame.left + ox + eye.x * w, y: frame.top + oy + eye.y * h };
}

export function Sitting({
  frozen = null,
  onState,
  frameloop,
}: {
  frozen?: { k: number; f: number; e: number } | null;
  onState?: (s: { k: number; f: number; e: number }) => void;
  /** opt-in, for a composing page: `demand` while the section is far off screen, so the scene draws nothing */
  frameloop?: 'always' | 'demand';
}) {
  const sectionRef = useRef<HTMLElement>(null);
  const wallRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  /** the phone frame's rect as a fraction of the room — measured: the frame is svh, the room lvh */
  const [phoneFrame, setPhoneFrame] = useState(LAYOUT.phone.frame);
  const plates = useRef<(HTMLElement | null)[]>([]);
  const labels = useRef<(HTMLElement | null)[]>([]);
  const names = useRef<(HTMLElement | null)[]>([]);
  const shard = useRef<HTMLDivElement>(null);
  const [live, setLive] = useState(false);
  const shardState = useRef<ShardState>({ on: false, f: 0, from: 0, next: 1, anchorFrom: 0.28, anchorNext: 0.28, current: frozen?.k ?? 0, anchorCurrent: 0.28, exit: frozen?.e ?? 0 });
  const exitRef = useRef<HTMLDivElement>(null);
  /**
   * Once the founder's room has the wall (`--hand` 1) this whole section is
   * at opacity 0 — the water would draw a full screen nobody sees, under the
   * founder's read, every frame. It is parked (`demand`) from that moment and
   * back to the page's choice the moment the hand begins to return. A coarse
   * state: it changes twice per passage, never per frame.
   */
  const [released, setReleased] = useState(false);
  const releasedRef = useRef(false);
  const focal = useRef<HTMLDivElement>(null);
  const counter = useRef<HTMLSpanElement>(null);
  const reduced = useMemo(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches, []);
  const phone = useMemo(() => window.innerWidth < 1024, []);
  const sitters = phone ? sittersPhone : desktopSitters;
  const portraitUrls = useMemo(() => sitters.map((s) => (phone ? s.portraitPhone : s.portrait)), [phone, sitters]);
  const probe = useMemo(probeWebGL, []);
  // the water's scene — its code, three.js, its textures and its context — is fetched and made only once
  // the section is within a screen and a half (every width): nothing of it in the page's first load
  const sceneNear = useNearViewport(sectionRef);
  // its code starts loading earlier — on a phone four screens out, on the desktop once the first screen is
  // complete (the hero and its film) and the browser is idle; the context still waits for `sceneNear`
  const prefetchNear = useNearViewport(sectionRef, { margin: '400%', enabled: phone });
  useEffect(() => {
    if (!prefetchNear || reduced || !probe.webgl) return;
    if (phone) {
      loadWater().catch(() => {}); // a failed prefetch is silent: the scene's mount reports it
      return;
    }
    let alive = true;
    let cancel = () => {};
    void afterFirstScreen().then(() => {
      if (alive) cancel = whenIdle(() => void loadWater().catch(() => {}));
    });
    return () => {
      alive = false;
      cancel();
    };
  }, [prefetchNear, reduced, probe.webgl, phone]);
  const [diag, setDiag] = useState<SceneDiag & { errors: string[] }>({ errors: [] });
  // a report that changes nothing is not a state write (the scene may report on its frame)
  const onDiag = useCallback((d: SceneDiag) => setDiag((prev) => {
    for (const k of Object.keys(d) as (keyof SceneDiag)[]) if (prev[k] !== d[k]) return { ...prev, ...d };
    return prev;
  }), []);
  // three reports shader failures through console.error: keep the first few
  useEffect(() => {
    const orig = console.error;
    console.error = (...args: unknown[]) => {
      const text = args.map((a) => (a instanceof Error ? a.message : String(a))).join(' ').slice(0, 220);
      setDiag((prev) => (prev.errors.length >= 4 ? prev : { ...prev, errors: [...prev.errors, text] }));
      orig.apply(console, args);
    };
    return () => { console.error = orig; };
  }, []);
  // a scene that never reports its first frame is a fallback with a reason
  // (once it has, the timer is dropped: a state write here re-renders the
  // section and, through the canvas, draws a frame the room did not need)
  const [stale, setStale] = useState(false);
  useEffect(() => {
    if (reduced || !probe.webgl || live) return;
    const t = window.setTimeout(() => setStale(true), 6000);
    return () => window.clearTimeout(t);
  }, [reduced, probe.webgl, live]);
  // the CTA pre-fills her in the form when the page has one (the standalone spike has none)
  const inquiry = useContext(InquiryContext);
  const [current, setCurrent] = useState(frozen?.k ?? 0);
  const trigger = useRef<ScrollTrigger | null>(null);
  const eyes = useRef<{ x: number; y: number }[]>([]);
  const nameEnds = useRef<number[]>([]);
  const state = useRef({ k: frozen?.k ?? 0, f: frozen?.f ?? 0, e: frozen?.e ?? 0 });

  /** the focal datum: a fixed line of the grid, 30 % down the frame on desktop */
  const DATUM = 0.3;
  const datumY = useRef(0);

  /**
   * measure once per layout: the datum, where each name ends, and — the other
   * way round from pass 1 — where each portrait must be anchored so that her
   * eye lands ON the datum. The text never moves for a portrait; the portrait
   * is cropped for the text.
   */
  const measure = useCallback(() => {
    const frame = frameRef.current?.getBoundingClientRect();
    const section = sectionRef.current?.getBoundingClientRect();
    if (!frame || !section) return;
    if (phone && section.height > 0) {
      const h = Math.round((frame.height / section.height) * 1000) / 1000;
      setPhoneFrame((prev) => (prev.h === h ? prev : { ...prev, h }));
    }
    datumY.current = phone ? 0 : section.height * DATUM;
    const iw = PORTRAIT_ASPECT, ih = 1;
    const sc = Math.max(frame.width / iw, frame.height / ih);
    const w = iw * sc, h = ih * sc;
    const slack = h - frame.height; // how far the crop can slide vertically
    eyes.current = sitters.map((s, i) => {
      // desktop: slide the crop so the eye sits on the datum (within the slack);
      // phone: keep the sitter's own anchor, the line goes to wherever her eye is
      const wanted = datumY.current - (frame.top - section.top);
      const anchor = phone || slack <= 0 ? s.anchorY : clamp((s.eye.y * h - wanted) / slack, 0, 1);
      const img = plates.current[i]?.querySelector('img');
      if (img) img.style.objectPosition = `50% ${(anchor * 100).toFixed(2)}%`;
      const oy = (frame.height - h) * anchor;
      const ox = (frame.width - w) * 0.5;
      return { x: frame.left - section.left + ox + s.eye.x * w, y: frame.top - section.top + oy + s.eye.y * h };
    });
    labels.current.forEach((el, i) => {
      const nm = names.current[i];
      if (!el || !nm) return;
      nameEnds.current[i] = nm.getBoundingClientRect().right - section.left;
    });
  }, [phone, sitters]);

  /**
   * paints the exit: the section settles into the wall. `e` runs over the
   * whole passage (EXIT + OPEN vh): its first EXIT/(EXIT + OPEN) is the
   * water stage, `t` → the scene (the light becomes the wall); the rest is
   * the founder's opening, in which this room lets go of the wall — its
   * opacity, `--hand`, over the opening's first beat, revealing the founder's
   * identical sheet beneath. The words lift away (the same masked lines as a
   * change), the wall label and the row fade, the focal line withdraws.
   * Reduced motion: two states — the room, the wall — and the hand.
   */
  const exit = useCallback((e: number) => {
    state.current.e = e;
    const span = (EXIT + OPEN) / EXIT;
    let t = clamp(e * span, 0, 1);
    let open = clamp((e * span - 1) * (EXIT / OPEN), 0, 1);
    if (reduced) { t = t > 0.5 ? 1 : 0; open = open > 0.02 ? 1 : 0; }
    shardState.current.exit = t;
    const hand = beat(open, 'hand');
    if (exitRef.current) exitRef.current.style.setProperty('--hand', hand.toFixed(3));
    if ((hand >= 1) !== releasedRef.current) {
      releasedRef.current = hand >= 1;
      setReleased(hand >= 1);
    }
    const lift = clamp((t - 0.05) / 0.4, 0, 1);
    const [lo, hi] = phone ? [0, 100] : [10, 80];
    const edge = hi - lift * (hi - lo);
    const mask = lift >= 1 ? 'linear-gradient(#000 0, #000 0)' : `linear-gradient(180deg, #000 ${(edge - 8).toFixed(2)}%, transparent ${edge.toFixed(2)}%)`;
    labels.current.forEach((el) => {
      if (!el || el.hidden) return;
      el.style.maskImage = lift > 0 ? mask : '';
      (el.style as unknown as Record<string, string>)['webkitMaskImage'] = lift > 0 ? mask : '';
      el.style.opacity = lift >= 1 ? '0' : '1';
    });
    const fade = 1 - clamp((t - 0.15) / 0.45, 0, 1);
    if (exitRef.current) {
      exitRef.current.style.setProperty('--exit-fade', fade.toFixed(3));
      exitRef.current.style.setProperty('--exit-marble', smooth((t - 0.3) / 0.5).toFixed(3));
    }
    if (focal.current) focal.current.style.opacity = String(fade);
    onState?.({ ...state.current });
  }, [onState, phone, reduced]);

  /** paints one position on the row: k is met, f is the way to k + 1 */
  const apply = useCallback((k: number, f: number) => {
    state.current = { k, f, e: state.current.e };
    const next = Math.min(N - 1, k + 1);
    // the words are masked lines: the label she is leaving lifts away from the
    // foot up to the name in the first fifth of the travel, and the next label
    // is set from its name down right after — the words are there long before
    // the picture has finished changing
    const goingOut = clamp(f / 0.2, 0, 1);
    const comingIn = clamp((f - 0.22) / 0.28, 0, 1);
    // the label lives between the wall label and the foot: the masks sweep that range
    const [lo, hi] = phone ? [0, 100] : [10, 80];
    const edgeOut = hi - goingOut * (hi - lo);
    const edgeIn = lo + comingIn * (hi - lo);
    const maskOut = goingOut >= 1 ? 'linear-gradient(#000 0, #000 0)' : `linear-gradient(180deg, #000 ${(edgeOut - 8).toFixed(2)}%, transparent ${edgeOut.toFixed(2)}%)`;
    const maskIn = comingIn <= 0 ? 'linear-gradient(transparent 0, transparent 0)' : `linear-gradient(180deg, #000 ${edgeIn.toFixed(2)}%, transparent ${(edgeIn + 8).toFixed(2)}%)`;
    const setMask = (el: HTMLElement, mask: string) => {
      el.style.maskImage = mask;
      (el.style as unknown as Record<string, string>)['webkitMaskImage'] = mask;
    };
    // the shard crosses the face quickly and lingers at the edges: an eased seam.
    // `seam` is where its centre stands, in % of the frame; the incoming portrait
    // is clear behind its trailing edge and seen through it ahead of that
    // the no-WebGL reveal: the change leaves the resident stone and crosses the frame rightward
    const seam = lerp(phone ? 30 : 4, 112, smooth(f));
    const half = 0;
    const band = 5;
    for (let i = 0; i < N; i++) {
      const plate = plates.current[i];
      const label = labels.current[i];
      if (!plate || !label) continue;
      if (i === k) {
        plate.hidden = false;
        plate.style.zIndex = '1';
        plate.style.maskImage = '';
        (plate.style as unknown as Record<string, string>)['webkitMaskImage'] = '';
        // the portrait she is leaving steps back a little as the change passes
        plate.style.transform = `translateX(${(4 * f).toFixed(2)}%)`;
        label.hidden = goingOut >= 1;
        setMask(label, goingOut > 0 ? maskOut : '');
      } else if (i === next && f > 0) {
        plate.hidden = false;
        plate.style.zIndex = '2';
        // the next portrait lies clear where the shard has passed: the reveal's
        // edge trails just inside the shard, so the shard is always the bridge
        const edge = seam + half;
        const mask = `linear-gradient(90deg, #000 ${(edge - band).toFixed(2)}%, transparent ${(edge + band).toFixed(2)}%)`;
        plate.style.maskImage = mask;
        (plate.style as unknown as Record<string, string>)['webkitMaskImage'] = mask;
        plate.style.transform = `scale(${(1 + 0.04 * (1 - f)).toFixed(4)})`;
        label.hidden = comingIn <= 0;
        setMask(label, comingIn < 1 ? maskIn : '');
      } else {
        plate.hidden = true;
        label.hidden = true;
      }
    }
    // the stone stays; the change comes out of it. The scene reads this every frame.
    const anchorOf = (i: number) => {
      const img = plates.current[i]?.querySelector('img');
      return img ? parseFloat(img.style.objectPosition.split(' ')[1] ?? '28') / 100 : 0.28;
    };
    const on = f > 0.001 && f < 0.999;
    shardState.current = { on, f, from: k, next, anchorFrom: anchorOf(k), anchorNext: anchorOf(next), current: f < 0.5 ? k : next, anchorCurrent: anchorOf(f < 0.5 ? k : next), exit: shardState.current.exit };
    // the no-WebGL light: a soft CSS band of it on the same boundary
    if (shard.current && sectionRef.current) {
      const sw = sectionRef.current.clientWidth;
      const pl = phone ? LAYOUT.phone.place : LAYOUT.desktop.place;
      const w = sw * (phone ? PASSAGE.field.phone.hw : PASSAGE.field.desktop.hw) * 2.6;
      shard.current.style.width = `${w.toFixed(1)}px`;
      shard.current.style.transform = `translate3d(${(sw * pl.x - w / 2).toFixed(1)}px, 0, 0)`;
      shard.current.style.opacity = '1';
    }
    // the focal line re-aims at the next pair of eyes while the light passes
    if (focal.current && eyes.current.length) {
      const a = eyes.current[k]!, b = eyes.current[next]!;
      const m = smooth((f - 0.15) / 0.35);
      // on desktop the line IS the datum; on the phone it finds her eye
      const y = phone ? lerp(a.y, b.y, m) : datumY.current;
      const endX = lerp(a.x, b.x, m);
      const startX = phone ? 0 : lerp(nameEnds.current[k] ?? 0, nameEnds.current[next] ?? 0, m) + 18;
      const width = Math.max(0, endX - startX - (phone ? 10 : 22));
      focal.current.style.top = `${y.toFixed(1)}px`;
      focal.current.style.left = `${startX.toFixed(1)}px`;
      focal.current.style.width = `${width.toFixed(1)}px`;
      const wallEdge = wallRef.current?.getBoundingClientRect().right ?? 0;
      const section = sectionRef.current?.getBoundingClientRect().left ?? 0;
      const at = phone ? 0 : clamp(((wallEdge - section - startX) / Math.max(1, width)) * 100, 0, 100);
      focal.current.style.setProperty('--at', `${at.toFixed(2)}%`);
      // the focal line is a line of rest; while the shard crosses, it withdraws
      focal.current.style.opacity = f > 0.06 && f < 0.94 ? '0' : '1';
    }
    const shown = f < 0.21 ? k : next;
    if (counter.current) counter.current.textContent = `${subIndex(INDEX, shown + 1)} / ${String(N).padStart(2, '0')}`;
    setCurrent((prev) => (prev === shown ? prev : shown));
    onState?.({ k, f, e: state.current.e });
  }, [onState, phone]);

  useEffect(() => {
    measure();
    apply(state.current.k, state.current.f);
    exit(state.current.e);
    const onResize = () => { measure(); apply(state.current.k, state.current.f); exit(state.current.e); };
    window.addEventListener('resize', onResize);
    // fonts change the name's width; re-measure when they land
    document.fonts?.ready.then(onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [measure, apply, exit]);

  /** the page's own scroll walks the row; snap lands on whole states */
  useEffect(() => {
    if (frozen || !sectionRef.current) return;
    // the pin holds the row of specialists, then the passage: the light becomes
    // the wall (EXIT) and the founder's room opens on it (OPEN, in which that
    // room is pinned too); the states snap, the passage is scrubbed
    const rowSpan = (N - 1) * PER;
    const total = rowSpan + EXIT + OPEN;
    const rowEnd = rowSpan / total;
    const auto = AUTO_FINISH * (EXIT / (EXIT + OPEN)); // AUTO_FINISH of the water stage, as a fraction of the passage
    const back = AUTO_RETURN * (OPEN / (EXIT + OPEN)); // AUTO_RETURN of the opening, likewise
    const st = ScrollTrigger.create({
      trigger: sectionRef.current,
      start: 'top top',
      end: () => `+=${(total / 100) * window.innerHeight}`,
      pin: true,
      anticipatePin: 1,
      invalidateOnRefresh: true,
      snap: reduced
        ? undefined
        : {
            // whole states along the row; in the passage, the soft finish: past AUTO_FINISH
            // of it the page carries the scene to the end, short of it back to the rest
            snapTo: (v, self) => {
              if (v <= rowEnd + 1e-6) return Math.round((v / rowEnd) * (N - 1)) / (N - 1) * rowEnd;
              const e = (v - rowEnd) / (1 - rowEnd);
              const dir = self?.direction ?? 1;
              if (dir >= 0) return e < auto ? rowEnd : 1;
              return e > 1 - back ? 1 : rowEnd;
            },
            duration: FINISH,
            delay: 0.08,
            ease: 'power2.inOut',
          },
      onUpdate: (self) => {
        const p = self.progress;
        const t = clamp((Math.min(p, rowEnd) / rowEnd) * (N - 1), 0, N - 1 - 1e-6);
        const e = clamp((p - rowEnd) / (1 - rowEnd), 0, 1);
        if (reduced) { apply(Math.round(t), 0); exit(e); return; } // reduced motion: states, no travel (exit steps by itself)
        apply(Math.floor(t), t - Math.floor(t));
        exit(e);
      },
    });
    trigger.current = st;
    return () => { st.kill(); trigger.current = null; };
  }, [frozen, reduced, apply, exit]);

  const goTo = useCallback((k: number) => {
    const st = trigger.current;
    if (!st) return;
    const rowEnd = ((N - 1) * PER) / ((N - 1) * PER + EXIT + OPEN);
    const y = st.start + (st.end - st.start) * rowEnd * (k / (N - 1));
    if (reduced) { window.scrollTo({ top: y, behavior: 'instant' as ScrollBehavior }); return; }
    gsap.to(window, { scrollTo: y, duration: 0.9, ease: MINERAL, overwrite: true });
  }, [reduced]);

  return (
    <section ref={(el) => { (sectionRef as React.MutableRefObject<HTMLElement | null>).current = el; (exitRef as React.MutableRefObject<HTMLDivElement | null>).current = el as HTMLDivElement | null; }} className="sitting" id="specialists" aria-labelledby="specialists-title" data-live={live || undefined}>
      <h2 id="specialists-title" className="sr-only">Специалисты</h2>

      {/* the wall: the light surface the label is set on */}
      <div ref={wallRef} className="wall">
        <p className="wall__label" aria-hidden="true">
          <span>05 — Специалисты</span>
          <span ref={counter} className="wall__count">{subIndex(INDEX, current + 1)} / {String(N).padStart(2, '0')}</span>
        </p>

        {sitters.map((s, i) => (
          <article
            key={s.person.id}
            ref={(el) => { labels.current[i] = el; }}
            className="sitter"
            aria-hidden={i !== current}
            aria-labelledby={`${s.person.id}-name`}
          >
            {/* the head grows UP from the datum: one line or two, the datum does not move */}
            <div className="sitter__head">
              <p className="sitter__no">{subIndex(INDEX, i + 1)}</p>
              <h3 id={`${s.person.id}-name`} className="sitter__name">
                <span ref={(el) => { names.current[i] = el; }} className="sitter__name-inner">{s.person.name}</span>
              </h3>
            </div>
            {/* the body starts a fixed distance BELOW the datum, whatever the name did */}
            <div className="sitter__body">
              <p className="sitter__role">{s.person.role}</p>
              <p className="sitter__approach">«{s.person.sentence}»</p>
              <dl className="sitter__facts">
                {s.person.facts.map(([dt, dd]) => (
                  <div key={dt} style={{ display: 'contents' }}><dt>{dt}</dt><dd>{dd}</dd></div>
                ))}
              </dl>
              <div className="sitter__cta">
                <a className="sitter__primary" href="#inquiry" tabIndex={i === current ? 0 : -1} onClick={() => inquiry?.setPrefill({ specialist: s.person.id })}>{cta.bookWith(s.person.shortName)}</a>
                <a className="sitter__link" href="#services" tabIndex={i === current ? 0 : -1}>К направлениям →</a>
              </div>
            </div>
          </article>
        ))}

        {/* the only progression cue besides the count: the row itself */}
        <div className="wall__foot">
          <nav className="row" aria-label="Специалисты">
            <ol role="list">
              {sitters.map((s, i) => (
                <li key={s.person.id}>
                  <button type="button" aria-current={i === current ? 'true' : undefined} aria-label={`${subIndex(INDEX, i + 1)} — ${s.person.name}`} onClick={() => goTo(i)}>
                    <span>{subIndex(INDEX, i + 1)}</span>
                  </button>
                </li>
              ))}
            </ol>
          </nav>
        </div>
      </div>

      {/* the scene: the wall, the frame and the resident stone — the section's own layer, under the words */}
      {!reduced && probe.webgl && sceneNear && (
        <SceneBoundary onError={() => setLive(false)}>
          {/* until the scene's code arrives the room shows its own wall (the canvas is transparent anyway) */}
          <Suspense fallback={null}>
            <WaterScene
              portraits={portraitUrls}
              state={shardState}
              phone={phone}
              frame={phone ? phoneFrame : LAYOUT.desktop.frame}
              place={phone ? LAYOUT.phone.place : LAYOUT.desktop.place}
              still={reduced}
              onReady={() => setLive(true)}
              onDiag={onDiag}
              {...(released ? { frameloop: 'demand' as const } : frameloop ? { frameloop } : {})}
            />
          </Suspense>
        </SceneBoundary>
      )}
      {/* the no-WebGL water: a CSS thread of it on the same line */}
      <div ref={shard} className="shard shard--glints" aria-hidden="true" hidden={live} />
      {/* the no-WebGL exit: the wall arrives as a surface — the same sheet as the founder's, no light */}
      <div className="sitting__marble" aria-hidden="true" hidden={live} />

      {/* the frame: one portrait at a time, at the scale of a person */}
      <div ref={frameRef} className="frame">
        {sitters.map((s, i) => (
          <figure
            key={s.person.id}
            ref={(el) => { plates.current[i] = el; }}
            className="plate"
          >
            <img
              src={phone ? s.portraitPhone : s.portrait}
              alt={`${s.person.name} — ${s.person.role}. ${s.person.portraitLabel}`}
              style={{ objectPosition: `50% ${s.anchorY * 100}%` }}
              loading="lazy"
              decoding="async"
              draggable={false}
            />
          </figure>
        ))}
      </div>

      {/* the focal line: from the name to her eyes */}
      <div ref={focal} className="focal" aria-hidden="true" />

      <p className="sr-only" aria-live="polite">{`Специалист ${current + 1} из ${N} — ${sitters[current]!.person.name}`}</p>

      {/* DIAGNOSTIC — which render path is active, and why (review build only) */}
      {debugTools && (() => {
        const path = reduced ? 'REDUCED_MOTION' : !probe.webgl ? 'NO_WEBGL' : live ? 'STONE_WEBGL' : 'CSS_FALLBACK';
        const why = reduced
          ? 'prefers-reduced-motion: reduce — the scene is not mounted by design'
          : !probe.webgl
            ? `no WebGL context (${probe.renderer})`
            : live
              ? 'the WebGL stone rendered its first frame'
              : diag.quartz?.startsWith('error')
                ? `quartz texture failed: ${diag.quartz}`
                : diag.errors.length
                  ? `error: ${diag.errors[0]}`
                  : !diag.canvasCreated
                    ? 'canvas not created yet'
                    : !diag.stoneMounted
                      ? `stone not mounted (quartz: ${diag.quartz ?? 'not started'})`
                      : stale
                        ? 'stone mounted but no frame reported in 6 s'
                        : 'waiting for the first frame';
        (window as unknown as Record<string, unknown>)['__diag'] = { path, why, ...diag, probe, live, reduced, phone };
        const wanted = debugQuery().get('diag');
        if (wanted === '0' || (phone && wanted !== '1')) return null;
        return (
          <pre className="diag" aria-hidden="true">
            {`ACTIVE RENDER PATH: ${path}
why: ${why}
quartz model loaded: ${diag.quartz ?? 'not started'}
WebGL stone mounted: ${diag.stoneMounted ? 'yes' : 'no'} · canvas: ${diag.canvasCreated ? 'yes' : 'no'} · first frame: ${diag.firstFrame ? 'yes' : 'no'}
fallback triggered: ${path === 'CSS_FALLBACK' || path === 'NO_WEBGL' ? 'yes' : 'no'}
gpu: ${diag.renderer ?? probe.renderer} · webgl2: ${probe.webgl2 ? 'yes' : 'no'} · reduced: ${reduced ? 'yes' : 'no'} · phone layout: ${phone ? 'yes' : 'no'}
stone visible now: ${diag.stoneVisible ? 'yes' : 'no'} · draw calls: ${diag.drawCalls ?? '—'} · layers: ${diag.layers ?? '—'}
errors: ${diag.errors.length ? diag.errors.join(' | ') : 'none'}`}
          </pre>
        );
      })()}
    </section>
  );
}

export function PortraitsSpike() {
  const { k, f, e, o, hud } = useMemo(readParams, []);
  const [s, setS] = useState({ k: k ?? 0, f, e });
  const [open, setOpen] = useState(o ?? 0);
  const frozen = k !== null;
  // `?o=` — the founder's room alone, frozen at o
  if (o !== null) return <Founder frozen={o} />;
  return (
    <>
      {!frozen && (
        <>
          <header className="stub stub--bar" aria-label="Заглушка шапки"><span className="stub__mark">эра</span><span className="stub__cta">Записаться</span></header>
          <section className="stub stub--before" aria-label="Заглушка предыдущей секции"><p>04 — Кейсы · [заглушка соседней секции — прокрутка страницы не перехватывается]</p></section>
        </>
      )}
      <Sitting frozen={frozen ? { k: k!, f, e } : null} onState={setS} />
      {/* the next room opens on the wall the section settled into — in place, under its last frame */}
      {!frozen && <Founder onState={setOpen} />}
      {!frozen && <section className="stub stub--after" aria-label="Заглушка следующей секции"><p>07 — Отзывы · [заглушка соседней секции]</p></section>}
      {hud && <div className="hud" aria-hidden="true">sitting · k {s.k} · f {s.f.toFixed(2)} · e {s.e.toFixed(2)} · founder {open.toFixed(2)}</div>}
    </>
  );
}
