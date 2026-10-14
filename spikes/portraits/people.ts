import { specialists } from '@/data/specialists';
import type { Specialist } from '@/types';

import sp1 from './assets/sp1.jpg';
import sp1m from './assets/sp1@phone.jpg';
import sp2 from './assets/sp2.jpg';
import sp2m from './assets/sp2@phone.jpg';
import sp3 from './assets/sp3.jpg';
import sp3m from './assets/sp3@phone.jpg';
import sp4 from './assets/sp4.jpg';
import sp4m from './assets/sp4@phone.jpg';

/**
 * The four specialists (the records in `src/data/specialists.ts`) with what the
 * gallery needs beyond the record: the portrait, where her nearer eye sits in
 * it (for the focal line), and where the crop anchors on the phone.
 *
 * THE CLINIC'S OWN PHOTOGRAPHS — `docs/references/sp1–4.HEIC` (3284 × 4938),
 * kept whole as masters in `public/images/specialists/sp1–4.jpg`; the plates
 * here are the same frames resized only (1100 × 1654, 640 × 962): no crop, no
 * retouch, no grade. The mapping is fixed by the client and keyed by id, never by order:
 * The files: sp1 → Корягина, sp2 → Сон, sp3 / sp4 → Воронина / Коргачева
 * (see `swap` below — the plates were named the other way round).
 */
export interface Sitter {
  readonly person: Specialist;
  readonly portrait: string;
  readonly portraitPhone: string;
  /** the nearer eye, as fractions of the image */
  readonly eye: { x: number; y: number };
  /** object-position y on the phone (and wherever the crop cannot reach the datum) */
  readonly anchorY: number;
}

/** width / height of every portrait plate (the photographs are 2 : 3) */
export const PORTRAIT_ASPECT = 2 / 3;

const plates: Readonly<Record<string, readonly [string, string]>> = {
  koryagina: [sp1, sp1m],
  son: [sp2, sp2m],
  korgacheva: [sp3, sp3m],
  voronina: [sp4, sp4m],
};
// measured on each photograph; the phone anchors keep the whole head and the
// shoulders in the 55 vh frame (the head sits lower in sp2, higher in sp4)
const framing: Readonly<Record<string, Pick<Sitter, 'eye' | 'anchorY'>>> = {
  koryagina: { eye: { x: 0.427, y: 0.35 }, anchorY: 0.62 },
  son: { eye: { x: 0.415, y: 0.418 }, anchorY: 0.95 },
  korgacheva: { eye: { x: 0.448, y: 0.352 }, anchorY: 0.75 },
  voronina: { eye: { x: 0.452, y: 0.324 }, anchorY: 0.5 },
};

/**
 * The client's correction (14.10 for the phone, 15.10 for the desktop too):
 * the photographs sp3 and sp4 belong the other way round — Коргачева is sp4,
 * Воронина sp3. Only the plate travels — the image and the framing measured
 * on it; her name, role, words and place in the row stay hers.
 */
const swap: Readonly<Record<string, string>> = { korgacheva: 'voronina', voronina: 'korgacheva' };

const cast = (plateOf: (id: string) => string): readonly Sitter[] =>
  specialists.map((person) => {
    const key = plateOf(person.id);
    const plate = plates[key];
    const frame = framing[key];
    if (!plate || !frame) throw new Error(`No portrait for specialist «${person.id}»`);
    return { person, portrait: plate[0], portraitPhone: plate[1], ...frame };
  });

export const sitters: readonly Sitter[] = cast((id) => swap[id] ?? id);
/** the same row on the phone layout (< 1024 px) — the same people, the same photographs */
export const sittersPhone: readonly Sitter[] = sitters;
