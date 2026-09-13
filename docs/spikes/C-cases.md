# Spike C — Cases / до · после

**Status: pass 1 built, AWAITING REVIEW (13.09.2026).** Not productionised; do
not start Specialists.

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
`object-fit`, no transform**, clipped to a window (46 % × 54 % of the frame;
70 % × 44 % on a phone) that follows the pointer and is clamped inside the
frame. Modes «До» · «Сравнить» · «После» are real buttons (44 px+, visible
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
