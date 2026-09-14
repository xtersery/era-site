# Spike E — THE PASSAGE: quartz → marble (15.09.2026)

**Brief.** A cinematic transition between 05 Specialists (the smoky quartz)
and 06 Founder (the ERA marble): not a background change, not a texture
replacement, not a cross-fade — a material transformation sequence. Keep the
approved quartz object; the viewer must recognise it. Use
`docs/references/wallpapers.png` as the destination; never stretch it, never
a flat wallpaper. Choreography: A quartz exists · B the camera enters the
quartz (its facets fill the viewport) · C inside (smoky layers, density,
facets, dark translucent planes) · D geological dissolution (facets → mineral
layers → veins → stone) · E the marble wall (depth, slabs, seams). Standalone
spike first; storyboard + spike, then stop.

**Board** `docs/spikes/boards/mineral-passage.html` (`e2e/spike-mineral.board.mjs`)
· https://claude.ai/code/artifact/b4d03401-b34d-4322-8f25-26aad269ea75
**Spike** `spikes/mineral/` · `docs/spikes/boards/mineral-passage-spike.html`
· https://claude.ai/code/artifact/b13530b7-0666-4042-9b5d-5ba7a798fac4
· `?t=0…1` freezes a moment; a slider on the page scrubs it.

## Built

- **Timeline** `t` 0 → 1 over a 700 vh pin (scrub 0.8 s): A 0–0.12 · B
  0.12–0.44 · C 0.44–0.58 · D 0.52–0.84 · E 0.74–1. Reduced motion: whole
  states at the scroll's midpoint.
- **Camera** (`useCameraPath`): two centripetal Catmull-Rom curves (position,
  target) through eight keys at t 0 / 0.14 / 0.34 / 0.46 / 0.56 / 0.7 / 0.86 /
  1; the timeline's keys map to the curve parameter with an ease per segment.
  (0,0,18.66) → (−1.4,−1.5,9.5) → (−1,+0.3,3.4) facets fill → through the
  front face at z ≈ 2.15 → inside at the upper third looking down the
  crystal's length → turn to the far shell (0.7: z 3.0) → pull back (0.86:
  z 5.6) → settle (0.55, 0.15, 10.05) facing the wall, the view 8.6 units
  wide.
- **The stone**: the approved body + glass overlay (Spike D pass-13
  materials, `createQuartzMaps` exported from `ShardScene`), the same
  geometry and place. The front surface gives way as the viewer passes it
  (0.4–0.47); the glass overlay first (0.36–0.45); the shadow lifts by 0.42;
  breathing to rest by 0.34.
- **The interior**: the same geometry drawn `BackSide` with
  `scene/becoming.frag` (`uInside 1`): the stone's photograph (`maps.interior`,
  with alpha, ungraded) sampled by world xy, reflected at its box (mirror
  repeat) so the crystal continues itself; the flanks read across (a blend by
  |normal.z|); deepened `pow 1.6 × 0.7`, lit from behind, wisps of value-noise
  fbm (`noise.glsl`) at 6× and 19× for the fine structure the photograph
  lacks; a dark fallback where the photograph's alpha is 0. Six translucent
  slices across the crystal's length at the facets' tilts (`layer.frag`: the
  photograph's density × fbm wisps, 0.5 opacity), `FogExp2` `#5a524b`
  0 → 0.16 → 0 (matched in the custom shaders).
- **The becoming** (`becoming.frag`, one material on the shell and on the
  wall plane): `uBecome` 0 → 1 over 0.54–0.82 — density from the smoke's
  luminance; graphite where dense, the wall's blue-grey where clear; the facet
  ridges (`createRidgeMap`) as pale veins with a breath of gold; then the slab
  as a front from the stone's place along the wall's veins (`uSpread` 0 → 9
  over 0.66–0.92) with 30 % of the smoke kept as the band; normal from the
  geometry → the slab's luminance relief; diffuse 0.6+0.4 → 0.74+0.28; sheen
  pow 6 × 0.05 (inside) → pow 18 × 0.10; grain ± 1 %. `becoming.vert`:
  `uFlatten` 0 → 0.94 over 0.68–0.88 settles the shell's world z toward the
  wall's plane and its normals with it; the wall plane runs the same shader at
  flatten 1 → one surface.
- **The wall**: `spikes/mineral/assets/wall.jpg` = the whole reference
  (1672 × 941) mirrored once vertically (`e2e/spike-mineral.marble.mjs`), laid
  12 world units wide (slab 3.24 units; the final view holds 2.65), centred at
  (−2.97, −3.33) so the diamond's pale centre sits under the founder's column
  and the graphite band passes through the stone; projected in world units.
  The room (plaster + portrait planes) leaves 0.46–0.56, unseen from inside.
- **DOM**: the sitting's words leave 0.06–0.22; «06 — Основатель» and a line
  arrive 0.88–0.98.

**Measured.** Scrub 16.7 ms median, p95 16.8, 0.4 % over 33 ms (225 frames,
1440 × 900). Published via `scripts/artifact-copy.mjs` (717 includes intact);
the published file tested at `?t=0.72`.

**Known soft spots (on the board).** S3 (facets filling the view) is the
photograph at 4×; the inside is the photograph at 6–10× with noise for the
fine structure; the wall at 0.72–0.8 is 3–4× before the camera is back. A
macro photograph of the same stone would give the approach and the interior
their own detail. The phone is not composed (the desktop layout of the
sitting). Not integrated into `spikes/portraits/` — waits for approval.

**Debug.** `window.__passage` (scene, camera, path, stone box);
`window.__ov = { nofog, nolayers, noshell }`.

## The assisted scroll (15.09.2026)

**Brief.** One intentional scroll triggers the passage, which completes itself;
the page is held meanwhile; then normal scrolling resumes. Do not touch the
animation, camera, shaders, composition — interaction logic only.

**Where it was.** No GSAP timeline existed: the scene reads a scalar `t`
(a ref) every frame; `paint(v)` in `MineralSpike.tsx` was the only writer,
fed by one `ScrollTrigger` scrub over a 700 vh pin. That ScrollTrigger is
gone; the pin is gone (the section is a normal 100 svh block, so after the
passage the page scrolls on into 06).

**Built.** `spikes/mineral/passageController.ts` — `createPassageController`:
the state `{ status, progress, triggered, locked, direction }`, one source of
truth, mirrored to `window.__transition` and the HUD. `idle → armed →
playing → completed → released`. Armed when the section's top is within 6 px
of the viewport's and t is 0 (or 1 for the way back). Intent: wheel deltas
accumulated over 220 ms past 20 px (a trackpad's ticks count as one gesture,
a single tick does not), a touch move past 20 px, ↓/PageDown/Space (↑/PageUp/
Home at the end); up to 48 px off alignment still plays, the lock brings the
section to the top. Playing: `gsap.to(proxy, { t, duration: 1.55 × |Δt|,
ease: 'power2.inOut' })` (phone 1.0 s; reduced motion lands at once;
`?d=` / `?ease=` for review), `overwrite: true`, one tween at a time;
wheel/touch/keys prevented, `scroll` pinned to the section top; every further
gesture ignored, a wheel up cannot reverse. Completed at the end, released
60 ms later (the finishing gesture cannot leak). Noise in the playing
direction is held (alignment must not creep); the other direction passes to
the page. The review slider calls `scrub(t)`: kills playback, releases.

**Proof** (`e2e/spike-mineral.interact.mjs`): armed at rest → an 8 px wheel
does nothing → a 120 px wheel plays, locked, y 0 → twelve more wheels and a
wheel up ignored (still forward) → t 1 after ≈ 1.57 s → released; a wheel
moves the page → at the top, a wheel up plays home → armed at 0. The phone
the same with synthetic touches, 1.0 s.

## The film's rhythm (15.09.2026)

**Brief.** 1.55 s felt like a web animation. Four phases, 8–9 s: recognition
(0–35 %, ~2.5 s, the mineral recognisable, a slow dolly, internal structure)
· immersion (35–65 %, ~2.5 s, into the material; refraction, light through
the planes; no blur, no fade) · geological transformation (65–90 %, ~3 s,
structure → mineral layers → marble surface) · reveal (90–100 %, ~1.5 s) ·
hold 1 s. easeInOut cinematic curves, no GSAP defaults.

**Built.** `CINEMATIC_RHYTHM` in `passageController.ts`: keys (seconds, t)
= (0, 0) · (2.5, 0.44) · (5, 0.62) · (8, 0.9) · (9.5, 1), hold 1 s. A
monotone cubic (Fritsch–Carlson, zero tangents at the ends) maps the film's
clock to t, so each phase eases in and out of its own and the speed is
continuous across phases. One tween drives the clock with `ease: 'none'`
(the curve is the ease); a passage resumed mid-way finds its clock by
bisection. The return is not the film: 4 s `power2.inOut`. Phone 0.7 ×.
`?d=` = the whole film in seconds. Measured: 2.6 s → 0.45 · 5.1 s → 0.62 ·
8.0 s → 0.90 · 9.5 s → 1.00 · released 10.6 s.

**Scene, for immersion (small, physical).** `layer.frag`: the room's key
passes through each plane as a soft sheen (`pow(n·h, 36) × 0.42`, warm),
two-sided, moving as the viewer moves. `becoming.frag`: inside, each facet of
the shell reads the smoke past it shifted along its own normal (0.045 units)
— refraction as parallax, not blur. Nothing else touched.

**Immersion shortened (15.09.2026).** The stay inside read as lingering.
Keys now (0, 0) · (2.5, 0.44) · (4, 0.62) · (7, 0.9) · (8.5, 1), hold 1 s:
recognition unchanged, immersion 1.5 s (was 2.5), transformation and reveal
the same lengths, the film 8.5 s + 1 s held. Measured: 2.6 s → 0.44 ·
4.1 s → 0.62 · 7.1 s → 0.90 · 8.5 s → 1.00 · released 9.6 s.

## One continuous movement (15.09.2026)

**Brief.** The movement read as separate camera steps (zoom → pause → zoom
→ transform). One uninterrupted dolly, one easing curve, no keyframe stops,
no sudden scale changes, no blur; ~15–20 % faster by removing pauses, not
by moving the camera faster; the transformation begins while the camera
still moves.

**Cause.** `useCameraPath`'s `u(t)` eased each segment between keys with
`smooth()` — the camera came to a full stop at every key (speed 0 eight
times). The clock→t cubic was continuous, so the stops were the path's.

**Built.** The timeline now maps to the curves' **arc length** through a
monotone cubic (Fritsch–Carlson) with non-zero tangents at every key
(`monotone(keys, flatEnds = false)`), `getPointAt` on position and target;
speed along the path measured (world units per unit t): 68 → 36 (0.2) → 10
(0.4) → 6 (0.5, deepest inside) → 15 (0.7) → 32 (0.9) — one deceleration
in, one acceleration out, minimum 5.9, never zero. Inside, the curve turns
without stopping (K4 → K5 differ in y, so the reversal in z is a bend, not a
cusp). Rhythm keys: (0, 0) · (2.1, 0.44) · (3.3, 0.62) · (5.9, 0.9) ·
(7.2, 1), hold 1 s — 7.2 s of motion (was 8.5, −15 %), released at 8.3 s.
Flatten 0.66 → 0.9 so the shell settles while the camera is still gliding
out; the shell's flanks fade as it settles (`alpha × facing`), since they
end with no area. The wall sheet is now the reference's first three whole
slabs (to the seam at x 1289) so its mirror repeat folds on a seam; laid
9.25 units wide, centre (−3.9, −3.33).

**Tried and dropped.** A push that never reverses (the wall at z −9, the
shell receding to it): from inside, the receding hollow shell's flanks
stretch into curtains and its patch floats in front of the wall — a
texture card flying. The in-and-out path with continuous speed reads as one
movement; the recession did not.

**Measured.** 2.1 s → 0.42 · 3.5 s → 0.64 · 6.0 s → 0.90 · 7.2 s → 1.00 ·
released 8.3 s; scrub 16.7 ms median, 0 % over 33 ms.
