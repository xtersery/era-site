# ERA — premium aesthetic medicine clinic website

Creative front-end for a high-end aesthetic medicine clinic. React + TypeScript +
Vite, React Three Fiber for WebGL, GSAP for motion.

> **Status: project initialised, design not started.**
> Stack, architecture, design tokens and Claude Code skills are in place. No
> visual concept has been chosen yet. Sections are structural stubs and design
> tokens are neutral placeholders — see `CLAUDE.md`.

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
npm run refs:sync  # clone/refresh .references/
```

`npm run build` runs the typecheck first, so a passing build is type-clean.

---

## Stack

|                    | Version    | Notes                                                                    |
| ------------------ | ---------- | ------------------------------------------------------------------------ |
| React              | `~19.2.8`  | Pinned below 19.3 — see _Compatibility_                                  |
| TypeScript         | `~5.9.3`   | Strict, with `noUncheckedIndexedAccess` and `exactOptionalPropertyTypes` |
| Vite               | `^8.3.0`   | Rolldown-based                                                           |
| three.js           | `^0.185.1` | Pinned to match `@types/three` — see _Compatibility_                     |
| @react-three/fiber | `^9.7.0`   |                                                                          |
| @react-three/drei  | `^10.7.8`  |                                                                          |
| GSAP               | `^3.15.0`  | Core + ScrollTrigger (both free)                                         |
| @gsap/react        | `^2.1.2`   | `useGSAP`                                                                |

Tooling: ESLint 10 + typescript-eslint 8, Prettier 3.

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
- **Not installed on purpose:** `postprocessing` /
  `@react-three/postprocessing` (every pass is a full-screen read — see
  `src/three/effects/README.md`), and any smooth-scroll library (native
  scrolling is correct until a scrubbed pinned sequence justifies Lenis — see
  `src/animations/scroll/smoothScroll.ts`).

---

## Project structure

```
src/
  components/   normal React UI — ui / layout / common
  sections/     Hero, Philosophy, Treatments, Cases, Doctor, Reviews, Contact
  three/        ALL WebGL — scenes, components, materials, shaders, effects, utils
  animations/   ALL motion — gsap, scroll, transitions
  hooks/        media queries, reduced motion, isomorphic layout effect
  lib/          framework-agnostic helpers, section id constants
  styles/       tokens (placeholders) → globals → component styles
  data/         typed content modules (empty — no copy written yet)
  types/        shared types, GLSL ambient declarations
  assets/       imported, hashed assets
public/         served verbatim — images, video, models, textures, fonts
```

Four layers are kept separate on purpose: **UI · WebGL · motion · design
system.** Nothing outside `src/three/` imports `three`; scenes never touch the
DOM. Full detail in [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

### Design tokens

`src/styles/tokens/` holds colour, typography, spacing, layout, breakpoints,
z-index and motion tokens. **All values are neutral placeholders** — no branding
decision has been made. `tokens.ts` mirrors the subset motion code needs.

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

- [`CLAUDE.md`](CLAUDE.md) — quality bar, development principles, and the
  CSS → GSAP → WebGL decision ladder.
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — UI, motion, R3F, shader,
  asset and performance architecture.
- [`docs/SKILLS.md`](docs/SKILLS.md) — the skills and when to use each.
