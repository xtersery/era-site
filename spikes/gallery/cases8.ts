import { cases as four } from '@/data/cases';
import { ru } from '@/lib/utils/ru';
import type { CaseRecord } from '@/types';

import c1a from '../cases/assets/case-1-after.jpg';
import c1b from '../cases/assets/case-1-before.jpg';
import c2a from '../cases/assets/case-2-after.jpg';
import c2b from '../cases/assets/case-2-before.jpg';
import c3a from '../cases/assets/case-3-after.jpg';
import c3b from '../cases/assets/case-3-before.jpg';
import c4a from '../cases/assets/case-4-after.jpg';
import c4b from '../cases/assets/case-4-before.jpg';
import c5a from '../cases/assets/case-5-after.jpg';
import c5b from '../cases/assets/case-5-before.jpg';
import c6a from '../cases/assets/case-6-after.jpg';
import c6b from '../cases/assets/case-6-before.jpg';
import c7a from '../cases/assets/case-7-after.jpg';
import c7b from '../cases/assets/case-7-before.jpg';
import c8a from '../cases/assets/case-8-after.jpg';
import c8b from '../cases/assets/case-8-before.jpg';
import type { CasePlate } from './scene/RibbonScene';

/**
 * The archive at its intended length — SPIKE-ONLY PLACEHOLDERS.
 *
 * The prototype's four placeholder cases plus four more in the same format, so
 * the rail can be judged with 8 sheets instead of a fragment of 4. The extra
 * records live here and not in `src/data/` because the greyscale room and its
 * tests are built on exactly four. Every record is `isPlaceholder`, every
 * image is a crop of the one test portrait, every case is «Визуализация».
 */
const more: readonly CaseRecord[] = [
  {
    id: 'case-5',
    categoryId: 'anti-age',
    isPlaceholder: true,
    title: ru('Шея и линия подбородка, курс'),
    resultAfter: ru('через 2 месяца'),
    specialistId: 'specialist-2',
    course: ru('4 процедуры'),
    commentary: ru('[Комментарий специалиста — о тонусе кожи шеи без изменения контура.]'),
    status: 'visualisation',
    beforeLabel: ru('Визуализация «до» — шея и подбородок, три четверти'),
    afterLabel: ru('Визуализация «после» — идентичный кадр, 2 месяца'),
  },
  {
    id: 'case-6',
    categoryId: 'device',
    isPlaceholder: true,
    title: ru('Аппаратный лифтинг овала лица'),
    resultAfter: ru('через 3 месяца'),
    specialistId: 'specialist-3',
    commentary: ru('[Комментарий специалиста — об овале и о том, что пропорции не менялись.]'),
    status: 'visualisation',
    beforeLabel: ru('Визуализация «до» — портрет, дневной свет'),
    afterLabel: ru('Визуализация «после» — идентичный кадр, 3 месяца'),
  },
  {
    id: 'case-7',
    categoryId: 'contour',
    isPlaceholder: true,
    title: ru('Губы и периоральная зона'),
    resultAfter: ru('через 2 недели'),
    specialistId: 'specialist-1',
    commentary: ru('[Комментарий специалиста — о форме без увеличения объёма.]'),
    status: 'visualisation',
    beforeLabel: ru('Визуализация «до» — губы и подбородок, крупно'),
    afterLabel: ru('Визуализация «после» — идентичный кадр, 2 недели'),
  },
  {
    id: 'case-8',
    categoryId: 'programmes',
    isPlaceholder: true,
    title: ru('Программа «периорбитальная зона»'),
    resultAfter: ru('через 6 недель'),
    specialistId: 'specialist-2',
    course: ru('3 этапа'),
    commentary: ru('[Комментарий специалиста — о взгляде и о том, что мимика сохранена.]'),
    status: 'visualisation',
    beforeLabel: ru('Визуализация «до» — висок и глаз, крупно'),
    afterLabel: ru('Визуализация «после» — идентичный кадр, 6 недель'),
  },
];

export const cases8: readonly CaseRecord[] = [...four, ...more];

export const plates8: readonly CasePlate[] = [
  { after: c1a, before: c1b },
  { after: c2a, before: c2b },
  { after: c3a, before: c3b },
  { after: c4a, before: c4b },
  { after: c5a, before: c5b },
  { after: c6a, before: c6b },
  { after: c7a, before: c7b },
  { after: c8a, before: c8b },
];
