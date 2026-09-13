import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { CASE_STATUS_LABEL, cases } from '@/data/cases';
import { services } from '@/data/services';
import { specialists } from '@/data/specialists';
import { subIndex } from '@/lib/utils';

import c1a from './assets/case-1-after.jpg';
import c1aP from './assets/case-1-after@phone.jpg';
import c1b from './assets/case-1-before.jpg';
import c1bP from './assets/case-1-before@phone.jpg';
import c2a from './assets/case-2-after.jpg';
import c2aP from './assets/case-2-after@phone.jpg';
import c2b from './assets/case-2-before.jpg';
import c2bP from './assets/case-2-before@phone.jpg';
import c3a from './assets/case-3-after.jpg';
import c3aP from './assets/case-3-after@phone.jpg';
import c3b from './assets/case-3-before.jpg';
import c3bP from './assets/case-3-before@phone.jpg';
import c4a from './assets/case-4-after.jpg';
import c4aP from './assets/case-4-after@phone.jpg';
import c4b from './assets/case-4-before.jpg';
import c4bP from './assets/case-4-before@phone.jpg';

/** the four stand-in pairs, desktop and phone tier — imported so the spike can ship as one file */
const PLATES: Readonly<Record<string, { after: string; before: string; afterPhone: string; beforePhone: string }>> = {
  'case-1': { after: c1a, before: c1b, afterPhone: c1aP, beforePhone: c1bP },
  'case-2': { after: c2a, before: c2b, afterPhone: c2aP, beforePhone: c2bP },
  'case-3': { after: c3a, before: c3b, afterPhone: c3aP, beforePhone: c3bP },
  'case-4': { after: c4a, before: c4b, afterPhone: c4aP, beforePhone: c4bP },
};

/**
 * Cases — spatial archive (Spike C). Working spike of the section logic.
 *
 * LAW: Services is rotation; Cases is DEPTH + FOCUS. The case planes live on one
 * axis running from the viewer into the room (vanishing point up and to the
 * right). Scroll walks that axis: the next case approaches out of the graphite,
 * docks frontal and readable, holds while it is read, then passes the viewer and
 * dissolves. Nothing rotates, nothing fans out, no plane has a frame — the deep
 * planes are masked into the ground so they read as depth, not as cards.
 *
 * Scroll rhythm (deliberately different from Services): pinned and *scrubbed*,
 * with a dwell plateau per case — no snap, no stepping. `DWELL` of each case's
 * scroll interval is spent docked; the rest is the approach.
 *
 * Before / after: «после» is the base plate; «до» is the same plate, same box,
 * same object-fit — a second layer clipped to a window. Nothing inside the
 * window is scaled, offset or distorted; the material lives on the rim only.
 * Modes: сравнить (window follows the pointer) · до · после, all reachable as
 * real buttons; on a phone a press-and-hold opens the window to the full frame.
 *
 * `?c=0..3&p=0..1` freezes a still (no pin). `?grid=1` overlays the alignment
 * grid. `?hud=1` shows the readout.
 */
gsap.registerPlugin(ScrollTrigger);

const N = cases.length;
const PER = 100; // vh of scroll per case
const DWELL = 0.55; // share of a case's interval spent docked
const SHOWN = 2.4; // planes further than this are not rendered

type Mode = 'compare' | 'before' | 'after';

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const smooth = (t: number) => { const s = clamp(t, 0, 1); return s * s * (3 - 2 * s); };
/** hold at the dock, then travel — the case is читается, not scrolled past */
const plateau = (frac: number) => smooth((frac - DWELL) / (1 - DWELL));

/** the depth axis, in viewport units: dock → vanishing point (into the room), dock → past the viewer */
interface Axis { dockX: number; dockY: number; vanX: number; vanY: number; nearX: number; nearY: number; fieldW: number; phone: boolean }
function axis(w: number, h: number): Axis {
  if (w < 1024) {
    return { dockX: w * 0.5, dockY: h * 0.33, vanX: w * 0.74, vanY: h * 0.2, nearX: w * 0.1, nearY: h * 0.62, fieldW: w * 0.78, phone: true };
  }
  return { dockX: w * 0.335, dockY: h * 0.53, vanX: w * 0.78, vanY: h * 0.36, nearX: -w * 0.12, nearY: h * 0.78, fieldW: Math.min(w * 0.4, h * 0.72 * 0.8), phone: false };
}

/** where plane `d` sits on the axis (d = 0 docked, d > 0 deeper, d < 0 past the viewer) */
function place(d: number, a: Axis) {
  if (d >= 0) {
    const k = 1 - 1 / (1 + 0.52 * d); // 0 … 1 into the room
    return {
      x: lerp(a.dockX, a.vanX, k),
      y: lerp(a.dockY, a.vanY, k),
      scale: 1 / (1 + 0.52 * d),
      blur: 2.6 * d,
      fog: clamp(1.25 * k, 0, 0.88), // green-black takes the plane
      opacity: clamp(1 - 0.22 * d, 0, 1),
      mask: clamp(0.5 * d, 0, 0.9), // deep planes dissolve at their edges
      z: Math.round(100 - d * 10),
    };
  }
  const u = smooth(-d); // 0 … 1 passing the viewer
  return {
    x: lerp(a.dockX, a.nearX, u),
    y: lerp(a.dockY, a.nearY, u),
    scale: 1 + 0.72 * -d, // the leaving case is nearer than the docked one — it passes the viewer
    blur: 13 * u,
    fog: 0,
    opacity: clamp(1 - 2 * u, 0, 1),
    mask: clamp(0.8 * u, 0, 0.9),
    z: Math.round(120 + u * 10),
  };
}

function readParams() {
  const q = new URLSearchParams(location.search);
  const p = q.get('p');
  return {
    c: clamp(Number(q.get('c') ?? 0), 0, N - 1),
    p: p === null ? null : clamp(Number(p), 0, 1),
    grid: q.get('grid') === '1',
    hud: q.get('hud') === '1',
    mode: (q.get('mode') as Mode | null) ?? null,
    wx: q.get('wx') === null ? null : Number(q.get('wx')),
    wy: q.get('wy') === null ? null : Number(q.get('wy')),
  };
}

const serviceName = (id: string) => services.find((s) => s.id === id)?.name ?? cases[0]!.title;
const specialistName = (id: string) => specialists.find((s) => s.id === id)?.name ?? '[Имя Фамилия]';

export function CasesArchive({
  start = 0,
  still = null,
  grid = false,
  mode: forcedMode = null,
  window0 = null,
  onPos,
}: {
  start?: number;
  still?: number | null;
  grid?: boolean;
  mode?: Mode | null;
  window0?: { x: number; y: number } | null;
  onPos?: (pos: number) => void;
}) {
  const sectionRef = useRef<HTMLElement>(null);
  const planeRefs = useRef<(HTMLElement | null)[]>([]);
  const pos = useRef({ v: still === null ? start : start + plateau(still) });
  const A = useRef<Axis>(axis(window.innerWidth, window.innerHeight));
  const [active, setActive] = useState(() => Math.round(pos.current.v));
  const [mode, setMode] = useState<Mode>(forcedMode ?? 'compare');
  const [held, setHeld] = useState(false); // phone: press and hold
  const win = useRef({ x: window0?.x ?? 0.5, y: window0?.y ?? 0.46 });
  const fieldRef = useRef<HTMLDivElement>(null);
  const reduced = useMemo(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches, []);

  /** one writer for the depth field */
  const apply = useCallback(() => {
    const a = A.current;
    const v = pos.current.v;
    for (let k = 0; k < N; k++) {
      const el = planeRefs.current[k];
      if (!el) continue;
      const d = k - v;
      if (Math.abs(d) > SHOWN) { el.style.visibility = 'hidden'; continue; }
      const s = place(d, a);
      const w = a.fieldW;
      el.style.visibility = 'visible';
      el.style.width = `${w}px`;
      el.style.transform = `translate3d(${s.x - w / 2}px, ${s.y - (w * 1.25) / 2}px, 0) scale(${s.scale})`;
      el.style.opacity = String(s.opacity);
      el.style.filter = s.blur > 0.05 ? `blur(${s.blur.toFixed(2)}px)` : 'none';
      el.style.zIndex = String(s.z);
      el.style.setProperty('--fog', String(s.fog));
      el.style.setProperty('--mask', String(s.mask));
      el.style.pointerEvents = Math.abs(d) < 0.25 ? 'auto' : 'none';
    }
    const k = clamp(Math.round(v), 0, N - 1);
    setActive((prev) => (prev === k ? prev : k));
    onPos?.(v);
  }, [onPos]);

  useEffect(() => {
    const onResize = () => { A.current = axis(window.innerWidth, window.innerHeight); apply(); };
    onResize();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [apply]);

  /** scroll walks the depth axis: pinned, scrubbed, with a dwell at each dock */
  useEffect(() => {
    if (still !== null || !sectionRef.current) return;
    const st = ScrollTrigger.create({
      trigger: sectionRef.current,
      start: 'top top',
      end: () => `+=${N * (PER / 100) * window.innerHeight}`,
      pin: true,
      anticipatePin: 1,
      invalidateOnRefresh: true,
      onUpdate: (self) => {
        const raw = self.progress * N; // 0 … N
        const i = Math.floor(raw);
        pos.current.v = clamp(i + plateau(raw - i), 0, N - 1);
        apply();
      },
    });
    return () => { st.kill(); };
  }, [apply, still]);

  /** secondary exploration: click a plane or a name to walk to that case */
  const goTo = useCallback((k: number) => {
    const st = ScrollTrigger.getAll().find((t) => t.pin === sectionRef.current);
    if (!st) return;
    // the dock of case k sits at the start of its dwell band
    const y = st.start + ((st.end - st.start) * (k + DWELL * 0.5)) / N;
    window.scrollTo({ top: y, behavior: reduced ? 'instant' : 'smooth' });
  }, [reduced]);

  /* ---- the reveal window ------------------------------------------------ */
  const setWindow = useCallback((clientX: number, clientY: number) => {
    const f = fieldRef.current;
    if (!f) return;
    const r = f.getBoundingClientRect();
    win.current = { x: clamp((clientX - r.left) / r.width, 0, 1), y: clamp((clientY - r.top) / r.height, 0, 1) };
    f.style.setProperty('--wx', String(win.current.x));
    f.style.setProperty('--wy', String(win.current.y));
  }, []);
  useEffect(() => {
    const f = fieldRef.current;
    if (!f) return;
    f.style.setProperty('--wx', String(win.current.x));
    f.style.setProperty('--wy', String(win.current.y));
  }, [active, mode]);

  const onFieldMove = (e: React.PointerEvent) => {
    if (mode !== 'compare' || A.current.phone) return;
    setWindow(e.clientX, e.clientY);
  };
  const onFieldDown = (e: React.PointerEvent) => {
    if (!A.current.phone) return;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    setHeld(true);
  };
  const onFieldUp = () => setHeld(false);

  const c = cases[active]!;
  // full-frame «до»: explicit mode, or a phone hold
  const full = mode === 'before' || (held && mode === 'compare');
  const windowed = mode === 'compare' && !full;

  return (
    <section
      ref={sectionRef}
      className="cases"
      id="cases"
      aria-labelledby="cases-title"
      data-grid={grid || undefined}
      data-mode={full ? 'before' : mode}
    >
      <h2 id="cases-title" className="sr-only">Кейсы — до и после</h2>
      <p className="cases__label" aria-hidden="true"><span>04 — Кейсы · до&nbsp;/&nbsp;после</span><span>{subIndex('04', active + 1)} / {String(N).padStart(2, '0')}</span></p>

      {/* the depth axis — planes only, no frames; the deep ones dissolve into the ground */}
      <div className="depth">
        {cases.map((rec, k) => {
          const isActive = k === active;
          const phone = A.current.phone;
          const plate = PLATES[rec.id]!;
          const after = phone ? plate.afterPhone : plate.after;
          const before = phone ? plate.beforePhone : plate.before;
          return (
            <article
              key={rec.id}
              ref={(el) => { planeRefs.current[k] = el; }}
              className="plane"
              aria-hidden={!isActive}
              inert={!isActive}
              data-active={isActive || undefined}
              onClick={() => { if (!isActive) goTo(k); }}
            >
              <div
                ref={isActive ? fieldRef : undefined}
                className="field"
                onPointerMove={isActive ? onFieldMove : undefined}
                onPointerDown={isActive ? onFieldDown : undefined}
                onPointerUp={isActive ? onFieldUp : undefined}
                onPointerCancel={isActive ? onFieldUp : undefined}
                onPointerLeave={isActive ? onFieldUp : undefined}
              >
                <img className="field__plate" src={after} alt={rec.afterLabel} draggable={false} />
                <div className="field__before" data-full={full || undefined} data-windowed={windowed || undefined}>
                  <img className="field__plate" src={before} alt={rec.beforeLabel} draggable={false} />
                </div>
                {windowed && isActive && <div className="field__rim" aria-hidden="true" />}
                {grid && <div className="field__grid" aria-hidden="true" />}
                <p className="field__stamp">{CASE_STATUS_LABEL[rec.status]}</p>
                <p className="field__state" aria-hidden="true">{full ? 'до' : windowed ? 'после · окно: до' : 'после'}</p>
              </div>
            </article>
          );
        })}
      </div>

      <div className="cases__scrim" aria-hidden="true" />

      {/* everything readable is DOM, docked and still */}
      <div className="dossier">
        <p className="dossier__no">{subIndex('04', active + 1)} <span>/ {String(N).padStart(2, '0')}</span></p>
        <h3 className="dossier__title">{c.title}</h3>
        <p className="dossier__service">{serviceName(c.categoryId)}</p>
        <dl className="dossier__meta">
          <div style={{ display: 'contents' }}><dt>Результат</dt><dd>{c.resultAfter}</dd></div>
          {c.course && <div style={{ display: 'contents' }}><dt>Курс</dt><dd>{c.course}</dd></div>}
          <div style={{ display: 'contents' }}><dt>Врач</dt><dd>{specialistName(c.specialistId)}</dd></div>
          <div style={{ display: 'contents' }}><dt>Съёмка</dt><dd>идентичный кадр, свет и расстояние</dd></div>
        </dl>
        <p className="dossier__note">{c.commentary}</p>
        <p className="dossier__honesty">{CASE_STATUS_LABEL[c.status]} — не реальный пациент; на запуске заменяется съёмкой с письменного согласия.</p>
        <div className="dossier__controls" role="group" aria-label="Показать до или после">
          {(['before', 'compare', 'after'] as const).map((m) => (
            <button key={m} type="button" className="dossier__btn" aria-pressed={mode === m} onClick={() => setMode(m)}>
              {m === 'before' ? 'До' : m === 'after' ? 'После' : 'Сравнить'}
            </button>
          ))}
        </div>
        <div className="dossier__cta">
          <a className="dossier__primary" href="#inquiry">Записаться</a>
          <a className="dossier__link" href="#services">К направлению →</a>
        </div>
      </div>

      <p className="cases__hint" aria-hidden="true">
        {A.current.phone ? 'листайте — кейсы приближаются · удерживайте снимок, чтобы увидеть «до»' : 'листайте — кейсы приближаются · ведите курсор по снимку, чтобы увидеть «до»'}
      </p>
      <p className="sr-only" aria-live="polite">Кейс {active + 1} из {N} — {c.title}. Показано: {full ? 'до' : 'после'}.</p>
    </section>
  );
}

export function CasesSpike() {
  const { c, p, grid, hud, mode, wx, wy } = useMemo(readParams, []);
  const [position, setPosition] = useState(c);
  return (
    <>
      {p === null && (
        <>
          <header className="stub stub--bar" aria-label="Заглушка шапки"><span className="stub__mark">эра</span><span className="stub__cta">Записаться</span></header>
          <section className="stub stub--before" aria-label="Заглушка предыдущей секции"><p>03 — Стоимость · [заглушка соседней секции — прокрутка страницы не перехватывается]</p></section>
        </>
      )}
      <CasesArchive
        start={c}
        still={p}
        grid={grid}
        mode={mode}
        window0={wx !== null && wy !== null ? { x: wx, y: wy } : null}
        onPos={setPosition}
      />
      {p === null && <section className="stub stub--after" aria-label="Заглушка следующей секции"><p>05 — Специалисты · [заглушка соседней секции]</p></section>}
      {hud && <div className="hud" aria-hidden="true">cases · pos {position.toFixed(3)} · кейс {Math.round(position) + 1}/{N}</div>}
    </>
  );
}
