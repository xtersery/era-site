# Spike G — Отзывы / the journal page of voices, and Основатель → Отзывы (18.09.2026)

**Status: BUILT — awaiting review.** `spikes/reviews/` (standalone
`/spikes/reviews/`), composed after Основатель in the flow
(`spikes/flow/`, pass 8). Live: https://claude.ai/artifact/9Y6Kgcw3ur4B2VppFaLE7g
(version 11) · board (section 4): https://claude.ai/artifact/UcM8J63qaKeNUXnQZJQnZS.
The wireframe's `src/sections/Reviews` is untouched (the `none` tier).

## The brief

Five recent high-rated reviews from an external trusted source (Yandex
Maps / Yandex Business) — without scraping, without coupling the room to
one provider; a provider abstraction so live data can arrive later without
a redesign; sample records for the spike, clearly marked. Founder → Reviews
as ordinary scroll: the marble leaving, a deep forest atmosphere rising from
below over 60–100 vh, no seam, nothing of the founder faded. The room: a
luxury journal of private voices, not testimonial cards — one featured
voice and four supporting; rating, date and source always visible; initials,
never generated faces; a trust line and «Все отзывы на Яндекс Картах →»;
keyboard, reduced motion, light (DOM + CSS).

## Data — `src/lib/reviews/`

- `types.ts` — `Review { id, author, rating, date (ISO), text, source:
  'yandex' | '2gis' | 'manual', sourceUrl?, avatarUrl?, isPlaceholder? }`
  and `ReviewsProvider { id, getReviews(): Promise<Review[]> }`.
- `select.ts` — `selectFeatured(reviews, 5)`: reviews with text; five-star
  first, newest first; take five; fill with four-star, newest first.
  `formatReviewDate` (`2026-08-12` → «12 августа 2026»).
- `providers.ts` — `localProvider` (`src/data/reviews-sample.ts`: six sample
  records, `source: 'manual'`, `isPlaceholder`, bracketed names — five
  five-star and one four-star so the rule is exercised); `createYandexProvider`
  and `twoGisProvider` reserved: they read only through an official channel
  (the clinic's Yandex Business API credentials or an authorised export) and
  resolve to nothing until one exists — never HTML, never an undocumented
  API. `getReviews()` (`index.ts`) returns the live provider's selection when
  it has any, the samples otherwise, and which. `REVIEWS_PLATFORM.profileUrl`
  is empty until the clinic's business card is known (the CTA renders
  `aria-disabled` and bracketed).
- `sanityProvider.ts` (19.09) — the CMS: `getFeaturedReviews()` reads the
  `review` documents of the Studio in `../studio-era` (`published &&
  featured`, `priority` asc, `date` desc, ≤ 5) through `src/lib/sanity.ts`
  (`@sanity/client`, env `VITE_SANITY_PROJECT_ID` / `VITE_SANITY_DATASET`,
  dynamic import — its own chunk). The Studio's order is the room's order;
  `selectFeatured` is not applied on top. `getReviews()` now asks Sanity
  first, then the reserved provider, then the samples in development only;
  in production an unreachable CMS gives an empty list and the room shows
  no stage — never a sample as a review. The room is unchanged. Setup and
  the editor's workflow: `README.md` → _Reviews CMS_.

## The room — `spikes/reviews/Reviews.tsx`, `reviews.css`

Forest ground (`#08140f`, its head `#0f1f19` over 60 svh — the shadow the
marble leaves into), a grain tile drifting by a hair (screen, 0.09–0.13).
Intro: «07 — Отзывы» (+ «примеры — заменить на опубликованные» while the
provider is local), the heading «О нас говорят тише, чем реклама.» and the
lede as PROPOSED copy (`data-placeholder="copy"`). The stage: the featured
voice in cols 1–7 — its number in champagne, the text in the serif at
1.5–2.3 rem in «ёлочки», the label row (initials in a hairline ring or the
platform's avatar · name · rating as five calibration ticks + «5,0» · date ·
source; the source links out when the record has a URL); the index in cols
9–12 — a tablist of 01–05 (number · who · when · the first words), the
chosen one in ivory with a champagne line grown under its number. Hover or
click chooses; arrows / Home / End move; the featured voice crossfades
(380 ms, a cut under reduced motion). Tablet: the voice, a compact selector
row under it. Phone: one voice, 01–05 as wide targets, a horizontal swipe
on the voice (`touch-action: pan-y`; vertical scroll untouched). Foot: the
trust line (bracketed while the records are samples) and «Все отзывы на
Яндекс Картах ↗». `aria-live` announces the chosen voice.

Rating: CLAUDE.md lists stars as deliberately absent, so the rating is five
ticks + the number; ★ is a one-line change if wanted.

## Основатель → Отзывы — `spikes/flow/` pass 8

No pin. When the two pins release, Основатель leaves over its own viewport
and Отзывы is the next thing in the document. One scrubbed timeline on the
founder's pin-spacer (`bottom bottom`, +100 vh — on the phone the window
opens when the taller room's FOOT reaches the viewport bottom) writes
`--f-k` (0 → 1 over the first 6 %) and `--f-reach` (12 → 72 svh, power1.out,
6–85 %) for a page-owned veil at the founder's foot (`.flow-veil--founder`,
`#0f1f19` solid at the line, released upward): the marble, then its shadow,
then the forest — one tone on both sides of the meeting line (Δlum 0.0 at
four positions), the founder's words leaving with the scroll, nothing faded.
Perceptual range: the veil's 72 svh + the head's 60 svh.

## Proof

`e2e/spike-flow.handoff.mjs` — the Основатель → Отзывы block (order, no pin,
veil off while pinned, seam tone across the window, reach, five voices,
source/date/rating visible, the way out, choosing 03 without moving the
page, arrow to 04 with focus) — 310 + checks, all five runs pass. Typecheck,
lint, production build: clean.

## To connect the real profile

1. The clinic's Yandex Business profile URL → `REVIEWS_PLATFORM.profileUrl`
   (the CTA and the trust line go live; the bracket goes).
2. Official access to the profile's reviews (Yandex Business API with the
   clinic's credentials, or an export the clinic authorises) →
   `createYandexProvider`: fetch, map to `Review` (author as the platform
   shows it, ISO date, `sourceUrl`, `avatarUrl` only if the platform gives
   one), set `VITE_YANDEX_BUSINESS_ID`. `getReviews()` then prefers it and
   the sample records and their labels disappear by themselves.
3. If the clinic wants the official Yandex widget as well, it is a separate
   external view (a link or a modal), never this room.
