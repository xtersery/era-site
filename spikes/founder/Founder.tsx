import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useCallback, useEffect, useMemo, useRef } from 'react';

import { sectionIndex } from '@/lib/constants/sections';

import { Biography } from './Biography';
import { founderCopy } from './copy';

/**
 * 06 — Основатель: the room that opens on the wall the passage arrived at.
 *
 * THE WALL is the project's approved marble — `docs/references/wallpapers.png`
 * cut at native scale as `spikes/portraits/assets/marble.jpg` (836 × 1882, a
 * book-matched pair), the Spike E / pass-18 destination — laid as pass 18
 * laid it: on the viewport's width (twice it on the phone), centred, the
 * section's top 195 px down the sheet, continuing below. `WALL` here,
 * `.founder__wall` in the stylesheet, and the specialists' scene lay it with
 * the same rule, so the sheet the light settles into and the sheet this room
 * stands on are one surface. (Pass 19 briefly laid the hero's onyx here; the
 * approved marble is this one.)
 *
 * THE OPENING (`OPEN` vh of scroll, scrubbed): the section is already in
 * place under the specialists' last frame — it stands where that pin ends
 * (`place()` sets its negative top margin) and pins itself for `OPEN` vh
 * from the moment the wall is complete. The specialists' room lets go of the
 * wall (its opacity, `--hand`, over the first beat — two identical sheets,
 * nothing visible changes) and the composition settles on it: she comes out
 * of the stone along the veins' 35° flow (a masked wipe, never a fade, a
 * hair of settling scale); the column's charcoal plate is set on the wall
 * (pass 19c: the words are read on it, white on charcoal — the marble is
 * never lightened or veiled); then the words, as staged lines — the room's
 * label, her name, her role, the statement, the two paragraphs, the facts,
 * the CTA.
 * `BEATS` is the whole choreography. Every quantity is a continuous function
 * of the scroll; the soft finish that carries the passage carries this too.
 *
 * THE READ (06.10, the real profile): the opening stages her label, name,
 * role and experience; her biography follows below them in ordinary flow, so
 * the section is as tall as the text (the wall continues under it). She
 * stands in a sticky stage one viewport tall (`.founder__stage`) — anchored
 * while the page scrolls the chapters past her, released when the section's
 * foot reaches the viewport's foot, which is the moment the Отзывы blend
 * (`spikes/flow/`) begins. No inner scroller, no wheel capture: Lenis
 * scrolls the page, and the page is the read.
 *
 * Reduced motion: pinned (a pin is not motion), every beat at 1 — the room as
 * it is. No WebGL here; the room is DOM on a CSS wall.
 */

/** vh of scroll over which the room opens (the specialists' pin spans it too) */
export const OPEN = 110;
/**
 * The wall sheet (`marble.jpg` 836 × 1882): its aspect, its width as a
 * multiple of the viewport's (desktop / phone), and how far down the sheet
 * the section's top sits (195 px of its 836 — the graphite band lands left
 * of the column, the diamond's pale centre under it). `.founder__wall` and
 * `.sitting__marble` use the same numbers: `100vw × width`, centred,
 * `background-position-y = −top × sheet width`, repeat-y.
 */
export const WALL = {
  aspect: 1882 / 836,
  width: { desktop: 1, phone: 2 },
  top: 195 / 836,
} as const;

/**
 * The beats of the opening, as fractions of `OPEN` — `[from, to]` on the
 * scroll; each element's `--k` is the smoothstep of its beat.
 */
export const BEATS = {
  hand: [0, 0.06], // the specialists' room lets go of the wall (read by `Sitting`)
  portrait: [0.08, 0.5], // she comes out of the stone along the vein flow
  plate: [0.24, 0.4], // the column's plate is set on the wall (and the band under the header)
  label: [0.3, 0.42],
  name: [0.38, 0.58],
  role: [0.5, 0.62],
  stat: [0.56, 0.74], // «Более 8 лет — в эстетической медицине»
  read: [0.68, 0.92], // the first chapter's lines, under the opening; the rest is simply there below
} as const satisfies Record<string, readonly [number, number]>;
type Beat = keyof typeof BEATS;

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
const smooth = (t: number) => {
  const s = clamp(t, 0, 1);
  return s * s * (3 - 2 * s);
};
/** the smoothstep of a beat at o */
export const beat = (o: number, b: Beat) => {
  const [a, z] = BEATS[b];
  return smooth((o - a) / (z - a));
};

export function Founder({
  frozen = null,
  onState,
}: {
  /** `?o=` — the opening frozen at o (0 … 1); null = live */
  frozen?: number | null;
  onState?: (o: number) => void;
}) {
  const sectionRef = useRef<HTMLElement>(null);
  const parts = useRef<Partial<Record<Beat, HTMLElement | null>>>({});
  const bandRef = useRef<HTMLDivElement>(null);
  /** the last value written per element and property — a write that changes nothing is skipped (the plate's subtree is the whole read) */
  const written = useRef(new WeakMap<HTMLElement, Record<string, string>>());
  const reduced = useMemo(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches, []);
  const phone = useMemo(() => window.innerWidth < 1024, []);
  const index = sectionIndex('founder');
  const { record } = founderCopy;

  /** paints one position of the opening */
  const stage = useCallback(
    (o: number) => {
      const put = (el: HTMLElement | null | undefined, name: string, value: string) => {
        if (!el) return;
        const seen = written.current.get(el) ?? {};
        if (seen[name] === value) return;
        seen[name] = value;
        written.current.set(el, seen);
        el.style.setProperty(name, value);
      };
      (Object.keys(BEATS) as Beat[]).forEach((b) => {
        const el = parts.current[b];
        // on the phone the long read continues below the first viewport: it is simply there
        const k = reduced || (phone && b === 'read') ? 1 : beat(o, b);
        put(el, '--k', k.toFixed(4));
        // a tall part (the plate, the read) is wiped over the first viewport; once set, no mask at all
        put(el, '--done', k >= 1 ? '1' : '0');
      });
      // the band under the page's header is set with the plate — written on the band, its one reader
      put(bandRef.current, '--k-band', (reduced ? 1 : beat(o, 'plate')).toFixed(4));
      onState?.(o);
    },
    [onState, phone, reduced],
  );

  /**
   * The room stands where the specialists' pin ends: the same viewport. Its
   * top margin pulls it up over the last viewport of that pin-spacer plus the
   * OPEN vh both pins share — set before every ScrollTrigger measurement.
   */
  const place = useCallback(() => {
    const section = sectionRef.current;
    if (!section) return;
    const prev = document.getElementById('specialists');
    if (!prev || frozen !== null) {
      section.style.marginTop = '';
      return;
    }
    section.style.marginTop = `${-(prev.offsetHeight + (OPEN / 100) * window.innerHeight)}px`;
  }, [frozen]);

  useEffect(() => {
    stage(frozen ?? 0);
  }, [frozen, stage]);

  useEffect(() => {
    if (frozen !== null || !sectionRef.current) return;
    place();
    const section = sectionRef.current;
    /**
     * After its pin ScrollTrigger holds the section with a translateY of the
     * pin's length; sticky is resolved before that transform, so the stage
     * would stick a pin's length too low. While the pin is behind us the
     * stage sticks that much higher instead (`--pin-shift`).
     */
    const shift = (self: ScrollTrigger, past: boolean) =>
      section.style.setProperty('--pin-shift', past ? `${self.end - self.start}px` : '0px');
    const st = ScrollTrigger.create({
      trigger: section,
      start: 'top top',
      end: () => `+=${(OPEN / 100) * window.innerHeight}`,
      pin: true,
      anticipatePin: 1,
      invalidateOnRefresh: true,
      onRefreshInit: place,
      onUpdate: (self) => stage(self.progress),
      onLeave: (self) => shift(self, true),
      onEnterBack: (self) => shift(self, false),
      onRefresh: (self) => shift(self, self.progress >= 1),
    });
    /**
     * The head: over the column's span only, the room's dark under the page's
     * header, so the read passes into it instead of under the nav. Nothing at
     * rest and through the whole pin (`--head-k` 0); on over the first 40 px
     * the read moves. Measured on every refresh, in layout terms: the span
     * (the plate on desktop, the read's plate on the phone) and the label's
     * resting line, which the head ends just above.
     */
    let headK = -1;
    /** layout offset of el inside the section — transforms (the beats' settling) excluded */
    const within = (el: HTMLElement) => {
      let x = 0;
      let y = 0;
      for (
        let e: HTMLElement | null = el;
        e && e !== section;
        e = e.offsetParent as HTMLElement | null
      ) {
        x += e.offsetLeft;
        y += e.offsetTop;
      }
      return { x, y };
    };
    const measureHead = () => {
      const label = parts.current.label;
      const span = window.innerWidth >= 1024 ? parts.current.plate : parts.current.read;
      if (!label || !span) return;
      section.style.setProperty('--head-x', `${within(span).x}px`);
      section.style.setProperty('--head-w', `${span.offsetWidth}px`);
      section.style.setProperty('--head-h', `${Math.max(0, within(label).y - 18)}px`);
    };
    const updateHead = () => {
      // the read has moved exactly as far as the scroll is past the pin's end (0 at rest and in the pin) — arithmetic, no layout read
      const k = clamp((st.scroll() - st.end) / 40, 0, 1);
      if (Math.abs(k - headK) < 0.001) return;
      headK = k;
      section.style.setProperty('--head-k', k.toFixed(3));
    };
    const head = ScrollTrigger.create({
      trigger: section,
      start: 'top bottom',
      end: 'bottom top',
      onUpdate: updateHead,
      onRefresh: () => {
        measureHead();
        updateHead();
      },
    });
    // measured after the specialists' pin (created first) — its spacer is in place
    ScrollTrigger.refresh();
    return () => {
      head.kill();
      st.kill();
    };
  }, [frozen, place, stage]);

  const ref = (b: Beat) => (el: HTMLElement | null) => {
    parts.current[b] = el;
  };

  return (
    <section
      ref={sectionRef}
      className="founder"
      id="founder"
      aria-labelledby="founder-name"
      data-still={reduced || undefined}
    >
      {/* the wall: the clinic's marble, the surface the passage arrived at — as tall as the read */}
      <div className="founder__wall" aria-hidden="true" />
      {/* the stage: one viewport, sticky in a track the section's full height — she stays with the visitor while the read moves, released at the section's foot */}
      {/* the band under the page's header, over the read: the words pass into it, never under the nav */}
      <div className="founder__track founder__track--head" aria-hidden="true">
        <div ref={bandRef} className="founder__band">
          <div className="founder__head" />
        </div>
      </div>
      <div className="founder__track">
        <div className="founder__stage">
          <figure ref={ref('portrait')} className="founder__portrait">
            {/* her own silhouette, multiplied into the stone as her shadow zone */}
            <img
              className="founder__halo"
              src={record.image}
              alt=""
              aria-hidden="true"
              loading="lazy"
              decoding="async"
              draggable={false}
            />
            <img
              className="founder__her"
              src={record.image}
              alt={`${record.name} — ${record.role.toLowerCase()}`}
              loading="lazy"
              decoding="async"
              draggable={false}
            />
            <figcaption className="founder__caption">{record.portraitLabel}</figcaption>
          </figure>
        </div>
      </div>

      {/* the column on its plate: everything that is read, white on charcoal, the marble untouched around it */}
      <div ref={ref('plate')} className="founder__column">
        <div className="founder__first">
          <div className="founder__group">
            <p ref={ref('label')} className="founder__label">
              <span>{index} — Основатель</span>
              <span className="founder__count">{index} / 09</span>
            </p>
            <h2 id="founder-name" ref={ref('name')} className="founder__name">
              <span className="sr-only">{record.name}</span>
              {record.displayName.map((line, i) => (
                <span key={line} className="founder__name-line" aria-hidden="true">
                  {i > 0 && ' '}
                  {line}
                </span>
              ))}
            </h2>
            <div className="founder__lead">
              <p ref={ref('role')} className="founder__role">
                {record.role}
              </p>
              <p ref={ref('stat')} className="founder__stat">
                <span className="founder__stat-value">{record.experience.value}</span>
                <span className="founder__stat-label">{record.experience.label}</span>
              </p>
            </div>
          </div>
        </div>
        <div ref={ref('read')} className="founder__read founder__group">
          <Biography index={index} />
        </div>
      </div>
    </section>
  );
}
