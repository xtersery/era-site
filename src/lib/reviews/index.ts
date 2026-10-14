import { isDev } from '@/lib/env';

import { createYandexProvider, localProvider } from './providers';
import { fetchFeaturedReviews, sanityProvider, snapshotReviews } from './sanityProvider';
import { selectFeatured } from './select';
import type { Review, ReviewsProvider } from './types';

export { formatReviewDate, selectFeatured, FEATURED_COUNT } from './select';
export { getFeaturedReviews, FEATURED_REVIEWS_QUERY } from './sanityProvider';
export type { Review, ReviewSource, ReviewsProvider } from './types';

/** the platform the room names in its trust line and its CTA */
export const REVIEWS_PLATFORM = {
  name: 'Яндекс Карты',
  namePrepositional: 'Яндекс Картах',
  profileUrl: '',
} as const;

/** the reserved live source, once the clinic's profile is connected; resolves to nothing until then */
const live: ReviewsProvider = createYandexProvider({
  businessId: import.meta.env['VITE_YANDEX_BUSINESS_ID'] as string | undefined,
});

const quietly = (p: ReviewsProvider) => p.getReviews().catch(() => [] as readonly Review[]);

/** what the room shows, and where it came from */
export interface ReviewsState {
  readonly reviews: Review[];
  readonly provider: ReviewsProvider['id'];
}

/**
 * What the room shows AT ONCE, synchronously, on its first render: the
 * curated reviews as committed in `snapshot.json` — or `null` when the
 * snapshot is empty, and the room waits for `getReviews()` as before.
 */
export function getInitialReviews(): ReviewsState | null {
  const captured = snapshotReviews();
  return captured.length ? { reviews: captured, provider: sanityProvider.id } : null;
}

/**
 * What the room shows once the live sources have answered, in order of trust:
 *
 *   1. Sanity — the reviews the clinic curated in the Studio, in the order
 *      the Studio gives them (`published && featured`, priority, date, ≤ 5).
 *      A valid non-empty answer replaces the snapshot.
 *   2. When Sanity gave no usable answer (unreachable, a timeout, an error):
 *      the committed snapshot — the room already shows it, so nothing moves.
 *   3. When Sanity answered «nothing featured» (authoritative), or there is no
 *      snapshot: the reserved platform provider, through the one selection
 *      rule; in development only, the sample records, so the room is never
 *      empty on a desk without credentials — labelled as samples by the room.
 *
 * In production, when nothing answers, the result is empty and the room
 * shows its intro and its foot without the stage — never a crash, never a
 * placeholder presented as a review. Never throws.
 */
export async function getReviews(): Promise<ReviewsState> {
  const fromSanity = await fetchFeaturedReviews();
  if (fromSanity?.length) return { reviews: fromSanity, provider: sanityProvider.id };
  if (fromSanity === null) {
    const initial = getInitialReviews();
    if (initial) return initial;
  }

  const fromLive = await quietly(live);
  if (fromLive.length) return { reviews: selectFeatured(fromLive), provider: live.id };

  if (isDev)
    return {
      reviews: selectFeatured(await localProvider.getReviews().catch(() => [])),
      provider: localProvider.id,
    };
  return { reviews: [], provider: sanityProvider.id };
}
