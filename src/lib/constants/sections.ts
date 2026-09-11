/**
 * Canonical section ids.
 *
 * These are the anchor targets, the scroll-progress keys and the section
 * component folder names, all in one place — so navigation, ScrollTrigger
 * markers and route hashes cannot drift apart.
 *
 * Copy and labels are NOT decided here; this is structure only.
 */
export const SECTION_IDS = [
  'hero',
  'philosophy',
  'treatments',
  'cases',
  'doctor',
  'reviews',
  'contact',
] as const;

export type SectionId = (typeof SECTION_IDS)[number];

export const sectionAnchor = (id: SectionId): string => `#${id}`;
