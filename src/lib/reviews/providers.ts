import { sampleReviews } from '@/data/reviews-sample';

import type { Review, ReviewsProvider } from './types';

/**
 * The providers — and the boundary.
 *
 * `local`  — the prototype's sample records (`src/data/reviews-sample.ts`),
 *            clearly marked; the only provider the spike uses.
 * `yandex` — reserved for the clinic's Yandex Business profile. It will read
 *            reviews ONLY through an official, documented channel (the
 *            Yandex Business API with the clinic's own credentials, or an
 *            export the clinic authorises) — never by scraping Yandex Maps
 *            HTML. Until that channel exists it resolves to nothing, and the
 *            room falls back to `local`; the official Yandex reviews widget,
 *            if ever used, is a separate external view, not this room.
 * `2gis`   — the same rule: no undocumented API behaviour, no HTML; nothing
 *            until an authorised export exists.
 */
export const localProvider: ReviewsProvider = {
  id: 'local',
  getReviews: () => Promise.resolve(sampleReviews),
};

export function createYandexProvider(config: { businessId?: string } = {}): ReviewsProvider {
  return {
    id: 'yandex',
    async getReviews(): Promise<readonly Review[]> {
      // No credentials, no channel → nothing. Never fetch maps.yandex.* pages.
      if (!config.businessId) return [];
      // TODO(integration): the clinic's Yandex Business API access — fetch,
      // map to `Review` (author as the platform shows it, ISO date, `sourceUrl`
      // = the review's own URL, `avatarUrl` only if the platform provides it).
      return [];
    },
  };
}

export const twoGisProvider: ReviewsProvider = {
  id: '2gis',
  getReviews: () => Promise.resolve([]),
};
