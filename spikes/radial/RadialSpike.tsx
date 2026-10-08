import gsap from 'gsap';
import { CustomEase } from 'gsap/CustomEase';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { services } from '@/data/services';
import { subIndex } from '@/lib/utils';
import { debugQuery } from '@/lib/env';

/**
 * Services — 2D radial editorial system. Working spike of the section logic.
 *
 * The wheel is a hidden navigation engine. Seven complete editorial states sit
 * on one invisible 2D wheel; the names sit on an inner ring about the same
 * centre (the dial — the only visible trace). Everything moves about the same
 * centre at the same angular speed, so a state and its name travel together; a
 * state's own rotation is damped so it stays flat and resolves horizontal.
 *
 * PRIMARY DRIVER — normal vertical page scroll (`drive` ≠ 'drag'): the section
 * pins with ScrollTrigger and native document scroll progress turns the wheel,
 * 02.1 → … → 02.7 over `dist` vh per state; past the last state the section
 * unpins and the page flows on; before the first it releases upward. No wheel
 * events are intercepted, no scroll-jacking — ScrollTrigger reads scrollY.
 *   · scrub — turn follows scroll continuously (smoothed 1 s); rests anywhere
 *   · snap  — scrub + ScrollTrigger snap to the nearest state when scrolling stops
 *   · step  — scroll position selects the state; the engine tweens to it on
 *             the mineral ease (never rests between states)
 *   · drag  — the earlier model (A): the dial is the primary control, no pin
 *
 * Secondary controls in every mode: click / Enter on a name, keyboard ← →
 * (↑ ↓ stay native page scroll), phone swipe, and the dial drag as an optional
 * enhancement — in scroll modes they all move the page to the state's scroll
 * position, so scroll and state can never disagree.
 *
 * Stills for the storyboard: `?a=0..6&t=0..1` (no ScrollTrigger). `?hud=1`
 * shows the corner readout. `?drive=` and `?d=` select the model and distance.
 */
gsap.registerPlugin(CustomEase, ScrollTrigger);
export type Drive = 'drag' | 'scrub' | 'snap' | 'step';
// heavy and calm: a slow, weighted departure and a long settle
const MINERAL = CustomEase.create('mineral', 'M0,0 C0.52,0 0.18,1 1,1');

const N = services.length; // 7
const STEP = 360 / N;
const DAMP = 0.35; // a state's own rotation relative to its angle on the wheel

const rad = (deg: number) => (deg * Math.PI) / 180;
const mod = (v: number, m: number) => ((v % m) + m) % m;
/** signed shortest distance from `from` to `to` on a wheel of N states */
const shortest = (from: number, to: number) => mod(to - from + N / 2, N) - N / 2;

interface Wheel {
  cx: number;
  cy: number;
  rDial: number;
  rBody: number;
  base: number; // angle of the focal position: 0° right of the centre (desktop), −90° above it (phone)
  tangent: boolean; // names lie along the arc (phone) or along the spoke (desktop)
  bodyW: number;
  bodyH: number;
  phone: boolean;
}

function layout(w: number, h: number): Wheel {
  if (w < 1024) {
    return { cx: w * 0.5, cy: h * 1.16, rDial: h * 0.3, rBody: h * 0.72, base: -90, tangent: true, bodyW: w * 0.86, bodyH: h * 0.6, phone: true };
  }
  return { cx: w * 0.012, cy: h * 0.5, rDial: w * 0.33, rBody: w * 0.648, base: 0, tangent: false, bodyW: w * 0.6, bodyH: h * 0.78, phone: false };
}

function readParams() {
  const q = debugQuery();
  const t = q.get('t');
  const drive = q.get('drive');
  return {
    a: Math.min(N - 1, Math.max(0, Number(q.get('a') ?? 0))),
    t: t === null ? null : Math.min(1, Math.max(0, Number(t))),
    hud: q.get('hud') === '1',
    drive: (drive === 'drag' || drive === 'scrub' || drive === 'snap' || drive === 'step' ? drive : 'snap') as Drive,
    dist: Math.min(140, Math.max(40, Number(q.get('d') ?? 85))),
  };
}

/**
 * `exit` is opt-in and off by default — with it unset this component renders
 * exactly what Spike B approved. When a composing page sets it (the flow spike,
 * `spikes/flow/`), the section additionally renders `.radial__exit`: an inert,
 * fully transparent layer the PAGE owns and drives, used to blend the bone
 * ground into whatever room follows while the section is leaving. Services
 * itself never touches it.
 */
export function ServicesRadial({ start = 0, still = null, drive = 'snap', dist = 85, exit = false, onTurn }: { start?: number; still?: number | null; drive?: Drive; dist?: number; exit?: boolean; onTurn?: (turn: number) => void }) {
  const scrollDriven = drive !== 'drag' && still === null;
  const sectionRef = useRef<HTMLElement>(null);
  const ringRef = useRef<SVGCircleElement>(null);
  const tickRefs = useRef<(SVGLineElement | null)[]>([]);
  const nameRefs = useRef<(HTMLAnchorElement | null)[]>([]);
  const stateRefs = useRef<(HTMLElement | null)[]>([]);
  const wheel = useRef({ turn: still === null ? start : start + MINERAL(still) });
  const L = useRef<Wheel>(layout(window.innerWidth, window.innerHeight));
  const tween = useRef<gsap.core.Tween | null>(null);
  const trigger = useRef<ScrollTrigger | null>(null);
  const [active, setActive] = useState(() => mod(Math.round(wheel.current.turn), N));
  const reduced = useMemo(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches, []);

  /** write the wheel position to the DOM — the only place transforms are set */
  const apply = useCallback(() => {
    const { turn } = wheel.current;
    const l = L.current;
    ringRef.current?.setAttribute('cx', String(l.cx));
    ringRef.current?.setAttribute('cy', String(l.cy));
    ringRef.current?.setAttribute('r', String(l.rDial));
    for (let k = 0; k < N; k++) {
      const rel = scrollDriven ? k - turn : shortest(turn, k); // scroll: a line 02.1 … 02.7, no wrap; drag: a ring
      const th = l.base + rel * STEP;
      const c = Math.cos(rad(th));
      const s = Math.sin(rad(th));
      const ad = Math.abs(rel);
      // dial: tick + name
      const tick = tickRefs.current[k];
      if (tick) {
        tick.setAttribute('x1', String(l.cx + (l.rDial - 6) * c));
        tick.setAttribute('y1', String(l.cy + (l.rDial - 6) * s));
        tick.setAttribute('x2', String(l.cx + (l.rDial + 6) * c));
        tick.setAttribute('y2', String(l.cy + (l.rDial + 6) * s));
      }
      const name = nameRefs.current[k];
      if (name) {
        const x = l.cx + l.rDial * c;
        const y = l.cy + l.rDial * s;
        const rot = l.tangent ? th + 90 : th;
        name.style.transform = `translate(${x}px, ${y}px) translate(${l.tangent ? '-50%' : '-100%'}, ${l.tangent ? '-118%' : '-50%'}) rotate(${rot}deg)`;
        name.style.setProperty('--mix', String(Math.min(1, ad)));
        name.style.visibility = ad > 2.2 ? 'hidden' : 'visible';
      }
      // state: the full composition as one body
      const el = stateRefs.current[k];
      if (el) {
        if (ad > 1.8) {
          el.style.visibility = 'hidden';
        } else {
          const x = l.cx + l.rBody * c - l.bodyW / 2;
          const y = l.cy + l.rBody * s - l.bodyH / 2;
          el.style.visibility = 'visible';
          el.style.width = `${l.bodyW}px`;
          el.style.height = `${l.bodyH}px`;
          el.style.transform = `translate(${x}px, ${y}px) rotate(${rel * STEP * DAMP}deg) scale(${Math.max(0.8, 1 - 0.15 * ad)})`;
          el.style.opacity = String(Math.max(0, 1 - 0.86 * ad));
        }
      }
    }
    const k = mod(Math.round(turn), N);
    setActive((prev) => (prev === k ? prev : k));
    onTurn?.(turn);
  }, [onTurn, scrollDriven]);

  useEffect(() => {
    const onResize = () => {
      L.current = layout(window.innerWidth, window.innerHeight);
      apply();
    };
    onResize();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [apply]);

  /** scroll-driven modes: pin the section; document scroll progress owns `turn` */
  useEffect(() => {
    if (!scrollDriven || !sectionRef.current) return;
    const section = sectionRef.current;
    const px = () => (dist / 100) * window.innerHeight;
    const common = {
      trigger: section,
      start: 'top top',
      end: () => `+=${(N - 1) * px()}`,
      pin: true,
      anticipatePin: 1,
      invalidateOnRefresh: true,
    };
    let st: ScrollTrigger;
    if (drive === 'step') {
      // the scroll position selects the state; the engine tweens to it — calm, never between states
      let current = Math.round(wheel.current.turn);
      st = ScrollTrigger.create({
        ...common,
        onUpdate: (self) => {
          // hysteresis: a state changes only once scroll is clearly past the midpoint (±0.1 state), so a hand resting near a threshold cannot flutter
          const p = self.progress * (N - 1);
          let target = current;
          while (p > target + 0.6 && target < N - 1) target += 1;
          while (p < target - 0.6 && target > 0) target -= 1;
          if (target !== current) {
            current = target;
            tweenTo(target);
          }
        },
      });
    } else {
      const anim = gsap.to(wheel.current, { turn: N - 1, ease: 'none', duration: 1, paused: true, onUpdate: apply });
      st = ScrollTrigger.create({
        ...common,
        animation: anim,
        scrub: 1, // one second of smoothing behind the finger / wheel
        ...(drive === 'snap'
          ? { snap: { snapTo: 1 / (N - 1), duration: { min: 0.5, max: 1.4 }, delay: 0.05, ease: MINERAL, inertia: false, directional: false } }
          : {}),
      });
    }
    trigger.current = st;
    return () => {
      st.kill();
      trigger.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scrollDriven, drive, dist]);

  /** scroll-driven: the document position of state k */
  const scrollYOf = useCallback((k: number) => {
    const st = trigger.current;
    if (!st) return null;
    return st.start + ((st.end - st.start) * k) / (N - 1);
  }, []);

  /** tween the engine to state k (engine-only; scroll modes call this from ScrollTrigger) */
  const tweenTo = useCallback(
    (k: number, opts: { snapOnly?: boolean; wrap?: boolean } = {}) => {
      const from = wheel.current.turn;
      const target = opts.wrap ? from + shortest(from, k) : k;
      const dist = Math.abs(target - from);
      if (dist < 1e-4) return;
      tween.current?.kill();
      if (reduced) {
        wheel.current.turn = target;
        apply();
        return;
      }
      tween.current = gsap.to(wheel.current, {
        turn: target,
        duration: opts.snapOnly ? 1.1 : 1.5 + 0.5 * Math.min(3, dist),
        ease: MINERAL,
        onUpdate: apply,
        onComplete: () => {
          if (opts.wrap) wheel.current.turn = mod(wheel.current.turn, N);
          apply();
        },
      });
    },
    [apply, reduced],
  );

  /** turn the wheel to state k by the shortest way */
  const goTo = useCallback(
    (k: number, opts: { snapOnly?: boolean } = {}) => {
      if (scrollDriven) {
        // secondary controls move the PAGE; ScrollTrigger then turns the wheel — one source of truth
        const y = scrollYOf(k);
        if (y !== null) window.scrollTo({ top: y, behavior: reduced ? 'instant' : 'smooth' });
        return;
      }
      tweenTo(k, { ...opts, wrap: true });
    },
    [scrollDriven, scrollYOf, reduced, tweenTo],
  );
  const step = useCallback(
    (dir: 1 | -1) => {
      const k = Math.round(wheel.current.turn) + dir;
      goTo(scrollDriven ? Math.max(0, Math.min(N - 1, k)) : mod(k, N));
    },
    [goTo, scrollDriven],
  );

  /* ---- drag on the dial (angle about the centre) and swipe on the state ---- */
  const drag = useRef<{ id: number; mode: 'dial' | 'swipe'; lastA: number; lastX: number; lastT: number; v: number; moved: number; startTurn: number } | null>(null);
  const angleAt = (x: number, y: number) => (Math.atan2(y - L.current.cy, x - L.current.cx) * 180) / Math.PI;

  const onPointerDown = (mode: 'dial' | 'swipe') => (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    if (mode === 'swipe' && !L.current.phone) return; // desktop: the state is read, not dragged
    tween.current?.kill();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    drag.current = { id: e.pointerId, mode, lastA: angleAt(e.clientX, e.clientY), lastX: e.clientX, lastT: performance.now(), v: 0, moved: 0, startTurn: wheel.current.turn };
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    const now = performance.now();
    let dTurn = 0;
    if (d.mode === 'dial') {
      let da = angleAt(e.clientX, e.clientY) - d.lastA;
      if (da > 180) da -= 360;
      if (da < -180) da += 360;
      d.lastA += da;
      dTurn = -da / STEP; // dragging the ring clockwise carries the names clockwise
    } else {
      const dx = e.clientX - d.lastX;
      d.lastX = e.clientX;
      dTurn = -dx / (window.innerWidth * 0.72); // a full swipe ≈ one state
    }
    d.moved += Math.abs(dTurn);
    const dt = Math.max(1, now - d.lastT);
    d.v = 0.6 * d.v + 0.4 * (dTurn / dt) * 1000; // states per second, smoothed
    d.lastT = now;
    if (scrollDriven) {
      if (d.mode === 'swipe') return; // decided on release: one state per swipe
      // optional enhancement: the dial drag scrolls the page; the wheel follows the page
      const y = scrollYOf(0);
      if (y !== null) {
        const per = (trigger.current!.end - trigger.current!.start) / (N - 1);
        d.startTurn = Math.max(0, Math.min(N - 1, d.startTurn + dTurn));
        window.scrollTo({ top: y + d.startTurn * per, behavior: 'instant' });
      }
      return;
    }
    wheel.current.turn += dTurn;
    apply();
  };
  const onPointerUp = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    drag.current = null;
    if (scrollDriven) {
      if (d.mode === 'swipe' && d.moved > 0.12) step(d.v > 0 ? 1 : -1); // a swipe is a page: next / previous
      else if (d.mode === 'dial') goTo(Math.round(d.startTurn)); // settle the page on the nearest state
      return;
    }
    const { turn } = wheel.current;
    let target = Math.round(turn);
    if (Math.abs(d.v) > 0.45 && d.moved > 0.03) target = d.v > 0 ? Math.ceil(turn) : Math.floor(turn); // a flick carries to the next
    target = Math.max(Math.round(d.startTurn) - 1, Math.min(Math.round(d.startTurn) + 1, target)); // never more than one state per gesture
    goTo(mod(target, N), { snapOnly: true });
  };
  const wasDrag = () => (drag.current ? drag.current.moved > 0.02 : false);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowRight' || (!scrollDriven && e.key === 'ArrowDown')) { e.preventDefault(); step(1); }
    if (e.key === 'ArrowLeft' || (!scrollDriven && e.key === 'ArrowUp')) { e.preventDefault(); step(-1); }
  };

  const activeService = services[active]!;
  return (
    <section ref={sectionRef} className="radial" id="services" aria-labelledby="services-title" tabIndex={-1} onKeyDown={onKeyDown}>
      <h2 id="services-title" className="sr-only">Услуги</h2>
      <p className="radial__label" aria-hidden="true"><span>02 — Услуги</span><span>{subIndex('02', active + 1)} / 07</span></p>

      {/* the dial — the one visible trace of the wheel; also the drag grip */}
      <div className="dial" onPointerDown={onPointerDown('dial')} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp}>
        <div className="dial__grip" aria-hidden="true" />
        <svg className="radial__ring" aria-hidden="true">
          <circle ref={ringRef} />
          {services.map((s, k) => <line key={s.id} ref={(el) => { tickRefs.current[k] = el; }} />)}
        </svg>
        <nav aria-label="Направления">
          <ol role="list">
            {services.map((s, k) => (
              <li key={s.id}>
                <a
                  ref={(el) => { nameRefs.current[k] = el; }}
                  className="dial__name"
                  href={`?a=${k}`}
                  aria-current={k === active ? 'true' : undefined}
                  onClick={(e) => { e.preventDefault(); if (!wasDrag()) goTo(k); }}
                  draggable={false}
                >
                  <span className="dial__no">{subIndex('02', k + 1)}</span>
                  {s.name}
                </a>
              </li>
            ))}
          </ol>
        </nav>
      </div>

      {/* the states — the outer ring; on the phone the state itself takes the swipe */}
      <div className="radial__states" onPointerDown={onPointerDown('swipe')} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp}>
        {services.map((s, k) => {
          const isActive = k === active;
          return (
            <article
              key={s.id}
              ref={(el) => { stateRefs.current[k] = el; }}
              className="state"
              aria-hidden={!isActive}
              inert={!isActive}
              data-active={isActive || undefined}
            >
              <div className="state__text">
                <p className="state__no">{subIndex('02', k + 1)} <span>/ 07</span></p>
                <h3 className="state__title">{s.title.map((line, i) => <Fragment key={line}>{i > 0 && <br />}{line}</Fragment>)}</h3>
                <p className="state__promise">{s.promise}</p>
                <p className="state__copy">{s.description}</p>
                <dl className="state__meta">
                  {s.meta.map(([l, v]) => (
                    <div key={l} style={{ display: 'contents' }}><dt>{l}</dt><dd>{v}</dd></div>
                  ))}
                </dl>
                <div className="state__cta">
                  <a className="state__btn" href="#inquiry">Записаться</a>
                  <a className="state__link" href="#pricing">Стоимость →</a>
                </div>
              </div>
              <div className="state__field">
                <div className="state__recess" />
                <div className="state__hair" />
                <div className="state__image" role="img" aria-label={`Кампания — ${s.imageLabel}`} style={{ backgroundImage: `url(${s.image})`, ['--pos' as string]: s.imagePosition }} />
                <div className="state__glass" />
                <div className="state__detail" style={{ backgroundImage: `url(${s.image})`, ['--pos' as string]: s.detailPosition }} />
                <p className="state__caption">Кампания — {s.imageLabel}</p>
              </div>
            </article>
          );
        })}
      </div>

      {exit && <div className="radial__exit" aria-hidden="true" />}

      <p className="radial__keys" aria-hidden="true">{scrollDriven ? (L.current.phone ? 'листайте — направления сменяются' : 'прокрутка — направления · ← → — по одному') : L.current.phone ? 'свайп — следующее направление' : '↑ ↓ — направления · дугу можно тянуть'}</p>
      <p className="sr-only" aria-live="polite">Услуга {subIndex('02', active + 1)} — {activeService.name}</p>
    </section>
  );
}

/**
 * The spike page: the section between two honest stubs, so page scroll is
 * visibly untouched. The neighbour below is Кейсы — Стоимость is not in the
 * vertical flow (see `spikes/flow/`, `docs/spikes/F-flow.md`).
 */
export function RadialSpike() {
  const { a, t, hud, drive, dist } = useMemo(readParams, []);
  const [turn, setTurn] = useState(a);
  return (
    <>
      {t === null && (
        <>
          <header className="stub stub--bar" aria-label="Заглушка шапки"><span className="stub__mark">эра</span><span className="stub__cta">Записаться</span></header>
          <section className="stub stub--before" aria-label="Заглушка предыдущей секции"><p>01 — Манифест · [заглушка соседней секции — прокрутка страницы не перехватывается]</p></section>
        </>
      )}
      <ServicesRadial start={a} still={t} drive={drive} dist={dist} onTurn={setTurn} />
      {t === null && <section className="stub stub--after" aria-label="Заглушка следующей секции"><p>04 — Кейсы · [заглушка соседней секции]</p></section>}
      {hud && t === null && (
        <div className="hud" aria-hidden="true">
          2D radial · {drive} · {dist}vh/state · turn {turn.toFixed(3)} · active {subIndex('02', mod(Math.round(turn), N) + 1)}
        </div>
      )}
    </>
  );
}
