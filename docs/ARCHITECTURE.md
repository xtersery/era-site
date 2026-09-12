# Architecture

The project is organised around one idea: **four layers that can change
independently** — normal UI, WebGL, motion, and the design system. A change to
the brand palette should not touch a component. A change to a scene should not
touch the DOM. A change to the choreography should not touch either.

```
era-site/
├── .claude/skills/     instruction-oriented skills Claude loads (lightweight)
├── .references/        read-only third-party source, git-ignored (~300 MB)
├── docs/               this file, TYPOGRAPHY.md, SKILLS.md
├── e2e/                Playwright visual QA
├── public/             served verbatim — images, video, models, textures, fonts
├── scripts/            sync-references.sh
└── src/
    ├── components/     ui / layout / common — normal React, no three.js
    ├── sections/       one folder per room (ten)
    ├── three/          ALL WebGL
    ├── animations/     ALL motion
    ├── hooks/          React hooks (media queries, reduced motion, layout effect)
    ├── lib/            constants, inquiry prefill, Russian typography helpers, env, math
    ├── styles/         tokens → globals → component styles
    ├── data/           clearly marked placeholder content modules
    ├── types/          shared types and ambient declarations
    └── assets/         imported, processed assets (hashed by Vite)
```

---

## 0. THROUGH GLASS — the approved direction as architecture

The art direction is approved (see `CLAUDE.md`). This section records the parts
of it that constrain code.

### 0.1 Rooms and rhythm

Ten sections, called _rooms_, each a real `<section id>` landmark. Each room has
a **ground** — dark or light — set by a `room--dark` / `room--light` class that
re-points the semantic colour tokens. The rhythm is fixed:

| #   | id            | Room               | Ground     | Glass        |
| --- | ------------- | ------------------ | ---------- | ------------ |
| 00  | `hero`        | Главная            | dark       | appearance 1 |
| 01  | `manifesto`   | Манифест           | dark→light | appearance 2 |
| 02  | `services`    | Услуги             | light      | —            |
| 03  | `pricing`     | Стоимость          | dark       | —            |
| 04  | `cases`       | Кейсы · до / после | light      | CSS «Линза»  |
| 05  | `specialists` | Специалисты        | light      | —            |
| 06  | `founder`     | Основатель         | dark       | —            |
| 07  | `reviews`     | Отзывы             | dark       | —            |
| 08  | `contact`     | Адрес и контакты   | light      | —            |
| 09  | `inquiry`     | Заявка             | dark       | appearance 3 |

Transitions between grounds are hard cuts. The manifesto is the one exception:
it brightens from dark to light as the lens exits.

### 0.2 The stage — one canvas, glass rooms, opaque rooms

The immersive layer is **one stage**: a single persistent canvas
(`three/components/StageCanvas.tsx`, `position: fixed`, `--z-canvas`, behind
the DOM, `pointer-events: none`, `frameloop="demand"`), mounted once after
LCP + idle for the `high` and `mid` tiers only. Rooms are either **glass** —
transparent DOM ground, the canvas paints the ground colour and hosts a _set_
— or **opaque** — DOM background, the canvas idle:

| Glass rooms (canvas paints the ground)                       | Opaque rooms (DOM ground, canvas idle)              |
| ------------------------------------------------------------ | --------------------------------------------------- |
| hero · manifesto · services (wheel column) · cases · inquiry | pricing · specialists · founder · reviews · contact |

Sets (`HeroSet`, `ManifestoSet`, `ServicesSet`, `CasesSet`, `InquirySet`) mount
while their chapter is current ±1; far sets unmount and dispose (LRU by chapter).
The glass appears in three _bodies of the same family_:

1. **Hero** — lens ~45vh, off-centre right, refracting the wordmark «эра» and,
   behind it, the campaign portrait. Pointer nudges position (≤ 6°), scroll
   raises IOR 1.25 → 1.55 and lifts the lens toward the manifesto.
2. **Manifesto** — pinned pass: the lens travels left→right across two serif
   lines; DOM text under the lens is sharp (CSS `filter` 2px → 0 outside it).
3. **Inquiry** — lens at 20 % strength behind the form; each completed field
   lowers IOR; valid submit clears it (IOR → 1.0, dispersion → 0).

**Material — ERA Mineral Glass, one shared material _system_.**
`three/materials/mineralGlass.ts` produces per-object instances on one of three
rendering paths — `transmission` (drei `MeshTransmissionMaterial`), `hybrid`
(built-in physical transmission + dispersion + a fresnel-tint compile patch),
`screen` (an FBO fake-refraction shader) — that share the same **ERA
environment map** (dark studio, gold key, teal fill), the same **vein normal /
thickness map** (derived from the real entrance wall, luminance only,
book-matched), the same attenuation colour (deep green: green lives in
_thickness_, never on the surface), the same two dispersion poles (mineral
teal ↔ logo gold), the same fresnel curve and the same rare specular sparkles.
Per-instance: `clarity`, `thicknessScale`, `veinPhase`, `segmentId`. Path is
chosen per object by tier and role; Spike A is the family-match gate.

The lens and the window carry a **double hairline rim** — the official mark's
double ring as an optical edge detail, kept subtle (reduce if it reads as a
logo echo). Gold is light only: rim highlight, sparkles, caustics, the final
highlight, the CTA on dark. Never a metallic fill.

Budget: `samples` 6 high / 2 mid, `resolution` 1024 / 512, ≤ 2 transmission
bodies at once, `screen` path on phones if Spike A says so, **stills** on
`reduced` and `none`. Every glass room ships a designed still (a poster, not a
fallback export).

Spike A (`docs/spikes/A-hero.md`) fixed the paths per tier — A `high`, B `mid` desktop/tablet, C phones and demotion — and the attenuation colour (a lifted derivative of the logo green, never the literal `#012118`, which turns skin olive in linear light). Gate before the production Hero merge: an on-device GPU run of path A.

Rules: real faces are never seen _through a lens_ — the only refracted face is
the art-directed hero campaign portrait; the Cases window is clear (IOR 1.02,
rim only). **The official ERA brand mark is never refracted and never behind
glass** — only the editorial serif «эра» participates in optical compositions.

### 0.3 The Cases comparison window («Линза»)

`high`/`mid` tiers (after Spike C): cases are image planes on an arc in the
stage; the active plane docks close; a flat, clear glass **window** (IOR 1.02,
double rim only) sits in front of it and the «до» is a circular _shader mix_
under the pointer — identical framing, no distortion by construction.
`reduced`/`none` tiers (built): the default image is «после»; a circular
`clip-path` on the «до» layer follows the pointer (`--lens-x`, `--lens-y`),
a 260 px "glass" with a 1 px rim, **no distortion**, identical framing beneath.
Both tiers read the same `stage.cases` state. Touch: drag. Keyboard and screen readers: a real
`<button aria-pressed>` «Показать до / после» toggles the full image; «Сравнить
рядом» swaps to a side-by-side diptych, which is also the phone layout.

Every case renders a mono **honesty label**: `Реальный кейс · публикуется с
согласия пациента` or `Визуализация`. The label is data, not decoration —
`CaseRecord.status`.

### 0.4 CTA routing and inquiry pre-fill

`src/lib/inquiry/` owns the path to booking:

- `InquiryProvider` — React context holding `{ procedure?, specialist? }`.
  Deliberately not a store library: one object, two setters, one consumer.
- `<InquiryLink procedure specialist>` — renders `<a href="#inquiry">`; on
  click sets the pre-fill then scrolls through `SmoothScroll`. Without JS it is
  still an anchor to the form.
- `Inquiry` reads the context into its selects. **Pre-filled values are visible
  and editable.** Submitting clears the pre-fill.

Routing secondaries («Стоимость →», «Посмотреть кейсы →») are anchors to section
ids plus an optional filter state in the URL hash query (`#pricing?cat=02.5`),
parsed by the target section on mount and on `hashchange`. No router.

CTA hierarchy: `Button` (primary rectangle) · `TextLink` (mono + glyph). One
primary per viewport; enforced by review, not code.

### 0.5 Women-only and Russian-only rules in code

- `data/` records for people carry `gender: 'f'` by type (`Person` has no other
  value) so a male placeholder cannot type-check.
- Every visible string is Russian. Strings live in `data/` or in the component
  JSX; there is no i18n layer because there is one language. `index.html` sets
  `lang="ru"`.
- Russian typography helpers in `lib/utils/ru.ts`: `ru()` inserts non-breaking
  spaces after short prepositions/conjunctions and before «—»; `formatRub()`
  formats prices (`12 000 ₽`, ranges `12 000 — 18 000 ₽`). Data modules run
  copy through `ru()` once at module scope.

### 0.6 Tiers — high · mid · reduced · none

Every visual feature declares its states:

| Tier    | Initial trigger                                                     | Glass                          | Motion                               |
| ------- | ------------------------------------------------------------------- | ------------------------------ | ------------------------------------ |
| high    | WebGL2 + max texture ≥ 4096, fine pointer, no reduced-motion        | live, `transmission` path      | full vocabulary, Lenis               |
| mid     | WebGL2, coarse pointer or small viewport or ≤ 4 cores (if reported) | live, `hybrid` / `screen` path | full vocabulary, Lenis, shorter pins |
| reduced | `prefers-reduced-motion: reduce`                                    | designed still                 | everything lands in final state      |
| none    | no WebGL2, `saveData`, context loss, or measured FPS below floor    | designed still                 | CSS-only; Lenis off; no pin scrub    |

`lib/stage/tier.ts` resolves the initial tier from capability only — **never
from `navigator.deviceMemory`** — and a rolling FPS sampler (2 s median) is the
final authority: it may promote `mid → high` once in the first 5 s (≥ 58 fps)
and may demote at any time (`high → mid → none`), one way per session.
`webglcontextlost` → `none`. `useVisualTier()` exposes the live value.
Specialists' horizontal pin is `high`/`mid`-only on `lg+`; otherwise a stack.

### 0.8 Stage state, anchors and grips

`lib/stage/stage.ts` is the one mutable state object of the immersive layer
(thirteen fields: tier, chapter + progress, scroll, pointer, camera, room tone,
glass, services, cases, form). Continuous fields are written by ScrollTrigger,
the global timeline, Lenis and the pointer handler and **read by refs** in
`useFrame` and the GSAP ticker; the few discrete fields React needs (tier,
chapter, active ids) are exposed through `useSyncExternalStore`. One writer per
field. Not a store library — Zustand's vanilla store is a drop-in if middleware
is ever needed.

**Anchors.** DOM elements marked `data-stage-anchor="<name>"` are measured on
`ScrollTrigger.refresh` and projected into world units at the camera plane
(`three/utils/projection.ts`): the scene places its planes where the DOM says.
DOM never moves to match the scene.

**Grips.** The canvas keeps `pointer-events: none` forever. Interaction is
captured by DOM **grips** — `aria-hidden`, non-focusable, content-free
`<div class="stage-grip">` elements positioned on a set's anchor rect with
`touch-action: pan-y` (vertical scroll always survives), sitting under the CTA
layer. Hero: the section listens to `pointermove`; a lens-rect grip for
touch-drag. Services: a wheel grip (Draggable + Inertia + wheel events →
`services.wheelAngle`); the tabs stay the accessible control. Cases: a grip on
the active plane (`pointermove` → `reveal.cx/cy`, press-and-hold → `reveal.mix`,
horizontal drag → `cases.arcAngle`); the buttons stay the accessible control.
Grips write normalised values to the stage only.

**Lifecycle.** `StageCanvas` mounts after `load` + idle (`requestIdleCallback`
with a `setTimeout` fallback and a hard 2 s ceiling), lazy-imports the WebGL
chunk, warms the material once, and thereafter renders only on `invalidate()`
from state writes; in opaque rooms with no set within ±1 chapter, zero draws.
Resize → refresh anchors → one render. Hidden tab → ticker paused.

### 0.9 Official brand mark vs editorial word motif

|           | OFFICIAL ERA BRAND MARK                                                                                                                             | EDITORIAL WORD MOTIF «эра»                                                                 |
| --------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| What      | the supplied ЭРА COSMETOLOGY logo (double ring, flourish, spaced sans) — `docs/references/era-logo.jpg`; **vector artwork pending from the client** | the large lowercase serif «эра» as an immersive typographic object                         |
| Where     | header, footer colophon, favicon, OG image, form success, contact                                                                                   | hero (refracted), submit resolution (clear), the manifesto wordmark texture — nowhere else |
| Rendering | flat `--color-gold` on dark rooms, ink on light; never metallic on the UI; never refracted, never behind glass                                      | canvas texture in the scene; may be refracted; never where a logo is expected              |

Until the vector arrives the header renders a traced placeholder flagged
`data-placeholder="mark"`.

### 0.7 Placeholder policy and launch-vs-concept assets

Content modules in `data/` export `placeholder: true`; records carry
`isPlaceholder: true`. Placeholder imagery is the `<Placeholder>` component
(labelled frame with mono caption) — never an unlabelled grey box. Pending copy
decisions render their bracket verbatim: `[ФИНАЛЬНЫЙ HERO-COPY БУДЕТ УТВЕРЖДЁН
ОТДЕЛЬНО]`.

Launch gate (checked by Playwright): no `data-placeholder` in the DOM, no
`isPlaceholder: true` record, no `[` bracket in rendered text, every case has a
status.

---

## 1. UI architecture

### Component tiers

| Tier         | Location             | Knows about                                                                                                                                                              |
| ------------ | -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **ui**       | `components/ui/`     | itself only — `Button`, `TextLink`, `WallLabel`, `Field`, `Placeholder`, `Hairline`. No layout knowledge, no content.                                                    |
| **common**   | `components/common/` | cross-cutting behaviour used by more than one section — `Room`, `SectionHeading`, `MetaList`, future `SplitLines`.                                                       |
| **layout**   | `components/layout/` | page structure — `Header`, `StickyBar`, `Footer`, the canvas host, the transition curtain. The only tier allowed to position `fixed` or read the z-index scale directly. |
| **sections** | `sections/<Room>/`   | one room each, composing the tiers above.                                                                                                                                |

A section over ~150 lines contains a component that has not been extracted yet.

### Section contract

Every section renders a real `<section id={id}>` landmark with
`aria-labelledby`, a `WallLabel` (`02 — Услуги`) and a ground class. Ids come
from `lib/constants/sections.ts`.

### Styling

Plain CSS with custom properties. No CSS-in-JS, no utility framework:

- CSS-in-JS adds runtime cost and a hydration story we do not need.
- A utility framework pushes design decisions into markup, and its defaults
  (rounded cards, pill buttons, standard scales) are exactly the template look
  this project is trying to avoid.

`styles/index.css` is the single entrypoint. Load order is load-bearing:
**tokens → reset → base → layout utilities → component styles.**

Component stylesheets are co-located (`Button.css` beside `Button.tsx`) and
imported from the component.

---

## 2. Motion architecture

Everything under `src/animations/`.

```
animations/
  gsap/
    register.ts    single plugin registration; house defaults; called once from main.tsx
    timelines.ts   shared reveal vocabulary (masked lines, clip reveal, reduced-motion settle)
  scroll/
    smoothScroll.ts  SmoothScroll interface · native implementation · Lenis implementation
    ScrollProvider   chooses Lenis (full) or native (reduced / none), wires ScrollTrigger
  transitions/     cinematic section/page transitions (empty by design)
```

### Rules

- **One registration point.** `registerGsap()` runs before React mounts.
- **Available plugins:** since GSAP 3.13 every formerly Club plugin ships free
  in the `gsap` package we install — ScrollTrigger, Draggable, InertiaPlugin,
  SplitText, Flip, CustomEase, ScrollSmoother. Register only what is used, in
  `register.ts`. ScrollSmoother is **not** adopted (Lenis is the scroller).
- **Every animation is created inside `useGSAP` with a `scope`.**
- **Timing values come from `styles/tokens/tokens.ts`**, not from literals.
- **Motion serves hierarchy.** One or two animated moments per _section_.
- **Prices never count up.** See `CLAUDE.md` Hard rule 6.

### Smooth scroll — decided: Lenis, behind the interface

Lenis is installed because the approved direction has two scrubbed, pinned
sequences whose feel depends on eased scroll position (manifesto lens pass,
Specialists horizontal scroll). It stays behind the `SmoothScroll` interface:

- `createLenisScroll()` wraps Lenis; `lenis.on('scroll', ScrollTrigger.update)`;
  `gsap.ticker.add(lenis.raf)`; `lagSmoothing(0)`.
- Lenis keeps native scroll position (no transform), so ScrollTrigger needs no
  `scrollerProxy` and `pin` works with `pinType: 'fixed'`.
- **Tiers `reduced` and `none` → `createNativeScroll()`.** No eased scroll for
  people who asked for less motion.
- Anchor navigation goes through `scroll.scrollTo()` so Lenis and native behave
  identically.

### Motion ↔ WebGL seam

GSAP owns timing. R3F owns rendering. They never drive the same value. GSAP
tweens a **plain JS object**; `useFrame` reads it:

```ts
const state = useRef({ progress: 0 });
useGSAP(() => {
  gsap.to(state.current, {
    progress: 1,
    ease: 'none',
    scrollTrigger: { trigger: el, scrub: 1 },
    onUpdate: invalidate,
  });
});
useFrame(() => {
  mesh.current.rotation.y = state.current.progress * Math.PI;
});
```

---

## 3. R3F architecture

Everything under `src/three/`. **Nothing outside `src/three/` imports `three`.**

```
three/
  components/
    SceneCanvas.tsx   the only place <Canvas> is written
  scenes/
    Glass/            the one scene — mounted three times (later phase)
  materials/
    shaderMaterial.ts typed ShaderMaterial factory + common uniforms
  shaders/
    lib/              shared GLSL chunks (simplex2d.glsl, fullscreen.vert)
    compose.ts        #include-free string composition
  effects/            post-processing — `postprocessing` + `@react-three/postprocessing`
                      installed for the glass phase (grain / subtle bloom on the
                      dispersion edge); not mounted yet
  utils/
    webgl.ts          hasWebGL, detectDeviceTier, dprRange
    dispose.ts        recursive GPU memory release
```

### `SceneCanvas` owns the global decisions

Capability gate, DPR ceiling, `frameloop="demand"`, `pointer-events: none`,
`antialias: false` (post-processing or DPR beats MSAA on cost), Suspense.

### Scene rules

- A scene **never** renders `<Canvas>` and **never** touches the DOM. Scroll
  progress and pointer position arrive as refs.
- A scene is **always** `lazy()`-imported. three.js must not be in the initial
  bundle.
- **One canvas per page.**
- Per-frame work mutates refs. No `setState`, no allocation, no DOM access in
  `useFrame`. All smoothing is `delta`-based (`damp()` from `@/lib/utils`).
- Every scene ships three states: full, reduced-motion **still**, and a
  no-WebGL fallback.

### Post-processing policy

`postprocessing` is a full-screen read per pass. It is installed for the glass
phase only — at most one `EffectComposer` with grain and, if it earns its place,
a very subtle bloom on dispersion highlights. Nothing is mounted in the
greyscale phase. Mobile tiers skip the composer entirely.

---

## 4. Shader organisation

- **Import mechanism:** Vite's built-in `?raw`. No shader plugin.
- **Shared chunks** in `three/shaders/lib/`; scene-specific GLSL beside its scene.
- **Composition** via `composeShader(...parts)`.
- **Naming:** uniforms `uCamelCase`, varyings `vCamelCase`, attributes `aCamelCase`.

---

## 5. Asset organisation

| Location      | Processed by Vite              | For                                                |
| ------------- | ------------------------------ | -------------------------------------------------- |
| `src/assets/` | yes — hashed, inlined if small | assets imported from code                          |
| `public/`     | no — served verbatim           | models, textures, video, production fonts, favicon |

```
public/
  images/    AVIF/WebP, responsive sizes, ≤ 250 kB for the hero; glass stills
  video/     .webm + .mp4 — GIT-IGNORED, host on a CDN
  models/    .glb only, Draco/Meshopt compressed, ≤ 2 MB each
  textures/  KTX2/Basis where possible
  fonts/     production .woff2 only, subset to Cyrillic + Latin (licensed faces)
```

Development fonts come from `@fontsource` packages (free faces, Cyrillic
subsets); production licensed faces are self-hosted in `public/fonts/`. See
`docs/TYPOGRAPHY.md`.

---

## 6. Performance strategy

1. **three.js is never in the initial bundle.** `vite.config.ts` splits `react`,
   `three`, `r3f`, `postprocessing` and `gsap` into separate chunks, and every
   scene is `lazy()`-imported. `dist/stats.html` (rollup-plugin-visualizer)
   proves it on every build.
2. **WebGL is never the LCP element.** The hero wordmark, sub-headline and
   primary CTA are DOM text painted before any canvas appears.
3. **DPR is capped by device tier**, never `window.devicePixelRatio`.
4. **`frameloop="demand"` by default.**
5. **Scenes unmount off-screen** and dispose their GPU memory.
6. **Three states for every visual feature** — full, reduced, none.
7. **The canvas layer is `position: fixed`** and so cannot contribute to CLS.
8. **Fonts:** two preloaded faces at most; `font-display: swap` with
   `size-adjust` fallbacks to remove CLS.

Hard rule: the site stays usable on a modern mid-range smartphone.

---

## 7. How Claude skills are organised

```
.claude/skills/     lightweight, instruction-oriented (11 skills)
.references/        full third-party source, read-only, git-ignored
```

See `docs/SKILLS.md`.

---

## 8. Dependency register

Every runtime dependency, why it exists, and where it is used. A package not in
this table has no business in `package.json`.

| Package                                                                                  | Why                                                                                                 | Where                                  |
| ---------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- | -------------------------------------- |
| `react`, `react-dom`                                                                     | UI                                                                                                  | everywhere                             |
| `three`, `@react-three/fiber`, `@react-three/drei`                                       | the glass (`MeshTransmissionMaterial`)                                                              | `src/three/`                           |
| `postprocessing`, `@react-three/postprocessing`                                          | grain / subtle bloom on the dispersion edge in the glass phase; the only full-screen passes allowed | `src/three/effects/` (not mounted yet) |
| `gsap`, `@gsap/react`                                                                    | timing, ScrollTrigger, pinning                                                                      | `src/animations/`                      |
| `lenis`                                                                                  | eased scroll for the two scrubbed pinned sequences; off under reduced motion                        | `src/animations/scroll/`               |
| `@fontsource-variable/inter`, `@fontsource-variable/jetbrains-mono`, `@fontsource/prata` | free development fonts with Cyrillic; replaced by licensed faces in `public/fonts/`                 | `src/styles/tokens/fonts.css`          |

Dev-only: `@playwright/test` (visual QA against the installed Google Chrome, no
browser download), `rollup-plugin-visualizer` (bundle report at
`dist/stats.html`).

**Evaluated and rejected for now:** `split-type` (no line reveals in the
greyscale phase; when needed, a ~40-line `SplitLines` with screen-reader-correct
markup is preferred), `maath` (`damp()` already exists in `lib/utils/math.ts`),
`zustand` (the pre-fill state is one context), `leva` (no uniforms to tune yet),
`vitest` (nothing pure worth testing yet beyond `ru.ts` — revisit),
`vite-plugin-glsl`, `three-stdlib`, `@gltf-transform/cli` (no models), any UI
kit, `framer-motion` (duplicates GSAP), Tailwind, `styled-components`, `emotion`.
