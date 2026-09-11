# Architecture

The project is organised around one idea: **four layers that can change
independently** — normal UI, WebGL, motion, and the design system. A change to
the brand palette should not touch a component. A change to a scene should not
touch the DOM. A change to the choreography should not touch either.

```
era-site/
├── .claude/skills/     instruction-oriented skills Claude loads (lightweight)
├── .references/        read-only third-party source, git-ignored (~300 MB)
├── docs/               this file, SKILLS.md
├── public/             served verbatim — images, video, models, textures, fonts
├── scripts/            sync-references.sh
└── src/
    ├── components/     ui / layout / common — normal React, no three.js
    ├── sections/       one folder per page section (structural stubs for now)
    ├── three/          ALL WebGL
    ├── animations/     ALL motion
    ├── hooks/          React hooks (media queries, reduced motion, layout effect)
    ├── lib/            framework-agnostic helpers and constants
    ├── styles/         tokens → globals → component styles
    ├── data/           typed content modules (empty — no copy written yet)
    ├── types/          shared types and ambient declarations
    └── assets/         imported, processed assets (hashed by Vite)
```

---

## 1. UI architecture

### Component tiers

| Tier | Location | Knows about |
|---|---|---|
| **ui** | `components/ui/` | itself only — buttons, links, fields, marks. No layout knowledge, no content, no margins that assume a parent. |
| **common** | `components/common/` | cross-cutting behaviour used by more than one section — media wrappers, reveal groups, split-text helpers. |
| **layout** | `components/layout/` | page structure — header, footer, shell, the canvas host, the transition curtain. The only tier allowed to position `fixed` or read the z-index scale directly. |
| **sections** | `sections/<Name>/` | one top-level page section each, composing the tiers above. |

A section over ~150 lines contains a component that has not been extracted yet.

### Section contract

Every section renders a real `<section id={id}>` landmark. Ids come from
`lib/constants/sections.ts` — one source of truth shared by anchors, navigation
and ScrollTrigger keys, so they cannot drift apart.

Sections currently render the landmark and nothing else. Composition, copy and
imagery are design decisions that have not been made.

### Styling

Plain CSS with custom properties. No CSS-in-JS, no utility framework:

- CSS-in-JS adds runtime cost and a hydration story we do not need.
- A utility framework pushes design decisions into markup, which is the opposite
  of what a token-driven editorial system wants — and its defaults (rounded
  cards, pill buttons, standard scales) are exactly the template look this
  project is trying to avoid.

`styles/index.css` is the single entrypoint, imported once from `main.tsx`.
Load order is load-bearing: **tokens → reset → base → layout utilities →
component styles.**

---

## 2. Motion architecture

Everything under `src/animations/`.

```
animations/
  gsap/
    register.ts    single plugin registration; house defaults; called once from main.tsx
    timelines.ts   shared reveal vocabulary (masked lines, clip reveal, reduced-motion settle)
  scroll/
    smoothScroll.ts  SmoothScroll interface + native implementation
  transitions/     cinematic section/page transitions (empty by design)
```

### Rules

- **One registration point.** `registerGsap()` runs before React mounts.
  `gsap.registerPlugin` appears nowhere else.
- **Available plugins:** gsap core, ScrollTrigger, `useGSAP`. All ship in the
  installed packages. Club plugins (SplitText, CustomEase, Flip, MorphSVG,
  ScrollSmoother, Inertia) are **not** licensed — do not import them.
- **Every animation is created inside `useGSAP` with a `scope`.** It wraps
  `gsap.context()`, so tweens and ScrollTriggers are reverted on unmount. React
  19 StrictMode double-mounts in dev; without this you get doubled timelines.
- **Timing values come from `styles/tokens/tokens.ts`**, not from literals. One
  house easing set is what makes motion read as authored rather than assembled.
- **Motion serves hierarchy.** One or two animated moments per *section*, not
  per element. See `.claude/skills/gsap-motion` for the banned defaults —
  uniform fade-up-on-scroll chief among them.

### Smooth scroll — an open decision

No smooth-scroll library is installed. Native scrolling is correct until there
is a scrubbed, pinned sequence whose feel genuinely depends on eased scroll
position; adding one earlier costs input latency and an accessibility risk for
nothing.

`animations/scroll/smoothScroll.ts` exists so that decision is a one-file change:
consumers talk to the `SmoothScroll` interface, today backed by the native
scroller. The file documents the exact Lenis integration steps (scrollerProxy,
`gsap.ticker` driving `lenis.raf`, reduced-motion bail-out) for when it is
justified.

### Motion ↔ WebGL seam

GSAP owns timing. R3F owns rendering. They never drive the same value.

GSAP tweens a **plain JS object**; `useFrame` reads it:

```ts
const state = useRef({ progress: 0 });
useGSAP(() => {
  gsap.to(state.current, { progress: 1, ease: 'none',
    scrollTrigger: { trigger: el, scrub: 1 }, onUpdate: invalidate });
});
useFrame(() => { mesh.current.rotation.y = state.current.progress * Math.PI; });
```

This keeps the timeline independent of the scene graph, works under
`frameloop="demand"`, and makes the reduced-motion branch trivial.

---

## 3. R3F architecture

Everything under `src/three/`. **Nothing outside `src/three/` imports `three`.**

```
three/
  components/
    SceneCanvas.tsx   the only place <Canvas> is written
  scenes/             one folder per scene (empty — design pass)
  materials/
    shaderMaterial.ts typed ShaderMaterial factory + common uniforms
  shaders/
    lib/              shared GLSL chunks (simplex2d.glsl, fullscreen.vert)
    compose.ts        #include-free string composition
  effects/            post-processing (empty; postprocessing NOT installed)
  utils/
    webgl.ts          hasWebGL, detectDeviceTier, dprRange
    dispose.ts        recursive GPU memory release
```

### `SceneCanvas` owns the global decisions

The capability gate, the DPR ceiling, `frameloop="demand"`,
`pointer-events: none`, `antialias: false` and the Suspense boundary. These are
easy to get wrong per-scene and expensive to get wrong everywhere, so they are
written once.

### Scene rules

- A scene **never** renders `<Canvas>` and **never** touches the DOM. Scroll
  progress and pointer position arrive as refs.
- A scene is **always** `lazy()`-imported. three.js must not be in the initial
  bundle — verified: with no scene imported, the `three` chunk is not emitted.
- **One canvas per page.** Each `<Canvas>` is a separate WebGL context and a
  separate render pass. Use one fixed full-viewport canvas
  (`.u-canvas-layer`, `--z-canvas`) behind the content.
- Per-frame work mutates refs. No `setState`, no allocation, no DOM access in
  `useFrame`. All smoothing is `delta`-based (`damp()` from `@/lib/utils`).
- Every scene ships three states: full, reduced-motion **still**, and a
  no-WebGL fallback. Never a hole where a composition was.

### Why a typed material factory instead of drei's `shaderMaterial()`

drei's helper generates a class and registers it with the R3F catalogue —
convenient for one-offs, but it gives up type safety on the uniform bag and
hides disposal. Scenes here are few and long-lived, so
`createShaderMaterial<T>()` with typed uniforms and explicit disposal is the
better trade.

---

## 4. Shader organisation

- **Import mechanism:** Vite's built-in `?raw`. No shader plugin is installed —
  `vite-plugin-glsl` gets added only if `#include` composition becomes genuinely
  painful, not before.
- **Shared chunks** in `three/shaders/lib/` — GLSL that more than one scene will
  actually use. `simplex2d.glsl` (Ashima, MIT) and `fullscreen.vert` are there.
- **Scene-specific GLSL** lives beside its scene (`three/scenes/Hero/hero.frag`),
  not in `lib/`.
- **Composition** via `composeShader(...parts)` — deliberately dumber than a
  preprocessor.
- **Naming:** uniforms `uCamelCase`, varyings `vCamelCase`, attributes
  `aCamelCase`.
- **Common uniforms** (`uTime`, `uPointer`, `uResolution`, `uProgress`) are
  declared once in `materials/shaderMaterial.ts` so shared update code can drive
  any material.

The cost model — why work belongs in a uniform before the vertex shader before
the fragment shader — is in `.claude/skills/webgl-shaders`.

---

## 5. Asset organisation

| Location | Processed by Vite | For |
|---|---|---|
| `src/assets/` | yes — hashed, inlined if small | assets imported from code |
| `public/` | no — served verbatim | assets referenced by URL: models, textures, video, fonts, favicon |

```
public/
  images/    AVIF/WebP, responsive sizes, ≤ 250 kB for the hero
  video/     .webm + .mp4 — GIT-IGNORED, host on a CDN
  models/    .glb only, Draco/Meshopt compressed, ≤ 2 MB each
  textures/  KTX2/Basis where possible (stays compressed in VRAM)
  fonts/     .woff2 only, subset to the glyphs used (Cyrillic + Latin)
```

Video is git-ignored on purpose: a few hero loops would dominate the repository
and git is a poor CDN.

---

## 6. Performance strategy

Budgets, measurement procedure and the full cost model live in
`.claude/skills/web-performance`. The architectural commitments:

1. **three.js is never in the initial bundle.** `vite.config.ts` splits `react`,
   `three`, `r3f` and `gsap` into separate chunks (Rolldown `codeSplitting.groups`
   — Vite 8 does not accept Rollup's object-form `manualChunks`), and every scene
   is `lazy()`-imported.
2. **WebGL is never the LCP element.** The hero is readable and composed before
   any canvas appears; the scene fades in over it.
3. **DPR is capped by device tier**, never `window.devicePixelRatio`. Fragment
   cost scales with the square of DPR.
4. **`frameloop="demand"` by default.** Scenes that do not move do not render.
5. **Scenes unmount off-screen** and dispose their GPU memory.
6. **Three states for every visual feature** — full, reduced, none — all three
   verified, never a hole.
7. **The canvas layer is `position: fixed`** and so cannot contribute to CLS.

Hard rule: the site stays usable on a modern mid-range smartphone. When ambition
and that conflict, mobile gets a simpler version of the concept — not a broken
version of the full one.

---

## 7. How Claude skills are organised

```
.claude/skills/     lightweight, instruction-oriented (11 skills, ~700 kB)
.references/        full third-party source, read-only, git-ignored (~300 MB)
```

The split is the point. Skills are what Claude reads to make decisions;
references are what it consults for detail. Dumping seven repositories into
`.claude/skills/` would bury the instructions under source code.

**Imported skills** keep their upstream structure. Where a repository was a
plugin or a marketplace rather than a bare skill, only the relevant skill
subtree was lifted out, and a `PROJECT-NOTES.md` beside it records what was
adapted and how it applies here. Upstream `SKILL.md` bodies are not edited.

**Custom skills** (`react-three-fiber`, `threejs`, `gsap-motion`,
`webgl-shaders`, `premium-web-design`, `web-performance`) are written for this
project and point at `.references/` for depth.

`.references/` is **read-only**. Re-create it with `npm run refs:sync`.

See `docs/SKILLS.md` for what each skill is for and which wins in a conflict.
