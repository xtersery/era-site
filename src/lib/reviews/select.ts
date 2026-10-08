import type { Review } from './types';

/**
 * The business rule: N RECENT, HIGH-QUALITY reviews.
 *
 *   1. only published reviews with text
 *   2. five-star first, newest first
 *   3. take the first N
 *   4. short of N, fill with four-star reviews, newest first
 *
 * Pure: takes what a provider returned, returns what the room shows.
 */
export const FEATURED_COUNT = 5;

const byNewest = (a: Review, b: Review) => b.date.localeCompare(a.date);

export function selectFeatured(reviews: readonly Review[], n = FEATURED_COUNT): Review[] {
  const withText = reviews.filter((r) => r.text.trim().length > 0);
  const five = withText.filter((r) => r.rating >= 5).sort(byNewest);
  const four = withText.filter((r) => r.rating >= 4 && r.rating < 5).sort(byNewest);
  return [...five, ...four].slice(0, n);
}

/** `2026-08-12` → «12 августа 2026»; a partial date (`2026-08`) → «август 2026» */
const MONTHS = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
const MONTHS_NOM = ['январь', 'февраль', 'март', 'апрель', 'май', 'июнь', 'июль', 'август', 'сентябрь', 'октябрь', 'ноябрь', 'декабрь'];
export function formatReviewDate(iso: string): string {
  const [y, m, d] = iso.split('-');
  const month = Number(m) - 1;
  if (!y || Number.isNaN(month) || !MONTHS[month]) return iso;
  if (!d) return `${MONTHS_NOM[month]} ${y}`;
  return `${Number(d)}\u00a0${MONTHS[month]} ${y}`;
}
