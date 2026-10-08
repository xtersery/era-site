import { isDev } from '@/lib/env';

import { createYandexProvider, localProvider } from './providers';
import { sanityProvider } from './sanityProvider';
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

/**
 * What the room shows, in order of trust:
 *
 *   1. Sanity — the reviews the clinic curated in the Studio, in the order
 *      the Studio gives them (`published && featured`, priority, date, ≤ 5).
 *   2. the reserved platform provider, through the one selection rule.
 *   3. in development only: the sample records, so the room is never empty
 *      on a desk without credentials — labelled as samples by the room.
 *
 * In production, when nothing answers, the result is empty and the room
 * shows its intro and its foot without the stage — never a crash, never a
 * placeholder presented as a review. The room calls this and nothing else.
 */
export async function getReviews(): Promise<{
  reviews: Review[];
  provider: ReviewsProvider['id'];
}> {
  const fromSanity = await quietly(sanityProvider);
  if (fromSanity.length) return { reviews: [...fromSanity], provider: sanityProvider.id };

  const fromLive = await quietly(live);
  if (fromLive.length) return { reviews: selectFeatured(fromLive), provider: live.id };

  if (isDev)
    return {
      reviews: selectFeatured(await localProvider.getReviews()),
      provider: localProvider.id,
    };
  return { reviews: [], provider: sanityProvider.id };
}
