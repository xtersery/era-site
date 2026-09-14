import gsap from 'gsap';
import { CustomEase } from 'gsap/CustomEase';
import { ScrollToPlugin } from 'gsap/ScrollToPlugin';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { cta } from '@/data/copy';
import { subIndex } from '@/lib/utils';

import { PLACEHOLDER_LABEL, sitters } from './people';

/**
 * Specialists — «Сеанс», the pinned portrait gallery (Spike D, pass 1).
 *
 * THE IDEA: one wall of a light room, one portrait at a time at the scale of a
 * person. The visitor never browses a staff list; she meets a specialist and
 * reads her label. At rest a calibration hairline — the FOCAL LINE — runs from
 * the typeset name across the wall to the eyes of the woman in the portrait.
 * Between specialists the same line becomes the travelling light that exposes
 * the next portrait through the current one, right to left, the direction the
 * light has in every room of this site; the words leave and arrive the same
 * way. Nothing slides, nothing fades, nothing is a card.
 *
 * DRIVEN BY: the page's own scroll. The section is pinned for (N − 1) × 100 vh;
 * progress maps to a position t on the row of specialists; k = ⌊t⌋ is the one
 * being met, f = t − k the transition to the next; ScrollTrigger snaps to whole
 * states so every resting state is a complete editorial page. Everything is
 * DOM + CSS (clip-path, transform, one gradient) — no WebGL, no canvas.
 *
 * `?k=0..3&f=0..1` freezes a state (f > 0 is mid-transition) · `?hud=1`.
 */
gsap.registerPlugin(CustomEase, ScrollTrigger, ScrollToPlugin);
const MINERAL = CustomEase.create('mineral', 'M0,0 C0.52,0 0.18,1 1,1');

const INDEX = '05';
const N = sitters.length;
const PER = 100; // vh of scroll per transition
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
const smooth = (t: number) => { const s = clamp(t, 0, 1); return s * s * (3 - 2 * s); };
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

function readParams() {
  const q = new URLSearchParams(location.search);
  const k = q.get('k');
  const f = q.get('f');
  return {
    k: k === null ? null : clamp(Number(k), 0, N - 1),
    f: f === null ? 0 : clamp(Number(f), 0, 1),
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
}: {
  frozen?: { k: number; f: number } | null;
  onState?: (s: { k: number; f: number }) => void;
}) {
  const sectionRef = useRef<HTMLElement>(null);
  const wallRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const plates = useRef<(HTMLElement | null)[]>([]);
  const labels = useRef<(HTMLElement | null)[]>([]);
  const names = useRef<(HTMLElement | null)[]>([]);
  const light = useRef<HTMLDivElement>(null);
  const focal = useRef<HTMLDivElement>(null);
  const counter = useRef<HTMLSpanElement>(null);
  const reduced = useMemo(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches, []);
  const phone = useMemo(() => window.innerWidth < 1024, []);
  const [current, setCurrent] = useState(frozen?.k ?? 0);
  const trigger = useRef<ScrollTrigger | null>(null);
  const eyes = useRef<{ x: number; y: number }[]>([]);
  const nameEnds = useRef<number[]>([]);
  const state = useRef({ k: frozen?.k ?? 0, f: frozen?.f ?? 0 });

  /** measure once per layout: where each eye lands, where each name ends */
  const measure = useCallback(() => {
    const frame = frameRef.current?.getBoundingClientRect();
    const section = sectionRef.current?.getBoundingClientRect();
    if (!frame || !section) return;
    eyes.current = sitters.map((s) => {
      const e = eyeOnScreen(frame, s.eye, s.anchorY);
      return { x: e.x - section.left, y: e.y - section.top };
    });
    // the name sits on the focal line: its block is placed so its last baseline is the eye line
    labels.current.forEach((el, i) => {
      const nm = names.current[i];
      if (!el || !nm) return;
      const eye = eyes.current[i]!;
      if (!phone) el.style.top = `${Math.round(eye.y - nm.offsetHeight + nm.offsetHeight * 0.16)}px`;
      nameEnds.current[i] = nm.getBoundingClientRect().right - section.left;
    });
  }, [phone]);

  /** paints one position on the row: k is met, f is the way to k + 1 */
  const apply = useCallback((k: number, f: number) => {
    state.current = { k, f };
    const next = Math.min(N - 1, k + 1);
    // the words are masked lines: the label she is leaving lifts away from the
    // foot up to the name, then the next label is set from its name down
    const goingOut = clamp(f / 0.5, 0, 1);
    const comingIn = clamp((f - 0.5) / 0.5, 0, 1);
    const maskOut = goingOut >= 1 ? 'linear-gradient(#000 0, #000 0)' : `linear-gradient(180deg, #000 ${((1 - goingOut) * 100 - 8).toFixed(2)}%, transparent ${((1 - goingOut) * 100).toFixed(2)}%)`;
    const maskIn = comingIn <= 0 ? 'linear-gradient(transparent 0, transparent 0)' : `linear-gradient(180deg, #000 ${(comingIn * 100).toFixed(2)}%, transparent ${(comingIn * 100 + 8).toFixed(2)}%)`;
    const setMask = (el: HTMLElement, mask: string) => {
      el.style.maskImage = mask;
      (el.style as unknown as Record<string, string>)['webkitMaskImage'] = mask;
    };
    // the light crosses the face quickly and lingers at the edges: an eased seam
    const seam = (1 - smooth(f)) * 100;
    const band = phone ? 9 : 6; // the width of the light, in % of the frame
    for (let i = 0; i < N; i++) {
      const plate = plates.current[i];
      const label = labels.current[i];
      if (!plate || !label) continue;
      if (i === k) {
        plate.hidden = false;
        plate.style.zIndex = '1';
        plate.style.maskImage = '';
        (plate.style as unknown as Record<string, string>)['webkitMaskImage'] = '';
        // the portrait she is leaving steps back a little as the light passes
        plate.style.transform = `translateX(${(-4 * f).toFixed(2)}%)`;
        label.hidden = goingOut >= 1;
        setMask(label, goingOut > 0 ? maskOut : '');
      } else if (i === next && f > 0) {
        plate.hidden = false;
        plate.style.zIndex = '2';
        // the next portrait develops through the light: a soft band, not a cut
        const mask = `linear-gradient(90deg, transparent ${(seam - band).toFixed(2)}%, #000 ${(seam + band * 0.6).toFixed(2)}%)`;
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
    // the travelling light
    if (light.current) {
      const on = f > 0.001 && f < 0.999;
      light.current.style.opacity = on ? '1' : '0';
      light.current.style.left = `${seam.toFixed(3)}%`;
    }
    // the focal line re-aims at the next pair of eyes while the light passes
    if (focal.current && eyes.current.length) {
      const a = eyes.current[k]!, b = eyes.current[next]!;
      const m = smooth((f - 0.3) / 0.45);
      const y = lerp(a.y, b.y, m);
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
      focal.current.style.opacity = f > 0.05 && f < 0.95 ? '0.55' : '1';
    }
    const shown = f < 0.5 ? k : next;
    if (counter.current) counter.current.textContent = `${subIndex(INDEX, shown + 1)} / ${String(N).padStart(2, '0')}`;
    setCurrent((prev) => (prev === shown ? prev : shown));
    onState?.({ k, f });
  }, [onState, phone]);

  useEffect(() => {
    measure();
    apply(state.current.k, state.current.f);
    const onResize = () => { measure(); apply(state.current.k, state.current.f); };
    window.addEventListener('resize', onResize);
    // fonts change the name's width; re-measure when they land
    document.fonts?.ready.then(onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [measure, apply]);

  /** the page's own scroll walks the row; snap lands on whole states */
  useEffect(() => {
    if (frozen || !sectionRef.current) return;
    const st = ScrollTrigger.create({
      trigger: sectionRef.current,
      start: 'top top',
      end: () => `+=${(N - 1) * (PER / 100) * window.innerHeight}`,
      pin: true,
      anticipatePin: 1,
      invalidateOnRefresh: true,
      snap: reduced ? undefined : { snapTo: 1 / (N - 1), duration: { min: 0.35, max: 0.9 }, delay: 0.05, ease: MINERAL },
      onUpdate: (self) => {
        const t = clamp(self.progress * (N - 1), 0, N - 1 - 1e-6);
        if (reduced) { apply(Math.round(t), 0); return; } // reduced motion: states, no travel
        apply(Math.floor(t), t - Math.floor(t));
      },
    });
    trigger.current = st;
    return () => { st.kill(); trigger.current = null; };
  }, [frozen, reduced, apply]);

  const goTo = useCallback((k: number) => {
    const st = trigger.current;
    if (!st) return;
    const y = st.start + (st.end - st.start) * (k / (N - 1));
    if (reduced) { window.scrollTo({ top: y, behavior: 'instant' as ScrollBehavior }); return; }
    gsap.to(window, { scrollTo: y, duration: 0.9, ease: MINERAL, overwrite: true });
  }, [reduced]);

  const nextIndex = Math.min(N - 1, current + 1);
  const hasNext = current < N - 1;

  return (
    <section ref={sectionRef} className="sitting" id="specialists" aria-labelledby="specialists-title">
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
            <p className="sitter__no">{subIndex(INDEX, i + 1)}</p>
            <h3 id={`${s.person.id}-name`} className="sitter__name" data-placeholder="fact">
              <span ref={(el) => { names.current[i] = el; }} className="sitter__name-inner">{s.person.name}</span>
            </h3>
            <p className="sitter__role">{s.person.role}</p>
            <p className="sitter__focus" data-placeholder="copy">{s.focus}</p>
            <p className="sitter__approach" data-placeholder="copy">«{s.approach}»</p>
            <dl className="sitter__facts">
              {s.person.facts.map(([dt, dd]) => (
                <div key={dt} style={{ display: 'contents' }}><dt>{dt}</dt><dd data-placeholder="fact">{dd}</dd></div>
              ))}
            </dl>
            <div className="sitter__cta">
              <a className="sitter__primary" href="#inquiry" tabIndex={i === current ? 0 : -1}>{cta.bookWith(s.person.shortName)}</a>
              <a className="sitter__link" href="#services" tabIndex={i === current ? 0 : -1}>К направлениям →</a>
            </div>
          </article>
        ))}

        {/* the way on: who is next, and the row itself */}
        <div className="wall__foot">
          <button type="button" className="wall__next" hidden={!hasNext} onClick={() => goTo(nextIndex)}>
            <span className="wall__next-kicker">далее</span>
            <span className="wall__next-name" data-placeholder="fact">{sitters[nextIndex]!.person.name}</span>
            <span className="wall__next-glyph" aria-hidden="true">↓</span>
          </button>
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

      {/* the frame: one portrait at a time, at the scale of a person */}
      <div ref={frameRef} className="frame">
        {sitters.map((s, i) => (
          <figure
            key={s.person.id}
            ref={(el) => { plates.current[i] = el; }}
            className="plate"
            data-placeholder="portrait"
          >
            <img
              src={phone ? s.portraitPhone : s.portrait}
              alt={`${s.person.name} — ${s.person.role}. ${s.person.portraitLabel}`}
              style={{ objectPosition: `50% ${s.anchorY * 100}%` }}
              draggable={false}
            />
          </figure>
        ))}
        {/* the light that exposes the next portrait */}
        <div ref={light} className="light" aria-hidden="true" />
        <p className="frame__caption" aria-hidden="true">{PLACEHOLDER_LABEL}</p>
      </div>

      {/* the focal line: from the name to her eyes */}
      <div ref={focal} className="focal" aria-hidden="true" />

      <p className="sr-only" aria-live="polite">{`Специалист ${current + 1} из ${N} — ${sitters[current]!.person.name}`}</p>
    </section>
  );
}

export function PortraitsSpike() {
  const { k, f, hud } = useMemo(readParams, []);
  const [s, setS] = useState({ k: k ?? 0, f });
  const frozen = k !== null;
  return (
    <>
      {!frozen && (
        <>
          <header className="stub stub--bar" aria-label="Заглушка шапки"><span className="stub__mark">эра</span><span className="stub__cta">Записаться</span></header>
          <section className="stub stub--before" aria-label="Заглушка предыдущей секции"><p>04 — Кейсы · [заглушка соседней секции — прокрутка страницы не перехватывается]</p></section>
        </>
      )}
      <Sitting frozen={frozen ? { k: k!, f } : null} onState={setS} />
      {!frozen && <section className="stub stub--after" aria-label="Заглушка следующей секции"><p>06 — Основатель · [заглушка соседней секции]</p></section>}
      {hud && <div className="hud" aria-hidden="true">sitting · k {s.k} · f {s.f.toFixed(2)}</div>}
    </>
  );
}
