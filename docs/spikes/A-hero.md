# Spike A — Hero refraction · results

**Status: CLOSED — material approved on the real test portrait (2026-09-12). NOT approved as hero art direction: the crop, darkness, circular lens geometry, placement and composition are to be art-directed later with this material system.** Review board: https://claude.ai/code/artifact/9471d543-fdbd-4c1e-bfff-6c8a73c6ec28 (local copy `docs/spikes/boards/spike-a-review.html`). Paths, attenuation, composition rule, `NoToneMapping` and the mark-outside-the-scene rule are approved; the emotional criterion was judged on `portrait-test.png` (see the final review below). Dev-only entry: `spikes/hero/` (`npm run dev` →
`/spikes/hero/?path=A|B|C&mode=hero|compare|diag&tier=high|mid&dpr=1.5&poster=1`).
Captures: `spikes/hero/__captures__/` (git-ignored). Capture suite: `node e2e/spike-hero.capture.mjs`.

## What was built

- **ERA Mineral Glass — three rendering paths on one material system** (`spikes/hero/scene/materials.tsx`):
  A `transmission` (drei `MeshTransmissionMaterial`, 6 samples / 1024 on `high`, 2 / 512 on `mid`),
  B `hybrid` (three `MeshPhysicalMaterial` transmission + native `dispersion` + an `onBeforeCompile`
  fresnel tint), C `screen` (FBO of the backdrop + a ~60-line screen-space refraction shader).
  Shared: the **ERA environment** (procedural equirect: gold key upper-left, teal fill right-low,
  bone bounce), the **vein normal map** derived from the real entrance wall (luminance only,
  book-matched, planar-mapped), the attenuation colour, the teal ↔ gold poles, the fresnel curve.
- **Lens geometry** (`lensGeometry.ts`): a lathed plano-convex slab with a thick rim and two shallow
  grooves — the **double optical rim** from the official mark, read only as two hairlines of light.
- **Wordmark as texture** (`wordmarkTexture.ts`): «эра» drawn with the loaded webfont, aligned to the
  DOM line box (baseline = (lineHeight − (ascent + descent)) / 2 + ascent); the DOM copy stays for LCP
  and a11y and goes transparent when the scene is ready.
- **The veil**: a graphite plane between lens and portrait with a _beam_ of light (an elongated pool at
  the marble's ~35°) so she is a presence outside the glass and lit through it — and so the darkness
  never traces the lens silhouette (the circular version read as an orb; rejected).
- Pointer (DOM section → stage), scroll dolly (chapter progress → camera z 5 → 1.6), idle breathing,
  `NoToneMapping` (design-controlled colour), diagnostics API (`window.__spike.sample/info`).
- Test-only assets: a **procedural skin plate** (contour + beam + pore grain) and a 6-tone
  **calibration strip**. No portrait was generated; see "What this spike could not prove".

## Decisions unlocked

| Question                | Answer                                                                                                                                                                                                                                                                                                                             |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Material path per tier  | **A on `high`**, **B on `mid` desktop/tablet**, **C on phones** (and as the demote step). All three read as one family (see comparison).                                                                                                                                                                                           |
| Attenuation colour      | **Not the logo green.** `#012118` is ≈ 0.0003 / 0.015 / 0.009 in linear light and turns skin olive over any path. The depth hint uses a lifted derivative `#3D6B58` at distance 8; the deep green itself lives in the grounds and the veil — what the glass shows where nothing bright is behind it.                               |
| Skin contamination      | Measured through the glass vs beside it (calibration strip): **A +2.2° hue, −0.06 sat, 0.90 lum · B +1.9° / −0.06 / 0.90 · C +0.3° / −0.01 / 1.00**. Skin stays warm on all paths.                                                                                                                                                 |
| Double rim              | Geometry grooves read as two hairlines at the rim under the gold key on A/B; subtle. Keep; do not add a drawn ring.                                                                                                                                                                                                                |
| Vein map                | Works as a _normal_ map at 0.05 (A/B) / 0.022 (C). Stronger reads as hammered glass — rejected. Polar (lathe) UVs produce radial streaks — planar UVs required.                                                                                                                                                                    |
| Rooms above the canvas  | Real bug found: rooms had no stacking context, so the fixed canvas painted over them. Fixed in `Room.css` (`z-index: var(--z-content)`).                                                                                                                                                                                           |
| DOM ↔ texture alignment | The wordmark texture matches the DOM at 1440 and 390 (visually ≤ 2 px).                                                                                                                                                                                                                                                            |
| Composition             | The lens must overlap the «а» and the face _contour_ must cross the glass (depth on one side, lit cheek on the other) — otherwise the lens reads as a coin. Spike-only anchor nudge: `left: 13%; bottom: 9%` on desktop → to be folded into `Hero.css` in production. On phone the word should sit behind the glass (layout task). |

## Measurements

Host: this Mac (Chrome, Metal). Frame counting via rAF over 2–4 s windows while the pointer
travels an arc, then while scrolling the dolly.

|                                     | idle | pointer (median / p10) | scroll | draw calls | textures | JS heap |
| ----------------------------------- | ---- | ---------------------- | ------ | ---------- | -------- | ------- |
| Desktop 1440 × DPR 1.5 · A          | 60   | 60 / 60                | 60     | 4          | 9        | 54 MB   |
| Desktop · B                         | 60   | 60 / 60                | 60     | 5          | 9        | 54 MB   |
| Desktop · C                         | 60   | 60 / 60                | 60     | 4          | 6        | 54 MB   |
| "Mobile" 390 × DPR 1.25, CPU 4× · A | 60   | 60 / 60                | 60     | 5          | 9        | —       |
| "Mobile" · C                        | 60   | 60 / 60                | 60     | 5          | 6        | —       |

**The mobile numbers are a CPU-throttled proxy on the host GPU — not a phone.** The GPU cost of
path A (a backbuffer read per frame at 1024²) is exactly what a phone will show and this run cannot.
On-device measurement (an iPhone 12-class and a mid-range Android) is the remaining gate for
"A on phones"; until then phones get C by design.

## Visual verdict (against the brief's criteria)

Reviewed: `still-desktop-A.png`, `interaction-desktop-A.png`, `still-mobile-C.png`,
`interaction-mobile-C.png`, `poster-desktop.png`, `poster-mobile.png`,
`compare-ABC-same-composition.png`, `compare-ABC.png`, `diag-*.png`.

- Not a WebGL demo, not glassmorphism, not a soap bubble: the slab reads heavy, the edge is thick,
  the refraction is of _real content_ (the «а», the beam edge, the contour) — yes.
- Not a crystal orb: **after** replacing the circular veil with the beam — yes. The first version
  failed this criterion and was rejected.
- Not a sci-fi lens, not emerald cliché: no rainbow, no green surfaces; green appears only in the
  dark side of the glass — yes.
- Architectural, mineral, calm, heavy, precise: yes on A and B; C is close but flatter.
- Sensual, feminine, physically believable: **partially proven** — the material is warm and the
  light on the plate is credible, but the plate is procedural. This criterion is only fully
  provable with the real campaign portrait (skin, hair, a real contour).
- Gold as reflected light / edge / glint / double rim only: yes. Official mark: DOM only, flat gold,
  never in the scene — yes.

**Verdict: PREMIUM — APPROVED for path A/B; C APPROVED as fallback**, with one open proof
(sensuality on a real portrait) and one open measurement (phone GPU for A).

## Mandatory before the production Hero merge

- **On-device GPU run** of path A on an iPhone-12-class device and a mid-range Android (phones ship
  path C regardless; this validates `mid` tablets and the demotion thresholds). Recorded as a gate;
  it does not block the material decision.
- The real test portrait rerun closes the emotional criterion.

## What this spike could not prove

1. Skin sensuality on a real face — needs the Higgsfield hero portrait (women 35–60, profile,
   eyes closed, one warm key). The plate is a stand-in for _light and colour behaviour_, not beauty.
2. Phone GPU cost of true transmission — needs a device run.
3. Reduced-motion poster quality as a _designed_ image — the current poster is a scene capture;
   the real one is art-directed at asset time.

## Carried into production (when approved)

- `mineralGlass()` factory with the three paths and shared textures → `src/three/materials/`.
- Lens geometry, wordmark texture, veil beam, environment builder → `src/three/stage/sets/HeroSet`.
- Anchor nudge into `Hero.css`; phone word behind the glass.
- `Room.css` z-index fix (already in the prototype).

## Final review — real test portrait (closes the spike)

Portrait: `spikes/hero/assets/portrait-test.png` (test-only, 1536 × 1024, generated per
`A-hero-portrait-brief.md`; git-ignored, regenerable from the brief). Placement, tuned with the
HUD/URL controls and recorded in `spikes/hero/assets/portrait-test.json`:

```
offsetX 0.14 · offsetY 0.07 · scale 1.7
```

Composition achieved: the jaw → neck contour crosses the glass, the lip line grazes the rim, the
nose and eye stay outside as the direct reference, the «а» bends at the lower-left edge, and the
beam (not a hole) lights her — the lens never sits over a uniform area. The official mark is DOM
only.

### Measurements on real skin

Same pixel, material tint on vs off (attenuation 999 + no vein), three patches inside the glass:

|                       | hue shift    | saturation Δ    | luminance × |
| --------------------- | ------------ | --------------- | ----------- |
| A · true transmission | +0.2 … +2.3° | −0.005 … −0.017 | 0.955       |
| B · hybrid            | +0.9 … +1.3° | 0 … −0.006      | 0.965       |

Calibration strip through the glass vs beside it: A +2.0° / −0.05 / 0.90 · B +1.9° / −0.05 / 0.90 ·
C +0.3° / −0.01 / 1.00. Frame rate 60 (median, p10, p90) on all paths at 1440 × DPR 1.5; 5–7 draw
calls; 6–9 textures; 52 MB JS heap. The 4× CPU-throttled 390 × DPR 1.25 run also holds 60 —
**CPU proxy only; the on-device GPU run remains the pre-production gate.**

### Judgement

| Criterion                                                                                                       | Verdict                                                                                                                                                           |
| --------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Skin hue / saturation / luminance                                                                               | unchanged to the eye; numerically a whisper (above)                                                                                                               |
| Texture preservation                                                                                            | pores and lip lines survive; A softens micro-detail slightly (transmission sampling), B and C keep it sharper                                                     |
| Eye readability                                                                                                 | eye kept outside the glass by composition; lips inside remain fully legible                                                                                       |
| Cheek / jaw contour bending                                                                                     | visible, gentle, believable — the contour bends, it does not warp                                                                                                 |
| Face still human                                                                                                | yes                                                                                                                                                               |
| Glass physically believable                                                                                     | yes — a thick flat slab with a dark depth edge and a lit rim, not a sphere                                                                                        |
| Lifted green attenuation                                                                                        | works: depth-green only in the dark side, none on skin                                                                                                            |
| Gold rim                                                                                                        | subtle — a hairline glint on the key side                                                                                                                         |
| Double rim                                                                                                      | reads as construction, not as a logo echo                                                                                                                         |
| PREMIUM · SENSUAL · MINERAL · ARCHITECTURAL · ERA-SPECIFIC · QUIET · PHYSICALLY BELIEVABLE                      | **pass**                                                                                                                                                          |
| NOT sci-fi · glassmorphism · soap bubble · crystal orb · emerald · magnifying glass · WebGL demo · green filter | **pass** — the orb read was eliminated by the beam; the magnifying-glass read is avoided as long as the lens is kept off the mouth/nose centre (composition rule) |

No material change was required by the portrait. The only adjustment was placement.

### Approved material parameters (carry into `src/three/materials/mineralGlass.ts`)

- Geometry: lathed plano-convex slab, edge thickness 0.42 × centre, two rim grooves, planar UVs.
- Shared: ERA environment (gold key upper-left, teal fill right-low, bone bounce);
  vein normal map from the wall (book-matched, planar), normalScale 0.05 (A/B) / 0.022 (C);
  attenuation `#3D6B58` at distance 8 (never the literal logo green); ior 1.45; roughness 0.11;
  clearcoat 1 / 0.06; envMapIntensity 1.35; colour `#F8F6F1`; `NoToneMapping`.
- A: `MeshTransmissionMaterial` thickness 0.42, chromaticAberration 0.055, anisotropicBlur 0.06,
  samples 6 / 2, resolution 1024 / 512.
- B: `MeshPhysicalMaterial` transmission, thickness 0.42, dispersion 0.22, fresnel tint patch
  (teal 0.16, gold 0.12).
- C: screen shader — bend 1.1 × (ior − 1) × thickness × ndv^1.5, dispersion 0.08, attenuation path
  0.6, teal fresnel 0.3, gold spec.
- Veil: graphite `#07110D` at 0.955 with a beam at −35° (1.7 r × 0.95 r) and a wide falloff.
- Paths per tier: **A `high` · B `mid` desktop/tablet · C phones and runtime demotion.**
- Lights: gold key `#F7E4B1` 3.2 at (−3, 3.2, 2.6); teal fill 0.55; ambient 0.12.

### Mandatory before the production Hero merge

On-device GPU run of path A (iPhone-12-class, mid-range Android) to validate `mid` tablets and the
demotion thresholds. Phones ship C regardless.
