import { getSanityClient } from '@/lib/sanity';
import { ru } from '@/lib/utils/ru';

import snapshot from './snapshot.json';
import { FEATURED_COUNT } from './select';
import type { Review, ReviewSource, ReviewsProvider } from './types';

/**
 * The Sanity provider — reviews curated by hand in the Studio
 * (`../studio-era`, document type `review`).
 *
 * The selection is the query's, not `selectFeatured`'s: the editor decides
 * what is featured and in which order (`priority`), and the site shows it as
 * given. Nothing is scraped — `source` and `sourceUrl` only record where the
 * review was published.
 */
export const FEATURED_REVIEWS_QUERY = /* groq */ `
  *[_type == "review" && published == true && featured == true]
    | order(priority asc, date desc)
    [0...$limit]
    { "id": _id, author, rating, date, text, source, sourceUrl }
`;

/** the raw row, before it is trusted */
interface ReviewRow {
  id?: unknown;
  author?: unknown;
  rating?: unknown;
  date?: unknown;
  text?: unknown;
  source?: unknown;
  sourceUrl?: unknown;
}

const SOURCES: readonly ReviewSource[] = ['yandex', '2gis', 'manual'];
const isSource = (v: unknown): v is ReviewSource =>
  typeof v === 'string' && (SOURCES as readonly string[]).includes(v);

/**
 * a row → a `Review`, or nothing when a required field is missing or malformed;
 * the text gets the site's Russian typography here, once, as the data modules do
 */
export function toReview(row: ReviewRow): Review | null {
  const { id, author, rating, date, text, source, sourceUrl } = row;
  if (typeof id !== 'string' || typeof author !== 'string' || typeof text !== 'string') return null;
  if (typeof rating !== 'number' || rating < 1 || rating > 5) return null;
  if (typeof date !== 'string' || !/^\d{4}-\d{2}(-\d{2})?$/.test(date)) return null;
  if (!isSource(source)) return null;
  const review: Review = {
    id,
    author: ru(author.trim()),
    rating,
    date,
    text: ru(text.trim()),
    source,
  };
  if (!review.author || !review.text) return null;
  return typeof sourceUrl === 'string' && /^https?:\/\//.test(sourceUrl)
    ? { ...review, sourceUrl }
    : review;
}

/**
 * The featured reviews, as the Studio curates them: published and featured,
 * `priority` ascending (unset priorities last), then newest first, at most
 * `limit`. Resolves to `[]` when Sanity is not configured, unreachable, or
 * answers with nothing — never throws.
 */
export async function getFeaturedReviews(limit = FEATURED_COUNT): Promise<Review[]> {
  return (await fetchFeaturedReviews(limit)) ?? [];
}

const toReviews = (rows: readonly unknown[]) =>
  rows.map((row) => toReview(row as ReviewRow)).filter((r): r is Review => r !== null);

/**
 * As `getFeaturedReviews`, but tells «Sanity answered with nothing» (`[]`)
 * from «Sanity could not be reached» (`null`) — only the second may fall back
 * on the build-time snapshot.
 */
export async function fetchFeaturedReviews(limit = FEATURED_COUNT): Promise<Review[] | null> {
  const client = await getSanityClient();
  if (!client) return null;
  try {
    const rows = await client.fetch<unknown>(FEATURED_REVIEWS_QUERY, { limit });
    return Array.isArray(rows) ? toReviews(rows) : null;
  } catch {
    return null;
  }
}

/**
 * The same reviews as captured at build time (`scripts/reviews-snapshot.mjs`):
 * what the room shows when the live request cannot get through — a mobile
 * network that drops or throttles the CMS's CDN must not empty the room.
 */
export function snapshotReviews(limit = FEATURED_COUNT): Review[] {
  return toReviews(snapshot.rows).slice(0, limit);
}

export const sanityProvider: ReviewsProvider = {
  id: 'sanity',
  getReviews: () => getFeaturedReviews(),
};
