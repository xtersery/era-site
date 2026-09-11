# ERA — premium aesthetic medicine clinic website

A creative front-end project: React + TypeScript + Vite, with React Three Fiber
for WebGL and GSAP for motion. The goal is an **Awwwards-level** site for a
high-end aesthetic medicine clinic — not a clinic template with effects on it.

**Status: initialised, not designed.** The stack, architecture, design tokens and
skills are in place. The visual concept has not been chosen. Sections in
`src/sections/` are structural stubs and are deliberately not composed into the
app yet. Design tokens are placeholders.

---

## Quality bar

Every visual solution is evaluated against one question:

> **"Would this feel credible on an Awwwards-level creative website?"**

Practically:

- **Do not generate generic landing-page layouts.** Alternating image/text
  sections, three-column feature grids, a centred hero with two buttons — these
  are failures, not starting points.
- **Do not settle for the first visual idea.** The first idea is the average of
  everything in the training data. Generate three real alternatives, argue them,
  then commit.
- **Prefer a strong concept over added effects.** One memorable idea executed
  with restraint beats five effects. A weak composition with a shader on it is
  still a weak composition.
- **If the page is not good in greyscale with no motion, go back to the concept.**

Read `.claude/skills/premium-web-design/SKILL.md` before designing anything. It
lists, specifically, what this site must not look like — and the beige-medspa
failure mode it is most likely to fall into.

---

## Development principles

- **Build reusable components.** But do not build an abstraction before there is
  a second use for it.
- **Keep WebGL isolated from normal UI.** Everything three.js lives under
  `src/three/`. Scenes never touch the DOM; components never import three
  directly. The page must work with the canvas removed.
- **Avoid unnecessary dependencies.** Every package is weight on a mobile
  connection. Check whether the platform, GSAP or ~30 lines of our own code
  already does it. Additions are justified in the PR/commit, not assumed.
- **Use semantic HTML.** Real `<section>`, `<h1>`–`<h3>`, `<button>`, `<a>`,
  `<figure>`. A `<div>` with a click handler is a bug.
- **Keep accessibility intact.** Visible focus, ≥ 4.5:1 body contrast, keyboard
  operability, alt text, screen-reader-correct text when splitting lines. This
  is a medical business with an older client base; it is not optional.
- **Respect `prefers-reduced-motion`.** CSS is handled globally. GSAP and WebGL
  are **not** — every JS animation needs an explicit branch that lands in the
  final state, never one that simply skips the tween.
- **Maintain responsive behaviour from the beginning.** Design the phone
  composition as its own composition, not as the desktop one squeezed. Mobile is
  not an afterthought and not a scaled-down desktop.
- **Avoid huge monolithic components.** A section that exceeds ~150 lines is
  telling you it contains a component.
- **Avoid inline CSS for major systems.** Layout, type and colour live in
  stylesheets driven by tokens. Inline style is for a computed one-off value.
- **Keep animation logic organised.** Under `src/animations/`, built from the
  shared vocabulary in `gsap/timelines.ts`, always inside `useGSAP` with a scope.
- **Keep shaders modular.** Shared chunks in `src/three/shaders/lib/`,
  scene-specific GLSL beside its scene, composed with `composeShader()`.
- **Keep design tokens centralised.** `src/styles/tokens/`. A component never
  contains a raw hex, px or duration. Changing the brand must be a token change.

---

## Before writing complex visual code

Ask, in order, and stop at the first yes:

1. **Can this effect be done efficiently with CSS?**
   Transforms, `clip-path`, `mask-image`, blend modes, `filter`, gradients,
   scroll-driven animations. Free, accessible, works everywhere.
2. **If not, should GSAP handle it?**
   Timing, choreography, scrubbing, pinning, sequencing.
3. **If not, does it justify WebGL?**
   Only if it needs genuine per-pixel or per-vertex work: refraction,
   noise-driven displacement, real material response to light, depth that
   layered CSS cannot fake.
4. **If WebGL is required, R3F or a custom shader?**
   R3F with standard materials and drei helpers first. A custom shader only when
   the shader _is_ the idea.

**Use the simplest technology that achieves the intended visual quality.** The
cost of an unnecessary shader is paid by every visitor on every frame.

---

## Architecture at a glance

```
src/
  components/   normal React UI (ui / layout / common)
  sections/     page sections — structural stubs for now
  three/        ALL WebGL: scenes, components, materials, shaders, effects, utils
  animations/   ALL motion: gsap, scroll, transitions
  hooks/  lib/  framework-agnostic helpers
  styles/       tokens (placeholders) + globals + component styles
  data/  types/ assets/
```

Full detail: `docs/ARCHITECTURE.md`. Skills: `docs/SKILLS.md`.

Four layers, kept separate on purpose: **UI · WebGL · motion · design system.**
A change to one should not require touching the others.

---

## Commands

```bash
npm install        # install dependencies
npm run dev        # dev server on http://localhost:5173
npm run typecheck  # tsc --noEmit
npm run build      # typecheck + production build
npm run preview    # serve the production build
npm run lint       # eslint
npm run format     # prettier --write
npm run refs:sync  # clone/refresh .references (git-ignored, ~300 MB)
```

`npm run build` runs the typecheck first — a build that passes is type-clean.

---

## Skills

Eleven skills in `.claude/skills/`. The ones that carry this project:

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

They are complementary, not interchangeable — `docs/SKILLS.md` says when each
applies and which wins when two conflict (short answer: `premium-web-design`).

---

## Ground rules for changes

- `.references/` is **read-only**. Never edit anything in it; it is git-ignored
  third-party source used as knowledge.
- Design tokens are **placeholders**. Do not treat the current greys and system
  fonts as branding decisions, and do not quietly promote them to final.
- Do not invent clinic content — treatments, prices, credentials, before/after
  claims, review quotes. Medical copy comes from the client. An empty `data/`
  folder is better than plausible-sounding placeholder medical claims.
- No stock photography and no AI-generated people. For an aesthetic medicine
  clinic that is both a credibility problem and a legal one.
- Measure before claiming performance. "It looks fine on my machine" is not a
  result — see `web-performance`.
