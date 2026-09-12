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

## Pass 4 — FULL 360° EDITORIAL CHAMBER: AWAITING VISUAL APPROVAL (13.09.2026)

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

## Next steps (blocked on approval)

1. Approve pass 4 (the FULL 360° room) or return notes on the board.
2. Then: pass 5 = the room with real interaction (foot/edge/strip grips → yaw tween
   with the mineral ease; keyboard; phone swipe; 07 → 01 wrap; reduced-motion
   lands on the frontal wall), measured, on the review board — page scroll is
   never hijacked, the wheel never rotates the room.
3. Do NOT start Spike C. Do NOT generate the seven service images. Do NOT
   productionise Services.
