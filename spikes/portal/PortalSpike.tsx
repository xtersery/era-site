import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { CASE_STATUS_LABEL, cases } from '@/data/cases';
import { services } from '@/data/services';
import { specialists } from '@/data/specialists';
import { subIndex } from '@/lib/utils';

import c1a from '../cases/assets/case-1-after.jpg';
import c1b from '../cases/assets/case-1-before.jpg';
import c2a from '../cases/assets/case-2-after.jpg';
import c2b from '../cases/assets/case-2-before.jpg';
import c3a from '../cases/assets/case-3-after.jpg';
import c3b from '../cases/assets/case-3-before.jpg';
import c4a from '../cases/assets/case-4-after.jpg';
import c4b from '../cases/assets/case-4-before.jpg';
import { clamp, PortalScene, smooth, WALK, type CasePlate, type SceneState } from './scene/PortalScene';

/**
 * Cases — the passage (Spike C, pass 3).
 *
 * The visitor walks an axis of monumental mineral-glass thresholds. Each one
 * holds a result. Scroll is the walk: APPROACH → CROSS → RELEASE → ARRIVE, and
 * on arrival the threshold shows the state the visitor came from and lets it
 * resolve into the result. The whole scene is WebGL; every word is DOM, set
 * beside the object like a museum label, never on top of it.
 *
 * `?c=0..3&p=0..1` freezes a still · `?mode=before|after|compare` · `?grid=1`
 * lays an alignment grid over the plate · `?hud=1` shows the readout.
 */
gsap.registerPlugin(ScrollTrigger);

const PER = 110; // vh of scroll per threshold
const DWELL = 0.52; // share of a threshold's interval spent standing at it
const PLATES: readonly CasePlate[] = [
  { after: c1a, before: c1b },
  { after: c2a, before: c2b },
  { after: c3a, before: c3b },
  { after: c4a, before: c4b },
];
const N = cases.length;

type Mode = 'compare' | 'before' | 'after';

function readParams() {
  const q = new URLSearchParams(location.search);
  const p = q.get('p');
  const mode = q.get('mode');
  return {
    c: clamp(Number(q.get('c') ?? 0), 0, N - 1),
    p: p === null ? null : clamp(Number(p), 0, 1),
    mode: (mode === 'before' || mode === 'after' || mode === 'compare' ? mode : null) as Mode | null,
    grid: q.get('grid') === '1',
    hud: q.get('hud') === '1',
    fx: q.get('fx') === null ? null : Number(q.get('fx')),
    fy: q.get('fy') === null ? null : Number(q.get('fy')),
    only: q.get('only') ?? undefined,
  };
}

const serviceName = (id: string) => services.find((s) => s.id === id)?.name ?? '';
const specialistName = (id: string) => specialists.find((s) => s.id === id)?.name ?? '[Имя Фамилия]';

/** the walk: standing still at a threshold, then crossing to the next */
const walk = (frac: number) => smooth((frac - DWELL) / (1 - DWELL));
/** on arrival the visitor sees where the case came from; it resolves into the result */
const arrivalReveal = (frac: number) => 1 - smooth((frac - 0.06) / 0.44);

export function CasesPassage({
  start = 0,
  still = null,
  mode: forcedMode = null,
  grid = false,
  field0 = null,
  only,
  onPos,
}: {
  start?: number;
  still?: number | null;
  mode?: Mode | null;
  grid?: boolean;
  field0?: { x: number; y: number } | null;
  only?: string | undefined;
  onPos?: (pos: number) => void;
}) {
  const sectionRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const [mode, setMode] = useState<Mode>(forcedMode ?? 'compare');
  const [active, setActive] = useState(start);
  const [held, setHeld] = useState(false);
  const reduced = useMemo(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches, []);
  const phone = useMemo(() => window.innerWidth < 1024, []);

  const state = useRef<SceneState>({
    pos: still === null ? start : start + walk(still),
    reveal: still === null ? 0 : forcedMode === 'before' ? 1 : forcedMode === 'after' ? 0 : arrivalReveal(still),
    field: { x: field0?.x ?? 0.5, y: field0?.y ?? 0.46, amount: field0 ? 1 : 0 },
  });
  const modeRef = useRef<Mode>(mode);
  const heldRef = useRef(false);
  useEffect(() => { modeRef.current = mode; }, [mode]);
  useEffect(() => { heldRef.current = held; }, [held]);

  /** scroll walks the passage; the reveal is part of arriving */
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
        const raw = self.progress * N;
        const i = Math.floor(raw);
        const frac = raw - i;
        const pos = clamp(i + walk(frac), 0, N - 1);
        state.current.pos = pos;
        const m = modeRef.current;
        state.current.reveal =
          m === 'before' || heldRef.current ? 1 : m === 'after' ? 0 : arrivalReveal(frac);
        const k = clamp(Math.round(pos), 0, N - 1);
        setActive((prev) => (prev === k ? prev : k));
        onPos?.(pos);
      },
    });
    return () => { st.kill(); };
  }, [still, onPos]);

  /** the pointer looks deeper into the threshold — desktop only, never required */
  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (phone || modeRef.current !== 'compare') return;
    const r = stageRef.current?.getBoundingClientRect();
    if (!r) return;
    // the plate occupies the middle of the stage; map the pointer into plate space
    const x = clamp((e.clientX - r.left) / r.width, 0, 1);
    const y = clamp((e.clientY - r.top) / r.height, 0, 1);
    state.current.field = { x: (x - 0.5) * 1.9 + 0.5, y: (y - 0.5) * 1.5 + 0.5, amount: 1 };
  }, [phone]);
  const onPointerLeave = useCallback(() => { state.current.field.amount = 0; }, []);

  /** phone: press and hold looks back at «до» */
  const onDown = useCallback(() => { if (phone) { setHeld(true); state.current.reveal = 1; } }, [phone]);
  const onUp = useCallback(() => { if (phone) { setHeld(false); } }, [phone]);

  const setModeAndState = (m: Mode) => {
    setMode(m);
    modeRef.current = m;
    if (m === 'before') state.current.reveal = 1;
    if (m === 'after') state.current.reveal = 0;
  };

  /** secondary exploration: walk to a threshold */
  const goTo = useCallback((k: number) => {
    const st = ScrollTrigger.getAll().find((t) => t.pin === sectionRef.current);
    if (!st) return;
    window.scrollTo({ top: st.start + ((st.end - st.start) * (k + DWELL * 0.45)) / N, behavior: reduced ? 'instant' : 'smooth' });
  }, [reduced]);

  const c = cases[active]!;
  return (
    <section ref={sectionRef} className="passage" id="cases" aria-labelledby="cases-title">
      <h2 id="cases-title" className="sr-only">Кейсы — до и после</h2>

      <div
        ref={stageRef}
        className="passage__stage"
        onPointerMove={onPointerMove}
        onPointerLeave={onPointerLeave}
        onPointerDown={onDown}
        onPointerUp={onUp}
        onPointerCancel={onUp}
      >
        <PortalScene plates={PLATES} state={state} tier={phone ? 'mid' : 'high'} dpr={phone ? [1, 2] : [1, 1.6]} only={only} walk={phone ? WALK.phone : WALK.desktop} />
        {grid && <div className="passage__grid" aria-hidden="true" />}
      </div>

      {/* the room's own labels, at the margins */}
      <p className="passage__label" aria-hidden="true">
        <span>04 — Кейсы · до&nbsp;/&nbsp;после</span>
        <span>{subIndex('04', active + 1)} / {String(N).padStart(2, '0')}</span>
      </p>

      {/* the museum label: beside the object, never over it */}
      <div className="wall">
        <p className="wall__no">{subIndex('04', active + 1)} <span>/ {String(N).padStart(2, '0')}</span></p>
        <h3 className="wall__title">{c.title}</h3>
        <p className="wall__service">{serviceName(c.categoryId)}</p>
        <dl className="wall__meta">
          <div style={{ display: 'contents' }}><dt>Результат</dt><dd>{c.resultAfter}</dd></div>
          {c.course && <div style={{ display: 'contents' }}><dt>Курс</dt><dd>{c.course}</dd></div>}
          <div style={{ display: 'contents' }}><dt>Врач</dt><dd>{specialistName(c.specialistId)}</dd></div>
          <div style={{ display: 'contents' }}><dt>Съёмка</dt><dd>идентичный кадр, свет и расстояние</dd></div>
        </dl>
        <p className="wall__note">{c.commentary}</p>
        <p className="wall__honesty">{CASE_STATUS_LABEL[c.status]} — не реальный пациент; на запуске заменяется съёмкой с письменного согласия.</p>
        <div className="wall__controls" role="group" aria-label="Показать до или после">
          {(['before', 'compare', 'after'] as const).map((m) => (
            <button key={m} type="button" className="wall__btn" aria-pressed={mode === m} onClick={() => setModeAndState(m)}>
              {m === 'before' ? 'До' : m === 'after' ? 'После' : 'Сравнить'}
            </button>
          ))}
        </div>
        <div className="wall__cta">
          <a className="wall__primary" href="#inquiry">Записаться</a>
          <a className="wall__link" href="#services">К направлению →</a>
        </div>
      </div>

      <nav className="ladder" aria-label="Кейсы">
        <ol role="list">
          {cases.map((rec, k) => (
            <li key={rec.id}>
              <button type="button" aria-current={k === active ? 'true' : undefined} onClick={() => goTo(k)}>
                <span>{subIndex('04', k + 1)}</span>
              </button>
            </li>
          ))}
        </ol>
      </nav>

      <p className="passage__hint" aria-hidden="true">
        {phone ? 'листайте — вы проходите сквозь пороги · удерживайте, чтобы увидеть «до»' : 'листайте — вы проходите сквозь пороги · курсор смотрит глубже в порог'}
      </p>
      <p className="sr-only" aria-live="polite">Кейс {active + 1} из {N} — {c.title}.</p>
    </section>
  );
}

export function PortalSpike() {
  const { c, p, mode, grid, hud, fx, fy, only } = useMemo(readParams, []);
  const [pos, setPos] = useState(c);
  return (
    <>
      {p === null && (
        <>
          <header className="stub stub--bar" aria-label="Заглушка шапки"><span className="stub__mark">эра</span><span className="stub__cta">Записаться</span></header>
          <section className="stub stub--before" aria-label="Заглушка предыдущей секции"><p>03 — Стоимость · [заглушка соседней секции — прокрутка страницы не перехватывается]</p></section>
        </>
      )}
      <CasesPassage
        start={c}
        still={p}
        mode={mode}
        grid={grid}
        field0={fx !== null && fy !== null ? { x: fx, y: fy } : null}
        only={only}
        onPos={setPos}
      />
      {p === null && <section className="stub stub--after" aria-label="Заглушка следующей секции"><p>05 — Специалисты · [заглушка соседней секции]</p></section>}
      {hud && <div className="hud" aria-hidden="true">passage · pos {pos.toFixed(3)} · порог {Math.round(pos) + 1}/{N}</div>}
    </>
  );
}
