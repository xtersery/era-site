# ЭРА cosmetology — premium cosmetology clinic website

A creative front-end project: React + TypeScript + Vite, with React Three Fiber
for WebGL and GSAP for motion. The goal is an **Awwwards-level** site for a
high-end cosmetology clinic for women that is also a **high-converting clinic
website** — not a clinic template with effects on it, and not an art piece that
hides the booking path.

**Status: art direction approved — THROUGH GLASS. Immersive system: Step 0–1
done; Spike A (hero refraction) CLOSED — material approved, hero composition
NOT final; Spike B (services) — the wheel, three alternative directions, the
chamber-in-a-field and the literal 3D room were rejected; what survived is the
information model (a service state = the entire editorial composition, moving as
one unit). The direction — 2D RADIAL EDITORIAL SYSTEM — is approved in principle: the wheel
is a hidden navigation engine, never shown as an object. **Spike B is CLOSED — APPROVED**: the 2D radial
editorial system, the full state as one unit, pinned page scroll as the primary
driver at 85 vh per state with snap, secondary controls, no scroll interception,
and the current visual direction are **locked** (`docs/spikes/B-services.md`,
reference implementation `spikes/radial/`). Do not redesign Services.
Spike C (cases) — DIRECTION APPROVED: THE ARCHIVE ON A RAIL (`spikes/gallery/`): curved case sheets hung on a helical rail, scroll walks the rail, a chosen sheet flies forward and unrolls into an editorial case. Pass 7b (spiral geometry: a tight ring of 8 cases making one full turn — r 3.6, 44°, longer lens from slightly above, back faces as slates, clamped recession) 7c (the opened case as an isolated scene: archive fades to 3 % while open, «×» close at the sheet's corner, return to the same scroll position) and 7d (04.1 as the frontal anchor — the drift is a ±1.7° breath, not a rotation; the rail starts at 04.1) are built and awaiting the closing review. Do not return to portals or other concepts. Earlier passes kept: `spikes/portal/` (passage, closed), `spikes/cases/` (CSS archive, `none`-tier fallback). See `docs/spikes/C-cases.md`. Spike D (specialists) — PINNED PORTRAIT GALLERY, one direction as briefed: pass 12 «Сеанс» (`spikes/portraits/`: one portrait at the scale of a person, the name on a fixed 30 % datum, the focal line at rest, and THE SMOKY QUARTZ (`src/assets/smoky-quartz.png` as the surface of a body with its own traced silhouette) RESIDENT on the wall/frame boundary with the name crossing in front of it; the portrait change comes OUT of the stone as a front with a wake; words arrive by f ≈ 0.28; section DOM + CSS with one section-wide canvas, page scroll + pin + snap; published only via `scripts/artifact-copy.mjs`) is built and awaiting review — `docs/spikes/D-specialists.md`. The greyscale horizontal pin stays the `none`-tier fallback. See
`docs/spikes/B-services.md`.** The concept phase is closed. Do
not propose alternative art directions, reorder sections, change the colour
system or typography philosophy, or remove the glass metaphor. The greyscale
prototype is the `none` tier and stays greyscale; the immersive layer is gated
by spikes (A → B → C) and each spike stops for approval.

---

## The approved art direction — THROUGH GLASS

> The clinic is something you look _through_. The visitor is inside the
> instrument: one optical path from distortion to clarity, one **mineral-glass
> material** in related bodies (lens, membrane, wheel, window, droplet) and light
> traces (hairline, focal line, caustics), one light, one state. The wordmark
> «эра» is seen refracted at the entrance and clear at the end, when the glass
> clears as the visitor sends the form. Between, the site is composed like a
> women's fashion editorial and labelled like a precision instrument.

Three sources, each with a fixed role:

- **Refraction** — the primary visual language: glass, optics, refraction,
  chromatic dispersion, the WebGL hero.
- **Relief** — the editorial manners: serif display typography, the wall-label
  caption system, sculptural asymmetric composition, restraint as luxury.
- **Calibration** — the structural discipline: visible grid logic, technical
  numbering, mono metadata, structured pricing and service information.

**Signature move:** a Cyrillic serif headline bending through real glass.
**The one thing remembered:** the glass that clears when the form is sent.
**Deliberately absent:** cards, icons, stars, gradient fills, blur as
decoration, capitals in headlines, anyone smiling at the camera, anything male.

### Material identity — ERA Mineral Glass (approved in principle)

Derived from the two real references in `docs/references/` (the official logo
and the entrance wall). Sampled values are **design interpretations, not brand
specifications** until a brand guide confirms them.

- **Deep forest green is depth**, never surface: the glass's attenuation colour
  (thick = green, thin = clear) and the deepest ground gradient. Grounds are
  green-black, not green. Skin tone is never contaminated by it.
- **Gold is light**, never decoration: reflected light, a fine optical edge,
  occasional specular glints, the double rim, the CTA on dark. No metallic
  fills, no gold type, no gold on light grounds except a 1 px glint.
- **Marble is geological logic**, never a texture: vein flow inside the glass
  (luminance-derived from the wall), two scales, ~35° flow, book-matched pairs
  on the wheel. No marble backgrounds. The one literal marble is the real wall
  in the real Contact photograph.
- **The official ERA brand mark ≠ the editorial «эра».** The mark (header,
  footer, favicon, OG, success, contact) is flat gold on dark / ink on light and
  is never refracted. The serif «эра» is the typographic protagonist and is not
  a logo. Vector artwork for the mark is pending from the client.
- **The double optical rim** (the mark's double ring as an edge detail) stays
  subtle — reduce it if it reads as a logo echo.
- The material must feel architectural, mineral, sensual, calm, heavy,
  expensive, precise, feminine, physically believable — and never like a WebGL
  demo, glassmorphism, a soap bubble, a crystal orb, a sci-fi lens or an
  emerald-luxury cliché.

Full detail — rooms, rhythm, CTA system, glass appearances, Cases lens — is in
`docs/ARCHITECTURE.md` §0.

### Approved section order (do not reorder)

```
00 hero         Главная
01 manifesto    Манифест           (short — one pinned screen, not a detour)
02 services     Услуги
03 pricing      Стоимость
04 cases        Кейсы · до / после
05 specialists  Специалисты        (horizontal pinned scroll on desktop, ≥3 people)
06 founder      Основатель
07 reviews      Отзывы
08 contact      Адрес и контакты
09 inquiry      Заявка
```

Ids live in `src/lib/constants/sections.ts` — the single source of truth for
anchors, navigation, ScrollTrigger keys and CTA routing.

Commercial arc: **увидеть → понять → узнать стоимость → увидеть результат →
выбрать специалиста → довериться основателю → увидеть отзывы → понять, куда
прийти → оставить заявку.**

---

## Hard rules

### 1. Women only

ЭРА is positioned for women. In every non-team image: **no men anywhere** — no
male portraits, silhouettes, hands, body fragments, or references in campaign
imagery or copy. Target imagery: women primarily 35–60, sophisticated, mature,
intelligent, elegant, hyperrealistic, editorial, natural skin texture. No
cheap beauty-model clichés, no stock-photo energy.

Placeholder copy follows the same rule — no male names, no male pronouns, no
«клиенты» framed as men. Team placeholders use female names and forms
(«врач-косметолог», «основатель», feminine verb endings where natural).

### 2. Russian-only visible UI

**Every visible string is Russian**: navigation, headings, CTAs, labels,
microcopy, service names, pricing, review labels, form labels, contact details,
section labels, error messages, success states, placeholder copy, `alt` text,
`aria-label`s, `<title>`. Code, comments and documentation may be English.

Russian typography is part of the premium feel and is enforced:

- «ёлочки» for quotation marks, „лапки“ only for nested quotes
- long dash — with a non-breaking space before it (` —`)
- non-breaking space after short prepositions and conjunctions
  (в, на, не, и, с, к, о, от, до, по, за, из, у, для, при, без, …) — use the
  `ru()` helper in `src/lib/utils/ru.ts`, never hand-type it in JSX
- prices as `12 000 ₽` — narrow no-break space between thousands, NBSP before
  ₽ — via `formatRub()` in `src/lib/utils/ru.ts`; ranges as `12 000 — 18 000 ₽`
- tabular figures wherever numbers align
- no Latin-centric line-breaking: `hyphens: manual`, `text-wrap: balance`
  on headings, `text-wrap: pretty` on body

### 3. Asset policy — launch vs concept

**Generated imagery (Higgsfield or equivalent) is allowed and encouraged** for:
hero atmosphere, campaign visuals, services atmosphere, cases, before/after and
outcome imagery, transitions, interludes, the form finale. Requirements:
hyperrealistic, editorial, women 35–60, visible pores and skin character, no
plastic smoothing, no artefacts (hands, teeth, eyes, ears, hairline checked),
no smile-to-camera, no clinic set, no white coats.

**Real people are real.** The founder, the specialists, reception, the rooms and
the door are commissioned photography in the same grade. During the
concept/prototype stage, hyperrealistic stand-ins are allowed **only when
labelled** `[Плейсхолдер — заменить на реальную съёмку]` in design files and
with `data-placeholder` in markup.

**Cases.** In the concept stage generated «до / после» pairs are allowed: same
framing, light, distance, neutral expression, no makeup, subtle plausible change.
**At launch every case is either a real patient with written consent
(`Реальный кейс · публикуется с согласия пациента`) or carries the visible
label `Визуализация`.** Never a generated result presented as real.

**No stock photography. Ever.** One grade across all imagery classes.

### 4. Placeholder content policy

The client supplies service names, descriptions, prices, names, credentials,
reviews, address and legal copy. Until then the prototype uses **clearly marked
format examples** in `src/data/`:

- every module exports `placeholder: true` and every record carries
  `isPlaceholder: true`
- visible placeholder facts are wrapped in square brackets — `[Имя Фамилия]`,
  `[ул. Адрес, 00]`, `[00] лет` — or marked «Пример» in the mono source line
- example prices are realistic in _format_ only; they are not quotes
- the current example service copy (seven categories with one-line promises) is
  approved **as placeholder content** — do not rewrite or remove it at this
  stage, and do not promote it to final
- copy marked `[ФИНАЛЬНЫЙ … БУДЕТ УТВЕРЖДЁН ОТДЕЛЬНО]` is a pending decision:
  the hero headline, the manifesto text and the cases headline. Render the
  bracketed placeholder; never substitute a proposed line.

Never invent credentials, outcomes, medical claims, or legal text. An obvious
bracket is better than a plausible fabrication.

### 5. Conversion rules

- A primary CTA is visible in the first viewport.
- «Записаться» is persistent in the header; the phone has a sticky action bar
  («Записаться» · «Позвонить» · «Telegram»).
- Contextual CTAs in Услуги, Стоимость, Кейсы, Специалисты, Основатель.
- The inquiry form is always one tap away; CTAs may **pre-fill** procedure and
  specialist (`src/lib/inquiry/`). Pre-filled values are visible and editable.
- **One primary CTA per viewport.** Secondary routing links («Стоимость →»,
  «Посмотреть кейсы →», «Выбрать специалиста →») connect related rooms.
- Every section ends with a handoff. «Scroll is the conversion» is not a
  strategy.
- Primary CTAs are rectangles (no radius), 56 px tall on touch, on dark filled
  with `--color-cta` (lamp), on light filled with ink. Secondaries are mono text
  links with a literal-direction glyph (↓ down the page, → across, ↗ external).

### 6. Motion rules specific to this site

- **Prices never count up or tick.** Allowed in Стоимость: hairline drawing,
  masked/clip reveals, row reveals. Numbers are stable, calm, confident.
- Glass *bodies* appear in hero, manifesto, services, cases and inquiry; light
  *traces* (hairline, focal line, caustics, highlight) in pricing, specialists,
  reviews and submit. Founder and contact have neither.
- Real faces are never seen through a lens. The only refracted face is the
  art-directed hero campaign portrait. The Cases window is clear (IOR 1.02, rim
  only) and the «до» reveal is a mix, never a distortion; the `none` tier's CSS
  clip does the same.
- Light travels, never fades: reveals are wipes along the optical axis or
  masked lines. The dispersion tell (2 px cyan/magenta split collapsing into the
  letter) happens once per heading, never on body text.
- Hard cuts between dark and light rooms. Nothing under 0.4 s except hairlines.

---

## Quality bar

Every visual solution is evaluated against one question:

> **"Would this feel credible on an Awwwards-level creative website — and does
> it move a 45-year-old woman one step closer to booking?"**

Practically:

- **Do not generate generic landing-page layouts.** Alternating image/text
  sections, three-column feature grids, a centred hero with two buttons — these
  are failures, not starting points.
- **Prefer the approved concept over added effects.** One memorable idea
  executed with restraint beats five effects.
- **If the page is not good in greyscale with no motion, fix the composition.**
  The greyscale typographic prototype must already feel premium through type,
  asymmetry, spacing, rhythm, scale and hierarchy alone.
- **Do not simplify into a generic clinic layout**, replace editorial language
  with cards, introduce Tailwind-like visual conventions, or drift into beige
  medspa styling.

Read `.claude/skills/premium-web-design/SKILL.md` before touching any layout.

---

## Development principles

- **Build reusable components.** But do not build an abstraction before there is
  a second use for it.
- **Keep WebGL isolated from normal UI.** Everything three.js lives under
  `src/three/`. Scenes never touch the DOM; components never import three
  directly. The page must work with the canvas removed. The canvas is
  `pointer-events: none` forever — interaction is captured by DOM **grips**
  that write to `lib/stage` (docs/ARCHITECTURE.md §0.8).
- **Avoid unnecessary dependencies.** Every package is weight on a mobile
  connection. Check whether the platform, GSAP or ~30 lines of our own code
  already does it. Additions are justified in the commit and in
  `docs/ARCHITECTURE.md` §8.
- **Use semantic HTML.** Real `<section>`, `<h1>`–`<h3>`, `<button>`, `<a>`,
  `<figure>`, `<table>` for the price list, `<label>` for every field. A `<div>`
  with a click handler is a bug.
- **Keep accessibility intact.** Visible focus, ≥ 4.5:1 body contrast, keyboard
  operability (tabs, the Cases lens toggle, the reviews list), alt text in
  Russian, screen-reader-correct text when splitting lines. The client base is
  older; touch targets are ≥ 44 px, body text ≥ 1.0625 rem (1.125 rem on phone).
- **Respect `prefers-reduced-motion`.** CSS is handled globally. GSAP and WebGL
  are **not** — every JS animation needs an explicit branch that lands in the
  final state, never one that simply skips the tween.
- **Three states for every visual feature:** full · reduced-motion still ·
  no-WebGL / low-tier. Never a hole where a composition was.
- **Design mobile as its own composition.** 390 px is designed alongside
  1440 px, not adapted afterwards. Target widths: 1440 · 1280 · 768 · 390.
- **Avoid huge monolithic components.** A section over ~150 lines contains a
  component.
- **Avoid inline CSS for major systems.** Layout, type and colour live in
  stylesheets driven by tokens. Inline style is for a computed one-off value
  (e.g. the lens position custom properties).
- **Keep animation logic organised.** Under `src/animations/`, built from the
  shared vocabulary in `gsap/timelines.ts`, always inside `useGSAP` with a scope.
- **Keep shaders modular.** Shared chunks in `src/three/shaders/lib/`,
  scene-specific GLSL beside its scene, composed with `composeShader()`.
- **Keep design tokens centralised.** `src/styles/tokens/`. A component never
  contains a raw hex, px or duration. The approved palette and type system are
  recorded there; the greyscale phase keeps colour tokens neutral on purpose.

---

## Before writing complex visual code

Ask, in order, and stop at the first yes:

1. **Can this effect be done efficiently with CSS?** Transforms, `clip-path`,
   `mask-image`, blend modes, `filter`, gradients. (The Cases lens is CSS.)
2. **If not, should GSAP handle it?** Timing, choreography, scrubbing, pinning.
   (The Specialists horizontal scroll is GSAP.)
3. **If not, does it justify WebGL?** Only genuine per-pixel or per-vertex work.
   (Refraction with dispersion is. Nothing else on this site is.)
4. **If WebGL is required, R3F or a custom shader?** drei
   `MeshTransmissionMaterial` first; a custom shader only when the shader is
   the idea.

---

## Architecture at a glance

```
src/
  components/   ui (Button, TextLink, WallLabel, Field, Placeholder…) · layout (Header, StickyBar…) · common
  sections/     the ten rooms, one folder each
  three/        ALL WebGL: scenes (Glass — later), components, materials, shaders, utils
  animations/   ALL motion: gsap, scroll (Lenis behind SmoothScroll), transitions
  lib/          constants/sections, inquiry prefill, ru typography helpers, env, math
  hooks/        media queries, reduced motion, breakpoint
  styles/       tokens → globals → components
  data/         clearly marked placeholder content modules
  types/
```

Full detail: `docs/ARCHITECTURE.md`. Typography: `docs/TYPOGRAPHY.md`.
Skills: `docs/SKILLS.md`.

---

## Commands

```bash
npm install        # install dependencies
npm run dev        # dev server on http://localhost:5173
npm run typecheck  # tsc --noEmit
npm run build      # typecheck + production build (+ dist/stats.html bundle report)
npm run preview    # serve the production build
npm run lint       # eslint
npm run format     # prettier --write
npm run test:e2e   # Playwright visual QA (uses installed Google Chrome)
npm run refs:sync  # clone/refresh .references (git-ignored, ~300 MB)
```

---

## Skills

| Use it for                                                   | Skill                |
| ------------------------------------------------------------ | -------------------- |
| This project's art direction, and what it must not look like | `premium-web-design` |
| Design systems, extracting structure from references, tokens | `design-dna`         |
| Visual taste, anti-template quality gate                     | `taste-skill`        |
| Scroll as narrative — journey, grammar, signature move       | `scroll-craft`       |
| Implementing motion: GSAP, ScrollTrigger, reveals, pinning   | `gsap-motion`        |
| R3F scenes in React                                          | `react-three-fiber`  |
| Core three.js: materials, lighting, colour, debugging        | `threejs`            |
| GLSL technique and its cost model                            | `webgl-shaders`      |
| Budgets, Core Web Vitals, mobile                             | `web-performance`    |
| Baseline visual craft                                        | `frontend-design`    |
| Verifying visual work in a real browser                      | `webapp-testing`     |

`docs/SKILLS.md` says when each applies and which wins when two conflict
(short answer: `premium-web-design`, then this file's hard rules).

---

## Ground rules for changes

- `.references/` is **read-only** and git-ignored.
- The approved palette and type system are **recorded** in tokens; the greyscale
  phase deliberately keeps colour neutral. Do not activate final colour before
  the colour phase is approved.
- Do not invent clinic content. Placeholders are bracketed and flagged
  (`isPlaceholder`). See Hard rule 4.
- Measure before claiming performance. Bundle report: `dist/stats.html`.
  Device tier never reads `navigator.deviceMemory`; measured FPS is the
  authority (§0.6).
- Spikes live in `spikes/<name>/` (dev-only Vite pages, type-checked, not
  built for production) and never touch the prototype's rooms. A spike or
  board published as an artifact goes through `scripts/artifact-copy.mjs`
  (`SPIKE=<name> npx vite build --config vite.spike.config.ts` →
  `node scripts/inline-spike.mjs <name>` → `node scripts/artifact-copy.mjs`);
  never strip tags from a built page by hand — a `<meta[^>]*>` regex once
  deleted `<metalnessmap_fragment>` from the inlined three.js and broke every
  physical material's shader in the published page only.
- Decision records and review-board links live in `docs/spikes/*.md`
  (`A-hero.md` closed; `B-services.md` open). Read them before touching the
  hero or services rooms.
- Phases are gated. Do not continue into the next production phase (colour,
  imagery, WebGL glass, post-processing, advanced choreography) without
  explicit approval.
