import { founder } from '@/data/specialists';
import { ru } from '@/lib/utils/ru';

/**
 * The founder's room — what it says. Everything factual is the record
 * (`src/data/specialists.ts`): her name, role, experience, the biography in
 * chapters (verbatim) and her philosophy. This file only holds the room's own
 * labels.
 */
export const placeholder = false;

export const founderCopy = {
  record: founder,
  philosophyMarker: 'Философия',
  secondary: ru('Отзывы пациенток ↓'),
} as const;
