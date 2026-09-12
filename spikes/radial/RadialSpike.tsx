import gsap from 'gsap';
import { CustomEase } from 'gsap/CustomEase';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { services } from '@/data/services';
import { subIndex } from '@/lib/utils';

import portrait from '../hero/assets/portrait-test.png';
import skin from '../hero/assets/skin-plate.jpg';

/**
 * Services — 2D radial editorial system. Working spike of the section logic.
 *
 * The wheel is a hidden navigation engine. Seven complete editorial states sit
 * on one invisible 2D wheel; the names sit on an inner ring about the same
 * centre (the dial — the only visible trace). Everything moves about the same
 * centre at the same angular speed, so a state and its name travel together; a
 * state's own rotation is damped so it stays flat and resolves horizontal.
 *
 * Interaction (all DOM, no scroll hijack, the mouse wheel does nothing here):
 *   · click / Enter on a name on the dial → the wheel turns to that state
 *   · drag the dial (angle about the wheel centre) → the wheel follows, snaps
 *   · phone: horizontal swipe on the state → next / previous
 *   · keyboard on the section: ← ↑ previous · → ↓ next
 *   · prefers-reduced-motion: the wheel lands on the state without a tween
 *
 * Stills for the storyboard: `?a=0..6&t=0..1` (progress a → a+1 on the real
 * ease, no tween). `?hud=0` hides the corner readout.
 */
gsap.registerPlugin(CustomEase);
// heavy and calm: a slow, weighted departure and a long settle
const MINERAL = CustomEase.create('mineral', 'M0,0 C0.52,0 0.18,1 1,1');

const N = services.length; // 7
const STEP = 360 / N;
const DAMP = 0.35; // a state's own rotation relative to its angle on the wheel
const IMAGES: readonly (readonly [string, string])[] = [
  [portrait, '62% 20%'],
  [skin, '60% 45%'],
  [portrait, '20% 30%'],
  [skin, '45% 60%'],
  [portrait, '70% 55%'],
  [skin, '30% 40%'],
  [portrait, '40% 10%'],
];

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
  const q = new URLSearchParams(location.search);
  const t = q.get('t');
  return {
    a: Math.min(N - 1, Math.max(0, Number(q.get('a') ?? 0))),
    t: t === null ? null : Math.min(1, Math.max(0, Number(t))),
    hud: q.get('hud') === '1',
  };
}

export function ServicesRadial({ start = 0, still = null, onTurn }: { start?: number; still?: number | null; onTurn?: (turn: number) => void }) {
  const sectionRef = useRef<HTMLElement>(null);
  const ringRef = useRef<SVGCircleElement>(null);
  const tickRefs = useRef<(SVGLineElement | null)[]>([]);
  const nameRefs = useRef<(HTMLAnchorElement | null)[]>([]);
  const stateRefs = useRef<(HTMLElement | null)[]>([]);
  const wheel = useRef({ turn: still === null ? start : start + MINERAL(still) });
  const L = useRef<Wheel>(layout(window.innerWidth, window.innerHeight));
  const tween = useRef<gsap.core.Tween | null>(null);
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
      const rel = shortest(turn, k); // −3.5 … 3.5 states from the focus
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
  }, [onTurn]);

  useEffect(() => {
    const onResize = () => {
      L.current = layout(window.innerWidth, window.innerHeight);
      apply();
    };
    onResize();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [apply]);

  /** turn the wheel to state k by the shortest way */
  const goTo = useCallback(
    (k: number, opts: { snapOnly?: boolean } = {}) => {
      const from = wheel.current.turn;
      const target = from + shortest(from, k);
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
          wheel.current.turn = mod(wheel.current.turn, N);
          apply();
        },
      });
    },
    [apply, reduced],
  );
  const step = useCallback((dir: 1 | -1) => goTo(mod(Math.round(wheel.current.turn) + dir, N)), [goTo]);

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
    wheel.current.turn += dTurn;
    apply();
  };
  const onPointerUp = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    drag.current = null;
    const { turn } = wheel.current;
    let target = Math.round(turn);
    if (Math.abs(d.v) > 0.45 && d.moved > 0.03) target = d.v > 0 ? Math.ceil(turn) : Math.floor(turn); // a flick carries to the next
    target = Math.max(Math.round(d.startTurn) - 1, Math.min(Math.round(d.startTurn) + 1, target)); // never more than one state per gesture
    goTo(mod(target, N), { snapOnly: true });
  };
  const wasDrag = () => (drag.current ? drag.current.moved > 0.02 : false);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); step(1); }
    if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); step(-1); }
  };

  const activeService = services[active]!;
  return (
    <section ref={sectionRef} className="radial" id="services" aria-labelledby="services-title" tabIndex={-1} onKeyDown={onKeyDown}>
      <h2 id="services-title" className="sr-only">Услуги</h2>
      <p className="radial__label" aria-hidden="true"><span>02 — Услуги</span><span>{subIndex('02', active + 1)} / 07</span></p>

      {/* the dial — the one visible trace of the wheel; also the drag grip */}
      <div className="dial" onPointerDown={onPointerDown('dial')} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp}>
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
          const [img, pos] = IMAGES[k]!;
          const [detail] = IMAGES[(k + 2) % N]!;
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
                <h3 className="state__title">{s.name}</h3>
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
                <div className="state__image" role="img" aria-label={`Кампания — ${s.imageLabel}`} style={{ backgroundImage: `url(${img})`, ['--pos' as string]: pos }} />
                <div className="state__glass" />
                <div className="state__detail" style={{ backgroundImage: `url(${detail})` }} />
                <p className="state__caption">Кампания — {s.imageLabel}</p>
              </div>
            </article>
          );
        })}
      </div>

      <p className="radial__keys" aria-hidden="true">{L.current.phone ? 'свайп — следующее направление' : '↑ ↓ — направления · дугу можно тянуть'}</p>
      <p className="sr-only" aria-live="polite">Услуга {subIndex('02', active + 1)} — {activeService.name}</p>
    </section>
  );
}

/** the spike page: the section between two honest stubs, so page scroll is visibly untouched */
export function RadialSpike() {
  const { a, t, hud } = useMemo(readParams, []);
  const [turn, setTurn] = useState(a);
  return (
    <>
      {t === null && (
        <>
          <header className="stub stub--bar" aria-label="Заглушка шапки"><span className="stub__mark">эра</span><span className="stub__cta">Записаться</span></header>
          <section className="stub stub--before" aria-label="Заглушка предыдущей секции"><p>01 — Манифест · [заглушка соседней секции — прокрутка страницы не перехватывается]</p></section>
        </>
      )}
      <ServicesRadial start={a} still={t} onTurn={setTurn} />
      {t === null && <section className="stub stub--after" aria-label="Заглушка следующей секции"><p>03 — Стоимость · [заглушка соседней секции]</p></section>}
      {hud && t === null && (
        <div className="hud" aria-hidden="true">
          2D radial · turn {turn.toFixed(3)} · active {subIndex('02', mod(Math.round(turn), N) + 1)}
        </div>
      )}
    </>
  );
}
