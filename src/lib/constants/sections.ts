/**
 * Canonical section ids — the ten rooms of THROUGH GLASS, in approved order.
 *
 * These are the anchor targets, the scroll-progress keys, the CTA routing
 * targets and the section component folder names, all in one place — so
 * navigation, ScrollTrigger markers, route hashes and pre-fill links cannot
 * drift apart.
 *
 * Order is load-bearing (see CLAUDE.md → approved section order). The index of
 * an id in this array is its wall-label number (`00 — Главная`).
 */
export const SECTION_IDS = [
  'hero',
  'manifesto',
  'services',
  'pricing',
  'cases',
  'specialists',
  'founder',
  'reviews',
  'contact',
  'inquiry',
] as const;

export type SectionId = (typeof SECTION_IDS)[number];

/** Visible Russian room names — the only place they are written. */
export const SECTION_LABELS: Readonly<Record<SectionId, string>> = {
  hero: 'Главная',
  manifesto: 'Манифест',
  services: 'Услуги',
  pricing: 'Стоимость',
  cases: 'Кейсы',
  specialists: 'Специалисты',
  founder: 'Основатель',
  reviews: 'Отзывы',
  contact: 'Адрес и контакты',
  inquiry: 'Заявка',
};

export const sectionAnchor = (id: SectionId): string => `#${id}`;

/** Two-digit wall-label index: `sectionIndex('services') === '02'`. */
export const sectionIndex = (id: SectionId): string =>
  String(SECTION_IDS.indexOf(id)).padStart(2, '0');

/** Rooms that appear in the header index. The hero is the wordmark itself. */
export const NAV_SECTION_IDS: readonly SectionId[] = SECTION_IDS.filter(
  (id) => id !== 'hero' && id !== 'manifesto',
);
