import { ru } from '@/lib/utils/ru';
import type { PriceRow } from '@/types';

/**
 * Price list — FORMAT EXAMPLES ONLY. Numbers demonstrate `12 000 ₽` and range
 * formatting; they are not quotes and carry no relation to the clinic's prices.
 * Names in brackets are replaced by the client's nomenclature.
 */
export const placeholder = true;

export const consultation: PriceRow = {
  id: 'consultation',
  categoryId: 'consultation',
  isPlaceholder: true,
  name: ru('Консультация косметолога'),
  duration: ru('30 мин'),
  price: { exact: 3000 },
  note: ru('[Предложение клиенту: засчитывается в стоимость процедуры]'),
};

export const pricing: readonly PriceRow[] = [
  consultation,
  {
    id: 'inj-1',
    categoryId: 'injection',
    isPlaceholder: true,
    name: ru('[Коррекция мимических морщин]'),
    duration: ru('30 мин'),
    price: { from: 12000, to: 18000 },
  },
  {
    id: 'inj-2',
    categoryId: 'injection',
    isPlaceholder: true,
    name: ru('[Название процедуры]'),
    duration: ru('45 мин'),
    price: { exact: 22000 },
  },
  {
    id: 'aa-1',
    categoryId: 'anti-age',
    isPlaceholder: true,
    name: ru('[Название программы]'),
    duration: ru('60 мин'),
    course: ru('курс 4'),
    price: { from: 18000, to: 26000 },
  },
  {
    id: 'ct-1',
    categoryId: 'contour',
    isPlaceholder: true,
    name: ru('[Контурная коррекция, 1 мл]'),
    duration: ru('45 мин'),
    price: { exact: 24000 },
  },
  {
    id: 'sq-1',
    categoryId: 'skin-quality',
    isPlaceholder: true,
    name: ru('[Название процедуры]'),
    duration: ru('60 мин'),
    course: ru('курс 3–6'),
    price: { from: 9000, to: 14000 },
  },
  {
    id: 'bio-1',
    categoryId: 'biorevitalisation',
    isPlaceholder: true,
    name: ru('Биоревитализация, 1 процедура'),
    duration: ru('45 мин'),
    course: ru('курс 3'),
    price: { exact: 14000 },
  },
  {
    id: 'dev-1',
    categoryId: 'device',
    isPlaceholder: true,
    name: ru('[Название методики]'),
    duration: ru('60 мин'),
    price: { from: 25000, to: 40000 },
  },
  {
    id: 'dev-2',
    categoryId: 'device',
    isPlaceholder: true,
    name: ru('[Название методики]'),
    duration: ru('90 мин'),
    course: ru('курс 2'),
    price: { exact: 32000 },
  },
  {
    id: 'prog-1',
    categoryId: 'programmes',
    isPlaceholder: true,
    name: ru('[Индивидуальная программа, год]'),
    duration: ru('по плану'),
    price: { from: 120000, to: 240000 },
  },
];
