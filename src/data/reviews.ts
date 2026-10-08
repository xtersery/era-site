import { ru } from '@/lib/utils/ru';
import type { Review } from '@/types';

/**
 * Reviews — FORMAT EXAMPLES, not real reviews. Every record is a placeholder;
 * the source line says so visibly. Replaced by verified reviews with the
 * author's permission and the platform named.
 */
export const placeholder = true;

const EXAMPLE_SOURCE = ru('Пример отзыва — заменить на реальный · источник: [платформа]');

export const reviewsPlatform = '[платформе]';

export const reviews: readonly Review[] = [
  {
    id: 'review-1',
    isPlaceholder: true,
    author: ru('[Имя] К.'),
    date: '03.2026',
    categoryId: 'injection',
    quote: ru(
      'Никто не заметил, что я что-то делала. Заметили, что я отдохнула. Это именно то, чего я хотела.',
    ),
    source: EXAMPLE_SOURCE,
  },
  {
    id: 'review-2',
    isPlaceholder: true,
    author: ru('[Имя] В.'),
    date: '01.2026',
    categoryId: 'consultation',
    quote: ru(
      'Мне впервые сказали «здесь лучше ничего не делать». После этого я доверяю всему остальному.',
    ),
    source: EXAMPLE_SOURCE,
  },
  {
    id: 'review-3',
    isPlaceholder: true,
    author: ru('[Имя] С.'),
    date: '11.2025',
    categoryId: 'contour',
    quote: ru(
      'Я боялась, что лицо станет чужим. Оно осталось моим — просто отдохнувшим и собранным.',
    ),
    source: EXAMPLE_SOURCE,
  },
  {
    id: 'review-4',
    isPlaceholder: true,
    author: ru('[Имя] М.'),
    date: '09.2025',
    categoryId: 'device',
    quote: ru(
      'Здесь объясняют, почему — и что будет, если не делать. Такого разговора у меня раньше не было.',
    ),
    source: EXAMPLE_SOURCE,
  },
];
