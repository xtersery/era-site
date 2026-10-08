# ЭРА cosmetology — premium cosmetology clinic website

Creative front-end for a high-end cosmetology clinic for women. React +
TypeScript + Vite, React Three Fiber for WebGL, GSAP for motion. Russian-only
interface.

> **Status: art direction approved (THROUGH GLASS); greyscale typographic
> prototype built.** All ten rooms are implemented in greyscale with labelled
> placeholders, no imagery, no final colour, no WebGL. Next phases (colour,
> imagery, the glass, post-processing, choreography) are gated on approval —
> see `CLAUDE.md`.

---

## Setup

Requires **Node ≥ 22.12** (Vite 8). `.nvmrc` pins Node 22.

```bash
git clone <this repo>
cd era-site
npm install
```

Optional but recommended — clone the read-only reference repositories Claude
Code consults (~300 MB, git-ignored, takes a few minutes):

```bash
npm run refs:sync
```

## Development

```bash
npm run dev        # dev server → http://localhost:5173
npm run build      # typecheck + production build → dist/
npm run preview    # serve the production build
npm run typecheck  # tsc --noEmit
npm run lint       # eslint
npm run lint:fix   # eslint --fix
npm run format     # prettier --write
npm run test:e2e   # Playwright visual QA (drives the installed Google Chrome)
npm run refs:sync  # clone/refresh .references/
```

`npm run build` runs the typecheck first, so a passing build is type-clean.

### Environment

Copy `.env.example` to `.env.local` and fill in the Sanity project (see
_Reviews CMS_ below). Without it the site still runs: the reviews room shows
its sample records in development and no reviews in production.

---

## Reviews CMS (Sanity)

The five reviews in **07 — Отзывы** are curated by hand in a Sanity Studio
that lives in a sibling repository, `../studio-era`. Nothing is scraped from
Yandex Maps or 2ГИС — the clinic copies a review it has the right to show
and records where it was published.

The website reads through `@sanity/client` (`src/lib/sanity.ts`, loaded on
demand, no token, CDN reads only). The reviews room never sees the CMS: it
calls `getReviews()` from `src/lib/reviews/` and receives `Review[]`, the same
shape whatever the source (`types.ts`). The GROQ query lives in
`src/lib/reviews/sanityProvider.ts` — never in a component.

### Environment variables

| Variable                 | Value                                                |
| ------------------------ | ---------------------------------------------------- |
| `VITE_SANITY_PROJECT_ID` | the project id from `../studio-era/sanity.config.ts` |
| `VITE_SANITY_DATASET`    | `production` (the default when unset)                |

Both are public read-side values, but they stay out of the code: `.env.local`
locally, the host's environment in production. **The site's origin must be
allowed on the Sanity project** or the browser blocks the read (the room then
falls back as if the CMS were down):

```bash
cd ../studio-era
npx sanity cors add http://localhost:5173 --no-credentials
npx sanity cors add https://<the production domain> --no-credentials
```

### Opening the Studio

```bash
cd ../studio-era
npm install
npm run dev        # → http://localhost:3333
```

The Studio is a separate app with its own login (the clinic's Sanity account).
Deploy a hosted copy with `npm run deploy` so the clinic owner needs no
terminal.

### Creating a review

1. In the Studio choose **Отзыв → создать** (the «+» next to the type).
2. Fill in the fields — all titles are Russian:
   - **Автор** — as the platform shows it: a first name and an initial («Анна М.»).
   - **Оценка** — 1 … 5.
   - **Дата отзыва** — the date it was published on the platform.
   - **Текст отзыва** — verbatim, unedited.
   - **Источник** — Яндекс Карты · 2ГИС · Вручную.
   - **Ссылка на отзыв** — the review's own page, if there is one
     (the room links the source label to it).
3. **Показывать на сайте** (`featured`) — tick it for a review that should be
   one of the five on the page. Off by default.
4. **Порядок** (`priority`) — an optional whole number; lower comes first.
   Leave it empty to order by date among the unnumbered.
5. **Опубликован** (`published`) — on by default; untick to hide a review
   from the site without deleting it.
6. Press **Publish**. Until then the document is a draft and the site does
   not see it — the site reads the `published` perspective only.

### How the site chooses the five

One query, one rule (`src/lib/reviews/sanityProvider.ts`):

```groq
*[_type == "review" && published == true && featured == true]
  | order(priority asc, date desc)
  [0...5]
  { "id": _id, author, rating, date, text, source, sourceUrl }
```

- only published documents (drafts are invisible), `published == true`
  **and** `featured == true`;
- `priority` ascending — numbered reviews first, in that order; reviews
  without a number after them;
- ties and unnumbered reviews by `date`, newest first;
- at most five. The site shows them in exactly this order — the Studio
  decides, the site does not re-rank.

A row missing a required field or with a malformed value is dropped rather
than shown broken.

### When Sanity is unavailable

`getReviews()` never throws. The chain is: Sanity → (the reserved platform
provider, empty until an official channel exists) → in **development** the
sample records from `src/data/reviews-sample.ts`, labelled as samples by the
room → in **production** an empty list: the room keeps its intro and its foot
and shows no voices. Placeholders are never presented as reviews in
production. The client makes one retry and gives up after 8 s.

---

## Stack

|                                              | Version          | Notes                                                                      |
| -------------------------------------------- | ---------------- | -------------------------------------------------------------------------- |
| React                                        | `~19.2.8`        | Pinned below 19.3 — see _Compatibility_                                    |
| TypeScript                                   | `~5.9.3`         | Strict, with `noUncheckedIndexedAccess` and `exactOptionalPropertyTypes`   |
| Vite                                         | `^8.3.0`         | Rolldown-based                                                             |
| three.js                                     | `^0.185.1`       | Pinned to match `@types/three` — see _Compatibility_                       |
| @react-three/fiber                           | `^9.7.0`         |                                                                            |
| @react-three/drei                            | `^10.7.8`        |                                                                            |
| GSAP                                         | `^3.15.0`        | Core + ScrollTrigger (both free)                                           |
| @gsap/react                                  | `^2.1.2`         | `useGSAP`                                                                  |
| lenis                                        | `^1.3.26`        | Eased scroll behind the `SmoothScroll` interface; off under reduced motion |
| postprocessing + @react-three/postprocessing | `^6.39` / `^3.1` | Installed for the glass phase, not mounted                                 |
| @fontsource (Prata, Inter, JetBrains Mono)   | `^5.3`           | Free development faces with Cyrillic — see `docs/TYPOGRAPHY.md`            |

Dev: ESLint 10 + typescript-eslint 8, Prettier 3, Playwright 1.63,
rollup-plugin-visualizer (bundle report at `dist/stats.html`).

### Compatibility decisions

- **React is pinned to `~19.2.8`, not `^19`.** `@react-three/fiber@9.7.0`
  declares `react: ">=19 <19.3"`. React 19.3.0 is published as `latest`, so a
  caret range would install a version R3F does not support. The tilde keeps us
  on the 19.2 line. Revisit when R3F widens the range.
- **three is pinned to `^0.185.1`, not `0.186`.** three.js does not ship its own
  type declarations; types come from `@types/three`, whose latest is `0.185.4`.
  Matching runtime to types exactly is worth more than one minor version.
  `^0.185.1` still picks up patches (caret on a `0.x` version pins the minor).
  This also sits inside `postprocessing`'s `>=0.168 <0.187` range for later.
- **TypeScript 5.9, not 7.0.** TS 7.0.2 is `latest`, but `typescript-eslint@8`
  declares `typescript: ">=4.8.4 <6.1.0"` — adopting TS 7 today means dropping
  type-aware linting. Revisit when typescript-eslint supports it.
- **Vite 8 uses Rolldown**, which takes `build.rollupOptions.output.codeSplitting.groups`
  rather than Rollup's object-form `manualChunks` (function-only there) or the
  now-deprecated `advancedChunks`.
- **GLSL needs no plugin.** Shaders are imported with Vite's built-in `?raw`
  suffix. `vite-plugin-glsl` gets added only if `#include` composition becomes
  genuinely painful.
- **Post-processing is installed but not mounted** — see
  `src/three/effects/README.md` for the narrow approved use.
- **Lenis is the scroller** for the `full` tier only; reduced motion, low tier
  and save-data get the native scroller (`src/animations/scroll/`).

---

## Project structure

```
src/
  components/   ui (Button, TextLink, WallLabel, Placeholder, Field, InquiryLink)
                common (Room, MetaList, Handoff) · layout (Header, StickyBar, Footer)
  sections/     the ten rooms: Hero Manifesto Services Pricing Cases Specialists
                Founder Reviews Contact Inquiry
  three/        ALL WebGL — scenes (empty until the glass phase), components, materials, shaders, effects, utils
  animations/   ALL motion — gsap, scroll (Lenis / native, horizontal pin), transitions
  hooks/        media queries, reduced motion, visual tier, hash params
  lib/          section constants, inquiry pre-fill, Russian typography helpers, env, math
  styles/       tokens (type system approved; colour greyscale) → globals → component styles
  data/         clearly marked placeholder content modules (Russian)
  types/        shared and content types, GLSL ambient declarations
e2e/            Playwright visual QA
public/         served verbatim — images, video, models, textures, production fonts
```

Four layers are kept separate on purpose: **UI · WebGL · motion · design
system.** Nothing outside `src/three/` imports `three`; scenes never touch the
DOM. Full detail in [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

### Design tokens

`src/styles/tokens/` holds colour, typography, spacing, layout, breakpoints,
z-index and motion tokens. The type system is approved (`docs/TYPOGRAPHY.md`);
colour is deliberately greyscale until the colour phase, with the approved
palette recorded in `color.css`. `tokens.ts` mirrors the subset motion code needs.

Components consume `var(--token)`, never a raw hex, px or duration.

---

## Reference repositories

`.references/` holds full clones of seven third-party repositories that Claude
Code reads as supporting knowledge:

```
.references/
  design-dna/           github.com/zanwei/design-dna
  taste-skill/          github.com/Leonxlnx/taste-skill
  scroll-craft/         github.com/nateherkai/scroll-craft
  anthropics-skills/    github.com/anthropics/skills
  react-three-fiber/    github.com/pmndrs/react-three-fiber
  drei/                 github.com/pmndrs/drei
  threejs/              github.com/mrdoob/three.js   (sparse: docs, src, examples/jsm, manual)
```

**`.references/` is git-ignored and is never committed.** It is ~300 MB of
third-party source; vendoring it would bloat the repository, mix foreign licences
into our history and make every clone slow. Re-create it on any machine with:

```bash
npm run refs:sync
```

The script (`scripts/sync-references.sh`) shallow-clones each repository, updates
any that already exist, and retries with exponential backoff on network failure.
three.js is cloned sparsely — the full repository carries roughly a gigabyte of
example assets we have no use for.

**Treat `.references/` as read-only.** Never edit anything inside it.

---

## Claude Code skills

`.claude/skills/` holds 11 lightweight, instruction-oriented skills (~700 kB) —
and these _are_ committed. Four were imported from existing repositories, five
were written for this project, two came from Anthropic's skill collection.

The split between `.claude/skills/` (instructions) and `.references/` (source)
is deliberate: dumping seven repositories into the skills folder would bury the
instructions under library code.

See [`docs/SKILLS.md`](docs/SKILLS.md) for what each skill is for, which one wins
when two conflict, and exactly what was adapted during import.

---

## Documentation

- [`CLAUDE.md`](CLAUDE.md) — the approved direction, hard rules (women only,
  Russian only, asset policy, placeholders, conversion), and the
  CSS → GSAP → WebGL decision ladder.
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — THROUGH GLASS as
  architecture, UI, motion, R3F, shader, asset and performance architecture,
  dependency register.
- [`docs/TYPOGRAPHY.md`](docs/TYPOGRAPHY.md) — the type system and font
  recommendation.
- [`docs/SKILLS.md`](docs/SKILLS.md) — the skills and when to use each.
