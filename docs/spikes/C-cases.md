# Spike C — Cases / до · после

**Status: pass 4 — the threshold opened, AWAITING REVIEW (13.09.2026).** The
passage concept is approved in principle; do not redesign it. Not productionised;
do not start Specialists.

Passes 1–2 (`spikes/cases/`, a DOM/CSS spatial archive) are superseded as a
*direction* by pass 3, but their honesty machinery carries over unchanged. They
stay in the repo as the fallback for the `none`/reduced tiers.

Narrative role: Services is the choice, Cases is the proof. The section's laws
are **DEPTH + FOCUS** with restrained refraction — deliberately not the radial
rotation of Services.

## The model — a spatial archive

Four case planes stand on **one axis** running from the viewer into the room
(dock at 33.5 % × 53 % of the viewport, vanishing point at 78 % × 36 %, the
pass-by point off the lower-left). Depth is a single scalar `pos`:

- `d = k − pos`; ahead of the dock `scale = 1/(1 + 0.52d)`, blur `2.6d px`,
  green-black fog `1.25k`, edge mask `0.5d`, position lerped toward the
  vanishing point;
- behind the dock the plane **passes the viewer**: `scale = 1 + 0.72|d|`,
  blur to 13 px, opacity `1 − 2u`, dissolving off the lower left.

No plane has a frame, shadow or radius; deep planes are masked with a radial
gradient so they lose their edges into the ground instead of ending as a card.
At most **three planes are visible at once**, only one is readable.

**Scroll rhythm (different from Services on purpose):** pinned and *scrubbed*
with a **dwell plateau** — the first 55 % of each case's 100 vh interval the
case stands still and is read, the remaining 45 % is the approach. No snap, no
stepping. Secondary exploration: click a plane in the depth to walk to that
case. Page scroll is never intercepted.

## The reveal — honest by construction

«После» is the base plate. «До» is a second layer in **the same box, the same
`object-fit`, no transform**, uncovered by a mask that follows the pointer and
is clamped inside the frame. *(Pass 2: the rectangular `clip-path` window read
as a crop box / selection tool and was replaced — see below.)* Modes «До» · «Сравнить» · «После» are real buttons (44 px+, visible
focus, `aria-pressed`); on a phone press-and-hold opens the window to the full
frame — no hover anywhere. The material is on the rim only: 1 px gold border,
a 6 px mineral band inside it, one warm hairline top-left, one teal hairline
bottom-right. Nothing inside the window is scaled, curved or vignetted.

Measured (`e2e/spike-cases.perf.mjs`):
- window interior vs the full «до» plate — **max channel delta 1/255**, mean
  0.007, 0 % of 67 620 px differ;
- outside the window vs the plain «после» plate — **byte-identical**;
- the two layers' layout boxes are identical and the «до» layer's transform is
  `none`.
The board also carries a 48 px grid over both layers: the lines stay continuous
across the window edge.

## Technical report

Desktop 1440 × 900 DPR 1 / phone 390 × 844 DPR 2, Chrome, one full scroll pass:

| | desktop | phone |
| --- | --- | --- |
| median frame | 16.7 ms (60 fps) | 16.7 ms (60 fps) |
| p95 | 16.7 ms | 16.8 ms |
| frames > 33 ms | 0 % | 0.4 % (one 167 ms frame at the first touch — pin refresh) |
| layout / recalc | 65 / 13.3 ms / 25.5 ms | 95 / 13.3 ms / 34.8 ms |
| script, whole pass | 163 ms | 254 ms |
| composited layers | 10 | 11 |
| planes visible at once | 3 of 4 | 3 of 4 |
| textures | 8 · 819 × 1024 · 13.1 MB decoded | 8 · 508 × 635 · 5.0 MB decoded |
| JS heap | 12.8 MB | 12.7 MB |

**No WebGL was opened** — the depth is transform, blur, mask and opacity on DOM
planes (CLAUDE.md's "can CSS do it?" gate; the architecture already specifies a
CSS Cases lens). So there are no draw calls, no KTX2/Basis and no GPU texture
budget to report. Two budget items were **not** met and are open: the desktop
plates are 819 × 1024 rather than 1536 px (the only test portrait is
1536 × 1024 and the crops come out of it — real case photography will be shot
larger), and **disposal / lazy loading is not implemented** (all eight plates
load with the section; fine at four cases, must be revisited past ~8).

## Honesty of the test material

All four pairs are crops of the **one** test portrait. In each pair «до» and
«после» are the same pixels in the same frame: «до» is a colour grade (cooler,
duller, less saturated), «после» is the plate as shot. Nothing was retouched,
morphed or simulated as a treatment outcome — which is what makes the geometry
proof possible. «Визуализация» is stamped on every image and repeated in the
dossier with «не реальный пациент; на запуске заменяется съёмкой с письменного
согласия»; neither label can be removed by a mode or a state. Generator:
`e2e/spike-cases.assets.mjs`; output `spikes/cases/assets/` (git-ignored,
derived from the git-ignored portrait).

## Recommendation

Take the direction. Two changes before production: lengthen the dwell to ~65 %
of each case's interval so the evidence is read rather than passed; and keep the
reveal in CSS — a WebGL rim would buy a better mineral edge at the cost of the
one thing this section must never lose, a provably honest comparison. If the rim
ever moves to WebGL, the before/after plates stay DOM images underneath it.
Not recommended: a thumbnail strip, a second visible case row, or auto-play.

## Deliverables (this session had no publishing tool — local files)

- review board: `docs/spikes/boards/cases-archive.html` (self-contained)
- live spike, single file: `docs/spikes/boards/cases-spike.html`
- or run it in the project: `npm run dev` → `/spikes/cases/`
  (`?c=0..3&p=0..1` stills · `?grid=1` alignment grid · `?hud=1` readout ·
  `?mode=before|after|compare` · `?wx=&wy=` window position)

## Open / not proved

The rim is CSS, not the ERA Mineral Glass shader; the plates are stand-ins; the
archive has never been longer than four, so disposal is untested; Cases has not
been seen next to the real Services room in one continuous scroll.

---

## Polish pass 2 (13.09.2026) — reveal, neighbour depth, atmosphere

Approved brief: one focused pass, no redesign, no new imagery, no typography
work. Three areas changed; everything else is untouched.

**1 · The reveal is optical, not a crop box.** The hard `clip-path` rectangle is
gone. «До» is uncovered by a `mask-image`: an ellipse of 52 % × 66 % of the
plate (74 % × 50 % on a phone), opaque to 55 % of its radii and feathered to
nothing by 90 %, **intersected** with a 124° linear gradient so the trailing
side dissolves first — asymmetric, and the edge never closes. The rim is a 1 px
ring at the 63 % contour, itself masked so only about a third of the arc on the
upper left is lit and fades out, plus one 12 % mineral glint at −38° and a
single teal hairline on the far side. The mask changes **opacity only**, which
is why the reveal can be soft and still be provably exact:
- reveal core vs the full «до» plate — **max channel delta 0/255** over 50 160 px
- far outside the reveal vs the plain «после» plate — max 1/255, mean 0.004
- layout boxes identical, «до» layer transform `none`
- the 48 px alignment grid runs continuously across the edge (board, item 2b)

**2 · The neighbour is a fragment in depth, not a second picture.** Scale
1/(1 + 0.95d) (was 0.52d), blur 3.4d px, a new contrast/saturation/brightness
fall-off of 0.74d, fog 1.7k (was 1.25k), the mask closes the frame to an
off-centre fragment as it recedes, and the plane drifts 6 % laterally per unit
of depth.

**3 · Mineral atmosphere.** One faint breath of teal light (5.5 %) where the
archive recedes, low sage smoke (5 %) where cases pass the viewer, and 3.5 %
fractal grain over the section to keep the gradients from banding. No veins, no
marble, no visible gradient edges.

Unchanged: information hierarchy, typography, metadata, «Визуализация» labels,
CTA placement, dominant active case, spatial gallery concept, before/after
functionality, placeholder imagery, scroll rhythm. Performance is unchanged —
60 fps median on both tiers, 0 % of frames over 33 ms, 10/11 composited layers,
12.9 MB heap.

Board: `docs/spikes/boards/cases-polish.html` (pass-1 board kept at
`cases-archive.html`; pass-1 frames kept in `spikes/cases/__captures__/pass1/`).

---

## Pass 3 — THE PASSAGE OF THRESHOLDS (13.09.2026)

Creative-director note: Cases is no longer a gallery but an **immersive art
passage** — monumental optical thresholds in depth, entering / approaching /
crossing / arriving / revealing. References given: `docs/references/noomo-labs.png`
(scale, editorial-tech immersion, objects cropped by the frame, mono labels at the
margins) and `docs/references/igloo-portals.png` (segmented monumental ring,
threshold logic, haze). Used as direction only, never copied.

**The object.** `spikes/portal/scene/portalGeometry.ts` authors each threshold
deterministically from its case index: 7–9 annular blocks, each with its own
inner/outer radius, depth (0.3–0.92), bevel and seam, each nudged in z and tilted
so nothing is flush; merged into ONE geometry, scaled 1.07 in x so the ring is
slightly elliptical. Two or three short torus arcs of polished gold lie on the
aperture edge — gold as light, not decoration. No neon, no glow, no perfect ring.

**The material.** ERA Mineral Glass from Spike A: transmission, ior 1.45,
attenuation `#3D6B58` over 4.5 units (thick reads green-black, thin reads clear),
clearcoat, the ERA environment (gold key upper left, teal fill right),
`NoToneMapping`. Only the threshold the visitor is standing at gets true
transmission (one pass); the others use the same glass without the backbuffer and
give up their light to the haze.

**The scene.** Four thresholds on one axis, each offset off it (±1.05 x, ±0.58 y)
so the passage is a corridor of objects rather than a bullseye tunnel. `FogExp2`
`#060f0c` at 0.115, one warm key, a second dim warm source behind the shoulder so
the inner bevels read, a teal fill, green-black ambient. The case plate hangs 1.6
units *behind* the threshold plane; its edges are eaten by an elliptical aperture
mask so it belongs to the opening.

**The walk.** Pinned, scrubbed, 110 vh per threshold with a 52 % dwell. Camera:
forward on one axis, a hand's width of drift, re-centring at each dock; it passes
through the threshold plane at `DOCK/SPACING` of the interval. The case is
released while its threshold is still ahead (fade from 4.3 to 2.1 units in front)
— the visitor crosses an opening, she does not fly into a photograph.

**Before / after as depth.** Arriving, the visitor sees the state the case came
from; it resolves into the result during the first half of the dwell. The pointer
pushes back into it as a soft elliptical field; «До» · «Сравнить» · «После» are
real buttons; a phone press-and-hold does the same. Both states are **one plane,
one uv set, mixed by opacity** — no transform anywhere, so the face cannot move.
Proof (`e2e/spike-portal.perf.mjs`): edge-structure alignment searched over ±3 px
— zero shift is the best by 3.7× (0.643 vs 2.395 at 1 px, 2.841 at 2 px).

**Measured** (Chrome, full scroll pass): 60 fps median on both viewports, p95
16.7 / 16.8 ms, **0 %** of frames over 33 ms, **11 draw calls**, 17 504 triangles,
23 programs, 27 geometries, 14 textures, 61 MB JS heap, 75 DOM nodes in the
section. These come from a desktop GPU driving a phone-sized viewport — they say
the scene is cheap, not that a mid-range Android holds 60 fps.

Board: `docs/spikes/boards/cases-passage.html`
Running spike (single file): `docs/spikes/boards/cases-passage-spike.html`
or `npm run dev` → `/spikes/portal/` (`?c=&p=&mode=&fx=&fy=&only=&hud=1`).

**Open / not proved:** a real device test (and a phone tier that drops the
transmission pass entirely); the reduced-motion path (must land on a docked
threshold and let the ladder do the walking); disposal past four cases; the
passage seen straight after the approved Services room; real case photography
(the composition assumes a vertical 4:5 frame, face slightly above centre). The
plates are still grade-only stand-ins from the one test portrait, «Визуализация»
on every case.

---

## Pass 4 — APERTURE AND HIERARCHY (13.09.2026)

Review of pass 3: the direction is right, the hierarchy was wrong — the
threshold obscured too much of the result. **The case is the hero; the threshold
frames and spatialises it.** Geometry-only refinement; the concept, the
traversal, the neighbouring thresholds, the museum label, the material language
and the before/after logic are untouched.

| | pass 3 | pass 4 |
| --- | --- | --- |
| aperture radius | 1.78 | **2.5** |
| clear opening at the dock (1440 × 900) | 38.7 % | **70.1 %** (target 65–75) |
| glass actually painting the frame | — | 15 % desktop · 18 % phone |
| blocks per threshold · seams | 7–9 · 0.01–0.06 rad | **5–7** · 0.05–0.27 rad, ~1 in 6 omitted |
| block reach outward · depth | 1.62 · 0.30–0.92 | **2.6** · 0.34–1.14 (runs past the frame) |
| gold glints | 2–3 arcs, 0.22–0.72 rad | **1–2** arcs, 0.10–0.32 rad, thinner |
| case plate height | 3.1 | **4.6**, corner-only fade instead of a circular mask |
| draw calls · triangles | 11 · 17 504 | **9 · 8 460** |

Also in this pass: the camera steps 0.72 to the left and looks parallel to the
axis so the object sits right of centre and the museum label keeps its own air
(a soft mineral gradient gathers the dark on the left); the far thresholds are
dimmer still; and the **phone has its own walk geometry** — camera 8.6 units
back, thresholds 11.2 apart, fog scaled to match — because at the desktop
distance the aperture fell entirely outside a portrait frame.

Openness is reported two ways on purpose: **70.1 %** is the clear opening (the
share of the frame inside the aperture, computed from the geometry), **15 %** is
how much of the frame the glass actually paints (lower, because the ring is
discontinuous and most of its mass is off-frame).

Unchanged and re-verified after the change: 60 fps median on both viewports,
0 % of frames over 33 ms; «до» vs «после» alignment still best at zero shift
(1.209 vs 3.473 at 1 px).

Board: `docs/spikes/boards/cases-passage-aperture.html` (pass-3 board kept at
`cases-passage.html`; pass-3 frames in `spikes/portal/__captures__/pass3/`).
Spike: `docs/spikes/boards/cases-passage-spike.html`.
