import { useEffect, useMemo, useState } from 'react';

import { services } from '@/data/services';
import { subIndex } from '@/lib/utils';

/**
 * Services — 2D radial editorial system (storyboard page).
 *
 * One enormous invisible 2D wheel. Seven complete editorial states are attached
 * to seven positions on it (outer ring); the service names sit on an inner ring
 * (the dial) about the same centre. Rotating the wheel moves everything about
 * the same centre at the same angular speed — a full state travels as one unit.
 * Self-rotation of a state is damped (×0.35) so it stays flat and readable and
 * resolves horizontal at the focal position. No perspective, no 3D.
 *
 * `?a=0..6` start state · `?t=0..1` progress of the turn a → a+1 · `?hud=0`.
 */
const STEP = 360 / 7;
const DAMP = 0.35;
const IMAGES = [
  ['/spikes/hero/assets/portrait-test.png', '62% 20%'],
  ['/spikes/hero/assets/skin-plate.jpg', '60% 45%'],
  ['/spikes/hero/assets/portrait-test.png', '20% 30%'],
  ['/spikes/hero/assets/skin-plate.jpg', '45% 60%'],
  ['/spikes/hero/assets/portrait-test.png', '70% 55%'],
  ['/spikes/hero/assets/skin-plate.jpg', '30% 40%'],
  ['/spikes/hero/assets/portrait-test.png', '40% 10%'],
] as const;

function readParams() {
  const q = new URLSearchParams(location.search);
  return {
    a: Math.min(6, Math.max(0, Number(q.get('a') ?? 0))),
    t: Math.min(1, Math.max(0, Number(q.get('t') ?? 0))),
    hud: q.get('hud') !== '0',
  };
}

// heavy, calm: one smoothstep — slow start, slow settle (production: the mineral ease)
const easeOut = (t: number) => {
  const s = Math.min(1, Math.max(0, t));
  return s * s * (3 - 2 * s);
};
const rad = (deg: number) => (deg * Math.PI) / 180;

interface Wheel {
  cx: number; cy: number; // centre of the wheel in viewport px
  rDial: number; rBody: number; // inner ring (names) and outer ring (states)
  base: number; // angle of the focal position: 0° = right of the centre (desktop), −90° = above it (phone)
  tangent: boolean; // names lie along the arc (phone) or along the spoke (desktop)
  bodyW: number; bodyH: number;
}

function layout(w: number, h: number): Wheel {
  if (w < 1024) {
    return { cx: w * 0.5, cy: h * 1.16, rDial: h * 0.3, rBody: h * 0.72, base: -90, tangent: true, bodyW: w * 0.86, bodyH: h * 0.6 };
  }
  return { cx: w * 0.012, cy: h * 0.5, rDial: w * 0.33, rBody: w * 0.648, base: 0, tangent: false, bodyW: w * 0.6, bodyH: h * 0.78 };
}

function useViewport() {
  const [v, set] = useState(() => ({ w: window.innerWidth, h: window.innerHeight }));
  useEffect(() => {
    const on = () => set({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener('resize', on);
    return () => window.removeEventListener('resize', on);
  }, []);
  return v;
}

export function RadialSpike() {
  const { a, t, hud } = useMemo(readParams, []);
  const { w, h } = useViewport();
  const L = layout(w, h);
  const turn = a + easeOut(t); // wheel position in "states"
  const active = t < 0.5 ? a : (a + 1) % 7;

  return (
    <>
      <section className="radial" aria-label="Услуги — радиальная система">
        {/* the dial: the one visible trace of the wheel */}
        <svg className="radial__ring" aria-hidden="true">
          <circle cx={L.cx} cy={L.cy} r={L.rDial} />
          {services.map((s, k) => {
            const th = L.base + (k - turn) * STEP;
            const x1 = L.cx + (L.rDial - 6) * Math.cos(rad(th));
            const y1 = L.cy + (L.rDial - 6) * Math.sin(rad(th));
            const x2 = L.cx + (L.rDial + 6) * Math.cos(rad(th));
            const y2 = L.cy + (L.rDial + 6) * Math.sin(rad(th));
            return <line key={s.id} x1={x1} y1={y1} x2={x2} y2={y2} />;
          })}
        </svg>

        <nav className="dial" aria-label="Направления">
          <ol role="list">
            {services.map((s, k) => {
              const th = L.base + (k - turn) * STEP;
              const d = Math.abs(k - turn);
              const dist = Math.min(d, 7 - d); // in states, wrap-aware
              const x = L.cx + L.rDial * Math.cos(rad(th));
              const y = L.cy + L.rDial * Math.sin(rad(th));
              const rot = L.tangent ? th + 90 : th;
              const mix = Math.min(1, dist); // 0 at the focal position → 1 one state away
              return (
                <li key={s.id} style={{ ['--mix' as string]: mix }} aria-current={k === active ? 'true' : undefined}>
                  <a className="dial__name" href={`?a=${k}`} style={{ left: x, top: y, transform: `translate(${L.tangent ? '-50%' : '-100%'}, ${L.tangent ? '-118%' : '-50%'}) rotate(${rot}deg)` }}>
                    <span className="dial__no">{subIndex('02', k + 1)}</span>
                    {s.name}
                  </a>
                </li>
              );
            })}
          </ol>
        </nav>

        {/* the states: the outer ring */}
        {services.map((s, k) => {
          const rel = k - turn; // signed distance in states (no wrap: only the near ones render)
          const wrapped = rel > 3.5 ? rel - 7 : rel < -3.5 ? rel + 7 : rel;
          const th = L.base + wrapped * STEP;
          const ad = Math.abs(wrapped);
          if (ad > 1.8) return null;
          const x = L.cx + L.rBody * Math.cos(rad(th));
          const y = L.cy + L.rBody * Math.sin(rad(th));
          const rot = wrapped * STEP * DAMP;
          const scale = Math.max(0.8, 1 - 0.15 * ad);
          const opacity = Math.max(0, 1 - 0.84 * ad); // a neighbour at rest is a 16 % ghost: partial typography, nothing more
          const [img, pos] = IMAGES[k]!;
          const [detail] = IMAGES[(k + 2) % 7]!;
          return (
            <article
              key={s.id}
              className="state"
              aria-current={k === active ? 'true' : undefined}
              style={{
                width: L.bodyW,
                height: L.bodyH,
                left: x - L.bodyW / 2,
                top: y - L.bodyH / 2,
                transform: `rotate(${rot}deg) scale(${scale})`,
                opacity,
                zIndex: k === active ? 2 : 1,
              }}
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
                <div className="state__cta"><span className="state__btn">Записаться</span><span className="state__link">Стоимость →</span></div>
              </div>
              <div className="state__field">
                <div className="state__recess" />
                <div className="state__hair" />
                <div className="state__image" style={{ backgroundImage: `url(${img})`, ['--pos' as string]: pos }} />
                <div className="state__glass" />
                <div className="state__detail" style={{ backgroundImage: `url(${detail})` }} />
                <p className="state__caption">Кампания — {s.imageLabel}</p>
              </div>
            </article>
          );
        })}

        <p className="radial__label"><span>02 — Услуги</span><span>{subIndex('02', active + 1)} / 07</span></p>
      </section>
      {hud && (
        <div className="hud" aria-hidden="true">
          2D radial · {subIndex('02', a + 1)} → {subIndex('02', ((a + 1) % 7) + 1)} · t {t.toFixed(2)} · <a href={`?a=${a}&t=0`}>0</a> <a href={`?a=${a}&t=0.5`}>0.5</a> <a href={`?a=${a}&t=1`}>1</a>
        </div>
      )}
    </>
  );
}
