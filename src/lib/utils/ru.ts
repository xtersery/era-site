/**
 * Russian typography helpers (CLAUDE.md → Hard rule 2).
 *
 * All visible copy passes through `ru()` once, at module scope in `data/`, so
 * JSX never contains hand-typed non-breaking spaces.
 */

export const NBSP = ' ';
/** Narrow no-break space — thousands separator in prices. */
export const NNBSP = ' ';

/**
 * Short prepositions, conjunctions and particles that must not end a line.
 * Kept deliberately conservative: over-gluing makes rag worse, not better.
 */
const SHORT_WORDS =
  /(^|[\s(«„])(а|и|в|во|к|ко|с|со|о|об|у|на|не|ни|но|по|за|из|до|от|для|при|без|над|под|про|же|бы|ли|то|как|что|или|уже|ещё|все|всё|это|эти|мы|вы|я|их|им|ей|ему|её|его|им|то)\s+/giu;

/** Glue short words to the next word and the long dash to the previous one. */
export function ru(text: string): string {
  return (
    text
      // «слово — слово»: NBSP before the dash, normal space after.
      .replace(/\s+—\s+/gu, `${NBSP}— `)
      // Run twice so chains like «и в» glue both joints.
      .replace(SHORT_WORDS, (_m, lead: string, word: string) => `${lead}${word}${NBSP}`)
      .replace(SHORT_WORDS, (_m, lead: string, word: string) => `${lead}${word}${NBSP}`)
      // Number + unit / abbreviation.
      .replace(/(\d)\s+(мин|ч|лет|год|года|шт|мл|см|мм|%|₽)/gu, `$1${NBSP}$2`)
  );
}

/** `12000` → `12 000 ₽` (narrow NBSP between thousands, NBSP before the sign). */
export function formatRub(amount: number): string {
  const whole = Math.round(amount).toString();
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/gu, NNBSP);
  return `${grouped}${NBSP}₽`;
}

/** `12000, 18000` → `12 000 — 18 000 ₽`. */
export function formatRubRange(from: number, to: number): string {
  const a = formatRub(from).replace(`${NBSP}₽`, '');
  return `${a}${NBSP}— ${formatRub(to)}`;
}

/** Two-digit sub-index: `subIndex('02', 5)` → `02.5`. */
export const subIndex = (sectionIndex: string, n: number): string => `${sectionIndex}.${n}`;
