import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useCallback, useContext, useEffect, useId, useMemo, useRef, useState, type ReactNode } from 'react';

import { registerGsap } from '@/animations/gsap/register';
import { trackEvent, type PricingSource } from '@/lib/analytics';
import { ScrollContext, ScrollProvider } from '@/animations/scroll';
import { NAV_SECTION_IDS, SECTION_LABELS, sectionAnchor, sectionIndex, type SectionId } from '@/lib/constants/sections';
import { InquiryProvider } from '@/lib/inquiry';
import { initTier } from '@/lib/stage';
import { debugQuery, debugTools } from '@/lib/env';

import { Place } from '../contact/Place';
import { Founder } from '../founder/Founder';
import { Corridor, Talk } from '../inquiry/Talk';
import { CasesArchive } from '../gallery/GallerySpike';
import { Sitting } from '../portraits/PortraitsSpike';
import { ServicesRadial } from '../radial/RadialSpike';
import { Reviews } from '../reviews/Reviews';
import { SpikePricing } from './Pricing';

/**
 * Услуги → Кейсы — the storytelling flow, and where Стоимость goes.
 *
 * Two questions, one page:
 *
 * 1. INFORMATION ARCHITECTURE. Стоимость is utility, кейсы are the story, so
 *    the vertical document runs Манифест → Услуги → Кейсы → Специалисты and
 *    never passes through the price list. Стоимость is reached deliberately —
 *    from the top navigation, or from the state's own «Стоимость →» — as a
 *    layer over the page (`PricingLayer`). It is not a section in the scroll
 *    and it is not hidden inside one. Leaving the layer («← Назад к сайту»,
 *    Esc, Back, or one of its own links out) returns to the page exactly where
 *    it was left: the page under the layer never moves.
 *
 * 2. THE HANDOVER. Услуги ends and Кейсы begins with no seam and no scene
 *    between them. Both approved sections are composed here UNCHANGED — this
 *    file imports `ServicesRadial` and `CasesArchive` and adds nothing to
 *    either. The whole transition is:
 *
 *      · the two pins are strictly sequential. Услуги pins for 6 × 85 vh and
 *        releases; the section then scrolls away over exactly one viewport;
 *        Кейсы pins only when its own top reaches the top of the screen. The
 *        100 vh between the two pins is ordinary document scroll owned by
 *        nobody, and that is the transition. No pin, no snap, no lock, no
 *        capture — one scrubbed timeline reads the position and paints.
 *      · THE BLEND, across that whole 100 vh. Услуги is bone and Кейсы is
 *        mineral dark; instead of one section covering the other, the page's
 *        atmosphere changes. Two page-owned layers share one interpolated
 *        SEAM TONE (bone → the ribbon's edge colour, eased in over ~0.05–0.82
 *        of the window): above the meeting line, an atmosphere inside Услуги
 *        (`.radial__exit`) rises from its empty lower margin — graphite first,
 *        then forest — reaching 18 → 72 % of the section and lagging the
 *        content by a few vh (depth); below the line, a veil at the top of
 *        Кейсы (`.flow-veil`) carries the same tone down into the archive's
 *        own ground and dissolves as the tone arrives, so the label and the
 *        rail emerge from the atmosphere at ~0.55–0.8 rather than entering as
 *        the edge of a dark block. The line where the two sections meet is
 *        the same colour on both sides at every position. Both layers are
 *        invisible at rest: while Услуги is pinned the tone is bone on bone,
 *        and when Кейсы pins the veil has gone.
 *
 *    Nothing animates on the Кейсы side and nothing in Услуги is faded: the
 *    content of both leaves and arrives by ordinary scrolling.
 *
 * SCROLLER. The page is mounted in the project's `ScrollProvider`: Lenis on the
 * live tiers (`lenis.raf` on `gsap.ticker`, `ScrollTrigger.update()` on every
 * Lenis scroll event, one instance), the native scroller under reduced motion.
 * The spike adds no RAF loop and no second smooth-scroll wrapper.
 *
 * 3. КЕЙСЫ → СПЕЦИАЛИСТЫ — results, then the person behind them. The same
 *    structure: the Кейсы pin releases, the section scrolls out over its own
 *    100 vh, Специалисты pins only when its top reaches the top. Across that
 *    window one scrubbed timeline (a) interpolates a second seam tone from
 *    the archive's dark foot to the light wall, painted on a veil at the foot
 *    of Кейсы and a veil over the head of Специалисты, so the line between
 *    them is one colour and the page lightens as atmosphere rather than as a
 *    light block arriving; and (b) writes one number, `calm`, that the
 *    archive's scene reads: its depth compresses — a narrower lens from
 *    further back so the docked case keeps its size while everything behind
 *    it foreshortens less, the eye lower, the breath still, the far sheets
 *    deeper in the fog, the rail dimmed. The archive loses dominance without
 *    being faded, scaled, blurred or morphed; the first portrait surfaces out
 *    of the same atmosphere from ~0.55 and takes the frame as the veil goes.
 *    Depth compression is full on desktop, halved on the tablet, absent on
 *    the phone and under reduced motion (where the tone still follows scroll).
 *
 * 4. СПЕЦИАЛИСТЫ → ОСНОВАТЕЛЬ — not a window between pins but one passage
 *    inside the Специалисты pin (Spike D pass 18–19): the water's light
 *    settles into the hero's onyx over the pin's last 130 vh, and over the
 *    110 vh after that the founder's room (`spikes/founder/`), which stands
 *    under the last frame and pins itself for those same 110 vh, opens on the
 *    wall while Специалисты lets go of it. One soft finish carries the
 *    visitor from the last specialist to the opened room.
 *
 * 5. ОСНОВАТЕЛЬ → ОТЗЫВЫ — ordinary scroll, as Услуги → Кейсы. When the two
 *    pins release, Основатель is a plain section leaving over its own 100 vh
 *    and Отзывы (`spikes/reviews/`) is simply the next thing in the document.
 *    Across that window one scrubbed timeline writes one number, `--f-k`,
 *    that a page-owned veil at the foot of Основатель is painted from: the
 *    deep forest rising from below into the marble's foot — the marble, then
 *    its shadow, then the forest — on within the first frames of the release
 *    and reaching from 12 to 72 svh up the leaving section as it goes, while
 *    the head of Отзывы is already the shadow's shade settling into the
 *    ground over its first 60 vh. No pin, no fade of the founder's words; the
 *    veil is nothing while the room is pinned.
 *
 * 6. ОТЗЫВЫ → АДРЕС — ordinary scroll, and the simplest of the passages:
 *    neither section is pinned, so no timeline is needed. The head of Адрес
 *    (`spikes/contact/`) is itself the atmosphere — 64 svh of the forest
 *    becoming graphite, a warm greige and then the bone the place stands on
 *    — painted in the document, position-linked by nature, the same under
 *    reduced motion. At the meeting line it is the forest of Отзывы, so no
 *    edge exists; the environment lightens as the visitor scrolls into the
 *    place.
 *
 * 7. АДРЕС → ЗАЯВКА — the public place becoming a private conversation, by
 *    the light going. Заявка is black; across the 100 vh in which its top
 *    crosses the viewport one scrubbed timeline writes three numbers: the
 *    sides of the viewport calming by a few per cent (`Corridor`, a fixed
 *    multiply layer, a long falloff — never a vignette) from 0.15; the
 *    ambient light leaving the whole of Адрес (`.flow-veil--place-dim`, a
 *    warm greige in multiply — the paper goes greige, ink stays ink) over
 *    0.06–0.82; and one DUSK tone (dimmed bone → black over 0.05–0.9)
 *    painted on both sides of the meeting line — solid at the foot of Адрес
 *    and fading 10 → 58 svh up the leaving room (`.flow-veil--place`), and
 *    at the head of Заявка, whose hush runs dusk → black over half a
 *    viewport — so the line is one tone at every position and the page
 *    darkens as a whole. Адрес is untouched and readable throughout. The room's own parts arrive as they enter
 *    (`spikes/inquiry/`). No pin, no snap, nothing moved.
 *
 * Numbering stays architectural (`SECTION_IDS`): the rooms read 02 → 04 → 05
 * → 06 → 07 on the page because 03 is still a room, just not one on the
 * vertical path.
 *
 * `?exit=0` turns the blend off — the control, the same page with the hard
 * cut. `?hud=1` shows the readout. `?drive=` / `?d=` pass through to Услуги.
 * `#pricing` deep-links the layer.
 */
registerGsap();
gsap.registerPlugin(ScrollTrigger);
// The visual tier decides the scroller (Lenis on high/mid, native otherwise).
initTier();
// dev probe for the proof script
if (debugTools) (window as unknown as Record<string, unknown>)['__ST'] = ScrollTrigger;

/**
 * The Кейсы ground where the two sections meet — `gallery.css` `.ribbon`'s
 * radial ground sampled along its own top edge (≈ #0b1712 on desktop, where
 * the ellipse's middle stop reaches the edge; the outer stop #050d0a on the
 * phone). The seam tone lands on this so the meeting line has no step.
 */
const CASES_EDGE = { desktop: '#0b1712', phone: '#050d0a' };

/**
 * The blend, as fractions of the 100 vh window between the two pins.
 *   tone   — the seam tone goes bone → Кейсы edge; eased in (quadratic), so
 *            0.2–0.45 is a barely-there deepening and 0.45–0.7 is clearly
 *            the next room.
 *   reach  — how far up Услуги the atmosphere reaches (share of its height):
 *            from under the CTA to most of the leaving section.
 *   veil   — when the veil over the top of Кейсы finally goes (its tone has
 *            already matched the ground by then; this guarantees nothing is
 *            left when Кейсы pins).
 *   shift  — the atmosphere lags the leaving content by this much (svh).
 */
const BLEND = {
  tone: { from: 0.05, to: 0.82 },
  reach: { from: 0.1, to: 0.9, min: 18, max: 72 },
  veil: { from: 0.84, to: 0.98 },
  shift: 6,
};

/**
 * The Кейсы ground along its own bottom edge (the ribbon's radial ground on
 * desktop; the phone's dark foot gradient), and the Специалисты wall — the
 * two ends of the second seam tone.
 */
const CASES_FOOT = { desktop: '#0c1713', phone: '#050e0b' };
const WALL = '#e9ebe6';

/**
 * The third blend — Основатель → Отзывы, as fractions of its 100 vh window:
 * the forest veil at the foot of Основатель is on within the first frames of
 * the release (so the meeting line is one tone from the start) and REACHES
 * further up the leaving marble as it goes — a shadow rising, then the
 * forest; the head of Отзывы needs nothing — it is the shadow's own shade.
 */
const BLEND3 = {
  on: { from: 0, to: 0.06 }, // the veil is on within the first frames of the release, still short
  reach: { from: 0.06, to: 0.85, min: 12, max: 72 }, // how far up the leaving marble the forest reaches (svh)
};

/**
 * The second blend — Кейсы → Специалисты, as fractions of its 100 vh window.
 *   tone  — the seam tone goes archive foot → wall, eased in as before.
 *   foot  — the veil at the foot of Кейсы is off while the section is pinned
 *           (it would sit over the last case) and on within the first frames
 *           of the exit, while its tone is still the archive's own.
 *   calm  — how far the archive's depth is compressed by when; amplitude by
 *           layout: full on desktop, half on the tablet, none on the phone.
 *   head  — when the veil over the head of Специалисты lifts: it shrinks from
 *           below (its edge band stays on the line until Кейсы has gone) and
 *           is nothing when the section pins.
 */
const BLEND2 = {
  tone: { from: 0.05, to: 0.82 },
  foot: { from: 0, to: 0.06 },
  calm: { from: 0.02, to: 0.7 },
  head: { from: 0.84, to: 1 },
};
/**
 * The corridor — Адрес → Заявка, as fractions of the 100 vh window in which
 * Заявка's top crosses the viewport. The first 15 % leave Адрес exactly as
 * it is; the sides of the viewport calm over the next 70 vh (`walls`); and
 * the dark of the last room rises into the foot of Адрес as it leaves
 * (`shadow`: on within the first frames, so the meeting line is black on
 * both sides from the start; reaching further up the leaving room as it
 * goes — a shadow first, then the black).
 */
const CORRIDOR = {
  walls: { from: 0.15, to: 0.85 }, // 70 vh
  dim: { from: 0.06, to: 0.82 }, // the ambient light leaving the whole of Адрес
  dusk: { from: 0.05, to: 0.9 }, // the one tone at the meeting line, dimmed bone → black
  reach: { from: 0.04, to: 0.92, min: 10, max: 58 }, // how far up the leaving room the dusk reaches (svh)
};
const calmAmplitude = (w: number, reduced: boolean) => (reduced ? 0 : w < 768 ? 0 : w < 1024 ? 0.5 : 1);

function readParams() {
  const q = debugQuery();
  const drive = q.get('drive');
  return {
    exit: q.get('exit') !== '0',
    hud: q.get('hud') === '1',
    drive: (drive === 'drag' || drive === 'scrub' || drive === 'snap' || drive === 'step'
      ? drive
      : 'snap') as 'drag' | 'scrub' | 'snap' | 'step',
    dist: Math.min(140, Math.max(40, Number(q.get('d') ?? 85))),
  };
}

const isPricingHash = () => location.hash === '#pricing';

/** which control opened the price layer — by where it sits, for `pricing_open` */
const pricingSource = (a: Element): PricingSource =>
  a.closest('.hh__index, .flowbar__menu-list')
    ? 'menu'
    : a.closest('.hh')
      ? 'hero'
      : a.closest('.flowbar')
        ? 'header'
        : 'other';

/**
 * The elements a blend paints — its variables are written on these and only
 * these. A scrubbed custom property on `.flowpage` (the page root) would
 * invalidate the style of every element on the page on every scroll frame
 * of every blend; on the consumers it costs a handful of elements.
 */
const consumers = (...selectors: string[]) =>
  selectors.flatMap((sel) => [...document.querySelectorAll<HTMLElement>(sel)]);

/* ------------------------------------------------------------------ nav -- */

/**
 * The top navigation, on the wireframe header's model (fixed, drawn in light
 * and composited with `mix-blend-mode: difference`, mono room index with the
 * architectural numbers). Everything in it is a plain in-page anchor —
 * including Стоимость, which is `href="#pricing"` like the wireframe's own
 * header link. The page's delegated click handler is what turns that one into
 * a layer instead of a scroll, so the link still works for middle-click,
 * copy-link and the keyboard, and the index needs no special case.
 */
function FlowHeader({ home = '#top' }: { home?: string }) {
  const rooms: readonly SectionId[] = ['services', 'cases', 'specialists', 'founder', 'reviews', 'contact', 'inquiry'];
  // the phone's menu (< 1024): «Меню» in place of the CTA — «Стоимость» is already the bar's centre entry
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const listId = useId();
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    const onPointer = (e: PointerEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('pointerdown', onPointer);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('pointerdown', onPointer);
    };
  }, [open]);
  return (
    <header className={open ? 'flowbar is-menu-open' : 'flowbar'}>
      {/* under the open menu: the frosted ground the links read on (the phone only) */}
      <div className={open ? 'menu-scrim flowbar__scrim is-open' : 'menu-scrim flowbar__scrim'} aria-hidden="true" />
      <a className="flowbar__mark" href={home} aria-label="эра — к началу">
        эра
      </a>
      <nav className="flowbar__nav" aria-label="Разделы">
        <ol className="flowbar__index" role="list">
          {rooms.map((id) => (
            <li key={id}>
              <a className="flowbar__link" href={`#${id}`}>
                <span className="flowbar__no">{sectionIndex(id)}</span>
                <span>{SECTION_LABELS[id]}</span>
              </a>
            </li>
          ))}
          <li className="flowbar__utility">
            <a className="flowbar__link" href="#pricing" data-layer="pricing">
              <span className="flowbar__no">{sectionIndex('pricing')}</span>
              <span>{SECTION_LABELS.pricing}</span>
            </a>
          </li>
        </ol>
      </nav>
      {/* the header's CTA opens the price layer (the page's delegated `#pricing` handler) — never a room in the scroll */}
      <a className="flowbar__cta" href="#pricing" data-layer="pricing">
        {SECTION_LABELS.pricing}
      </a>
      <div ref={menuRef} className="flowbar__menu">
        <button
          type="button"
          className="flowbar__menu-button"
          aria-expanded={open}
          aria-controls={listId}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? 'Закрыть' : 'Меню'}
        </button>
        <ul id={listId} className="flowbar__menu-list" role="list" hidden={!open}>
          {NAV_SECTION_IDS.map((id) => (
            <li key={id}>
              <a className="flowbar__menu-link" href={sectionAnchor(id)} onClick={() => setOpen(false)}>
                {SECTION_LABELS[id]}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </header>
  );
}

/* ---------------------------------------------------------- price layer -- */

/**
 * Стоимость as a layer, not a section.
 *
 * The layer is its own scroller over the page; while it is open the document
 * is held by the project's scroller (`setLocked`: Lenis stops and
 * `html.is-scroll-locked` refuses input — the scroll position is kept).
 * Nothing about the page changes: `scrollY` is the same number before, during
 * and after, so the two pinned sections beneath never see an event and need
 * no refresh. Closing returns focus to whatever opened the layer.
 *
 * Links out of the layer (`#cases`, `#inquiry`) close it first and then go
 * where they point, so leaving is always one step.
 */
function PricingLayer({
  open,
  onClose,
  onLeaveTo,
}: {
  open: boolean;
  onClose: () => void;
  onLeaveTo: (hash: string) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const scroll = useContext(ScrollContext);

  useEffect(() => {
    if (!open) return;
    const opener = document.activeElement as HTMLElement | null;
    const root = document.documentElement;
    // the project's scroller owns the lock: Lenis stops, the document is held
    if (scroll?.current) scroll.current.setLocked(true);
    else root.classList.add('is-scroll-locked');
    root.dataset['layer'] = 'pricing';
    ref.current?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      if (scroll?.current) scroll.current.setLocked(false);
      else root.classList.remove('is-scroll-locked');
      delete root.dataset['layer'];
      opener?.focus?.();
    };
  }, [open, onClose, scroll]);

  if (!open) return null;
  return (
    <div
      className="pricelayer"
      ref={ref}
      role="dialog"
      aria-modal="true"
      aria-label="Стоимость"
      tabIndex={-1}
      onClick={(e) => {
        const a = (e.target as HTMLElement).closest<HTMLAnchorElement>('a[href^="#"]');
        if (!a || a.hash === '#pricing') return;
        e.preventDefault();
        onLeaveTo(a.hash);
      }}
    >
      <div className="pricelayer__bar">
        <button type="button" className="pricelayer__back" onClick={onClose}>
          ← Назад к сайту
        </button>
        <p className="pricelayer__where">раздел вне ленты · открыт из меню</p>
      </div>
      {/* the layer's own scroller is outside Lenis's reach (stopped Lenis would otherwise swallow the wheel) */}
      <div className="pricelayer__scroll" data-lenis-prevent="">
        <SpikePricing />
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- page -- */

export function FlowSpike() {
  return (
    <ScrollProvider>
      {/* the project's pre-fill context: the form reads it as the wireframe's does (the spike's CTAs are plain anchors) */}
      <InquiryProvider>
        <FlowPage />
      </InquiryProvider>
    </ScrollProvider>
  );
}

/**
 * The page. `head` is what stands before Кейсы: by default a stub and the
 * approved Услуги; the full page (`spikes/full/`) passes the hero's stage,
 * which takes the same Услуги node into its own frame. `home` is the bar's
 * mark anchor.
 */
export function FlowPage({
  head,
  home,
  onLayer,
}: {
  head?: (services: ReactNode) => ReactNode;
  home?: string;
  /** hears the price layer open and close (the composing page tints the browser's chrome by it) */
  onLayer?: (open: boolean) => void;
} = {}) {
  const { exit, hud, drive, dist } = useMemo(readParams, []);
  const scroll = useContext(ScrollContext);
  const [priceOpen, setPriceOpen] = useState(isPricingHash);
  useEffect(() => {
    onLayer?.(priceOpen);
  }, [priceOpen, onLayer]);
  /**
   * The readout. The rooms report their position on every scroll frame; the
   * numbers live in a ref and become React state ONLY for the `?hud=1`
   * readout — a state write here re-renders the whole page (every room and,
   * through their React trees, every canvas) on every frame of every scroll.
   */
  const readout = useRef({ turn: 0, cases: { pos: 0, focus: null as number | null, unfold: 0 }, sitting: { k: 0, f: 0, e: 0 }, opening: 0, blend: 0, blend2: 0, corridor: 0 });
  const [, setHudTick] = useState(0);
  const report = useCallback(<K extends keyof typeof readout.current>(key: K, value: (typeof readout.current)[K]) => {
    readout.current[key] = value;
    if (hud) setHudTick((n) => n + 1);
  }, [hud]);
  const setTurn = useCallback((v: number) => report('turn', v), [report]);
  const setCases = useCallback((v: { pos: number; focus: number | null; unfold: number }) => report('cases', v), [report]);
  const setSitting = useCallback((v: { k: number; f: number; e: number }) => report('sitting', v), [report]);
  const setOpening = useCallback((v: number) => report('opening', v), [report]);
  const setBlend = useCallback((v: number) => report('blend', v), [report]);
  const setBlend2 = useCallback((v: number) => report('blend2', v), [report]);
  const setCorridor = useCallback((v: number) => report('corridor', v), [report]);
  /** which scenes are near the viewport: the others draw nothing (frameloop `demand`) */
  const [near, setNear] = useState({ cases: true, sitting: true });
  /** the archive's depth compression, written by the second timeline and read by the scene */
  const calm = useRef(0);
  /** whether this page pushed the `#pricing` entry — then Back is the way out */
  const pushed = useRef(false);

  const openPricing = useCallback(() => {
    if (!isPricingHash()) {
      history.pushState(null, '', '#pricing');
      pushed.current = true;
    }
    setPriceOpen(true);
  }, []);
  const closePricing = useCallback(() => {
    if (pushed.current) {
      // pops our own entry; popstate below does the closing
      pushed.current = false;
      history.back();
      return;
    }
    // arrived by deep link: nothing of ours to pop, so just drop the hash
    if (isPricingHash()) history.replaceState(null, '', location.pathname + location.search);
    setPriceOpen(false);
  }, []);
  /** leave the layer for a place on the page — one step, no history residue */
  const pendingHash = useRef<string | null>(null);
  const leaveTo = useCallback(
    (hash: string) => {
      pendingHash.current = hash;
      closePricing();
    },
    [closePricing],
  );
  // The scroll happens once the layer is gone and the scroller is released
  // (a scroll started under the lock would be refused by Lenis and cancelled
  // by the overflow change on the native scroller), through the project's
  // scroller so Lenis and ScrollTrigger stay in step.
  useEffect(() => {
    if (priceOpen || !pendingHash.current) return;
    const target = document.querySelector<HTMLElement>(pendingHash.current);
    pendingHash.current = null;
    if (!target) return;
    if (scroll?.current) scroll.current.scrollTo(target);
    else target.scrollIntoView({ block: 'start' });
  }, [priceOpen, scroll]);

  // The triggers are created while the dev server's stylesheet may still be
  // on its way (the body's default 8 px margin was measured into them once).
  // One refresh when the document is complete and the fonts are in.
  useEffect(() => {
    const done = () => ScrollTrigger.refresh();
    if (document.readyState === 'complete') done();
    else window.addEventListener('load', done, { once: true });
    document.fonts?.ready.then(done);
    return () => window.removeEventListener('load', done);
  }, []);

  // The two always-on scenes (the archive's ribbon, the water) draw nothing
  // while their section is more than a viewport away: their frame loop goes
  // to `demand` there and back to `always` a viewport before they arrive.
  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return;
    const watch = (sel: string, key: 'cases' | 'sitting') => {
      const el = document.querySelector<HTMLElement>(sel);
      if (!el) return () => {};
      const target = el.closest<HTMLElement>('.pin-spacer') ?? el;
      const io = new IntersectionObserver(
        ([e]) => setNear((n) => (n[key] === !!e?.isIntersecting ? n : { ...n, [key]: !!e?.isIntersecting })),
        { rootMargin: '100% 0px 100% 0px' },
      );
      io.observe(target);
      return () => io.disconnect();
    };
    const a = watch('#cases', 'cases');
    const b = watch('#specialists', 'sitting');
    return () => { a(); b(); };
  }, []);

  // The page's height changes after mount without a resize: Отзывы grows when
  // the CMS answers (the featured voice's real text is longer than the sample).
  // Every trigger below it would then be measured short. One refresh per
  // settled height change, on the next frame.
  useEffect(() => {
    const page = document.querySelector<HTMLElement>('.flowpage');
    if (!page || typeof ResizeObserver === 'undefined') return;
    let last = page.getBoundingClientRect().height;
    let raf = 0;
    const ro = new ResizeObserver(() => {
      const h = page.getBoundingClientRect().height;
      if (Math.abs(h - last) < 1) return;
      last = h;
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => ScrollTrigger.refresh());
    });
    ro.observe(page);
    return () => {
      ro.disconnect();
      cancelAnimationFrame(raf);
    };
  }, []);

  // Back / Forward drive the layer — it is one real history entry. The page
  // owns scroll restoration while it is up: the layer never moves the page,
  // so there is nothing for the browser to restore on the way back, and its
  // restore (which lands after popstate) would cancel a link out of the layer.
  // Set through ScrollTrigger, which otherwise re-applies its own record of
  // `history.scrollRestoration` after every refresh.
  useEffect(() => {
    const was = history.scrollRestoration;
    ScrollTrigger.clearScrollMemory('manual');
    const onPop = () => setPriceOpen(isPricingHash());
    window.addEventListener('popstate', onPop);
    return () => {
      window.removeEventListener('popstate', onPop);
      ScrollTrigger.clearScrollMemory(was);
    };
  }, []);

  // Every `#pricing` anchor on the page — the header's index entry and the
  // state's own «Стоимость →» — opens the layer. Plain clicks only; a
  // modified click keeps its browser meaning (new tab with the deep link).
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as HTMLElement).closest<HTMLAnchorElement>('a[href]');
      if (!a || a.hash !== '#pricing' || a.closest('.pricelayer')) return;
      e.preventDefault();
      // a click on an already open layer opens nothing
      if (!isPricingHash()) trackEvent('pricing_open', { source: pricingSource(a) });
      openPricing();
    };
    // capture: before the ScrollProvider's own anchor handler, which would
    // otherwise look for a `#pricing` element in the document
    document.addEventListener('click', onClick, true);
    return () => document.removeEventListener('click', onClick, true);
  }, [openPricing]);

  /**
   * The blend. One scrubbed timeline over the 100 vh between the two pins —
   * from the moment the Услуги pin lets go (the pin-spacer's bottom reaches
   * the viewport bottom; a pinned section's own bottom sits there for the
   * whole pin, so the spacer is the trigger) to the moment Кейсы pins. It
   * writes four custom properties the two layers are painted from; it moves
   * nothing and holds nothing. Scrubbed directly, so it is exactly reversible
   * and position-linked rather than timed — which is also why it is the same
   * under reduced motion: no autonomous tween exists, and the end state is
   * reached by scrolling, never by waiting.
   */
  useEffect(() => {
    if (!exit) return;
    const page = document.querySelector<HTMLElement>('.flowpage');
    const services = document.querySelector<HTMLElement>('#services');
    if (!page || !services) return;
    const phone = () => window.innerWidth < 1024;
    const tone = () => page.style.setProperty('--cases-edge', phone() ? CASES_EDGE.phone : CASES_EDGE.desktop);
    tone();

    // painted on the atmosphere under Услуги and the veil over the top of Кейсы
    const atmosphere = consumers('.flowpage .radial__exit');
    const veil = consumers('.flow-cases > .flow-veil:not([class*="flow-veil--"])');
    const tl = gsap.timeline({ paused: true, defaults: { ease: 'none' } });
    const seg = (r: { from: number; to: number }) => ({ duration: r.to - r.from, at: r.from });
    const t = seg(BLEND.tone);
    tl.fromTo([...atmosphere, ...veil], { '--seam-k': 0 }, { '--seam-k': 1, duration: t.duration, ease: 'power1.in' }, t.at);
    const r = seg(BLEND.reach);
    tl.fromTo(atmosphere, { '--a-reach': `${BLEND.reach.min}%` }, { '--a-reach': `${BLEND.reach.max}%`, duration: r.duration }, r.at);
    tl.fromTo(atmosphere, { '--a-shift': '0svh' }, { '--a-shift': `${BLEND.shift}svh`, duration: 1 }, 0);
    const v = seg(BLEND.veil);
    tl.fromTo(veil, { '--b-opacity': 1 }, { '--b-opacity': 0, duration: v.duration }, v.at);
    tl.to({}, { duration: 1 }, 0); // the timeline is exactly the window

    const spacer = services.closest<HTMLElement>('.pin-spacer') ?? services;
    const st = ScrollTrigger.create({
      trigger: spacer,
      start: 'bottom bottom',
      end: () => `+=${window.innerHeight}`,
      scrub: true,
      animation: tl,
      invalidateOnRefresh: true,
      onRefresh: tone,
      onUpdate: (self) => setBlend(self.progress),
    });
    return () => {
      st.kill();
      tl.kill();
    };
  }, [exit, setBlend]);

  /**
   * The second blend, Кейсы → Специалисты: the same shape on the Кейсы
   * pin-spacer. It writes the second seam tone and the two veils' opacities,
   * and drives `calm` — the only thing the archive's scene reads from the
   * page. Scrubbed, reversible, position-linked; it ends exactly where the
   * Специалисты pin begins, so nothing overlaps that section's own trigger.
   */
  useEffect(() => {
    if (!exit) return;
    const page = document.querySelector<HTMLElement>('.flowpage');
    const casesEl = document.querySelector<HTMLElement>('#cases');
    if (!page || !casesEl) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const phone = () => window.innerWidth < 1024;
    const tone = () => {
      page.style.setProperty('--cases-foot', phone() ? CASES_FOOT.phone : CASES_FOOT.desktop);
      page.style.setProperty('--wall', WALL);
    };
    tone();

    // painted on the veil at the foot of Кейсы and the veil over the head of Специалисты
    const foot = consumers('.flow-veil--foot');
    const head = consumers('.flow-veil--head');
    const tl = gsap.timeline({ paused: true, defaults: { ease: 'none' } });
    const seg = (r: { from: number; to: number }) => ({ duration: r.to - r.from, at: r.from });
    const t = seg(BLEND2.tone);
    tl.fromTo([...foot, ...head], { '--seam2-k': 0 }, { '--seam2-k': 1, duration: t.duration, ease: 'power1.in' }, t.at);
    const f = seg(BLEND2.foot);
    tl.fromTo(foot, { '--c-opacity': 0 }, { '--c-opacity': 1, duration: f.duration }, f.at);
    const c = seg(BLEND2.calm);
    const amp = { value: 0 };
    tl.fromTo(amp, { value: 0 }, {
      value: 1,
      duration: c.duration,
      ease: 'sine.inOut',
      onUpdate: () => { calm.current = amp.value * calmAmplitude(window.innerWidth, reduced); },
    }, c.at);
    const h = seg(BLEND2.head);
    tl.fromTo(head, { '--d-height': '58svh' }, { '--d-height': '0svh', duration: h.duration }, h.at);
    tl.fromTo(head, { '--d-opacity': 1 }, { '--d-opacity': 0, duration: 0.03 }, 0.97);
    tl.to({}, { duration: 1 }, 0);

    const spacer = casesEl.closest<HTMLElement>('.pin-spacer') ?? casesEl;
    const st = ScrollTrigger.create({
      trigger: spacer,
      start: 'bottom bottom',
      end: () => `+=${window.innerHeight}`,
      scrub: true,
      animation: tl,
      invalidateOnRefresh: true,
      onRefresh: tone,
      onUpdate: (self) => setBlend2(self.progress),
    });
    // dev probe for the proof script
    if (debugTools) (window as unknown as Record<string, unknown>)['__flow'] = { calm };
    return () => {
      st.kill();
      tl.kill();
      calm.current = 0;
    };
  }, [exit, setBlend2]);

  /**
   * The third blend, Основатель → Отзывы: the same shape on the founder's
   * pin-spacer (its bottom reaches the viewport bottom the moment both pins
   * release). It writes one number the foot veil is painted from.
   */
  useEffect(() => {
    if (!exit) return;
    const page = document.querySelector<HTMLElement>('.flowpage');
    const founderEl = document.querySelector<HTMLElement>('#founder');
    if (!page || !founderEl) return;
    // painted on the forest veil at the foot of Основатель alone
    const veil = consumers('.flow-veil--founder');
    const tl = gsap.timeline({ paused: true, defaults: { ease: 'none' } });
    tl.fromTo(veil, { '--f-k': 0 }, { '--f-k': 1, duration: BLEND3.on.to - BLEND3.on.from }, BLEND3.on.from);
    tl.fromTo(veil, { '--f-reach': `${BLEND3.reach.min}svh` }, { '--f-reach': `${BLEND3.reach.max}svh`, duration: BLEND3.reach.to - BLEND3.reach.from, ease: 'power1.out' }, BLEND3.reach.from);
    tl.to({}, { duration: 1 }, 0);
    const spacer = founderEl.closest<HTMLElement>('.pin-spacer') ?? founderEl;
    const st = ScrollTrigger.create({
      trigger: spacer,
      start: 'bottom bottom',
      end: () => `+=${window.innerHeight}`,
      scrub: true,
      animation: tl,
      invalidateOnRefresh: true,
    });
    return () => { st.kill(); tl.kill(); };
  }, [exit]);

  /**
   * The corridor, Адрес → Заявка: one scrubbed timeline over the 100 vh in
   * which Заявка's top crosses the viewport (bottom → top). It writes three
   * numbers and nothing else — `--t-k`, the sides of the viewport calming
   * (the page's fixed walls); `--p-k` and `--p-reach`, the black of the last
   * room rising into the foot of Адрес as it leaves (a page-owned veil in
   * the room's wrapper) — no pin, no snap, no element moved. Position-linked,
   * so it is the same under reduced motion and exactly reversible; the walls
   * stay for the room, which is the last thing on the page.
   */
  useEffect(() => {
    if (!exit) return;
    const page = document.querySelector<HTMLElement>('.flowpage');
    const talk = document.querySelector<HTMLElement>('#inquiry');
    if (!page || !talk) return;
    // painted on the walls, the dim and the dusk veil over Адрес, and the head of Заявка (its hush)
    const walls = consumers('.talk-walls');
    const dim = consumers('.flow-veil--place-dim');
    const dusk = consumers('.flow-veil--place', '#inquiry .talk__hush');
    const tl = gsap.timeline({ paused: true, defaults: { ease: 'none' } });
    tl.fromTo(walls, { '--t-k': 0 }, { '--t-k': 1, duration: CORRIDOR.walls.to - CORRIDOR.walls.from, ease: 'power1.in' }, CORRIDOR.walls.from);
    tl.fromTo([...dim, ...dusk], { '--p-dim': 0 }, { '--p-dim': 1, duration: CORRIDOR.dim.to - CORRIDOR.dim.from, ease: 'sine.inOut' }, CORRIDOR.dim.from);
    tl.fromTo(dusk, { '--p-k': 0 }, { '--p-k': 1, duration: CORRIDOR.dusk.to - CORRIDOR.dusk.from, ease: 'sine.inOut' }, CORRIDOR.dusk.from);
    tl.fromTo(consumers('.flow-veil--place'), { '--p-reach': `${CORRIDOR.reach.min}svh` }, { '--p-reach': `${CORRIDOR.reach.max}svh`, duration: CORRIDOR.reach.to - CORRIDOR.reach.from, ease: 'power1.out' }, CORRIDOR.reach.from);
    tl.to({}, { duration: 1 }, 0);
    const st = ScrollTrigger.create({
      trigger: talk,
      start: 'top bottom',
      end: 'top top',
      scrub: true,
      animation: tl,
      invalidateOnRefresh: true,
      onUpdate: (self) => setCorridor(self.progress),
    });
    return () => { st.kill(); tl.kill(); };
  }, [exit, setCorridor]);

  const services = <ServicesRadial drive={drive} dist={dist} exit={exit} onTurn={setTurn} />;

  return (
    <div className="flowpage">
      <FlowHeader {...(home ? { home } : {})} />

      {head ? (
        head(services)
      ) : (
        <>
          <section className="flow-stub" id="top" aria-label="Заглушка предыдущей секции">
            <p>01 — Манифест · [заглушка соседней секции — прокрутка не перехватывается]</p>
          </section>
          {services}
        </>
      )}

      {/*
        Nothing between the two sections. No spacer, no bridge element, no
        transition scene — Кейсы is simply the next thing in the document.
      */}
      <div className="flow-cases">
        <CasesArchive onState={setCases} calm={exit ? calm : undefined} frameloop={near.cases ? 'always' : 'demand'} />
        {/* the page's atmosphere over the top of Кейсы while it arrives — gone by the time it pins */}
        {exit && <div className="flow-veil" aria-hidden="true" />}
        {/* and at its foot while it leaves — off for the whole pin, on from the release */}
        {exit && <div className="flow-veil flow-veil--foot" aria-hidden="true" />}
      </div>

      {/* Специалисты is simply the next thing in the document as well */}
      <div className="flow-sitting">
        <Sitting onState={setSitting} frameloop={near.sitting ? 'always' : 'demand'} />
        {/* the page's atmosphere over the head of Специалисты while it arrives — gone by the time it pins */}
        {exit && <div className="flow-veil flow-veil--head" aria-hidden="true" />}
      </div>

      {/* Основатель stands under the last frame of Специалисты and opens on the wall that passage arrived at */}
      <div className="flow-founder">
        <Founder onState={setOpening} />
        {/* the forest rising into the marble's foot as the room leaves — off for the whole pin, on from the release */}
        {exit && <div className="flow-veil flow-veil--founder" aria-hidden="true" />}
      </div>

      {/* Отзывы is simply the next thing in the document */}
      <Reviews />

      {/*
        Адрес и контакты — and the place is the next thing after the voices.
        Ordinary scroll: the forest becomes daylight over the head of the room
        itself (`spikes/contact/`), painted in the document; the page adds no
        veil, no timeline and no pin between them.
      */}
      <div className="flow-place">
        <Place />
        {/* the light leaving the open room: the dim over the whole of it, the black rising into its foot — nothing until the window opens */}
        {exit && <div className="flow-veil--place-dim" aria-hidden="true" />}
        {exit && <div className="flow-veil flow-veil--place" aria-hidden="true" />}
      </div>

      {/*
        Заявка — the conversation, the last thing on the page, on black.
        Ordinary scroll; the page's walls (a fixed layer, scrubbed across the
        window in which the room enters) and the veil above are the whole
        transition.
      */}
      <Talk />
      {exit && <Corridor />}

      <PricingLayer open={priceOpen} onClose={closePricing} onLeaveTo={leaveTo} />

      {hud && (() => {
        const { turn, cases, sitting, opening, blend, blend2, corridor } = readout.current;
        return (
          <div className="flowhud" aria-hidden="true">
            flow · услуги {turn.toFixed(2)} · переход {blend.toFixed(2)} · кейсы {cases.pos.toFixed(2)}
            {cases.focus === null ? '' : ` · открыт ${cases.focus}`} · переход {blend2.toFixed(2)} · calm {calm.current.toFixed(2)} · специалисты {sitting.k}.{sitting.f.toFixed(2)} · переход {sitting.e.toFixed(2)} · основатель {opening.toFixed(2)} · коридор {corridor.toFixed(2)} · стоимость{' '}
            {priceOpen ? 'слой' : 'вне ленты'} · {document.documentElement.dataset['scroll'] ?? '—'}
          </div>
        );
      })()}
    </div>
  );
}
