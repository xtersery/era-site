import type { Review } from '@/lib/reviews/types';
import { ru } from '@/lib/utils/ru';

/**
 * Reviews — SAMPLE RECORDS for the prototype, in the shape the live provider
 * will return (`src/lib/reviews/types.ts`). Every record is a placeholder
 * (`source: 'manual'`, `isPlaceholder: true`) and the room says so; none is
 * presented as a published Yandex review. Six records — five five-star and
 * one four-star — so the selection rule (five-star first, newest first, fill
 * with four-star) is exercised. Replaced by the clinic's published reviews.
 */
export const placeholder = true;

export const sampleReviews: readonly Review[] = [
  {
    id: 'sample-1',
    author: ru('[Анна] М.'),
    rating: 5,
    date: '2026-08-12',
    text: ru('Никто не заметил, что я что-то делала. Заметили, что я отдохнула. Это именно то, чего я хотела — и именно это мне здесь пообещали на первой встрече, спокойно и без лишних слов.'),
    source: 'manual',
    isPlaceholder: true,
  },
  {
    id: 'sample-2',
    author: ru('[Елена] В.'),
    rating: 5,
    date: '2026-07-03',
    text: ru('Мне впервые сказали «здесь лучше ничего не делать». После этого я доверяю всему остальному.'),
    source: 'manual',
    isPlaceholder: true,
  },
  {
    id: 'sample-3',
    author: ru('[Мария] С.'),
    rating: 5,
    date: '2026-05-21',
    text: ru('Я боялась, что лицо станет чужим. Оно осталось моим — просто отдохнувшим и собранным. Врач объяснила каждое решение до процедуры, а не после.'),
    source: 'manual',
    isPlaceholder: true,
  },
  {
    id: 'sample-4',
    author: ru('[Ольга] К.'),
    rating: 5,
    date: '2026-03-14',
    text: ru('Здесь объясняют, почему — и что будет, если не делать. Такого разговора у меня раньше не было ни в одной клинике.'),
    source: 'manual',
    isPlaceholder: true,
  },
  {
    id: 'sample-5',
    author: ru('[Наталья] Р.'),
    rating: 5,
    date: '2026-01-28',
    text: ru('Тихо, точно, без спешки. Курс расписали на полгода вперёд и ни разу не предложили «ещё что-нибудь».'),
    source: 'manual',
    isPlaceholder: true,
  },
  {
    id: 'sample-6',
    author: ru('[Ирина] Д.'),
    rating: 4,
    date: '2026-09-02',
    text: ru('Результат аккуратный и очень естественный. Единственное — записаться удалось только через три недели.'),
    source: 'manual',
    isPlaceholder: true,
  },
];
