---
name: web-performance
description: >-
  Performance for creative and WebGL-heavy websites — Core Web Vitals, code
  splitting, lazy loading, dynamic imports, video and texture optimisation,
  Draco/Meshopt, responsive images, preload strategy, WebGL memory management,
  draw calls, shader cost, adaptive DPR, mobile fallbacks, reduced motion,
  loading states and graceful degradation. Use when adding anything heavy, when
  setting budgets, and before declaring any visual feature done.
---

# Performance for a creative site

## The rule this project is held to

**The site must remain usable on a modern mid-range smartphone.**

Not "degrade gracefully in theory" — actually usable: readable within a couple
of seconds, scrollable without stutter, not draining the battery, not crashing
the tab. A significant share of this clinic's visitors will arrive on a
mid-range Android over mobile data, from Instagram.

Visual ambition is the point of this project. It does not get to break that.
When they conflict, the answer is a **simpler version of the concept on mobile**,
not a broken version of the full one.

---

## Budgets

Treat these as limits, not aspirations. Measure on a throttled mid-tier device
profile (Chrome DevTools: 4x CPU throttle, Fast 4G), not on the dev machine.

| Metric | Budget |
|---|---|
| LCP | ≤ 2.5 s (mobile, 4G) |
| INP | ≤ 200 ms |
| CLS | ≤ 0.1 |
| Initial JS (gzip) | ≤ 120 kB — three.js is **not** in it |
| Total JS before interaction | ≤ 250 kB gzip |
| Hero image | ≤ 250 kB after compression |
| Any single `.glb` | ≤ 2 MB |
| Any single texture | ≤ 1024² unless demonstrably needed |
| Preloaded fonts | ≤ 2 faces |
| Draw calls | < 100 |
| Sustained frame rate on mid-tier | ≥ 50 fps, never below 30 |

`npm run build` prints chunk sizes. Read them every time.

---

## Core Web Vitals, specifically here

### LCP — usually the hero

The largest element is almost always the hero image or the display heading.

- **Never let WebGL be the LCP element.** A canvas that paints after three.js
  downloads, compiles shaders and loads a model is a catastrophic LCP. The hero
  must be readable and composed *before* any canvas appears; the scene fades in
  over it.
- Preload exactly one hero image (`<link rel="preload" as="image" imagesrcset=…>`).
- `fetchpriority="high"` on the hero image, `loading="lazy"` on everything below
  the fold.
- Fonts: `font-display: swap` with a metric-matched fallback stack, or
  `optional` if the layout shift is worse than the swap. Self-host `.woff2`,
  subset to the glyphs actually used (Cyrillic + Latin here — do not ship the
  full Google Fonts file).

### CLS

- Every image and video has explicit `width`/`height` or `aspect-ratio`.
- The canvas layer is `position: fixed` — it cannot shift content, by design.
- Fonts with mismatched metrics cause the classic late shift. Use
  `size-adjust`/`ascent-override` on the fallback `@font-face`.
- Nothing collapses or expands after load. Reserve space for anything async.

### INP

- Long tasks on the main thread are the enemy: shader compilation, GLTF parsing,
  large JSON, layout thrash from measuring during scroll.
- Measure layout **once** in ScrollTrigger's refresh, never per frame.
- Compile shaders behind the loading state (`renderer.compile()`), not on first
  user interaction.
- Break up any task over 50 ms, or move it off the main thread.

---

## Code splitting and lazy loading

The single most important architectural decision: **three.js and every scene are
lazy.**

```tsx
const HeroScene = lazy(() => import('@three/scenes/Hero'));
```

- `vite.config.ts` splits `react`, `three`, `r3f` and `gsap` into separate
  chunks so the shell can paint while the renderer downloads. Verified: with no
  scene imported, the three chunk is not emitted at all.
- Mount scenes on an **IntersectionObserver** with a generous `rootMargin` so
  the chunk fetches just before it is needed, not on page load.
- **Unmount scenes that are far off-screen.** A mounted idle scene under
  `frameloop="demand"` costs nothing per frame but still holds GPU memory.
- Prefetch on intent: hover over a nav link, or the previous section entering
  the viewport.
- Do not lazy-load the hero's *content*. Lazy-load its enhancement.

---

## Images

```html
<img src="hero-1280.avif" srcset="hero-640.avif 640w, hero-1280.avif 1280w, hero-2560.avif 2560w"
     sizes="100vw" width="2560" height="1440" alt="…" fetchpriority="high" decoding="async" />
```

- **AVIF first, WebP fallback.** AVIF is typically 30–50% smaller than WebP at
  matched quality. Use `<picture>` when a JPEG fallback is genuinely needed.
- Generate real responsive sizes. Serving a 2560px image to a 390px phone is the
  most common single waste on a "premium" site.
- DPR: cap at 2. A 3x asset is invisible improvement for 2.25x the bytes.
- Anything in `public/` is unprocessed. Anything that should be hashed and
  optimised goes in `src/assets/` and is imported.

## Video

Video is the heaviest thing a site can ship. Before adding one, check whether an
image sequence, a shader, or a still would carry the idea.

- `.webm` (VP9/AV1) first, `.mp4` (H.264) fallback.
- Muted, `playsinline`, `preload="none"` (or `metadata`), `poster` always set —
  the poster is what LCP sees.
- **Never autoplay video on mobile.** Serve the poster and let the visitor tap,
  or use a much shorter, much smaller mobile cut.
- Cap the hero loop at ~6–8 seconds and ~2 MB. Long loops are not more cinematic,
  they are just larger.
- Host on a CDN. `public/video/*.mp4` is git-ignored deliberately.
- Respect `prefers-reduced-motion`: show the poster, do not play.
- Respect `navigator.connection.saveData` (`prefersReducedData()` in `@/lib/env`).

## 3D models and textures

- **`.glb` only.** Draco for geometry compression (10–20x on typical meshes),
  Meshopt for large or animated meshes.
- Decimate before compressing. Compressing a 500k-triangle mesh that should be
  30k just makes a smaller mistake.
- **KTX2 / Basis Universal for textures.** PNG and JPEG decompress to raw RGBA in
  VRAM: a 2048² PNG is 16 MB on the GPU regardless of its file size. KTX2 stays
  compressed — often 4–8x less VRAM.
- `gltf-transform` / `gltfpack` do all of this in one pass. Run it; do not ship a
  raw export.
- Draco decoders are loaded from a CDN — that is a third-party request on the
  critical path of the scene. Acceptable because the scene is already lazy.

## Preload strategy

Preloading is a zero-sum game: everything preloaded competes with the LCP.

Preload **only**: the hero image, and at most two font faces.

Use `<link rel="prefetch">` (low priority, idle) for the next section's assets.
Do not preload three.js, scenes, models or video.

---

## WebGL cost, in priority order

1. **Fragment cost × resolution.** DPR is the biggest single dial —
   `dprRange()` caps it at `[1,1]` / `[1,1.5]` / `[1,2]` by tier. Halving DPR
   quarters fragment work.
2. **Draw calls.** Instance, merge, share materials. Target < 100.
3. **Shader programs.** Each unique material is a compile, and compiles block the
   main thread. Warm them; reuse materials.
4. **Post-processing.** Every pass is another full-screen read. `postprocessing`
   is deliberately *not installed* — see `src/three/effects/README.md`.
5. **Transmission / refraction.** A second scene render per object.
6. **Shadow maps.** A render pass per casting light. Prefer contact shadows or a
   baked plane.
7. **Triangles.** Usually last.

### Adaptive quality

- `detectDeviceTier()` gives a static guess from memory, cores and pointer type.
- drei's `<AdaptiveDpr pixelated />` and `<AdaptiveEvents />` drop quality under
  real measured load — add both to any non-trivial scene.
- **Degrade the scene, not just the pixels:** fewer instances, fewer noise
  octaves, lower subdivision, smaller textures, no post-processing below `high`.

### WebGL memory

The leak that kills long sessions. R3F disposes what it created; everything
imperative is yours. Use `disposeObject` / `disposeMaterial` from `@three/utils`
in cleanup effects. Watch `renderer.info.memory` while scrolling up and down the
page — the numbers must return, not climb.

Also: contexts are a limited resource. One canvas per page.

---

## Mobile fallbacks and degradation

Three states for every visual feature, all three verified:

1. **Full** — desktop, high tier, motion allowed.
2. **Reduced** — mid/low tier or `prefers-reduced-motion`: the scene renders
   **still**, video shows its poster, scrubbed motion becomes a static end state.
   The composition survives.
3. **None** — no WebGL, a failed load, or save-data: a real image or CSS
   composition holding the same layout and meaning.

Never leave a hole. A missing scene with nothing behind it is worse than no
scene at all.

---

## Loading states

- **Never a full-screen spinner on an editorial site.** The page should be
  readable while enhancements arrive.
- The hero renders immediately; the canvas fades in over it when ready.
- A loading progress overlay is acceptable *only* if it is part of the concept
  and lasts under ~1.5 s on a normal connection — and there must be a path that
  never shows it on a fast connection.
- Skeletons are a product-UI device and generally off-brief here.
- Anything that can fail must have a failure path. A rejected `import()` should
  render the fallback, not a blank section.

---

## Measuring

Before declaring a visual feature done:

1. `npm run build` — read the chunk sizes, confirm three is not in the entry.
2. Lighthouse, mobile preset, throttled. LCP/CLS/INP against the budgets above.
3. DevTools Performance with 4x CPU throttle: scroll the whole page, look for
   long tasks and dropped frames.
4. `renderer.info` — draw calls, triangles, textures, programs.
5. Memory: scroll up and down five times, confirm nothing climbs.
6. **A real mid-range Android.** Emulation does not reproduce GPU limits,
   thermal throttling or fragment-shader precision.

Do not report a feature as done on the basis that it compiles and looks right on
the dev machine.
