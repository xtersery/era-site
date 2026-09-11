# Skills

Eleven skills live in `.claude/skills/`. They are deliberately kept
**instruction-oriented and small** (~700 kB total, 46 files). Full third-party
source lives in `.references/`, which is git-ignored and read-only.

Skills are complementary, not interchangeable. The common failure is merging
them into one generic "make it look good" instruction — each of these carries a
different kind of judgement, and they are most useful kept distinct.

---

## Quick reference

| Skill | Source | Use it when |
|---|---|---|
| `premium-web-design` | **custom** | Before designing anything. This project's art direction and the specific looks it must avoid. |
| `design-dna` | [zanwei/design-dna](https://github.com/zanwei/design-dna) | Turning references into a structured design profile; defining real tokens. |
| `taste-skill` | [Leonxlnx/taste-skill](https://github.com/Leonxlnx/taste-skill) | Quality gate — catching output that has drifted toward templated defaults. |
| `scroll-craft` | [nateherkai/scroll-craft](https://github.com/nateherkai/scroll-craft) | Deciding what the scroll *does*: journey, page grammar, signature move. |
| `gsap-motion` | **custom** | Implementing motion: timelines, ScrollTrigger, reveals, pinning, cleanup. |
| `react-three-fiber` | **custom** | Any R3F scene: Canvas, useFrame, loading, disposal, GSAP coordination. |
| `threejs` | **custom** | Core three.js: materials, lighting, colour management, instancing, debugging. |
| `webgl-shaders` | **custom** | Writing GLSL, and deciding whether a shader is worth its cost. |
| `web-performance` | **custom** | Budgets, Core Web Vitals, mobile, anything heavy. |
| `frontend-design` | [anthropics/skills](https://github.com/anthropics/skills) | Baseline visual craft. The floor, not the ceiling. |
| `webapp-testing` | [anthropics/skills](https://github.com/anthropics/skills) | Verifying visual work in a real browser instead of assuming. |

---

## Which wins in a conflict

1. **`premium-web-design`** — it encodes this specific brief. It overrides
   `frontend-design`, `taste-skill` and `scroll-craft` on any aesthetic
   question.
2. **`web-performance`** — its mobile-usability rule is a hard constraint, not a
   preference. It overrides visual ambition, and the answer is a simpler concept
   on mobile, never a broken one.
3. **Accessibility** (in `CLAUDE.md` and `premium-web-design`) is never traded
   for an effect.

Everything else is judgement.

---

## The design and taste skills

### `premium-web-design` — custom

**The most important skill in this repository.** Written for this project.

- The concept-first process: three directions, argue them, commit, then the
  concept governs every later decision.
- A specific list of what this site must not look like — generic clinic, Tilda
  template, SaaS, beauty marketplace, **beige medspa** (the most likely failure
  mode, because it is what "premium clinic" looks like in the training
  distribution), corporate landing page.
- What to prioritise: editorial composition, intentional asymmetry, typographic
  scale contrast, uneven premium whitespace, restrained colour, strong art
  direction on real photography.
- The order of work — typography and composition **before** motion, motion
  before WebGL. Steps 5 and 6 do not rescue steps 1–4.

Read it before designing any page, section or component.

### `design-dna` — imported, unmodified

A three-phase workflow: design system (measurable tokens), design style
(qualitative feel), visual effects (WebGL, shaders, scroll, particles). Includes
runnable colour-measurement tooling in `scripts/`.

Two moments where it earns its place here:

1. **Reference intake** — converting art-direction references into a structured
   profile instead of vague adjectives. Its third dimension maps directly onto
   `src/three/`.
2. **Token definition** — when the placeholders in `src/styles/tokens/` are
   replaced with the real identity.

Do not use its generation phase to produce finished pages.

### `taste-skill` — imported, one line changed

Anti-slop frontend judgement: brief inference, real design systems, a strict
pre-flight check.

Use it as a **quality gate, not a generator**. Its strongest parts here are
Section 0 (read the brief before choosing an aesthetic) and the pre-flight
check. Its general landing-page conventions defer to `premium-web-design`.

### `scroll-craft` — imported, unmodified

Scroll as a narrative timeline: visitor journey, page grammar, emotional peak,
one bespoke signature move, dimensional heroes with independent visual planes,
and a *separate* mobile composition.

The strongest reference we have for **what the scroll does**. Pair it with
`gsap-motion`, which covers **how to implement it**.

Two project constraints (see its `PROJECT-NOTES.md`): its kie.ai asset
generation is unavailable and must not be used — clinic imagery is real
photography — and its standalone-HTML engine is reference for technique only;
we implement in React + GSAP.

### `frontend-design` — imported, unmodified

Anthropic's general guidance on distinctive, intentional visual design. Useful
baseline for typography and spacing. `premium-web-design` sets the actual bar.

---

## The implementation skills

### `gsap-motion` — custom

Implementation-level motion expertise: timelines and position parameters,
ScrollTrigger scrubbing and pinning, the house reveal vocabulary (masked line
reveals, clip-path image reveals), justified parallax, horizontal scroll scenes,
interaction choreography, `useGSAP` cleanup, `gsap.matchMedia()` for
reduced-motion and mobile branches.

Leads with the principle that governs it: **motion creates hierarchy**. A page
where everything animates has none. It lists the defaults that are banned here —
uniform fade-up-on-scroll first among them — and records which GSAP plugins are
actually licensed (core, ScrollTrigger, `useGSAP`; no Club plugins).

### `react-three-fiber` — custom

R3F for **premium interactive websites, not games**. Canvas discipline (one per
page, `frameloop="demand"`, the capability gate), `useFrame` hot-path rules (no
setState, no allocation, always `delta`), minimising React re-renders, `useThree`
and responsive cameras, model and texture loading, DPR and device tiers,
disposal, draw-call budgets, the GSAP coordination pattern, scroll-driven scenes,
and the three-state progressive-enhancement requirement.

Opens with the question that comes first: **should this be WebGL at all?**

### `threejs` — custom

Core three.js below R3F: scene graph and matrix cost, camera framing across
aspect ratios, image-based lighting and tone mapping, the PBR material cost
table, colour-space rules (the usual cause of washed-out renders), geometry,
instancing, the ordered performance model, texture formats, shader injection via
`onBeforeCompile`, and a WebGL debugging symptom table.

Prefers R3F inside React and says exactly when to drop below it.

### `webgl-shaders` — custom

GLSL technique **and its cost model** — the part that decides whether the site
works on a phone. Vertex vs fragment economics, noise and fBm budgets,
displacement, distortion and liquid effects, noise-guided image transitions,
refraction, Fresnel, and mouse/scroll-reactive uniforms (damped, never raw).

Leads with when a shader is the right answer at all: CSS, then GSAP, then WebGL.
**The shader should be the idea, not the garnish.**

### `web-performance` — custom

Core Web Vitals for a WebGL site, a concrete budget table, code splitting and
lazy loading, responsive images, video and model/texture compression
(Draco/Meshopt/KTX2), preload strategy as a zero-sum game, the ordered WebGL
cost model, adaptive DPR, WebGL memory management, mobile fallbacks, loading
states, and the measurement procedure.

Its hard rule: **the site must remain usable on a modern mid-range smartphone**
— actually usable, verified on a real device, not degraded in theory.

### `webapp-testing` — imported, unmodified

Playwright-driven browser verification. On a site whose value is motion and
composition, "it compiles" proves nothing. Use it to check the hero at 390 /
768 / 1440 px, scroll states, `prefers-reduced-motion`, the no-WebGL fallback,
and a clean console.

Chromium is pre-installed at `/opt/pw-browsers`; do not run `playwright install`.

---

## How imports were handled

Repositories were inspected before anything was copied. Three of the four
"existing skill" repositories were **not** bare Claude skills:

| Repository | What it actually was | What was imported |
|---|---|---|
| `zanwei/design-dna` | A valid skill at the repo root | `SKILL.md` + `references/` + `scripts/`, verbatim |
| `Leonxlnx/taste-skill` | A plugin marketplace with **13** skills | Only `skills/taste-skill/`. One edit: frontmatter `name` was `design-taste-frontend`, which does not match the loading folder — changed to `taste-skill`. |
| `nateherkai/scroll-craft` | A Claude Code **plugin** | The skill subtree from `plugins/nateherk-design/skills/scroll-craft/`, unmodified. The plugin wrapper was not imported. |
| `anthropics/skills` | ~19 skills, mostly document tooling | Only `frontend-design` and `webapp-testing`. |
| `pmndrs/react-three-fiber` | Library source + docs, **no skill** | Nothing. A custom `react-three-fiber` skill was written that references it. |
| `pmndrs/drei` | Library source, **no skill** | Nothing. Covered inside the `react-three-fiber` skill. |
| `mrdoob/three.js` | Library source + docs, **no skill** | Nothing. A custom `threejs` skill was written that references it. |

Each imported skill has a `PROJECT-NOTES.md` beside it recording what was
adapted and how it applies here. Upstream `SKILL.md` bodies are otherwise not
edited — they are third-party content.

**What was deliberately left out**, and why: the other 12 taste-skill aesthetics
(brutalist, minimalist, soft, stitch, brandkit, …) would put a dozen competing
doctrines in front of Claude at once; the Anthropic document skills (docx, xlsx,
pptx, pdf, mcp-builder, internal-comms, …) are unrelated domains. Both remain
readable under `.references/`.
