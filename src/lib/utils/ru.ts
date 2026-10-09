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
 *
 * No lookbehind: a regex lookbehind is a parse-time SyntaxError in Safari
 * before 16.4, and this module is in the entry chunk — one such literal blanks
 * the whole site on those iPhones. The lead is checked in the replacer against
 * the original string instead, which is exactly what the lookbehind did — so
 * chains like «но и с» still glue every joint in one pass.
 */
const SHORT_WORDS =
  /(а|и|в|во|к|ко|с|со|о|об|у|на|не|ни|но|по|за|из|до|от|для|при|без|над|под|про|же|бы|ли|то|как|что|или|уже|ещё|все|всё|это|эти|мы|вы|я|их|им|ей|ему|её|его|им|то)\s+/giu;
const LEAD = /[\s(«„]/u;

function glueShortWords(text: string): string {
  return text.replace(SHORT_WORDS, (match: string, word: string, offset: number, whole: string) =>
    offset === 0 || LEAD.test(whole.charAt(offset - 1)) ? `${word}${NBSP}` : match,
  );
}

/** Glue short words to the next word and the long dash to the previous one. */
export function ru(text: string): string {
  // «слово — слово»: NBSP before the dash, normal space after.
  const dashed = text.replace(/\s+—\s+/gu, `${NBSP}— `);
  return (
    glueShortWords(dashed)
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
