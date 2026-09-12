import { useMemo } from 'react';

import { services } from '@/data/services';
import { subIndex } from '@/lib/utils';

/**
 * Services — full 360° editorial chamber (storyboard page).
 *
 * The whole section is the room. Seven complete spreads stand as walls around
 * the viewer's axis; the room turns 360/7 per service. `?t=0..1` turns from face
 * `a` to `a+1`; `?a=` picks the start face. Real DOM typography on the walls — the
 * text rotates because it is the wall.
 */
const STEP = 360 / 7;
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

const easeOut = (t: number) => {
  const s = Math.min(1, Math.max(0, t));
  const u = s * s * (3 - 2 * s);
  return u * u * (3 - 2 * u);
};

export function RoomSpike() {
  const { a, t, hud } = useMemo(readParams, []);
  const turn = (a + easeOut(t)) * STEP; // next wall sits to the right; the room turns left to bring it frontal
  const active = t < 0.5 ? a : (a + 1) % 7;

  return (
    <>
      <section className="room360" aria-label="Услуги — 360° комната" style={{ ['--turn' as string]: `${turn}deg` }}>
        <div className="room360__scene">
          {services.map((s, k) => {
            const prev = services[(k + 6) % 7]!;
            const next = services[(k + 1) % 7]!;
            const [img, pos] = IMAGES[k]!;
            const [detail] = IMAGES[(k + 2) % 7]!;
            return (
              <article key={s.id} className="wall" style={{ ['--angle' as string]: `${-k * STEP}deg` }} aria-current={k === active ? 'true' : undefined}>
                <p className="wall__label"><span>02 — Услуги</span><span>{subIndex('02', k + 1)} / 07</span></p>
                <ol className="wall__strip" role="list">
                  {services.map((o, i) => (
                    <li key={o.id}>{i === k ? <b>{subIndex('02', i + 1)}</b> : subIndex('02', i + 1)}</li>
                  ))}
                </ol>
                <p className="wall__prev"><small>←</small>{prev.name}</p>
                <p className="wall__next">{next.name}<small>→</small></p>
                <div className="wall__text">
                  <p className="wall__no">{subIndex('02', k + 1)}</p>
                  <h3 className="wall__title">{s.name}</h3>
                  <p className="wall__promise">{s.promise}</p>
                  <p className="wall__copy">{s.description}</p>
                  <dl className="wall__meta">
                    {s.meta.map(([l, v]) => (
                      <div key={l} style={{ display: 'contents' }}><dt>{l}</dt><dd>{v}</dd></div>
                    ))}
                  </dl>
                  <div className="wall__cta"><span className="wall__btn">Записаться</span><span className="wall__link">Стоимость →</span></div>
                </div>
                <div className="wall__field">
                  <div className="wall__recess" />
                  <div className="wall__hair" />
                  <div className="wall__image" style={{ backgroundImage: `url(${img})`, ['--pos' as string]: pos }} />
                  <div className="wall__glass" />
                  <div className="wall__detail" style={{ backgroundImage: `url(${detail})` }} />
                  <p className="wall__caption">Кампания — {s.imageLabel}</p>
                </div>
                <p className="wall__foot"><span>{prev.name} ←</span><span>стена {k + 1} из 7</span><span>→ {next.name}</span></p>
              </article>
            );
          })}
        </div>
      </section>
      {hud && (
        <div className="hud" aria-hidden="true">
          360° room · face {subIndex('02', a + 1)} → {subIndex('02', ((a + 1) % 7) + 1)} · t {t.toFixed(2)} · <a href={`?a=${a}&t=0`}>0</a> <a href={`?a=${a}&t=0.5`}>0.5</a> <a href={`?a=${a}&t=1`}>1</a>
        </div>
      )}
    </>
  );
}
