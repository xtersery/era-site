import { setThemeColor } from '@/lib/themeColor';

/**
 * Each room's tone for the browser's chrome — its dominant ground, taken from
 * the palette the rooms are painted with (measured against the page at
 * 390 px). A room whose ground moves (a seam, a film, a portrait) gives its
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
} as const;

export type RoomTone = keyof typeof ROOM_TONES;

/**
 * The rooms in page order; the manifesto's still room exists only without
 * the film. A third value marks a part that keeps the PREVIOUS room's tone
 * for that fraction of its height: Адрес opens with a dawn (its head goes
 * from the forest to the bone over 46–64svh), so the bars stay forest until
 * half the dawn has passed the top edge, then turn bone.
 */
const ROOMS: ReadonlyArray<readonly [selector: string, room: RoomTone, upTo?: number]> = [
  ['#hero', 'hero'],
  ['.mf-room', 'manifesto'],
  ['.sv-frame', 'services'],
  ['#cases', 'cases'],
  ['#specialists', 'specialists'],
  ['#founder', 'founder'],
  ['#reviews', 'reviews'],
  ['#contact', 'contact'],
  ['.place__dawn', 'reviews', 0.5],
  ['#inquiry', 'inquiry'],
];

/**
 * Follows the room under the top edge of the screen — the one the status
 * bar sits against — and tints the chrome to it.
 *
 * An IntersectionObserver on a 1 % band at the top of the viewport: it calls
 * back only when a room crosses that band, never per frame, and reads
 * geometry only then. Inside the pinned hero the descent decides: the hero
 * until the film covers it, the manifesto after (`setDescended`, called with
 * a boolean, so only its flips matter). The price layer overrides while open.
 *
 * A new tone is applied once it has held for `SETTLE` ms: a pin's snap that
 * pulls the page back across a boundary, or a fast fling through a short
 * room, never flickers the bars. The first tone is applied at once.
 */
const SETTLE = 120;

export function watchRoomTone() {
  const els = ROOMS.map(([sel, room, upTo = 1]) => [document.querySelector<HTMLElement>(sel), room, upTo] as const).filter(
    (e): e is readonly [HTMLElement, RoomTone, number] => e[0] !== null,
  );
  const inBand = new Set<HTMLElement>();
  let descended = false;
  let layer: RoomTone | null = null;
  let first = true;
  let timer = 0;
  const apply = (room: RoomTone) => {
    window.clearTimeout(timer);
    if (first) {
      first = false;
      return setThemeColor(ROOM_TONES[room]);
    }
    timer = window.setTimeout(() => setThemeColor(ROOM_TONES[room]), SETTLE);
  };

  const resolve = () => {
    if (layer) return apply(layer);
    // the room whose box holds the screen's top edge; on an overlap the later room (it stands over the earlier)
    let room: RoomTone | null = null;
    for (const [el, r, upTo] of els) {
      if (!inBand.has(el)) continue;
      const b = el.getBoundingClientRect();
      if (b.top <= 1 && b.top + b.height * upTo > 1) room = r;
    }
    if (!room) return;
    if (room === 'hero' && descended) room = 'manifesto';
    apply(room);
  };

  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) (e.isIntersecting ? inBand.add : inBand.delete).call(inBand, e.target as HTMLElement);
      resolve();
    },
    { rootMargin: '0px 0px -99% 0px' },
  );
  for (const [el] of els) io.observe(el);
  // a part with a fraction: its fraction line crossing the top edge changes nothing in the band,
  // so it is watched by how much of it is on screen (once it reaches the top, that is the line)
  const parts = new IntersectionObserver(resolve, { threshold: [...new Set(els.filter((e) => e[2] < 1).map((e) => 1 - e[2]))] });
  for (const [el, , upTo] of els) if (upTo < 1) parts.observe(el);
  resolve();

  return {
    setDescended(next: boolean) {
      if (next === descended) return;
      descended = next;
      resolve();
    },
    setLayer(next: RoomTone | null) {
      if (next === layer) return;
      layer = next;
      resolve();
    },
    dispose() {
      io.disconnect();
      parts.disconnect();
      window.clearTimeout(timer);
    },
  };
}
