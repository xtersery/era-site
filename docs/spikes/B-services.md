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

## Next steps (blocked on approval)

1. Approve a direction (or ask for a second concept pass).
2. Then: Spike B pass 3 = the approved direction with real interaction (DOM index → `t`
   tween with the mineral ease, hover pre-shift ≤ 0.1, keyboard, phone), measured, on
   the review board.
3. Do NOT start Spike C. Do NOT generate the seven service images. Do NOT
   productionise Services.
