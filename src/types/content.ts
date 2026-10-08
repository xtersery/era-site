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
  /** One-line name — navigation labels, selects, filters, screen readers. */
  readonly name: string;
  /** The display heading broken into its set lines. */
  readonly title: readonly string[];
  /** One-line lead under the heading. */
  readonly promise: string;
  /** One concise paragraph — client copy. */
  readonly description: string;
  readonly duration: string;
  readonly course: string;
  readonly method: string;
  /** Duration / course / method as label–value rows (derived, never authored). */
  readonly meta: ReadonlyArray<readonly [label: string, value: string]>;
  /** Campaign image URL and its framing (`background-position` / `object-position`). */
  readonly image: string;
  readonly imagePosition: string;
  /** Focus of the macro detail cut from the same image. */
  readonly detailPosition: string;
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

/**
 * `real-consented` — a real patient, written consent on file (the launch state).
 * `real-pending` — the clinic's own photograph, consent NOT yet documented in
 * the project: rendered with a bracketed label, never as a visualisation and
 * never as consented. `visualisation` — generated imagery, labelled as such.
 */
export type CaseStatus = 'real-consented' | 'real-pending' | 'visualisation';

/** One photograph of a case. `srcSmall` is the rail / phone tier; `alt` is neutral — what is in the frame, not what was done. */
export interface CaseImage {
  readonly src: string;
  readonly srcSmall?: string;
  readonly alt: string;
}

/**
 * How a photograph sits in the archive's 4 : 5 sheet. `cover` fills the sheet
 * and crops around `focus` (0…1 of the image, default centre); `contain` shows
 * the whole photograph on the sheet's own dark paper — for the clinic's
 * side-by-side diptychs, which a crop would cut through. Never a stretch.
 */
export interface CaseFit {
  readonly mode: 'cover' | 'contain';
  readonly focus?: readonly [x: number, y: number];
}

/** A case is one photograph, or a «до / после» pair sharing one viewport. */
export type CaseMedia =
  | { readonly type: 'single'; readonly image: CaseImage; readonly fit?: CaseFit }
  | { readonly type: 'beforeAfter'; readonly before: CaseImage; readonly after: CaseImage; readonly fit?: CaseFit };

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
  /** The photograph(s). Absent on the greyscale prototype's records, which render labelled frames. */
  readonly media?: CaseMedia;
}

export interface Specialist extends Person {
  readonly facts: ReadonlyArray<readonly [label: string, value: string]>;
  readonly sentence: string;
  readonly credentials: readonly string[];
  readonly portraitLabel: string;
}

/** One chapter of the founder's biography: a mono marker, an editorial anchor, her text verbatim. */
export interface FounderChapter {
  readonly id: string;
  readonly marker: string;
  readonly anchor: string;
  readonly text: string;
}

export interface FounderRecord extends Person {
  /** The display name as set lines (the full name is `name`). */
  readonly displayName: readonly string[];
  /** «Более 8 лет» · «в эстетической медицине». */
  readonly experience: { readonly value: string; readonly label: string };
  readonly chapters: readonly FounderChapter[];
  /** Her philosophy: the opening sentence, then the statement as set lines (one sentence, punctuation kept). */
  readonly philosophy: { readonly lead: string; readonly quote: readonly string[] };
  /** The real photograph (a cutout on a transparent ground). */
  readonly image: string;
  readonly portraitLabel: string;
  /* derived for the greyscale prototype's room — never authored separately */
  readonly plaque: string;
  readonly paragraphs: readonly string[];
  readonly facts: ReadonlyArray<readonly [label: string, value: string]>;
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
  /** Secondary metadata — not part of the address line. */
  readonly district: string;
  readonly postcode: string;
  /** The entrance on the map: WGS-84, [lat, lon]. */
  readonly point: readonly [lat: number, lon: number];
  /** Shown only when verified; absent otherwise. */
  readonly parking?: string;
  readonly hours: ReadonlyArray<{
    readonly days: string;
    readonly time: string;
    readonly dayIndexes: readonly number[];
  }>;
  /** A line under the hours, e.g. «по предварительной записи». */
  readonly hoursNote?: string;
  readonly phoneDisplay: string;
  readonly phoneHref: string;
  readonly telegramHref: string;
  readonly whatsappHref: string;
  /** The clinic's card on the map service, and a route to it. */
  readonly mapHref: string;
  readonly routeHref: string;
}

/* ---- price list (the clinic's real list) --------------------------------- */

/**
 * A price as the clinic states it. `perUnit` renders «150 ₽ за ед.»,
 * `surcharge` «+5 000 ₽», `free` «бесплатно». Values are the source's own —
 * never rounded, never derived.
 */
export type PriceValue =
  | { readonly kind: 'exact'; readonly rub: number }
  | { readonly kind: 'range'; readonly from: number; readonly to: number }
  | { readonly kind: 'perUnit'; readonly rub: number }
  | { readonly kind: 'surcharge'; readonly rub: number }
  | { readonly kind: 'free' };

/** A secondary line: a gift, a discount, or plain information from the source. */
export interface PriceNote {
  readonly kind: 'gift' | 'offer' | 'info';
  readonly text: string;
  readonly price?: PriceValue;
}

export interface PriceItem {
  readonly id: string;
  /** The source's own wording; typography normalised only. */
  readonly name: string;
  readonly price: PriceValue;
  readonly notes?: readonly PriceNote[];
  /** A restrained mark — «Хит». */
  readonly badge?: string;
}

/** A heading with rows; one level of nesting (Morpheus8 → Тело, ROBOLEX → Курс). */
export interface PriceGroup {
  readonly id: string;
  readonly title?: string;
  readonly subtitle?: string;
  /** Notes that stand before the rows («Анестезия включена в процедуру»). */
  readonly lead?: readonly PriceNote[];
  readonly items?: readonly PriceItem[];
  /** Notes that follow the rows (anaesthesia, «От 2 шприцев — скидка 5%»). */
  readonly notes?: readonly PriceNote[];
  readonly groups?: readonly PriceGroup[];
}

export interface PriceCategory {
  readonly id: string;
  /** Short name for the index. */
  readonly title: string;
  /** The source's full heading, when longer than the index name. */
  readonly fullTitle?: string;
  readonly groups: readonly PriceGroup[];
}
