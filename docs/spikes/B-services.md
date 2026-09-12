# Spike B — Services · results and current state

## Pass 1 — optical wheel: REJECTED creatively (13.09.2026)

Built in `spikes/wheel/` (kept for reference; not to be refined or productionised):
a partial orbit of seven cut-mineral blocks on a large-radius arc, one glass mesh with
per-vertex clarity (hybrid path), GSAP Draggable + Inertia drag with a "mineral" ease,
DOM index as the accessible control, no wheel-to-rotate. Technically sound (60 fps,
15 draw calls, 13.6 ms selection latency, 0.1 ms drag latency; CSS 3D fallback), but
it reads as a 3D carousel / curved display system rather than an ERA object.

Review board (artifact): https://claude.ai/code/artifact/6cb69603-7fda-4d2c-908d-41323f7e3ae7
Local copy: `docs/spikes/boards/spike-b-wheel-review.html` (git-ignored).
Rerun: `node e2e/spike-wheel.capture.mjs` (dev server up) → `spikes/wheel/__captures__/`.

Lessons carried forward: a full ring from above reads as a bangle / product
configurator; visible photo panels read as cards; a lit ground plane turns the bone
room ochre (the medspa failure); an over-clear front makes the glass vanish; the
book-match vein mirroring is illegible at object scale and belongs to Hero/Cases only.

## Pass 2 — three alternative directions: AWAITING VISUAL APPROVAL

Built in `spikes/services/` as a visual concept pass (planes, glass boxes on the
approved path-B material, one ~30-line stripe shader; pseudo-motion via `?t=`; no
motion system, no interaction). Same Services layout, camera (8° above, 34° fov),
bone room, temporary imagery and ease for all three.

Live: `/spikes/services/?dir=1|2|3&t=0..1` · captures: `node e2e/spike-services.capture.mjs`
→ `spikes/services/__captures__/d{1,2,3}-{desktop,mobile,strip,closeup,mobile-strip}.png`

Board (artifact): https://claude.ai/code/artifact/9efa85e7-6458-4f47-adbf-3c832a698bdc
Local copy: `docs/spikes/boards/services-directions.html` (git-ignored).

| Direction | Read | Strict test |
| --- | --- | --- |
| 1 · Spatial Focus Field (`scene/Direction1.tsx`) | calm, editorial, the Hero's materials; mid-transition reads as a layered image collage | fails Q3 partially (generic layered-image field) |
| 2 · Optical Aperture (`scene/Direction2.tsx`) | most literal glass after the hero (blades, depth-green thickness, gold chamfers, graphite recess); at t 0.5 two images side by side behind the opening | fails Q4 partially (slideshow in a window) |
| 3 · Mineral Strata (`scene/Direction3.tsx`, `strata.frag`) | one image at rest; on choice it cuts along the real wall's diagonal (0.61 rad), strata step in depth with gold hairlines and two glass strata, reassemble as the next state | passes all five; caution: keep separation amplitude small so Services stays quieter than Cases |

**Recommendation: Direction 3 — Mineral Strata.** The clinic's geometry is the
mechanism; surprises with neutral imagery; strongest on phone (the object is the
image); one scalar drives five masked quads + two glass strata; CSS `clip-path` twin
for the `none` tier. Direction 1 is the safe editorial fallback.

## Pass 3 — SERVICES 360 CHAMBER inside the right-hand field: REJECTED (13.09.2026)

The three-direction pass was rejected (all read as wheels of images / curved
galleries / layered posters). The brief was clarified: the orbit idea stands,
interpreted as ONE chamber with seven orientations — the whole right-hand
environment turns; nothing is shown as a ring, wheel or set of panels.

Built in `spikes/chamber/` as pseudo-motion (`?a=0..6&t=0..1`): the viewer stands
inside a seven-sided rotunda (radius 3, viewer 2 inside, slightly left of the
axis), looking at one wall through the right-hand field; the canvas is clipped to
the field so the field is a window onto the chamber. Each wall = bone wall, dark
mineral recess, one dominant image, one macro, one calm glass slab (vein ≈ 0,
faces shift but never warp), one gold hairline at 35°. The chamber turns 51.4°
about its invisible axis per service; the camera is fixed (≤ 0.08 dolly). DOM
title takes a subtle CSS perspective and resolves flat; index and copy stay.

Board (artifact): https://claude.ai/code/artifact/f15d26a7-b99b-4fc2-ae56-a4b640b97f00
Local copy: `docs/spikes/boards/services-chamber.html`. Captures:
`node e2e/spike-chamber.capture.mjs` → `spikes/chamber/__captures__/`.

Caveats on the board: face 02.2 uses the instrument plate (dark, empty); the
mid-turn corner is a hard seam (production: a soft graphite return between
walls); interaction is not built.

**Rejected:** it still treated the 360° experience as a visual object inside a
normal Services section — a fixed list on the left, a rotating environment on
the right. The brief was reset: THE ENTIRE SERVICES SECTION IS THE 360°
EXPERIENCE. No fixed index outside the scene; the service list lives inside the
world; the whole composition rotates.

## Pass 4 — FULL 360° EDITORIAL CHAMBER: information model KEPT, 3D room REJECTED (13.09.2026)

Model: the visitor stands at the centre of a circular editorial room. Seven
complete editorial walls (number, title, promise, copy, metadata, image, detail
crop, glass strip, CTA «Записаться» + «Стоимость →», neighbour names, the
orientation strip 02.1…02.7, foot navigation «prev ← · стена k из 7 · → next»)
stand as a heptagon around a fixed camera that only yaws. The WHOLE wall turns —
type, image, CTA — as one body. Only the active wall is frontal; the neighbours
recede at both edges and name the current wall at the corners. Loop 07 → 01.

Built in `spikes/room/` as a **CSS 3D cylinder of DOM walls** (no canvas): the
walls *are* the typography, so rotation cannot leave the text static. Exact
heptagon geometry (`--apothem = (100vw / 2) / tan(π/7)`, walls meet at their
edges), eye distance `--persp = 0.9 × 100vw` (frontal wall ≈ 87 % of the
viewport, neighbours ≈ 6 % each side), `--wall-h: 118svh` so the wall overruns
the frame top and bottom. Pseudo-motion `?a=0..6&t=0..1`, one eased yaw of
51.4°; `--dolly` / `--tilt` exist only for the diagram cutaway. Mobile is the
same room with 390 px walls (`--persp = 0.95 × 100vw`), each wall a complete
phone spread.

Board (artifact): https://claude.ai/code/artifact/b1b5bd3c-ef3a-4be6-8a2a-904851d9ed9f
Local copy: `docs/spikes/boards/services-full-room.html`. Captures:
`node e2e/spike-room.capture.mjs` → `spikes/room/__captures__/` (1 frontal 01 ·
2 early · 3 mid-turn · 4 late · 5 frontal 02 · 6b cutaway · 7 nav close-ups ·
8–10 mobile). The plan diagram (6b) is SVG generated by the board build.

Failure list checked on the board: no list outside the scene, nothing rotates
alone, no static text, no carousel/gallery/cards/posters, no WebGL demo in a
normal layout — all clear. Not proven: real-time weight/damping and the 07 → 01
wrap under continuous input; the ERA Mineral Glass treatment of the wall's glass
strip (currently a translucent CSS strip). Images are the Spike A test portrait
and skin plate as stand-ins; no service assets generated.

Fixes made while building: rotation sign (the «next» wall must sit on the
right — first build put 02.7 there while the foot said «→ Anti-age»); apothem
factor 0.9 made adjacent walls intersect and buried 02.7 of the strip under the
neighbour — exact geometry with a shorter eye distance instead; mobile
`--persp: 900px` zoomed the room 2.2× — eye distance now scales with width.

**Review:** the board proved the right idea — A SERVICE STATE IS THE ENTIRE
EDITORIAL COMPOSITION (number, name, title, description, metadata, imagery,
CTA, optical details) and it transitions as ONE unit. Keep that. The literal 3D
chamber is rejected: perspective walls, seams, camera-inside-a-polygon and angled
text read as architecture / an exhibition. Final direction: flatten this exact
information model into a 2D radial experience.

## Pass 5 — 2D RADIAL EDITORIAL SYSTEM: direction APPROVED, board format rejected (13.09.2026)

Model: one enormous invisible 2D wheel. Two rings about the same centre — the
outer ring carries the seven complete editorial states, the inner ring is the
dial of names (the only visible trace of the wheel: a 1 px ring with seven
ticks). Rotating the wheel moves both rings at the same angular speed, so a state
and its name travel together; a state's own rotation is damped (×0.35) so it
stays flat, tilts ≤ 9° at mid-turn and resolves horizontal at the focal position.
Translation + scale (1 → 0.85) + subtle rotation; opacity secondary (a neighbour
at rest is a 16 % ghost of its title at the edge — partial typography, never a
second layout). No perspective, no 3D, no walls.

Desktop: centre just beyond the left edge (`0.012W, 0.5H`), dial `R = 0.33W`
(names are spokes leaning on the ring from inside: active horizontal at the apex,
1.5 rem serif, gold underline; neighbours ±51.4° smaller/lighter), states on
`R = 0.648W` (frame centre `0.66W`); the state is a 0.6W × 0.78H grid (text 46 %
· field 1fr). Phone: centre below the screen (`0.5W, 1.16H`), dial `R = 0.3H` as
a bottom arc with tangent names, states on `R = 0.72H` (0.86W × 0.6H: field,
number, title, promise, CTA); swipe turns the wheel.

Built in `spikes/radial/` (`?a=0..6&t=0..1&hud=0`, pseudo-motion, one smoothstep
for the storyboard). Board (artifact):
https://claude.ai/code/artifact/2450ad29-a03b-4521-ad19-02515f332264
Local copy: `docs/spikes/boards/services-radial.html`. Captures:
`node e2e/spike-radial.capture.mjs` → `spikes/radial/__captures__/` (desktop
t 0 … 1 in nine frames, nav-rest, nav-turning, mobile t 0 … 1 in five). The
plan diagrams are SVG generated by the board build.

Not proven: real-time feel (mineral ease, drag on the ring, 07 → 01 wrap,
keyboard) and the ERA Mineral Glass treatment of the state's glass strip. Images
are the Spike A stand-ins; no service assets generated. Known softness: the
phone mid-turn frame is sparse (the two states sit mostly outside the 390 px
frame at 25.7°) — the arc rise, tilt and dial carry the radial read; production
can shorten the phone's outer radius only by lowering the state, which is a
composition call for the next pass.

## Next steps (blocked on approval)

1. Review pass 6 in the working spike (not the board) and return notes.
2. Then: productionise Services from `spikes/radial/` into `src/sections/services`
   (tokens, `useGSAP`, `lib/stage` grips, the `none` tier = the greyscale
   prototype's list; the real Mineral Glass strip when the WebGL phase opens).
3. Do NOT start Spike C. Do NOT generate the seven service images. Do NOT
   productionise Services.

**Review of pass 5:** the strongest direction so far — a service is a full
editorial state; the system is 2D radial. But the ring of mini pages / the
top-down plan are internal explanation only, never the user-facing solution; the
visitor must never look at the whole wheel as an object. Next: a real section
prototype, not a board.

## Pass 6 — THE RADIAL SECTION, working spike: AWAITING REVIEW (13.09.2026)

`spikes/radial/` is now the working section logic (`ServicesRadial`): the wheel
is a hidden navigation engine. One active spread; the dial arc enters from the
left (desktop) / sits along the bottom (phone) with the active name horizontal
on the content line and the neighbours as tilted hints; a 14 % ghost of the
next title at the edge; the whole state travels as one unit.

Engine: `turn` (float, states) tweened with GSAP on a CustomEase «mineral»
(`M0,0 C0.52,0 0.18,1 1,1`; 1.5 s + 0.5 s per state, 1.1 s for a snap); shortest
path with wrap (07 ↔ 01); transforms written imperatively in one `apply()` (no
React re-render on the frame path); `prefers-reduced-motion` lands without a
tween. Grips: the dial is a pointer grip (angle about the wheel centre; a flick
carries at most one state); on the phone the spread takes a horizontal swipe
(`touch-action: pan-y`); names are links (`aria-current`); keyboard ← ↑ / → ↓ on
the section; inactive states are `inert` + `aria-hidden`; a live region announces
the service. The mouse wheel is not handled; page scroll is untouched (proved).

Spike artifact (interactive): https://claude.ai/code/artifact/f5dd8b8f-4a3b-495c-97cb-803aa7c58cbb
Board: https://claude.ai/code/artifact/652ec34b-820b-4860-81e4-5b88875d106e
(local `docs/spikes/boards/services-radial-section.html`). Bundle:
`SPIKE=radial npx vite build --config vite.spike.config.ts && node scripts/inline-spike.mjs radial`
→ `dist-spike/radial.html` (fonts and images inlined, ~3.9 MB). Proof:
`node e2e/spike-radial.interact.mjs` (click, keyboard, wrap, drag, wheel-ignored,
swipe, tap, reduced motion — all pass).

Not yet: the glass strip is a CSS stand-in; images are the Spike A stand-ins;
the phone mid-turn is sparse by geometry; the header/neighbour sections are
stubs. No production code.
