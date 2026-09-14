import { specialists } from '@/data/specialists';
import { ru } from '@/lib/utils/ru';
import type { Specialist } from '@/types';

import p1 from './assets/p1.jpg';
import p1m from './assets/p1@phone.jpg';
import p2 from './assets/p2.jpg';
import p2m from './assets/p2@phone.jpg';
import p3 from './assets/p3.jpg';
import p3m from './assets/p3@phone.jpg';
import p4 from './assets/p4.jpg';
import p4m from './assets/p4@phone.jpg';

/**
 * The four specialists of the prototype (placeholders from `src/data/`) with
 * what the gallery needs beyond the record: a stand-in portrait, where the
 * subject's nearer eye sits in it (for the focal line), and where the crop
 * should anchor when the frame is taller than 4 : 5.
 *
 * STAND-INS: four crops and grades of the ONE generated test portrait. Real
 * specialists are real photography — four different women, one grade, one
 * light — and every frame here is labelled as a placeholder.
 */
export interface Sitter {
  readonly person: Specialist;
  readonly portrait: string;
  readonly portraitPhone: string;
  /** the nearer eye, as fractions of the 4 : 5 image */
  readonly eye: { x: number; y: number };
  /** object-position y for a frame taller than the image */
  readonly anchorY: number;
  /** the approach line — a placeholder in the client's voice */
  readonly approach: string;
  /** what she works with most — a short editorial line */
  readonly focus: string;
}

const APPROACH = [
  ru('[Фраза о подходе: почему меньше — это точнее, и что для неё значит естественный результат.]'),
  ru('[Фраза о подходе: о пропорциях лица и о том, чего она никогда не делает.]'),
  ru('[Фраза о подходе: об аппаратных методиках как о работе со временем, а не против него.]'),
  ru('[Фраза о подходе: о сопровождении курса и о том, что уход — это дисциплина.]'),
];
const FOCUS = [
  ru('качество кожи · инъекционные методики · шея и декольте'),
  ru('контурная коррекция · anti-age программы · пропорции'),
  ru('аппаратные методики · лифтинг · программы для кожи'),
  ru('уходовые программы · сопровождение курсов · домашний протокол'),
];

const plates: readonly [string, string][] = [
  [p1, p1m],
  [p2, p2m],
  [p3, p3m],
  [p4, p4m],
];
const eyes = [
  { x: 0.5, y: 0.3 },
  { x: 0.22, y: 0.3 },
  { x: 0.4, y: 0.29 },
  { x: 0.6, y: 0.29 },
];

export const sitters: readonly Sitter[] = specialists.map((person, i) => ({
  person,
  portrait: plates[i]![0],
  portraitPhone: plates[i]![1],
  eye: eyes[i]!,
  anchorY: 0.28,
  approach: APPROACH[i]!,
  focus: FOCUS[i]!,
}));

export const PLACEHOLDER_LABEL = ru('[Плейсхолдер — заменить на реальную съёмку]');
