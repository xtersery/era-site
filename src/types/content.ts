/**
 * Content types. Every record that can be a placeholder says so — the launch
 * gate (docs/ARCHITECTURE.md §0.7) refuses `isPlaceholder: true`.
 */

interface Placeholderable {
  readonly isPlaceholder: boolean;
}

/** A person shown on the site. The clinic is for women; the type allows nothing else. */
export interface Person extends Placeholderable {
  readonly id: string;
  readonly gender: 'f';
  /** Display name, e.g. «[Имя Фамилия]» while a placeholder. */
  readonly name: string;
  /** Short form used in CTAs — «Записаться к [Имя]». */
  readonly shortName: string;
  readonly role: string;
}

export interface ServiceCategory extends Placeholderable {
  readonly id: string;
  readonly name: string;
  /** One-line promise under the heading. */
  readonly promise: string;
  /** Paragraph — client copy; placeholder describes itself. */
  readonly description: string;
  readonly meta: ReadonlyArray<readonly [label: string, value: string]>;
  readonly imageLabel: string;
}

export interface PriceRow extends Placeholderable {
  readonly id: string;
  readonly categoryId: string;
  readonly name: string;
  readonly duration: string;
  readonly course?: string;
  /** Exact price, or a range. Format examples only until the client confirms. */
  readonly price: { readonly exact: number } | { readonly from: number; readonly to: number };
  readonly note?: string;
}

export type CaseStatus = 'real-consented' | 'visualisation';

export interface CaseRecord extends Placeholderable {
  readonly id: string;
  readonly categoryId: string;
  readonly title: string;
  readonly resultAfter: string;
  readonly specialistId: string;
  readonly course?: string;
  readonly commentary: string;
  readonly status: CaseStatus;
  readonly beforeLabel: string;
  readonly afterLabel: string;
}

export interface Specialist extends Person {
  readonly facts: ReadonlyArray<readonly [label: string, value: string]>;
  readonly sentence: string;
  readonly credentials: readonly string[];
  readonly portraitLabel: string;
}

export interface FounderRecord extends Person {
  readonly plaque: string;
  readonly paragraphs: readonly string[];
  readonly facts: ReadonlyArray<readonly [label: string, value: string]>;
  readonly portraitLabel: string;
  readonly detailLabel: string;
}

export interface Review extends Placeholderable {
  readonly id: string;
  readonly author: string;
  readonly date: string;
  readonly categoryId: string;
  readonly quote: string;
  readonly source: string;
}

export interface ContactInfo extends Placeholderable {
  readonly city: string;
  readonly address: string;
  readonly entrance: string;
  readonly metro: string;
  readonly parking: string;
  readonly hours: ReadonlyArray<{
    readonly days: string;
    readonly time: string;
    readonly dayIndexes: readonly number[];
  }>;
  readonly phoneDisplay: string;
  readonly phoneHref: string;
  readonly telegramHref: string;
  readonly whatsappHref: string;
  readonly mapHref: string;
}
