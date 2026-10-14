# Spike C — Cases / до · после

> **CLOSED — 14.10.2026, by the client's decision: no longer relevant.** Removed from the active plan; this record and its results are kept as history. What shipped of it lives in the production page `spikes/full/`.

**Status: DIRECTION APPROVED — THE ARCHIVE ON A RAIL (pass 6 PASS, 14.09.2026).
Pass 7 (experience refinement) was reviewed: direction approved in principle,
geometry sent back — cases drifted too deep, the spiral did not read, the
composition was sparse. Passes 7b (spiral geometry), 7c (the opened case as an
isolated scene, «×», return to the same position) and 7d (04.1 as the frontal
anchor the spiral unwinds from) are built and AWAITING REVIEW.** The portal passage and all other concepts are closed; do
not go back to them. Not productionised; do not start Specialists.

Board (pass 7b–7d): https://claude.ai/code/artifact/6044c33b-3b46-4102-b0e7-08aa7ff9ce38
Spike (interactive, pass 7d): https://claude.ai/code/artifact/193e5716-b73f-4668-af01-d7ed547f3059
Board (pass 7, superseded): https://claude.ai/code/artifact/bd4cd872-3e09-4aaa-a8c0-f037002cc537

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

---

## Pass 5 — THE ARCHIVE ON A RAIL (13.09.2026)

Direction correction: stop inventing a gallery system from scratch; take the
**ThreeUI `Gallery` element** (https://threeui.com/ui-elements/gallery) as the
mechanical base and extend it into an ERA Cases experience with a focus state
and an unfold state. Not literal portals, not a ring, not a cover flow.

**Inherited from the element** — its own description is "sixteen curved
editorial panels orbiting a vertical cylindrical rail on a quiet paper grid":
the arrangement (curved panels around a vertical rail, each at its own angle and
height), the slow continuous drift as the idle state, and the panel as a *bent
sheet* rather than a flat card. The element itself is decorative — autoplay,
props for speed/scale/opacity/hue, no selection and no detail state.

**What is ours.** The rail is walked by the page's own scroll (pinned, ~95 vh
per case) instead of autoplay; sheets are pickable (click on a sheet, «Открыть
кейс», the index, keyboard); the curvature became a **uniform** so a chosen
sheet can *unroll*; the two case states live on the sheet, sampled with the same
uv and mixed by opacity only; the archive dims to about a fifth while one case
is read; the ground is ERA's mineral dark with grain instead of a paper grid;
gold is one glint on the rail marking where the visitor stands; every word is
DOM.

**The hero interaction.** One `unfold` value, 0 → 1, tweened 1.25 s on the
mineral ease. The sheet's position is interpolated **in camera space** from its
rail slot to a dock 7.4 units in front of the visitor (8.4 on a phone) — so it
approaches monotonically instead of swinging past her — its quaternion slerps to
the camera's, scale → 1.25, and `uBend` 1 → 0 flattens the wrap. The scene
projects the sheet's screen box back to the DOM and the editorial block fades in
beside it. «Назад в архив» / Esc / the back control runs the same value to 0 in
1.05 s and the sheet re-wraps onto the rail.

**Measured.** Browsing and open both hold 60 fps median (p95 16.8 ms, 0 % of
frames over 33 ms) on 1440 × 900 and on a 390 × 844 viewport; **5 draw calls,
770 triangles, 2 programs, 8 textures**, 31 MB JS heap, 80 DOM nodes — a
fraction of the portal scene. Before/after alignment re-proved on the open
sheet: zero shift is the best by 2.4× (1.689 vs 4.116 at 1 px).

**Real vs stand-in.** Real: the mechanic, the scroll driver, picking, the
unfold, the return, the before/after logic, the DOM editorial block, keyboard
and touch paths, the Russian placeholder copy. Stand-in: the four case images
(crops of the one test portrait; «до» is a colour grade of «после», no
retouching, no simulated outcome), «Визуализация» on every open case.

**Main risk.** With four cases the ribbon is an archive *fragment*; it wants
8–16 sheets to read as an archive — a content question. Second: the affordance —
a sheet is clickable but nothing shouts it, so the spike leans on «Открыть кейс»
and the index to teach the gesture.

Board: `docs/spikes/boards/cases-ribbon.html`
Spike (single file): `docs/spikes/boards/cases-ribbon-spike.html`
or `npm run dev` → `/spikes/gallery/` (`?c=&p=` browse still · `?focus=&u=`
unfold still · `?mode=` · `?fx=&fy=` · `?hud=1`).

Recommendation: take this as the Cases direction and treat the portal passage as
closed. Then, in order: 8–12 cases on the rail and re-judge the browse state; a
decision on the affordance; a real device test; a reduced-motion path that skips
the travel and opens the case in place.

---

## Pass 6 — STAGING CORRECTION (13.09.2026)

Review of pass 5: the concept holds, the staging did not — equal rectangles on
the same small radius, colliding silhouettes, z-order glitches, and a
composition squeezed into the middle of the frame. Rule for this pass: **one
active case + large spatial gaps + deep neighbours**, solved spatially rather
than with opacity.

| | pass 5 | pass 6 |
| --- | --- | --- |
| helix radius | 3.2 | **7.5** |
| angle between cases · drop | 38° · 1.85 | **25° · 1.7** (× 1.45 on a phone) |
| where the visitor stands | fixed 11.5 from the axis — every sheet about the same distance | **just outside the helix**: the docked case is always 4.55 away (7.6 on a phone) |
| active case width on screen | ~28 % | **45 %** (target 45–60) |
| neighbour depth | 1.05–1.2× the active distance | **1.27–2.25×**, and scaled 0.72 on top |
| neighbour form | the same rectangle, smaller | **a clipped fragment** of its own plate — a slice, a band, a cheek — flattened and cooled (`uFragment`, `uFragmentRect`, `uFlat`) |
| overlap | silhouettes collided; transparent sheets cut into each other | **324 px and 236 px of clear air** between silhouettes at the dock; sheets no longer write depth, so no z-fighting |
| cost | 5 draw calls · 770 triangles | 4–5 draw calls · 578–770 triangles |

The measurements come from the running scene: the spike exposes every sheet's
projected box on `window.__sheets`, and the board's annotated figure draws those
boxes, not hand-drawn ones.

Unchanged and re-verified: 60 fps median browsing and open on both viewports,
0 % of frames over 33 ms; the before/after alignment on the open sheet is still
best at zero shift (1.537 vs 3.105 at 1 px); the full interaction path (scroll,
click, open, До/После, back, index, Escape, phone tap/hold) still passes.

Board: `docs/spikes/boards/cases-ribbon-staging.html` (pass-5 board kept at
`cases-ribbon.html`). Spike: `docs/spikes/boards/cases-ribbon-spike.html`.

**Still open:** the archive is four cases long, so the "one distant hint" is
usually off-frame — the staging is built for 8–16 and should be re-judged with
them; and the affordance is still carried by «Открыть кейс» and the index rather
than by the sheet, which matters more now that neighbours are fragments (decide
whether a fragment is clickable at all, or only the docked case).


---

## Pass 7 — EXPERIENCE REFINEMENT (14.09.2026)

Review of pass 6: **PASS — the archive-on-a-rail is the Cases interaction
direction.** Spatial archive · scroll-driven · the chosen case flies forward ·
the editorial state unfolds. Before closing, one refinement pass on experience
quality only — no architecture, no rebuild. Four points were asked.

**1 · Density.** Eight cases instead of four: the prototype's four placeholder
records plus four more in the same format, spike-only
(`spikes/gallery/cases8.ts`; `src/data/cases.ts` is untouched because the
greyscale room and its 55 tests are built on four). Four new stand-in plates
were cut from the one test portrait (two mirrored — a framing device, not a
result). The staging was turned: the helix now winds so the case **coming
next** rises through the lower left and the one just left leaves at the upper
right — at any position the archive is a diagonal of four sheets through the
frame (three at the head), never a photograph with a fragment beside it. The
kicker says «Архив результатов · 08 кейсов».

**2 · Affordance.** «Открыть кейс» was carrying the gesture; the sheet now
carries it. Every sheet in view is a real `<button>` laid over its projected
screen box every frame — a **DOM grip**, so the canvas is `pointer-events:
none` as the architecture requires (§0.8) and the sheets are in the Tab order.
The docked case carries a fine gold edge, the rail's glint under it, and its own
wall label «04.4 · открыть →». Hover or keyboard focus on any sheet lifts it
0.22 units off the rail toward the visitor (eased, measured 6.55 → 6.31 and
back) and lights its edge; a neighbour's label shows its number and gains the
verb only when the pointer arrives. The boxed button became a mono link
«Открыть кейс 04.4 →» — the keyboard / screen-reader way in — so there is one
primary CTA per viewport again. The hint is one clause. Decided here, to be
confirmed: a neighbour is clickable and opens directly (the travel starts from
wherever it hangs).

**3 · One spatial object.** The rail is real: one hairline helix that runs
level across the top edge of each sheet and descends between them (landings),
drawn behind the sheets, with the glint where the visitor stands — the sheets
hang from it. Depth is on the surface: the mineral dark gathers along each
curved sheet with distance in the shader (`vDepth`), so a sheet turns away into
the fog rather than being uniformly dimmed; neighbours lose contrast and
colour. Gold is light: one glint just inside the docked sheet's edge, brightest
where the key falls, dying along the far edges — it was first built as a full
rim and read as a frame, so it was cut back. The pass-6 clipped fragments were
dropped: a whole sheet reads as a documented result, a slice does not.

| | pass 6 | pass 7 |
| --- | --- | --- |
| helix · angle · drop | 7.5 · 25° · 1.7 | 7.5 · 20° · 1.5, wound the other way |
| the visitor | 4.55 outside; dock 45 % wide, ~90 % tall | 5.2 outside; dock 33 % wide, 68 % tall |
| sheets in frame | 1 + a fragment | 4 (head: 3) |
| neighbours | clipped fragments × 0.72 | whole sheets × 0.82, cooled, flattened, fogged along the surface |
| the rail | vertical hairline at the axis, 7.5 behind the sheets | helix with landings through the sheets' top edges, behind them |
| the docked case | larger | larger · lit edge · own label · the rail's glint |
| picking | mesh raycast (canvas takes the pointer) | DOM grips (canvas `pointer-events: none`) |

**4 · Transitions.** Browse → focus: the words now arrive at 72 % of the travel
instead of after it; the archive recedes to a visible archive (dim 0.5,
opacity 0.65), not to black — a single result taken out of a collection.
Focus → return: if the page was scrolled while the case was open, the rail
catches up with a 0.7 s mineral ease instead of jumping on the next scroll
event (pass 6 had this latent jump); scrolling the section away closes the
case (`onLeave` / `onLeaveBack`). The browse block, index and grips fade
(360 ms) instead of toggling `hidden`. Measured per animation frame
(`e2e/spike-gallery.continuity.mjs`): largest unfold step 0.041 / 0.049,
largest sheet move 12 / 16 px (desktop open / return), 8 / 10 px on the phone,
width step ≤ 10 px, monotonic — on a ~400 px journey, that is the peak of an
eased travel, not a jump. Sheets do not write depth, so the travelling sheet
never cuts into a neighbour.

**Phone — its own composition.** The frame is too narrow for a neighbour
beside the docked case, so the archive is a stack with a slight twist (step
16°, drop 2.9, the visitor 8.2 out): the docked case in the upper half at 68 %
width with its label under it; the next case rising from the lower left behind
the words' scrim (now always on — in pass 6 it appeared only when open); the
previous one leaving at the upper right under a new top scrim. Open: the sheet
at 83 % width above the words, never under them (it overlapped in pass 6).

**Reduced motion.** No drift (measured 0 px over 1 s), no hover lift, the case
opens and returns in place.

**Technical.** 60 fps median, 0 % of frames over 33 ms, browsing and open, on
1440 × 900 (real Chrome on this Mac) and on an emulated 390 × 844 @2× touch
viewport; 5–6 draw calls (up to 9 mid-archive: 8 sheets + the rail), 3
programs, 34 MB heap. **Honesty:** «до» vs «после» on the open sheet still best
at zero shift (1.530 vs 3.316 at 1 px). Interaction proof
(`e2e/spike-gallery.interact.mjs`): scroll browse · hover lift and settle · Tab
to a sheet · click the docked sheet · rail holds still while open · До/После ·
back with catch-up · index · Escape · close on leave · phone touch scroll, tap
the sheet, back, tap the link — all pass.

**Not proved: a real phone.** The mobile numbers are emulation on a desktop
GPU; the staging and the touch paths are proved, the frame rate on a real
mid-range phone is not. That test needs a device in hand.

Board: `docs/spikes/boards/cases-ribbon-refined.html` (built by
`e2e/spike-gallery.board.mjs`; pass-6 board kept at `cases-ribbon-staging.html`).
Spike: `docs/spikes/boards/cases-ribbon-spike.html` or `npm run dev` →
`/spikes/gallery/` (`?c=&p=` browse still · `?hover=k` · `?c=&focus=&u=`
unfold still · `?mode=` · `?fx=&fy=` · `?hud=1`).

**Recommendation:** close Spike C on this pass. Carry into production: the
DOM-grip picking model, one `STAGING` object per viewport class, `cases8`'s
format as the content contract (8–16 cases), the honesty label on every case.


---

## Pass 7b — THE SPIRAL GEOMETRY (14.09.2026)

Review of pass 7: the direction holds, the geometry does not — (1) the sheets
drifted too far into the background, (2) the spiral read as a loose diagonal,
(3) the composition was sparse. Fix by better spiral geometry, not by scaling
or scattering. One cause behind all three: the visitor stood outside a **wide**
ring (radius 7.5, 20° between cases), so only ~60° of the helix was ever in
frame — a diagonal, not a turn.

**The turn.** A tight ring of eight cases making one full turn: radius **3.6**,
**44°** between cases (8 × 44° = 352°), drop **0.8** per case (a turn descends
6.4). A sheet (2.4 wide) now wraps 38° of the ring, so its curvature is
visible. The visitor stands **8.6** outside the ring, **1.6 above** the docked
case and looks 0.5 below it, with a longer lens (**fov 30°**, was 46°) — further
back so the ring is seen as a ring rather than as perspective, from above so
the far side shows over the docked case. Result in frame: the docked case
frontal and lit, right of centre; the next and the previous turned away
either side, one step lower and one step higher; the cases after them edge-on
at the ring's extremes; the far side of the turn as dark slates. The rail's
landings draw the helix as a line as well.

**Back faces.** From outside a tight ring the far side shows the backs of
sheets; with `DoubleSide` that was a mirrored face. The fragment shader now
uses `gl_FrontFacing`: a back face is the back of a plate — dark mineral glass
with the key, no image, 35 % thinner — so the far side is a body, never a
mirrored face.

**Clamped recession.** Fog became a linear ramp over 9 units to a ceiling of
60 % (was an exponential that ran to black); index dim is capped at 0.62 (was
0.9); contrast loss is 0.55 + 0.12 per step. Measured at 04.4: the nearest
sheet at 8.77, the farthest drawn at 16.5 — a **1.9×** spread (was 2.4× and
into black); 8 of 8 sheets in frame (was 4); the docked case 32 % of the
viewport wide and 63 % tall; its turned neighbours 54 % of its width (was
60 % of a smaller dock); neighbour scale 0.94 (was 0.82) — the hierarchy is
distance and angle.

**Open state.** The camera steps in 1.4 (was 0.9 → 1.9 across passes) and the
sheet stands at z −9.2 for the longer lens — 63 % of the frame, flat, with
the ring still visible behind it (the previous case turned away at the right,
the next behind the words). Per-frame continuity re-measured: largest move
11 / 12 px (desktop open / return), 7 / 9 px (phone), largest unfold step
0.049, monotonic, 60 fps, 0 % over 33 ms.

**Phone — a column of the turn.** The frame cannot hold the ring, so: the same
44° step on radius 3.2, drop 1.6, the visitor 8.4 out and 0.8 above. The
docked case centred at 66 % width, the next turned away at the left edge, the
previous at the right, the backs behind.

**Technical.** 7 draw calls on desktop (8 sheets + rail; the whole ring is in
frame), 6 on the phone; 60 fps median both; 34.5 MB heap. Honesty: zero shift
still best (1.471 vs 3.137 at 1 px). Interaction proof unchanged and passing
(hover lift 10.91 → 10.67 and back; Tab; click; catch-up 2.63 → 2.99; index;
Escape; close on leave; phone tap/hold).

**Trade-off made, to be confirmed:** from just outside a tight ring the ±2
cases are inevitably edge-on and the far side is backs — that is what a ring
looks like from outside. If the far side should show faces, the visitor would
have to stand inside the ring, which is the chamber that was rejected in
Spike B; the slate treatment is the honest alternative.

Board: `docs/spikes/boards/cases-ribbon-turn.html` (`e2e/spike-gallery.board.mjs`;
pass-7 board kept at `cases-ribbon-refined.html`).
Spike: `docs/spikes/boards/cases-ribbon-spike.html` or `npm run dev` →
`/spikes/gallery/`.


---

## Pass 7c — THE OPENED CASE AS ITS OWN SCENE (14.09.2026)

Review note on 7b: opening a case that was not the front-most left the
archive readable behind the open sheet — overlap and clutter. Required: the
opened case is an isolated focus state; the archive leaves the composition
once the sheet arrives and reappears on close; the visitor returns to the same
archive position; a clear «×» close is the primary exit.

**Isolation.** Every non-focused sheet and the rail now fade to 3 % over
25 % → 80 % of the travel (`gone = smooth((u − 0.25) / 0.55)`), so the ring is
still there while the sheet leaves it and is gone before the words arrive;
on the return it is back before the sheet has re-wrapped. Index dim no longer
depends on `u`. Browse = archive; open = only the active case, its words, and
one way out.

**«×».** A 44 px close with a gold hairline, hung at the open sheet's top-right
corner (20 px outside it on desktop; above the corner on the phone), placed
from the sheet's projected box like the wall label; `aria-label` «Закрыть
кейс»; fills gold on hover; Escape unchanged. «← Назад в архив» stays as the
secondary editorial control.

**Same position on return.** `scrollY` is recorded on open; on close, if the
page was scrolled meanwhile and the recorded position is still inside the
pinned range, the page is put back to it instantly — the section is pinned, so
nothing visible moves — and the rail position is untouched. The pass-7
catch-up tween remains only as the fallback for a position outside the pin.
Measured: pos 2.63 → 2.63 with 300 px of scrolling while open, scrollY
2943 → 2643; the same after opening a neighbour directly.

**Travel rotation.** The sheet's turn toward the visitor is now a single
quaternion slerp from its rail orientation to the camera's (the Euler override
that followed the slerp is gone) — no roll mid-flight. Continuity re-measured:
max 10 / 12 px per frame (desktop open / return), 7 / 8 px (phone), monotonic,
60 fps.

Board: `docs/spikes/boards/cases-ribbon-turn.html` (sections 3–4 updated).


---

## Pass 7d — THE ANCHOR (14.09.2026)

Review note on 7c: the spiral seemed to begin by drifting away, so the first
impression was an archive already receding. Required: 04.1 as a clear
front-facing anchor, the rest unwinding behind it.

**The cause was motion, not the pose.** The "never quite still" drift was a
monotonic rotation of the whole ring (`t × 0.035 × 0.25` rad/s ≈ 0.5°/s). On
the old wide ring (20° steps) it was imperceptible; on the tight ring (44°)
it meant that by the time a visitor had scrolled down to Cases, 04.1 had
already turned 15–30° away from her. The drift is now a breath —
`sin(t × 0.18) × 0.03` rad, ±1.7° with a 35 s period — around the exact pose,
so the case the visitor arrives at is always presented to her. Measured 20 s
and 32 s after load: the docked sheet's x 559 → 568 px.

**The rail begins at the anchor.** It used to run 1.2 cases *before* 04.1 as
a full landing into nothing, which read as the spiral continuing up and away
from the first card; it now starts 0.32 before 04.1 (a short lead) and ends
0.32 after 04.8.

The entry pose: 04.1 frontal (the 0.45 side offset gives it a slight
obliqueness, "almost directly"), lit, labelled, the rail beginning at its top
edge; 04.2 turned away behind-left, 04.3 edge-on, the slates beyond. Nothing
else in the geometry changed; all proofs unchanged.

Board: `docs/spikes/boards/cases-ribbon-turn.html` (fig. 1c and the verdict).


---

## Pass 8 — THE CLINIC'S PHOTOGRAPHS (19.09.2026)

The stand-ins are gone. The archive now hangs the clinic's own case photographs
from `public/images/` (inventoried by eye, not by filename order):

| file | as shot | read as | on the rail |
| --- | --- | --- | --- |
| `case1.HEIC` | 4090 × 4090 | the clinic's own side-by-side diptych, one file | 04.1 · single, whole |
| `case2_before / _after.HEIC` | 3213 × 5712 | one sitting, one dress, the patient lying — a confirmed pair | 04.2 · **pair** |
| `case3_before / _after.JPG` | 960 × 1280 | the same woman (earring, hair), different framing and light — a confirmed pair, loosely aligned | 04.3 · **pair** |
| `case4.HEIC` | 4808 × 4808 | a diptych, one file | 04.4 · single, whole |
| `case5.HEIC` | 4200 × 4200 | a diptych, one file | 04.5 · single, whole |

`scripts/case-assets.sh` (sips: format, orientation, crop, size — nothing else)
writes `spikes/gallery/assets/` in two tiers, 1280 px for the open sheet and
800 px for the rail and the phone. case2 was shot with the phone turned; both
frames are turned −90° so the face is upright and cut to ONE 4 : 5 rectangle
around the lips, so «до» and «после» share a viewport. The diptychs stay one
image each: a slider is not manufactured out of a collage, and their halves do
not align anyway. They sit whole on the sheet's own dark paper (`contain`);
the pairs fill the sheet (`cover`, one focus for both frames).

**The data model.** `CaseRecord.media?: CaseMedia` — `single { image }` or
`beforeAfter { before, after }`, each with a neutral Russian `alt` and a `fit`
(`src/types/content.ts`). The records (`spikes/gallery/casesReal.ts`) name
only what the photograph shows — «Губы —», «Кожа лица —», «Профиль лица —» —
and bracket everything that is not in project data: procedure, timing, doctor,
commentary. A third status, `real-pending`, renders «Реальный кейс · [согласие
пациента — подтверждается]»: these are real patients, and neither «Визуализация»
nor «публикуется с согласия» would be true today. **Open: the clinic confirms
consent and the copy.** The eight spike-only stand-ins (`cases8.ts`) and the
pointer field are removed.

**The divider.** One `CompareSlider` (`src/components/ui/CompareSlider/`,
token-driven, lit by `gallery.css` in champagne) laid exactly on the open
sheet's projected box — the scene cuts the two textures at the same `split`
(`uSplit`, a one-pixel-soft `step` in sheet uv, never a mix or a move). The
whole surface drags (`touch-action: pan-y`, so a vertical swipe still scrolls;
the ring itself `none`), the ring is `role="slider"` 0–100 with arrows / Shift /
Home / End, labels «до» · «после» inside the photograph step aside at the
edges, «До · Сравнить · После» stay as the three named positions. On the rail a
pair shows «после» only and says «до / после» on its label; the divider exists
only while a case is open — nothing on a moving sheet is draggable. A single
photograph has no divider, no controls, no states.

**Textures.** 7 rail-tier textures up front (≈ 1.25 MB, mipmapped); the open
case loads its 1280 px photographs on demand and the previous case's are
disposed — not on the phone, where the rail tier already exceeds the sheet.

**Measured** (`e2e/spike-gallery.media.mjs`, Chrome 1440 × 900 and 390 × 844
touch): all 14 paths resolve at their sizes; divider box = sheet box within
1.5 px; drag → 25 / 70, arrows 2 %, Shift 10 %, Home / End; touch drag → 80;
a vertical swipe on the open sheet scrolls the page; no horizontal overflow;
left of the divider is the «до» frame and right the «после» frame (mean |Δ|
0.30 / 0.05 against the frames, 37 / 41 against the other); browse, hover
lift, «×», «Назад в архив», Esc, scroll-away close and the flow's compression
unchanged (`spike-gallery.interact.mjs`, `spike-flow.handoff.mjs`,
`spike-full.mjs` all pass). The ring is now five sheets — 176° of the turn,
the geometry untouched; it closes again as the clinic adds cases.
