import { ScrollTrigger } from 'gsap/ScrollTrigger';

import { setThemeColor } from '@/lib/themeColor';

/**
 * Each room's tone for the browser's chrome — its dominant ground at the top
 * of the screen, from the palette the rooms are painted with (measured on the
 * page). A room whose ground moves (a seam, a film, a portrait) gives its
 * resting ground; the chrome never follows a frame of an animation.
 */
export const ROOM_TONES = {
  hero: '#f3dfba', //        the onyx field under the hero (`--mf-champagne`, nearest to its light top)
  manifesto: '#0e1a12', //   the emerald wall under its veil (`--mf-deep`)
  services: '#ece8df', //    bone
  cases: '#050d0a', //       the archive's dark (flow's ground for Кейсы)
  specialists: '#e9ebe6', // the sitting room's wall (`--wall`)
  founder: '#9c9689', //     the marble behind her, as shaded (`--greige-dim`)
  reviews: '#08140f', //     the forest (`bg-dark`)
  contact: '#ece8df', //     daylight bone
  inquiry: '#070707', //     the black room with the form and the footer (`--black`)
  pricing: '#ece8df', //     the price layer over the page
  passage: '#b9b4ab', //     the phone only: the light marble between Специалисты and Основатель (the marble's mean)
} as const;

export type RoomTone = keyof typeof ROOM_TONES;

/**
 * The phone's own compositions put another ground under the status bar: the
 * portrait fills the top of Специалисты (the wall is below it), and Основатель
 * reads on the dark plate below her for most of its length.
 */
const PHONE = '(max-width: 1023px)';
const PHONE_TONES: Partial<Record<RoomTone, string>> = {
  specialists: '#2f2d29', // under the portrait: warm graphite (`--hs-graphite`)
  founder: '#08140f', //     the dark read below her (`bg-dark`)
};

/**
 * The rooms in page order. `lead` places the line at which a room's tone
 * takes over, as a fraction of the screen's height, measured where the colour
 * at the top edge actually crosses from one room's ground to the next (390,
 * 430 and an iPhone viewport agree): positive — before the room's top reaches
 * the edge, because the seam above it already wears its ground (Услуги's head
 * veil, the dark between Услуги and Кейсы, the corridor's black before
 * Заявка); negative — after, because the room opens in the previous one's
 * colour (Адрес's dawn, forest to bone, half of it). 0 — a clean edge.
 */
/*
 * The phone's passage from Специалисты to Основатель crosses a light marble
 * (the specialists' exit onto the wall, then the wall her room opens on)
 * between their two dark grounds — the portrait, then the read. Measured at
 * the top edge (390, 430, an iPhone viewport agree): light from 0.83 of a
 * screen before Основатель's top to 0.32 after it. So on the phone the
 * marble has its own line there, and Основатель's dark begins 0.32 after.
 */
const ROOMS: ReadonlyArray<{
  readonly sel: string;
  readonly room: RoomTone;
  readonly lead: number;
  /** the phone's own line, where its composition differs */
  readonly phoneLead?: number;
  /** a line that exists on the phone only */
  readonly phoneOnly?: boolean;
}> = [
  { sel: '#hero', room: 'hero', lead: 0 },
  { sel: '.mf-room', room: 'manifesto', lead: 0 }, // only without the film
  { sel: '.sv-frame', room: 'services', lead: 0.08 },
  { sel: '#cases', room: 'cases', lead: 0.25 },
  { sel: '#specialists', room: 'specialists', lead: 0 },
  // on Основатель's wrapper, not the room: the room pins itself at its top, so a line past its top
  // on the room would wait for the pin's end; the wrapper's top is the room's top and never pins
  { sel: '.flow-founder', room: 'passage', lead: 0.83, phoneOnly: true },
  { sel: '.flow-founder', room: 'founder', lead: 0, phoneLead: -0.32 },
  { sel: '#reviews', room: 'reviews', lead: 0 },
  { sel: '#contact', room: 'contact', lead: -0.27 },
  { sel: '#inquiry', room: 'inquiry', lead: 0.35 },
];

/**
 * Follows the room at the top of the screen and tints the chrome to it.
 *
 * The room is a pure function of the scroll position: the LAST room whose
 * start line has been passed. The start lines are ScrollTrigger positions —
 * measured with every pin's spacing included, re-measured on every refresh —
 * so the answer is the same scrolling down or up, through pins, snaps and the
 * long scenes, and never depends on what was shown before. It is worked out
 * only when a line is crossed (each room's toggle), after a refresh, and once
 * more when a scroll comes to rest (`scrollEnd`) — never per frame.
 *
 * Inside the pinned hero the descent decides: the hero until the film is half
 * way, the manifesto after (`setDescended`, a boolean, so only its flips
 * matter). The price layer overrides while open and, closed, the tone is the
 * room's at that moment — worked out again, never a stored one.
 *
 * A new tone is applied once it has held for `SETTLE` ms (a pin's snap pulling
 * the page back across a line never flickers the bars); at rest, and the very
 * first time, at once.
 */
const SETTLE = 120;

export function watchRoomTone() {
  const phone = window.matchMedia(PHONE);
  let descended = false;
  let layer: RoomTone | null = null;
  let first = true;
  let timer = 0;

  const tone = (room: RoomTone) => (phone.matches && PHONE_TONES[room]) || ROOM_TONES[room];
  const apply = (room: RoomTone, now: boolean) => {
    window.clearTimeout(timer);
    if (first || now) {
      first = false;
      setThemeColor(tone(room));
      return;
    }
    timer = window.setTimeout(() => setThemeColor(tone(room)), SETTLE);
  };

  const lines: { room: RoomTone; st: ScrollTrigger; phoneOnly: boolean }[] = [];
  const resolve = (now: boolean) => {
    if (layer) return apply(layer, now);
    let room: RoomTone = 'hero';
    for (const { room: r, st, phoneOnly } of lines) {
      if (phoneOnly && !phone.matches) continue;
      if (st.scroll() >= st.start - 0.5) room = r;
    }
    if (room === 'hero' && descended) room = 'manifesto';
    apply(room, now);
  };

  for (const { sel, room, lead, phoneLead, phoneOnly = false } of ROOMS) {
    const el = document.querySelector<HTMLElement>(sel);
    if (!el) continue;
    // a function, so a refresh across the breakpoint re-reads which line applies
    const start = () => `top ${(phone.matches && phoneLead !== undefined ? phoneLead : lead) * 100}%`;
    const st = ScrollTrigger.create({ trigger: el, start, onToggle: () => resolve(false) });
    lines.push({ room, st, phoneOnly });
  }

  const atRest = () => resolve(true);
  ScrollTrigger.addEventListener('scrollEnd', atRest);
  ScrollTrigger.addEventListener('refresh', atRest);
  phone.addEventListener('change', atRest);
  resolve(true);

  return {
    setDescended(next: boolean) {
      if (next === descended) return;
      descended = next;
      resolve(false);
    },
    setLayer(next: RoomTone | null) {
      if (next === layer) return;
      layer = next;
      resolve(true);
    },
    dispose() {
      window.clearTimeout(timer);
      ScrollTrigger.removeEventListener('scrollEnd', atRest);
      ScrollTrigger.removeEventListener('refresh', atRest);
      phone.removeEventListener('change', atRest);
      for (const { st } of lines) st.kill();
    },
  };
}
