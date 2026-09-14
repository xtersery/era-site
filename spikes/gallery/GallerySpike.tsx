import gsap from 'gsap';
import { CustomEase } from 'gsap/CustomEase';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { CASE_STATUS_LABEL } from '@/data/cases';
import { services } from '@/data/services';
import { specialists } from '@/data/specialists';
import { subIndex } from '@/lib/utils';

import { cases8 as cases, plates8 as PLATES } from './cases8';
import { clamp, RibbonScene, type RibbonState, type SheetBox } from './scene/RibbonScene';

/**
 * Cases — the archive on a rail (Spike C, pass 7: experience refinement).
 *
 * BROWSE: the cases hang on a rail as curved editorial sheets; page scroll
 * walks the rail, the ribbon drifts, one case is always nearest and carries a
 * gold edge and its own label. Every sheet in view is a DOM grip: hover lifts
 * it off the rail, focus does the same, a click takes it out.
 * CHOOSE: the chosen sheet leaves the rail, comes forward and unrolls flat
 * while the archive recedes behind it — still there, still an archive.
 * READ: the editorial block appears beside the sheet (number, title, category,
 * promise, commentary, metadata, honesty label, CTA) with «До · Сравнить ·
 * После» on the sheet itself.
 * RETURN: «Назад в архив», Esc, or scrolling the section away — the sheet
 * re-wraps onto the rail and the archive comes back.
 *
 * `?c=0..7&p=0..1` freezes a browse still · `?focus=0..7&u=0..1` freezes the
 * unfold · `?mode=before|after|compare` · `?hover=k` · `?hud=1`.
 */
gsap.registerPlugin(CustomEase, ScrollTrigger);
const MINERAL = CustomEase.create('mineral', 'M0,0 C0.52,0 0.18,1 1,1');

const PER = 80; // vh of scroll per case while browsing
const N = cases.length;

type Mode = 'compare' | 'before' | 'after';

function readParams() {
  const q = new URLSearchParams(location.search);
  const p = q.get('p');
  const u = q.get('u');
  const f = q.get('focus');
  const h = q.get('hover');
  const mode = q.get('mode');
  return {
    c: clamp(Number(q.get('c') ?? 0), 0, N - 1),
    p: p === null ? null : clamp(Number(p), 0, 1),
    focus: f === null ? null : clamp(Number(f), 0, N - 1),
    u: u === null ? null : clamp(Number(u), 0, 1),
    hover: h === null ? null : clamp(Number(h), 0, N - 1),
    mode: (mode === 'before' || mode === 'after' || mode === 'compare' ? mode : null) as Mode | null,
    hud: q.get('hud') === '1',
    fx: q.get('fx') === null ? null : Number(q.get('fx')),
    fy: q.get('fy') === null ? null : Number(q.get('fy')),
  };
}

const serviceName = (id: string) => services.find((s) => s.id === id)?.name ?? '';
const specialistName = (id: string) => specialists.find((s) => s.id === id)?.name ?? '[Имя Фамилия]';
const no = (k: number) => subIndex('04', k + 1);

/** the DOM grips: one transparent button per sheet, kept on the sheet's screen box every frame */
function SheetGrips({
  state,
  near,
  hidden,
  onPick,
}: {
  state: React.MutableRefObject<RibbonState>;
  near: number;
  hidden: boolean;
  onPick: (k: number) => void;
}) {
  const grips = useRef<(HTMLButtonElement | null)[]>([]);
  useEffect(() => {
    let raf = 0;
    const place = (el: HTMLButtonElement, b: SheetBox | null) => {
      if (!b || b.w < 8) { el.hidden = true; return; }
      el.hidden = false;
      el.style.transform = `translate(${b.x.toFixed(1)}px, ${b.y.toFixed(1)}px)`;
      el.style.width = `${b.w.toFixed(1)}px`;
      el.style.height = `${b.h.toFixed(1)}px`;
    };
    const tick = () => {
      const boxes = state.current.boxes;
      grips.current.forEach((el, k) => { if (el) place(el, boxes[k] ?? null); });
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [state]);

  return (
    <div className="grips" data-hidden={hidden || undefined}>
      {cases.map((rec, k) => (
        <button
          key={rec.id}
          ref={(el) => { grips.current[k] = el; }}
          type="button"
          className="grip"
          data-near={k === near || undefined}
          aria-label={`Открыть кейс ${no(k)} — ${rec.title}`}
          tabIndex={hidden ? -1 : 0}
          onPointerEnter={() => { state.current.hover = k; }}
          onPointerLeave={() => { if (state.current.hover === k) state.current.hover = null; }}
          onFocus={() => { state.current.hover = k; }}
          onBlur={() => { if (state.current.hover === k) state.current.hover = null; }}
          onClick={() => onPick(k)}
        >
          {/* the sheet's own label — the wall label of a specimen — says what it is and what it does */}
          <span className="grip__tag" aria-hidden="true">
            <span>{no(k)}</span>
            <span className="grip__verb">открыть →</span>
          </span>
        </button>
      ))}
    </div>
  );
}

export function CasesArchive({
  start = 0,
  still = null,
  focus0 = null,
  unfold0 = null,
  hover0 = null,
  mode: forcedMode = null,
  field0 = null,
  onState,
}: {
  start?: number;
  still?: number | null;
  focus0?: number | null;
  unfold0?: number | null;
  hover0?: number | null;
  mode?: Mode | null;
  field0?: { x: number; y: number } | null;
  onState?: (s: { pos: number; focus: number | null; unfold: number }) => void;
}) {
  const sectionRef = useRef<HTMLElement>(null);
  const phone = useMemo(() => window.innerWidth < 1024, []);
  const reduced = useMemo(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches, []);
  const frozen = still !== null || unfold0 !== null;

  const state = useRef<RibbonState>({
    pos: still ?? start,
    focus: focus0,
    unfold: unfold0 ?? 0,
    reveal: forcedMode === 'before' ? 1 : 0,
    field: { x: field0?.x ?? 0.5, y: field0?.y ?? 0.46, amount: field0 ? 1 : 0 },
    hover: hover0,
    focusBox: null,
    boxes: [],
  });
  const trigger = useRef<ScrollTrigger | null>(null);
  // dev probe: the live state, for the continuity measurement
  useEffect(() => { (window as unknown as Record<string, unknown>)['__ribbon'] = state.current; }, []);
  const [focus, setFocus] = useState<number | null>(focus0);
  const [open, setOpen] = useState((unfold0 ?? 0) > 0.6);
  const [mode, setMode] = useState<Mode>(forcedMode ?? 'compare');
  const [box, setBox] = useState<RibbonState['focusBox']>(null);
  const [near, setNear] = useState(Math.round(still ?? start));
  const modeRef = useRef<Mode>(mode);
  const unfoldTween = useRef<gsap.core.Tween | null>(null);
  const posTween = useRef<gsap.core.Tween | null>(null);
  useEffect(() => { modeRef.current = mode; }, [mode]);

  const closeRef = useRef<() => void>(() => {});
  /** where the page stood when the case was opened — the archive comes back to exactly this */
  const openedAt = useRef<number | null>(null);

  /** browsing: page scroll walks the rail (the rail holds still while a case is open) */
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
        if (state.current.unfold > 0.02 || posTween.current?.isActive()) return;
        const pos = clamp(self.progress * (N - 1) + 0.0001, 0, N - 1);
        state.current.pos = pos;
        const k = clamp(Math.round(pos), 0, N - 1);
        setNear((prev) => (prev === k ? prev : k));
        onState?.({ pos, focus: state.current.focus, unfold: state.current.unfold });
      },
      // scrolling the section away while a case is open puts the case back
      onLeave: () => { if (state.current.focus !== null) closeRef.current(); },
      onLeaveBack: () => { if (state.current.focus !== null) closeRef.current(); },
    });
    trigger.current = st;
    return () => { st.kill(); trigger.current = null; };
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
    state.current.hover = null;
    openedAt.current = window.scrollY;
    setFocus(k);
    unfoldTween.current?.kill();
    if (reduced) {
      state.current.unfold = 1;
      setOpen(true);
      onState?.({ pos: state.current.pos, focus: k, unfold: 1 });
      return;
    }
    let shown = false;
    unfoldTween.current = gsap.to(state.current, {
      unfold: 1,
      duration: 1.3,
      ease: MINERAL,
      onUpdate: () => {
        onState?.({ pos: state.current.pos, focus: k, unfold: state.current.unfold });
        // the words arrive while the sheet is still settling, not after it
        if (!shown && state.current.unfold > 0.72) { shown = true; setOpen(true); }
      },
    });
    setOpen(false);
  }, [onState, reduced]);

  const closeCase = useCallback(() => {
    setOpen(false);
    unfoldTween.current?.kill();
    // if the page was scrolled while the case was open, put it back where it was
    // opened — the section is pinned, so nothing visible moves, and the archive
    // reappears at the position the visitor left it
    const st = trigger.current;
    const at = openedAt.current;
    openedAt.current = null;
    if (st && at !== null && at >= st.start && at <= st.end && Math.abs(window.scrollY - at) > 1) {
      window.scrollTo({ top: at, behavior: 'instant' as ScrollBehavior });
    }
    const done = () => {
      state.current.focus = null;
      setFocus(null);
      setBox(null);
      onState?.({ pos: state.current.pos, focus: null, unfold: 0 });
      // if the page was scrolled while the case was open, the rail catches up
      // smoothly instead of jumping on the next scroll event
      const st = trigger.current;
      if (st) {
        const target = clamp(st.progress * (N - 1) + 0.0001, 0, N - 1);
        if (Math.abs(target - state.current.pos) > 0.01) {
          if (reduced) { state.current.pos = target; setNear(Math.round(target)); return; }
          posTween.current = gsap.to(state.current, {
            pos: target,
            duration: 0.7,
            ease: MINERAL,
            onUpdate: () => {
              setNear((prev) => { const k = Math.round(state.current.pos); return prev === k ? prev : k; });
              onState?.({ pos: state.current.pos, focus: null, unfold: 0 });
            },
          });
        }
      }
    };
    if (reduced) { state.current.unfold = 0; done(); onState?.({ pos: state.current.pos, focus: null, unfold: 0 }); return; }
    unfoldTween.current = gsap.to(state.current, {
      unfold: 0,
      duration: 1.1,
      ease: MINERAL,
      onUpdate: () => onState?.({ pos: state.current.pos, focus: state.current.focus, unfold: state.current.unfold }),
      onComplete: done,
    });
  }, [onState, reduced]);
  useEffect(() => { closeRef.current = closeCase; }, [closeCase]);

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
        className="ribbon__stage"
        onPointerMove={onPointerMove}
        onPointerLeave={onPointerLeave}
        onPointerDown={() => hold(true)}
        onPointerUp={() => hold(false)}
        onPointerCancel={() => hold(false)}
      >
        <RibbonScene plates={PLATES} state={state} phone={phone} reduced={reduced} dpr={phone ? [1, 2] : [1, 1.6]} />
      </div>

      <div className="ribbon__scrim" aria-hidden="true" />

      <p className="ribbon__label" aria-hidden="true">
        <span>04 — Кейсы · до&nbsp;/&nbsp;после</span>
        <span className="ribbon__count">{no(active)} / {String(N).padStart(2, '0')}</span>
      </p>

      {/* browsing: what the visitor has arrived at, and the keyboard way in */}
      <div className="browse" data-hidden={isOpen || undefined} aria-hidden={isOpen}>
        <p className="browse__kicker">Архив результатов · {String(N).padStart(2, '0')} кейсов</p>
        <h3 className="browse__title">{cases[near]!.title}</h3>
        <p className="browse__service">{serviceName(cases[near]!.categoryId)} · {cases[near]!.resultAfter}</p>
        <button type="button" className="browse__open" tabIndex={isOpen ? -1 : 0} onClick={() => openCase(near)}>
          Открыть кейс {no(near)} →
        </button>
      </div>
      <p className="browse__hint" data-hidden={isOpen || undefined} aria-hidden="true">листайте — архив идёт вдоль рейки</p>

      <SheetGrips state={state} near={near} hidden={isOpen} onPick={openCase} />

      <nav className="rail" aria-label="Кейсы" data-hidden={isOpen || undefined} aria-hidden={isOpen}>
        <ol role="list">
          {cases.map((rec, k) => (
            <li key={rec.id}>
              <button type="button" aria-current={k === near ? 'true' : undefined} tabIndex={isOpen ? -1 : 0} onClick={() => openCase(k)}>
                <span>{no(k)}</span>
              </button>
            </li>
          ))}
        </ol>
      </nav>

      {/* the open case: everything readable is DOM, set beside the sheet */}
      <div className="sheetinfo" data-visible={open || undefined} aria-hidden={!isOpen}>
        <button type="button" className="sheetinfo__back" tabIndex={isOpen ? 0 : -1} onClick={closeCase}>← Назад в архив</button>
        <p className="sheetinfo__no">{no(active)} <span>/ {String(N).padStart(2, '0')}</span></p>
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
            <button key={m} type="button" className="sheetinfo__btn" aria-pressed={mode === m} tabIndex={isOpen ? 0 : -1} onClick={() => setModeAndState(m)}>
              {m === 'before' ? 'До' : m === 'after' ? 'После' : 'Сравнить'}
            </button>
          ))}
        </div>
        <div className="sheetinfo__cta">
          <a className="sheetinfo__primary" href="#inquiry" tabIndex={isOpen ? 0 : -1}>Записаться</a>
          <a className="sheetinfo__link" href="#services" tabIndex={isOpen ? 0 : -1}>К направлению →</a>
        </div>
        <p className="sheetinfo__hint">{phone ? 'удерживайте снимок — кадр «до»' : 'ведите курсор по снимку — кадр «до»'}</p>
      </div>
      {/* the primary way out: a close at the open sheet's top-right corner */}
      {box && (
        <button
          type="button"
          className="sheetclose"
          data-visible={open || undefined}
          aria-label="Закрыть кейс"
          tabIndex={isOpen ? 0 : -1}
          onClick={closeCase}
          style={{ transform: phone ? `translate(${box.x + box.w - 44}px, ${box.y - 52}px)` : `translate(${box.x + box.w + 20}px, ${box.y - 4}px)` }}
        >
          <span aria-hidden="true">×</span>
        </button>
      )}
      {/* the open sheet's own wall label, at its lower edge */}
      {box && (
        <p className="sheettag" data-visible={open || undefined} aria-hidden="true" style={{ transform: `translate(${box.x}px, ${box.y + box.h}px)` }}>
          <span>{no(active)}</span>
          <span>{mode === 'before' ? 'до' : mode === 'after' ? 'после' : 'после · курсор — до'}</span>
        </p>
      )}

      <p className="sr-only" aria-live="polite">
        {isOpen ? `Открыт кейс ${active + 1} из ${N} — ${c.title}` : `Архив: кейс ${near + 1} из ${N}`}
      </p>
    </section>
  );
}

export function GallerySpike() {
  const { c, p, focus, u, hover, mode, hud, fx, fy } = useMemo(readParams, []);
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
        hover0={hover}
        mode={mode}
        field0={fx !== null && fy !== null ? { x: fx, y: fy } : null}
        onState={setS}
      />
      {!frozen && <section className="stub stub--after" aria-label="Заглушка следующей секции"><p>05 — Специалисты · [заглушка соседней секции]</p></section>}
      {hud && <div className="hud" aria-hidden="true">ribbon · pos {s.pos.toFixed(2)} · focus {s.focus ?? '—'} · unfold {s.unfold.toFixed(2)}</div>}
    </>
  );
}
