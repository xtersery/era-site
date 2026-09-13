import gsap from 'gsap';
import { CustomEase } from 'gsap/CustomEase';
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
import { clamp, RibbonScene, type CasePlate, type RibbonState } from './scene/RibbonScene';

/**
 * Cases — the archive on a rail (Spike C, pass 5).
 *
 * BROWSE: the cases hang on a vertical rail as curved editorial sheets; page
 * scroll walks the rail, the ribbon drifts, one case is always nearest.
 * CHOOSE: click or tap a sheet — it leaves the rail, comes forward and unrolls
 * flat while the archive dims behind it.
 * READ: the editorial block appears beside the sheet (number, title, category,
 * promise, commentary, metadata, honesty label, CTA) with «До · Сравнить ·
 * После» on the sheet itself.
 * RETURN: «Назад в архив», Esc, or a click on the ground — the sheet re-wraps
 * onto the rail and the archive comes back.
 *
 * `?c=0..3&p=0..1` freezes a browse still · `?focus=0..3&u=0..1` freezes the
 * unfold · `?mode=before|after|compare` · `?hud=1`.
 */
gsap.registerPlugin(CustomEase, ScrollTrigger);
const MINERAL = CustomEase.create('mineral', 'M0,0 C0.52,0 0.18,1 1,1');

const PER = 95; // vh of scroll per case while browsing
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
  const u = q.get('u');
  const f = q.get('focus');
  const mode = q.get('mode');
  return {
    c: clamp(Number(q.get('c') ?? 0), 0, N - 1),
    p: p === null ? null : clamp(Number(p), 0, 1),
    focus: f === null ? null : clamp(Number(f), 0, N - 1),
    u: u === null ? null : clamp(Number(u), 0, 1),
    mode: (mode === 'before' || mode === 'after' || mode === 'compare' ? mode : null) as Mode | null,
    hud: q.get('hud') === '1',
    fx: q.get('fx') === null ? null : Number(q.get('fx')),
    fy: q.get('fy') === null ? null : Number(q.get('fy')),
  };
}

const serviceName = (id: string) => services.find((s) => s.id === id)?.name ?? '';
const specialistName = (id: string) => specialists.find((s) => s.id === id)?.name ?? '[Имя Фамилия]';

export function CasesArchive({
  start = 0,
  still = null,
  focus0 = null,
  unfold0 = null,
  mode: forcedMode = null,
  field0 = null,
  onState,
}: {
  start?: number;
  still?: number | null;
  focus0?: number | null;
  unfold0?: number | null;
  mode?: Mode | null;
  field0?: { x: number; y: number } | null;
  onState?: (s: { pos: number; focus: number | null; unfold: number }) => void;
}) {
  const sectionRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const phone = useMemo(() => window.innerWidth < 1024, []);
  const reduced = useMemo(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches, []);
  const frozen = still !== null || unfold0 !== null;

  const state = useRef<RibbonState>({
    pos: still ?? start,
    focus: focus0,
    unfold: unfold0 ?? 0,
    reveal: forcedMode === 'before' ? 1 : 0,
    field: { x: field0?.x ?? 0.5, y: field0?.y ?? 0.46, amount: field0 ? 1 : 0 },
    hover: null,
    focusBox: null,
  });
  const [focus, setFocus] = useState<number | null>(focus0);
  const [open, setOpen] = useState((unfold0 ?? 0) > 0.6);
  const [mode, setMode] = useState<Mode>(forcedMode ?? 'compare');
  const [box, setBox] = useState<RibbonState['focusBox']>(null);
  const [near, setNear] = useState(start);
  const modeRef = useRef<Mode>(mode);
  const unfoldTween = useRef<gsap.core.Tween | null>(null);
  useEffect(() => { modeRef.current = mode; }, [mode]);

  /** browsing: page scroll walks the rail (paused while a case is open) */
  useEffect(() => {
    if (frozen || !sectionRef.current) return;
    const st = ScrollTrigger.create({
      trigger: sectionRef.current,
      start: 'top top',
      end: () => `+=${N * (PER / 100) * window.innerHeight}`,
      pin: true,
      anticipatePin: 1,
      invalidateOnRefresh: true,
      onUpdate: (self) => {
        if (state.current.unfold > 0.02) return; // reading a case: the rail holds still
        const pos = clamp(self.progress * (N - 1) + 0.0001, 0, N - 1);
        state.current.pos = pos;
        const k = clamp(Math.round(pos), 0, N - 1);
        setNear((prev) => (prev === k ? prev : k));
        onState?.({ pos, focus: state.current.focus, unfold: state.current.unfold });
      },
    });
    return () => { st.kill(); };
  }, [frozen, onState]);

  /** the DOM follows the sheet's screen box while a case is open */
  useEffect(() => {
    let raf = 0;
    const tick = () => {
      const b = state.current.focusBox;
      setBox((prev) => {
        if (!b || !prev) return b;
        return Math.abs(b.x - prev.x) < 1 && Math.abs(b.y - prev.y) < 1 && Math.abs(b.w - prev.w) < 1 ? prev : b;
      });
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const openCase = useCallback((k: number) => {
    state.current.focus = k;
    setFocus(k);
    unfoldTween.current?.kill();
    if (reduced) {
      state.current.unfold = 1;
      setOpen(true);
      return;
    }
    unfoldTween.current = gsap.to(state.current, {
      unfold: 1,
      duration: 1.25,
      ease: MINERAL,
      onUpdate: () => onState?.({ pos: state.current.pos, focus: k, unfold: state.current.unfold }),
      onComplete: () => setOpen(true),
    });
    setOpen(false);
  }, [onState, reduced]);

  const closeCase = useCallback(() => {
    setOpen(false);
    unfoldTween.current?.kill();
    const done = () => { state.current.focus = null; setFocus(null); setBox(null); };
    if (reduced) { state.current.unfold = 0; done(); return; }
    unfoldTween.current = gsap.to(state.current, {
      unfold: 0,
      duration: 1.05,
      ease: MINERAL,
      onUpdate: () => onState?.({ pos: state.current.pos, focus: state.current.focus, unfold: state.current.unfold }),
      onComplete: done,
    });
  }, [onState, reduced]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && state.current.focus !== null) closeCase();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [closeCase]);

  /** the pointer looks into the earlier state of the open case */
  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (phone || modeRef.current !== 'compare' || state.current.unfold < 0.9) return;
    const b = state.current.focusBox;
    if (!b) return;
    state.current.field = {
      x: clamp((e.clientX - b.x) / b.w, 0, 1),
      y: clamp((e.clientY - b.y) / b.h, 0, 1),
      amount: 1,
    };
  }, [phone]);
  const onPointerLeave = useCallback(() => { state.current.field.amount = 0; }, []);
  const hold = useCallback((on: boolean) => {
    if (!phone || modeRef.current !== 'compare') return;
    state.current.reveal = on ? 1 : 0;
  }, [phone]);

  const setModeAndState = (m: Mode) => {
    setMode(m);
    modeRef.current = m;
    state.current.reveal = m === 'before' ? 1 : 0;
    if (m !== 'compare') state.current.field.amount = 0;
  };

  const active = focus ?? near;
  const c = cases[active]!;
  const isOpen = focus !== null;

  return (
    <section ref={sectionRef} className="ribbon" id="cases" aria-labelledby="cases-title" data-open={isOpen || undefined}>
      <h2 id="cases-title" className="sr-only">Кейсы — до и после</h2>

      <div
        ref={stageRef}
        className="ribbon__stage"
        onPointerMove={onPointerMove}
        onPointerLeave={onPointerLeave}
        onPointerDown={() => hold(true)}
        onPointerUp={() => hold(false)}
        onPointerCancel={() => hold(false)}
      >
        <RibbonScene plates={PLATES} state={state} phone={phone} onPick={openCase} dpr={phone ? [1, 2] : [1, 1.6]} />
      </div>

      <p className="ribbon__label" aria-hidden="true">
        <span>04 — Кейсы · до&nbsp;/&nbsp;после</span>
        <span>{subIndex('04', active + 1)} / {String(N).padStart(2, '0')}</span>
      </p>

      {/* browsing: the archive's own index, and the invitation to open a case */}
      <div className="browse" hidden={isOpen}>
        <p className="browse__kicker">Архив результатов</p>
        <h3 className="browse__title">{cases[near]!.title}</h3>
        <p className="browse__service">{serviceName(cases[near]!.categoryId)} · {cases[near]!.resultAfter}</p>
        <button type="button" className="browse__open" onClick={() => openCase(near)}>
          Открыть кейс
        </button>
        <p className="browse__hint">листайте — архив идёт вдоль рейки · нажмите на кейс, чтобы открыть</p>
      </div>

      <nav className="rail" aria-label="Кейсы" hidden={isOpen}>
        <ol role="list">
          {cases.map((rec, k) => (
            <li key={rec.id}>
              <button type="button" aria-current={k === near ? 'true' : undefined} onClick={() => openCase(k)}>
                <span>{subIndex('04', k + 1)}</span>
              </button>
            </li>
          ))}
        </ol>
      </nav>

      {/* the open case: everything readable is DOM, set beside the sheet */}
      <div className="sheetinfo" data-visible={open || undefined} aria-hidden={!isOpen}>
        <button type="button" className="sheetinfo__back" onClick={closeCase}>← Назад в архив</button>
        <p className="sheetinfo__no">{subIndex('04', active + 1)} <span>/ {String(N).padStart(2, '0')}</span></p>
        <h3 className="sheetinfo__title">{c.title}</h3>
        <p className="sheetinfo__service">{serviceName(c.categoryId)}</p>
        <p className="sheetinfo__promise">Результат {c.resultAfter}{c.course ? ` · ${c.course}` : ''}</p>
        <dl className="sheetinfo__meta">
          <div style={{ display: 'contents' }}><dt>Врач</dt><dd>{specialistName(c.specialistId)}</dd></div>
          <div style={{ display: 'contents' }}><dt>Съёмка</dt><dd>идентичный кадр, свет и расстояние</dd></div>
          <div style={{ display: 'contents' }}><dt>Кадр «до»</dt><dd>{c.beforeLabel}</dd></div>
        </dl>
        <p className="sheetinfo__note">{c.commentary}</p>
        <p className="sheetinfo__honesty">{CASE_STATUS_LABEL[c.status]} — не реальный пациент; на запуске заменяется съёмкой с письменного согласия.</p>
        <div className="sheetinfo__controls" role="group" aria-label="Показать до или после">
          {(['before', 'compare', 'after'] as const).map((m) => (
            <button key={m} type="button" className="sheetinfo__btn" aria-pressed={mode === m} onClick={() => setModeAndState(m)}>
              {m === 'before' ? 'До' : m === 'after' ? 'После' : 'Сравнить'}
            </button>
          ))}
        </div>
        <div className="sheetinfo__cta">
          <a className="sheetinfo__primary" href="#inquiry">Записаться</a>
          <a className="sheetinfo__link" href="#services">К направлению →</a>
        </div>
        <p className="sheetinfo__hint">{phone ? 'удерживайте снимок — кадр «до»' : 'ведите курсор по снимку — кадр «до»'}</p>
      </div>

      <p className="sr-only" aria-live="polite">
        {isOpen ? `Открыт кейс ${active + 1} из ${N} — ${c.title}` : `Архив: кейс ${near + 1} из ${N}`}
      </p>
    </section>
  );
}

export function GallerySpike() {
  const { c, p, focus, u, mode, hud, fx, fy } = useMemo(readParams, []);
  const [s, setS] = useState({ pos: c, focus, unfold: u ?? 0 });
  const frozen = p !== null || u !== null;
  return (
    <>
      {!frozen && (
        <>
          <header className="stub stub--bar" aria-label="Заглушка шапки"><span className="stub__mark">эра</span><span className="stub__cta">Записаться</span></header>
          <section className="stub stub--before" aria-label="Заглушка предыдущей секции"><p>03 — Стоимость · [заглушка соседней секции — прокрутка страницы не перехватывается]</p></section>
        </>
      )}
      <CasesArchive
        start={c}
        still={p !== null ? p * (N - 1) : null}
        focus0={focus}
        unfold0={u}
        mode={mode}
        field0={fx !== null && fy !== null ? { x: fx, y: fy } : null}
        onState={setS}
      />
      {!frozen && <section className="stub stub--after" aria-label="Заглушка следующей секции"><p>05 — Специалисты · [заглушка соседней секции]</p></section>}
      {hud && <div className="hud" aria-hidden="true">ribbon · pos {s.pos.toFixed(2)} · focus {s.focus ?? '—'} · unfold {s.unfold.toFixed(2)}</div>}
    </>
  );
}
