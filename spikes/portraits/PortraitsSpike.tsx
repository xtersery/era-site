import gsap from 'gsap';
import { CustomEase } from 'gsap/CustomEase';
import { ScrollToPlugin } from 'gsap/ScrollToPlugin';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { cta } from '@/data/copy';
import { subIndex } from '@/lib/utils';

import quartzUrl from '../../src/assets/smoky-quartz.png';
import { PLACEHOLDER_LABEL, sitters } from './people';
import { QUARTZ_ASPECT } from './scene/quartzGeometry';
import { ShardScene, type SceneDiag, type ShardState, type StonePlace } from './scene/ShardScene';

/** the frame's box and the stone's place, in fractions of the section */
const LAYOUT = {
  desktop: { frame: { x: 0.44, y: 0, w: 0.56, h: 1 }, place: { x: 0.455, y: 0.6, h: 0.64, narrow: 0.92 } as StonePlace },
  phone: { frame: { x: 0, y: 0, w: 1, h: 0.55 }, place: { x: 0.2, y: 0.56, h: 0.3, narrow: 0.9 } as StonePlace },
} as const;

/** what a visitor's browser can do, probed once */
function probeWebGL(): { webgl2: boolean; webgl: boolean; renderer: string } {
  try {
    const c = document.createElement('canvas');
    const gl2 = c.getContext('webgl2');
    const gl = gl2 ?? c.getContext('webgl');
    if (!gl) return { webgl2: false, webgl: false, renderer: 'none' };
    const info = gl.getExtension('WEBGL_debug_renderer_info');
    return { webgl2: !!gl2, webgl: true, renderer: info ? String(gl.getParameter(info.UNMASKED_RENDERER_WEBGL)) : 'masked' };
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
 * volume, and lies clear behind it where it has passed. The WebGL shard is the
 * object; the CSS shard of pass 3 stays as the no-WebGL fallback. Right to left, the
 * direction the light has in every room of this site; the words leave and
 * arrive the same way. Nothing slides, nothing fades, nothing is a card.
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
  const shard = useRef<HTMLDivElement>(null);
  const [live, setLive] = useState(false);
  const shardState = useRef<ShardState>({ on: false, f: 0, from: 0, next: 1, anchorFrom: 0.28, anchorNext: 0.28, current: frozen?.k ?? 0, anchorCurrent: 0.28 });
  const focal = useRef<HTMLDivElement>(null);
  const counter = useRef<HTMLSpanElement>(null);
  const reduced = useMemo(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches, []);
  const phone = useMemo(() => window.innerWidth < 1024, []);
  const portraitUrls = useMemo(() => sitters.map((s) => (phone ? s.portraitPhone : s.portrait)), [phone]);
  const probe = useMemo(probeWebGL, []);
  const [diag, setDiag] = useState<SceneDiag & { errors: string[] }>({ errors: [] });
  const onDiag = useCallback((d: SceneDiag) => setDiag((prev) => ({ ...prev, ...d })), []);
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
  const [stale, setStale] = useState(false);
  useEffect(() => {
    if (reduced || !probe.webgl) return;
    const t = window.setTimeout(() => setStale(true), 6000);
    return () => window.clearTimeout(t);
  }, [reduced, probe.webgl]);
  const [current, setCurrent] = useState(frozen?.k ?? 0);
  const trigger = useRef<ScrollTrigger | null>(null);
  const eyes = useRef<{ x: number; y: number }[]>([]);
  const nameEnds = useRef<number[]>([]);
  const state = useRef({ k: frozen?.k ?? 0, f: frozen?.f ?? 0 });

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
    datumY.current = phone ? 0 : section.height * DATUM;
    const iw = 4, ih = 5;
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
  }, [phone]);

  /** paints one position on the row: k is met, f is the way to k + 1 */
  const apply = useCallback((k: number, f: number) => {
    state.current = { k, f };
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
    shardState.current = { on, f, from: k, next, anchorFrom: anchorOf(k), anchorNext: anchorOf(next), current: f < 0.5 ? k : next, anchorCurrent: anchorOf(f < 0.5 ? k : next) };
    // the no-WebGL stone: the photograph, resident at the same place
    if (shard.current && sectionRef.current) {
      const sw = sectionRef.current.clientWidth, sh = sectionRef.current.clientHeight;
      const pl = phone ? LAYOUT.phone.place : LAYOUT.desktop.place;
      const h = sh * pl.h;
      const w = h * QUARTZ_ASPECT * pl.narrow;
      shard.current.style.width = `${w.toFixed(1)}px`;
      shard.current.style.height = `${h.toFixed(1)}px`;
      shard.current.style.transform = `translate3d(${(sw * pl.x - w / 2).toFixed(1)}px, ${(sh * pl.y - h / 2).toFixed(1)}px, 0) rotateZ(-4deg)`;
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

  return (
    <section ref={sectionRef} className="sitting" id="specialists" aria-labelledby="specialists-title" data-live={live || undefined}>
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
              <h3 id={`${s.person.id}-name`} className="sitter__name" data-placeholder="fact">
                <span ref={(el) => { names.current[i] = el; }} className="sitter__name-inner">{s.person.name}</span>
              </h3>
            </div>
            {/* the body starts a fixed distance BELOW the datum, whatever the name did */}
            <div className="sitter__body">
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
      {!reduced && probe.webgl && (
        <ShardScene
          portraits={portraitUrls}
          state={shardState}
          phone={phone}
          frame={phone ? LAYOUT.phone.frame : LAYOUT.desktop.frame}
          place={phone ? LAYOUT.phone.place : LAYOUT.desktop.place}
          still={reduced}
          onReady={() => setLive(true)}
          onDiag={onDiag}
        />
      )}
      {/* the no-WebGL stone: the photograph itself, resident at the same place */}
      <div ref={shard} className="shard shard--photo" aria-hidden="true" hidden={live}>
        <img className="shard__photo" src={quartzUrl} alt="" draggable={false} />
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

        <p className="frame__caption" aria-hidden="true">{PLACEHOLDER_LABEL}</p>
      </div>

      {/* the focal line: from the name to her eyes */}
      <div ref={focal} className="focal" aria-hidden="true" />

      <p className="sr-only" aria-live="polite">{`Специалист ${current + 1} из ${N} — ${sitters[current]!.person.name}`}</p>

      {/* DIAGNOSTIC — which render path is active, and why (review build only) */}
      {(() => {
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
        const wanted = new URLSearchParams(location.search).get('diag');
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
