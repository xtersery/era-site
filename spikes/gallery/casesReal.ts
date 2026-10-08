import { ru } from '@/lib/utils/ru';
import type { CaseRecord } from '@/types';

import c1 from './assets/case1.jpg';
import c1s from './assets/case1@rail.jpg';
import c2a from './assets/case2-after.jpg';
import c2as from './assets/case2-after@rail.jpg';
import c2b from './assets/case2-before.jpg';
import c2bs from './assets/case2-before@rail.jpg';
import c3a from './assets/case3-after.jpg';
import c3as from './assets/case3-after@rail.jpg';
import c3b from './assets/case3-before.jpg';
import c3bs from './assets/case3-before@rail.jpg';
import c4 from './assets/case4.jpg';
import c4s from './assets/case4@rail.jpg';
import c5 from './assets/case5.jpg';
import c5s from './assets/case5@rail.jpg';

/**
 * The archive's cases — THE CLINIC'S OWN PHOTOGRAPHS (`public/images/`,
 * derived by `scripts/case-assets.sh`: format, orientation, crop, size — no
 * retouching). Inventory, 19.09.2026:
 *
 *   case1.HEIC                 4090 × 4090   one image — the clinic's side-by-side diptych
 *   case2_before / case2_after 3213 × 5712   a confirmed pair (filename + the same sitting)
 *   case3_before / case3_after  960 × 1280   a confirmed pair (filename + the same person),
 *                                            NOT the same framing — the slider aligns loosely
 *   case4.HEIC                 4808 × 4808   one image — a diptych
 *   case5.HEIC                 4200 × 4200   one image — a diptych
 *
 * The diptychs are ONE file each: they stay single images, whole, on the
 * sheet's paper — a slider is not manufactured out of a collage.
 *
 * WHAT IS NOT KNOWN is bracketed: the procedure, the timing, the doctor, the
 * commentary, the consent. The title names only what the photograph shows.
 * Every record is `isPlaceholder` until the clinic confirms the copy.
 */
export const placeholder = true;

const PENDING = {
  isPlaceholder: true,
  categoryId: '', // not mapped to a service — the clinic confirms the procedure
  specialistId: '', // renders as «[Имя Фамилия]»
  resultAfter: ru('[срок результата уточняется]'),
  commentary: ru('[Комментарий специалиста — предоставляется клиникой.]'),
  status: 'real-pending',
} as const;

export const casesReal: readonly CaseRecord[] = [
  {
    ...PENDING,
    id: 'case-1',
    title: ru('Губы — [процедура уточняется]'),
    beforeLabel: ru('диптих клиники: два кадра одним изображением, слева и справа'),
    afterLabel: ru('диптих клиники: два кадра одним изображением, слева и справа'),
    media: {
      type: 'single',
      image: { src: c1, srcSmall: c1s, alt: ru('Снимок клиники: губы и нижняя треть лица, два кадра рядом одним изображением') },
      fit: { mode: 'contain' },
    },
  },
  {
    ...PENDING,
    id: 'case-2',
    title: ru('Губы — [процедура уточняется]'),
    beforeLabel: ru('губы и нижняя треть лица, крупно, лёжа'),
    afterLabel: ru('тот же ракурс, чуть ближе'),
    media: {
      type: 'beforeAfter',
      before: { src: c2b, srcSmall: c2bs, alt: ru('Снимок «до»: губы и нижняя треть лица крупным планом') },
      after: { src: c2a, srcSmall: c2as, alt: ru('Снимок «после»: губы и нижняя треть лица, тот же ракурс') },
      fit: { mode: 'cover', focus: [0.5, 0.5] },
    },
  },
  {
    ...PENDING,
    id: 'case-3',
    title: ru('Кожа лица — [процедура уточняется]'),
    beforeLabel: ru('щека и линия челюсти, три четверти, в кабинете'),
    afterLabel: ru('лицо в три четверти — другой ракурс и свет'),
    media: {
      type: 'beforeAfter',
      before: { src: c3b, srcSmall: c3bs, alt: ru('Снимок «до»: щека и линия челюсти в три четверти') },
      after: { src: c3a, srcSmall: c3as, alt: ru('Снимок «после»: лицо в три четверти, другой ракурс') },
      fit: { mode: 'cover', focus: [0.5, 0.42] },
    },
  },
  {
    ...PENDING,
    id: 'case-4',
    title: ru('Кожа лица — [процедура уточняется]'),
    beforeLabel: ru('диптих клиники: два кадра одним изображением, слева и справа'),
    afterLabel: ru('диптих клиники: два кадра одним изображением, слева и справа'),
    media: {
      type: 'single',
      image: { src: c4, srcSmall: c4s, alt: ru('Снимок клиники: лицо в три четверти, лёжа, два кадра рядом одним изображением') },
      fit: { mode: 'contain' },
    },
  },
  {
    ...PENDING,
    id: 'case-5',
    title: ru('Профиль лица — [процедура уточняется]'),
    beforeLabel: ru('диптих клиники: два кадра одним изображением, слева и справа'),
    afterLabel: ru('диптих клиники: два кадра одним изображением, слева и справа'),
    media: {
      type: 'single',
      image: { src: c5, srcSmall: c5s, alt: ru('Снимок клиники: лицо в профиль и три четверти, два кадра рядом одним изображением') },
      fit: { mode: 'contain' },
    },
  },
];
