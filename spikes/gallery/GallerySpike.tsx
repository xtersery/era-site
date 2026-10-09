import gsap from 'gsap';
import { CustomEase } from 'gsap/CustomEase';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { CompareSlider } from '@/components/ui';
import { useNearViewport } from '@/hooks';
import { CASE_STATUS_LABEL } from '@/data/cases';
import { services } from '@/data/services';
import { specialists } from '@/data/specialists';
import { subIndex } from '@/lib/utils';
import type { CaseMedia } from '@/types';
import { debugQuery, debugTools } from '@/lib/env';
import { SceneBoundary } from '@/three/components/SceneBoundary';
import { hasWebGL } from '@/three/utils/webgl';

import { casesReal as cases } from './casesReal';
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
 * promise, commentary, metadata, honesty label, CTA). A «до / после» pair
 * carries one vertical divider on the sheet itself — dragged, or set by «До ·
 * Сравнить · После»; a single photograph is simply the photograph.
 * RETURN: «Назад в архив», Esc, or scrolling the section away — the sheet
 * re-wraps onto the rail and the archive comes back.
 *
 * `?c=0..N-1&p=0..1` freezes a browse still · `?focus=0..N-1&u=0..1` freezes
 * the unfold · `?mode=before|after|compare` · `?hover=k` · `?hud=1`.
 */
gsap.registerPlugin(CustomEase, ScrollTrigger);
const MINERAL = CustomEase.create('mineral', 'M0,0 C0.52,0 0.18,1 1,1');

const PER = 80; // vh of scroll per case while browsing
const N = cases.length;

/** every record in the archive carries its photograph(s) — the plates the scene draws, in rail order */
const MEDIA: readonly CaseMedia[] = cases.map((c) => {
  if (!c.media) throw new Error(`case ${c.id} has no media`);
  return c.media;
});
const paired = (k: number) => MEDIA[k]!.type === 'beforeAfter';

type Mode = 'compare' | 'before' | 'after';
/** where the divider stands for each of the three named positions */
const SPLIT_OF: Readonly<Record<Mode, number>> = { before: 1, compare: 0.5, after: 0 };
const modeOf = (split: number): Mode => (split > 0.985 ? 'before' : split < 0.015 ? 'after' : 'compare');

function readParams() {
  const q = debugQuery();
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
    split: q.get('split') === null ? null : clamp(Number(q.get('split')), 0, 1),
  };
}

// a record not yet mapped to a service or a doctor says so — a bracket, never a guess
const serviceName = (id: string) => services.find((s) => s.id === id)?.name ?? '[направление уточняется]';
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
    // written only when something changed: the loop runs while the archive is
    // screens away, and a same-value attribute write still dirties style
    const place = (el: HTMLButtonElement, b: SheetBox | null) => {
      if (!b || b.w < 8) { if (!el.hidden) el.hidden = true; return; }
      if (el.hidden) el.hidden = false;
      const transform = `translate(${b.x.toFixed(1)}px, ${b.y.toFixed(1)}px)`;
      if (el.style.transform !== transform) el.style.transform = transform;
      const w = `${b.w.toFixed(1)}px`;
      if (el.style.width !== w) el.style.width = w;
      const h = `${b.h.toFixed(1)}px`;
      if (el.style.height !== h) el.style.height = h;
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
            {paired(k) && <span className="grip__pair">до / после</span>}
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
  split0 = null,
  onState,
  calm,
  frameloop,
}: {
  start?: number;
  still?: number | null;
  focus0?: number | null;
  unfold0?: number | null;
  hover0?: number | null;
  mode?: Mode | null;
  split0?: number | null;
  onState?: (s: { pos: number; focus: number | null; unfold: number }) => void;
  /**
   * Opt-in, for a composing page: a number it writes (0 … 1) that compresses
   * the archive's depth while the section is leaving — see `RibbonScene`'s
   * `calm`. Unset, the archive is exactly what Spike C approved.
   */
  calm?: React.RefObject<number>;
  /**
   * Opt-in, for a composing page: the scene's frame loop — `demand` while the
   * section is far off screen so it draws nothing, `always` otherwise. Unset,
   * the archive renders as it always has.
   */
  frameloop?: 'always' | 'demand';
}) {
  const sectionRef = useRef<HTMLElement>(null);
  const phone = useMemo(() => window.innerWidth < 1024, []);
  const reduced = useMemo(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches, []);
  const frozen = still !== null || unfold0 !== null;
  // on a phone the archive's context is not created until the section is near (desktop: at once, as before)
  const sceneNear = useNearViewport(sectionRef, { enabled: phone });

  const state = useRef<RibbonState>({
    pos: still ?? start,
    focus: focus0,
    unfold: unfold0 ?? 0,
    split: split0 ?? SPLIT_OF[forcedMode ?? 'compare'],
    hover: hover0,
    focusBox: null,
    boxes: [],
  });
  const trigger = useRef<ScrollTrigger | null>(null);
  // dev probe: the live state, for the continuity measurement; the media, for the asset test
  useEffect(() => {
    if (!debugTools) return;
    const w = window as unknown as Record<string, unknown>;
    w['__ribbon'] = state.current;
    w['__media'] = MEDIA;
  }, []);

  const [focus, setFocus] = useState<number | null>(focus0);
  const [open, setOpen] = useState((unfold0 ?? 0) > 0.6);
  const [split, setSplitState] = useState(state.current.split);
  const [box, setBox] = useState<RibbonState['focusBox']>(null);
  const [near, setNear] = useState(Math.round(still ?? start));
  const unfoldTween = useRef<gsap.core.Tween | null>(null);
  const posTween = useRef<gsap.core.Tween | null>(null);
  const splitTween = useRef<gsap.core.Tween | null>(null);

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
    // every pair opens with the divider in the middle
    splitTween.current?.kill();
    if (forcedMode === null && split0 === null) { state.current.split = 0.5; setSplitState(0.5); }
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
  }, [forcedMode, onState, reduced, split0]);

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

  /** the divider follows the hand directly; the three named positions are reached with a short travel */
  const setSplit = useCallback((v: number, source: 'pointer' | 'keyboard' | 'button') => {
    splitTween.current?.kill();
    const target = clamp(v, 0, 1);
    if (source !== 'button' || reduced) {
      state.current.split = target;
      setSplitState(target);
      return;
    }
    splitTween.current = gsap.to(state.current, {
      split: target,
      duration: 0.5,
      ease: MINERAL,
      onUpdate: () => setSplitState(state.current.split),
    });
  }, [reduced]);

  const active = focus ?? near;
  const c = cases[active]!;
  const isOpen = focus !== null;
  const media = MEDIA[active]!;
  const isPair = media.type === 'beforeAfter';
  const mode = modeOf(split);

  return (
    <section ref={sectionRef} className="ribbon" id="cases" aria-labelledby="cases-title" data-open={isOpen || undefined}>
      <h2 id="cases-title" className="sr-only">Кейсы — до и после</h2>

      <div className="ribbon__stage">
        {sceneNear && hasWebGL() && (
          <SceneBoundary>
            <RibbonScene media={MEDIA} state={state} phone={phone} reduced={reduced} dpr={phone ? [1, 2] : [1, 1.6]} calm={calm} {...(frameloop ? { frameloop } : {})} />
          </SceneBoundary>
        )}
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
        <p className="browse__service">{serviceName(cases[near]!.categoryId)} · {cases[near]!.resultAfter}{paired(near) ? ' · до / после' : ''}</p>
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
          {/* what is claimed about the shooting is only what is known: the stand-ins were one frame; the clinic's photographs are described, not vouched for */}
          <div style={{ display: 'contents' }}><dt>Съёмка</dt><dd>{c.status === 'visualisation' ? 'идентичный кадр, свет и расстояние' : '[условия съёмки — уточняются]'}</dd></div>
          {isPair ? (
            <>
              <div style={{ display: 'contents' }}><dt>Кадр «до»</dt><dd>{c.beforeLabel}</dd></div>
              <div style={{ display: 'contents' }}><dt>Кадр «после»</dt><dd>{c.afterLabel}</dd></div>
            </>
          ) : (
            <div style={{ display: 'contents' }}><dt>Снимок</dt><dd>{c.beforeLabel}</dd></div>
          )}
        </dl>
        <p className="sheetinfo__note">{c.commentary}</p>
        <p className="sheetinfo__honesty">
          {CASE_STATUS_LABEL[c.status]}
          {c.status === 'visualisation' && ' — не реальный пациент; на запуске заменяется съёмкой с письменного согласия.'}
        </p>
        {/* the three named positions of the divider — a pair only; a single photograph has no states to show */}
        {isPair && (
          <div className="sheetinfo__controls" role="group" aria-label="Показать до или после">
            {(['before', 'compare', 'after'] as const).map((m) => (
              <button key={m} type="button" className="sheetinfo__btn" aria-pressed={mode === m} tabIndex={isOpen ? 0 : -1} onClick={() => setSplit(SPLIT_OF[m], 'button')}>
                {m === 'before' ? 'До' : m === 'after' ? 'После' : 'Сравнить'}
              </button>
            ))}
          </div>
        )}
        <div className="sheetinfo__cta">
          <a className="sheetinfo__primary" href="#inquiry" tabIndex={isOpen ? 0 : -1}>Записаться</a>
          <a className="sheetinfo__link" href="#services" tabIndex={isOpen ? 0 : -1}>К направлению →</a>
        </div>
        {isPair && <p className="sheetinfo__hint">{phone ? 'ведите линию пальцем — слева «до», справа «после»' : 'ведите линию по снимку — слева «до», справа «после»'}</p>}
      </div>
      {/* the divider, laid exactly on the open sheet: the scene cuts the two states at the same split */}
      {box && isPair && (
        <div
          className="sheetcompare"
          data-visible={open || undefined}
          style={{ transform: `translate(${box.x}px, ${box.y}px)`, width: `${box.w}px`, height: `${box.h}px` }}
        >
          <CompareSlider
            value={split}
            onChange={setSplit}
            ariaLabel={`Сравнение до и после — кейс ${no(active)}`}
          />
        </div>
      )}
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
          <span>{!isPair ? 'снимок клиники' : mode === 'before' ? 'до' : mode === 'after' ? 'после' : 'до · после'}</span>
        </p>
      )}

      <p className="sr-only" aria-live="polite">
        {isOpen ? `Открыт кейс ${active + 1} из ${N} — ${c.title}` : `Архив: кейс ${near + 1} из ${N}`}
      </p>
    </section>
  );
}

export function GallerySpike() {
  const { c, p, focus, u, hover, mode, hud, split } = useMemo(readParams, []);
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
        split0={split}
        onState={setS}
      />
      {!frozen && <section className="stub stub--after" aria-label="Заглушка следующей секции"><p>05 — Специалисты · [заглушка соседней секции]</p></section>}
      {hud && <div className="hud" aria-hidden="true">ribbon · pos {s.pos.toFixed(2)} · focus {s.focus ?? '—'} · unfold {s.unfold.toFixed(2)}</div>}
    </>
  );
}
