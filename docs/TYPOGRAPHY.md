# Typography — THROUGH GLASS

Typography carries the identity of this site. In the greyscale phase it carries
_all_ of it. This document is the type system: faces, scale, leading, tracking,
measure and the vertical relationships between levels. Tokens in
`src/styles/tokens/typography.css` are the executable version of this page; the
two must not drift.

---

## 1. Roles

Three voices, three families (two superfamilies in production):

| Voice             | Role                                                                                        | Face (production)                  | Face (development, free)         |
| ----------------- | ------------------------------------------------------------------------------------------- | ---------------------------------- | -------------------------------- |
| **Serif display** | the human voice — wordmark, room titles, service names, quotes, headings seen through glass | **Kazimir** (type.today)           | **Prata** (Cyreal, Google Fonts) |
| **Grotesk text**  | the room they stand in — body, sub-headlines, CTAs, inputs, addresses                       | **Suisse Int'l** (Swiss Typefaces) | **Inter Variable**               |
| **Mono meta**     | the instrument — wall labels, indices, prices, durations, dates, sources, form labels       | **Suisse Int'l Mono**              | **JetBrains Mono Variable**      |

Lowercase serif headlines, never capitals. No italics anywhere. Wide tracking
nowhere — not even on labels.

---

## 2. Font evaluation

### Display candidates

|                            | Cyrillic quality                                                                                                                                                                                                        | Premium character                                                                                                                | Fit with THROUGH GLASS                                                                                                                                                  | Display perf.                                  | Body perf.                               | Licence / availability                                                                               | Weight on the wire                                    |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------- | ---------------------------------------- | ---------------------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| **Kazimir** (type.today)   | Native Cyrillic — designed Cyrillic-first, Latin is the companion. Excellent.                                                                                                                                           | High: a "pre-revolutionary" transitional with sharp contrast and real character in lowercase «д», «л», «ф», «э». Warm, not cold. | Very high — the hairlines refracting through glass are the image of the site; the warmth keeps it human.                                                                | Excellent at 5–15rem; wedge serifs stay crisp. | Not a body face; only display/quote use. | Commercial, web licence by pageview tier; self-hosted woff2. Cyrillic is the default, not an add-on. | 2 static weights × 1 file (Cyr+Lat subset) ≈ 60–80 kB |
| **Pilar** (type.today)     | Native Cyrillic. Excellent.                                                                                                                                                                                             | High: a modern Didone — more fashion, cooler, more "Vogue".                                                                      | High, but colder; risks pushing the site toward "tech/fashion" rather than "clinic for women 35–60".                                                                    | Excellent.                                     | No.                                      | Commercial, same model.                                                                              | similar                                               |
| **Spectral**               | **No Cyrillic** on Google Fonts (Latin, Latin-ext, Vietnamese only).                                                                                                                                                    | Good bookish transitional.                                                                                                       | —                                                                                                                                                                       | —                                              | —                                        | OFL                                                                                                  | —                                                     |
| **Prata** (dev pick)       | Cyrillic by Cyreal (Gayaneh Bagdasaryan); good quality, recognisable Russian editorial face.                                                                                                                            | Didone with generous lowercase; elegant, slightly wide. One weight (400).                                                        | Good — closest free stand-in for the serif-hairline idea. Slightly wider set than Kazimir, so measures are tuned to Kazimir's proportions and checked again on licence. | Good.                                          | No.                                      | OFL; via `@fontsource/prata`.                                                                        | ~18 kB Cyrillic + ~12 kB Latin woff2                  |
| Rejected free alternatives | Playfair Display, Cormorant — Cyrillic exists but both _are_ the beige-medspa look. Oranienbaum — Cyrillic Didone, but too dated/academic at large sizes. Piazzolla — good opsz axis but the Latin character dominates. |                                                                                                                                  |                                                                                                                                                                         |                                                |                                          |                                                                                                      |                                                       |

### Text candidates

|                               | Cyrillic                   | Character                                                                                                              | Readability (older audience)              | Licence                                                     | Weight                                                                                          |
| ----------------------------- | -------------------------- | ---------------------------------------------------------------------------------------------------------------------- | ----------------------------------------- | ----------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| **Suisse Int'l**              | Full Cyrillic, well drawn. | Neutral Swiss grotesk with warmth in the rounds; never "UI-font". Has tabular figures and a matching **Mono**.         | Excellent at 17–18 px, generous x-height. | Commercial (Swiss Typefaces), web licence by pageview tier. | Book + Medium ≈ 2 × 35 kB subset                                                                |
| **Inter Variable** (dev pick) | Full, high quality.        | More "interface" than "editorial", but the tightest free match for metrics and feature set (tabular figures, `ss01`…). | Excellent.                                | OFL; `@fontsource-variable/inter`.                          | Cyrillic + Latin variable ≈ 2 × ~100 kB (variable axis cost; acceptable in dev, subset in prod) |

### Mono candidates

|                                        | Cyrillic                               | Character                                                                                             | Licence                                        | Weight               |
| -------------------------------------- | -------------------------------------- | ----------------------------------------------------------------------------------------------------- | ---------------------------------------------- | -------------------- |
| **Suisse Int'l Mono**                  | Yes (Cyrillic included in the family). | The only mono that is the _same family_ as the text face — metadata reads as the same voice, quieter. | Commercial, bundled pricing with Suisse Int'l. | 1 weight ≈ 35 kB     |
| **JetBrains Mono Variable** (dev pick) | Yes, excellent.                        | Slightly "developer"; fine at 11–12 px metadata sizes.                                                | OFL; `@fontsource-variable/jetbrains-mono`.    | ≈ 2 × 60 kB variable |

### Recommendation

1. **Preferred production combination: Kazimir (display) · Suisse Int'l (text) · Suisse Int'l Mono (meta).**
   Kazimir over Pilar for warmth — the brief says human and desirable, not
   cold tech. Suisse because it ships a matching mono, which makes the
   Calibration layer feel like the same voice lowered, not a third font.
   Licensing: two foundries (type.today, Swiss Typefaces), web licences sized
   to the clinic's expected traffic; self-hosted subset woff2 in
   `public/fonts/` (Cyrillic + Latin + punctuation + ₽ + tabular figures).
   Budget: 4–5 files, ≈ 180–220 kB total, two preloaded (display regular, text
   book). **Not purchased yet** — approval required.

2. **Free development combination (installed now): Prata · Inter Variable · JetBrains Mono Variable.**
   All OFL, all with native Cyrillic, loaded from `@fontsource` packages with
   `font-display: swap` and metric-adjusted local fallbacks. Proportions are
   close enough that the scale below will hold when Kazimir and Suisse land;
   the one known difference is Prata's wider set width, so wordmark and
   display measures are tuned slightly tight and will be re-checked.

---

## 3. Scale

Fluid sizes are `clamp(min, preferred, max)` with min at **390 px** and max at
**1440 px** viewport width; between them the size is linear in `vw`. Above 1440
nothing grows — the 1440 composition is the composition.

| Token            | Use                                                       | 390 px     | 1440 px    | Leading | Tracking | Max measure |
| ---------------- | --------------------------------------------------------- | ---------- | ---------- | ------- | -------- | ----------- |
| `--text-hero`    | wordmark «эра»                                            | 7 rem      | 15 rem     | 0.9     | −0.04em  | —           |
| `--text-display` | room headlines (Услуги spread, Кейсы, Основатель, Заявка) | 2.75 rem   | 5.5 rem    | 0.95    | −0.03em  | 14ch        |
| `--text-h2`      | room titles, specialist names, price-list plaque          | 2.25 rem   | 4 rem      | 1.0     | −0.02em  | 18ch        |
| `--text-h3`      | service names in the index, case titles, pull quotes      | 1.625 rem  | 2.75 rem   | 1.1     | −0.01em  | 28ch        |
| `--text-lead`    | hero sub-headline, manifesto lines, plaques               | 1.375 rem  | 2 rem      | 1.25    | −0.01em  | 34ch        |
| `--text-lg`      | founder long-read, specialist sentence                    | 1.125 rem  | 1.25 rem   | 1.55    | 0        | 58ch        |
| `--text-body`    | body — **1.125 rem on phone**, 1.0625 rem from `md` up    | 1.125 rem  | 1.0625 rem | 1.6     | 0        | 64ch        |
| `--text-sm`      | captions, helper text, legal colophon                     | 0.9375 rem | 0.9375 rem | 1.5     | 0        | 64ch        |
| `--text-input`   | form inputs (older audience)                              | 1.25 rem   | 1.25 rem   | 1.3     | 0        | —           |
| `--text-cta`     | primary buttons (grotesk Medium)                          | 1 rem      | 1 rem      | 1       | 0        | —           |
| `--text-price`   | mono prices, tabular                                      | 1 rem      | 1.0625 rem | 1.4     | 0        | —           |
| `--text-meta`    | mono metadata, wall labels, form labels, sources          | 0.6875 rem | 0.75 rem   | 1.4     | 0        | —           |

Every heading uses `text-wrap: balance`, `hyphens: manual`; body uses
`text-wrap: pretty`. Headings are serif, lowercase, weight 400. Body is grotesk
400; emphasis is weight 500, never italic. Mono is 400 with `font-variant-numeric:
tabular-nums`.

---

## 4. Vertical relationships

Spacing between text levels is proportional to the _larger_ element's size, not
a fixed ramp, so the rhythm survives the fluid scale:

| From → to                  | Space                                                       |
| -------------------------- | ----------------------------------------------------------- |
| section top → wall label   | `--space-section` (6 → 12 rem)                              |
| wall label → room headline | `--space-xl` (3 rem)                                        |
| headline → lead / plaque   | `0.5em` of the headline                                     |
| lead → body                | `--space-lg` (2 rem)                                        |
| body paragraph → paragraph | `1em`                                                       |
| body → metadata block      | `--space-xl`                                                |
| metadata block → CTA row   | `--space-2xl` (4.5 rem)                                     |
| CTA row → section end      | `--space-section`                                           |
| price-list row height      | `3.5 rem` desktop · `auto`, min `4.5 rem` phone (two lines) |
| hairline → text on it      | `--space-sm` (1 rem)                                        |

Whitespace is uneven on purpose: the hero and founder get `--space-section`
above _and_ below; pricing and contact run tighter (`--space-section-tight`)
because they are instruments, not rooms you linger in.

---

## 5. Russian typographic rules (enforced in code)

- `ru()` in `src/lib/utils/ru.ts` inserts ` ` after one- and two-letter
  prepositions/conjunctions and before «—». All copy in `data/` passes through it.
- `formatRub()` → `12 000 ₽` (U+202F between thousands, U+00A0 before ₽);
  ranges `12 000 — 18 000 ₽`.
- «ёлочки» in copy; `quotes: '«' '»' '„' '“'` on `html[lang=ru]` so `<q>` is
  correct too.
- `hyphens: manual` everywhere — Russian auto-hyphenation in browsers is
  unreliable and a hyphenated headline looks cheap.
- Numbers, indices and prices are mono with tabular figures so nothing jitters.

---

## 6. Loading

Development: `@fontsource` CSS imported once from `styles/tokens/fonts.css`;
each face declares `unicode-range`, so the browser fetches only Cyrillic and
Latin. `font-display: swap` with metric-adjusted `local()` fallbacks
(`size-adjust`, `ascent-override`) so the swap is not a layout shift.

Production: licensed faces self-hosted as subset woff2 in `public/fonts/`, two
`<link rel="preload">` in `index.html` (display regular, text book), the
`@font-face` block in `fonts.css` swapped, nothing else changes.
