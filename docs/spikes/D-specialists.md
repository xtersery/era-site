# Spike D — Специалисты / the pinned portrait gallery

**Status: pass 13 — «СЕАНС», the sitting, with the SMOKY QUARTZ AS ENVIRONMENT (on the wall/frame boundary, quieter, the sentence crossing it, fragments at the edges, the change coming out of it) — AWAITING REVIEW (14.09.2026).** The stone renders on the reviewer's machine since the packaging fix. Pass 9 review: the board is approved as the visual target; the live page did not match it on the reviewer's machine ("abstract transparent transition, no readable stone"). Pass 8 review: the stone must remain physically present, visibly the smoky quartz, never abstracted into a translucent form — non-negotiable; keep it, embed it more organically. Pass 6 review: the convex-hull stone still read as an abstract translucent strip; the reference (`src/assets/smoky-quartz.png`) must be the source of form, material and character — asymmetric, volumetric, naturally broken edges, bodily, dense, smoky grey-brown. Pass 5 review: the previous stones read as a strip, a pasted shard, or vanished into a wipe; a reference asset was supplied (`src/assets/парящий_дымчатый_кварц.png`) and one rule: if the stone can be removed and the transition still works, the concept is wrong. Pass 1 review: the concept holds; the text placement drifted between states; «далее — [name]» to be removed.
One direction only, as briefed: a pinned portrait gallery. Not productionised;
the greyscale room (`src/sections/specialists/`, horizontal pin) is untouched
and remains the `none`-tier fallback until this is approved.

Board: https://claude.ai/code/artifact/dd98b26d-d3f8-4c9e-be79-1757e521af53
Spike (interactive): https://claude.ai/code/artifact/afad742c-2978-42f2-93c1-231c99f5537c
Local: `docs/spikes/boards/specialists-sitting.html` (built by
`e2e/spike-portraits.board.mjs`), `docs/spikes/boards/specialists-sitting-spike.html`,
or `npm run dev` → `/spikes/portraits/` (`?k=0..3&f=0..1` freezes a state ·
`?hud=1`).

---

## The brief

Specialists as a **pinned portrait gallery**: the section is pinned, a single
large portrait is the primary object, scrolling moves from one specialist to
the next, each state a full editorial page. Not a team grid, not profile
cards, not a carousel, not a slider, not a spinning gallery, not the mechanic
of Services or Cases. Must communicate trust, expertise, refinement, calm
authority, human presence. "Less UI for browsing staff, more an editorial
encounter with a person."

## The concept — «Сеанс», the sitting

One wall of a light room. One portrait at a time, at the scale of a person.
The visitor never browses a staff list — she meets a specialist and reads her
label. **The signature is the focal line:** at rest, a calibration hairline
runs from the typeset name across the wall to the eyes of the woman in the
portrait; between specialists the same line becomes the travelling light that
develops the next portrait through the current one. Nothing slides, nothing
fades, nothing is a card.

Deliberately absent: cards, thumbnails, a row of faces, arrows, avatars, a
grid, carousel motion, blur, any lens on a real face (the rule: real faces are
never seen through a lens; Specialists is a room of light *traces*, never a
glass body).

Two directions argued and dropped before this one: the **double page** (the
name as a masthead on a light page, a page-turn between people) — a slider in
disguise; a **focus pull** between two portraits at different depths — blur on
a real face, an effect for its own sake.

## The composition

**Desktop (1440 × 900).** The wall takes 44 % and holds the label; the frame
takes 56 % and holds the portrait full height, bleeding off three edges. The
name is set in Prata at display scale (clamp 2.6–4.9 rem, −0.025 em, 0.98)
with its last baseline **on the datum** — a fixed line of the grid 30 % down
the frame (see pass 2 below; in pass 1 the block followed the eye, which is
what drifted). The focal line leaves the measured
right edge of the name, crosses the wall in ink, crosses onto the portrait in
gold (the split is a CSS variable set to the wall's edge) and stops 22 px
short of her eye with a 7 px ring. Below the name: role · focus line (mono) ·
her sentence in her own voice (Prata 1.25–1.6 rem, «…») · facts as a mono
table (15ch / 1fr) · «Записаться к [Имя]» (ink on light, 56 px) with
«К направлениям →» beside it. At the foot: the row 05.1–05.4 (a `<nav>` of
buttons) — the only progression cue besides the count in the wall label. Top-left: the wall label and
the count. Bottom-right of the portrait: «[Плейсхолдер — заменить на реальную
съёмку]».

**Phone (390 × 844).** The portrait takes the top 57 % full-bleed; the wall
label and the count sit on it in light text; the focal line runs from the
screen's edge to her eye. The label beneath: name 1.85 rem · role · sentence
1 rem · facts in a 13.5ch column · CTA 52 px · the row of four at the foot.

## The transition

One viewport of scroll is one transition, scrubbed, then snapped to a whole
state. The light — a 1 px hairline of pale gold with a 160 px bloom in
`mix-blend-mode: screen` — enters at the outer edge of the frame and crosses
right to left (the site's direction of light); the next portrait develops
behind it through a **soft band** (`mask-image` gradient, 6 % of the frame;
9 % on the phone), not a cut; the seam position is eased (`smoothstep(f)`), so
the light crosses the face quickly and lingers at the edges; the portrait she
is leaving steps back 4 % (`translateX`) as the light passes; the incoming one
settles from scale 1.04. The words are **masked lines**: the label she is
leaving lifts away from the foot up to the name (vertical `mask-image`, f
0 → 0.5), so the name is the last thing to go; the next label is set from its
name down (f 0.5 → 1), so the name is the first thing to arrive. The focal
line re-aims from one pair of eyes to the next (f 0.3 → 0.75) while the light
crosses. The count switches at f = 0.5.

A first version cut the incoming portrait with a hard `clip-path` and wiped
the text horizontally: a knife edge through a face at mid-transition and word
fragments on the wall. Both were replaced before the board.

## How it is driven

DOM and CSS only — no WebGL, no canvas (CLAUDE.md "before writing complex
visual code": CSS can do it). ScrollTrigger pins the section for
(N − 1) × 100 vh; `onUpdate` maps progress to `t`, `k = ⌊t⌋`, `f = t − k` and
calls one `apply(k, f)` that writes every style directly (no React state per
frame; `setCurrent` only when the shown index changes). Snap:
`snapTo: 1 / (N − 1)`, mineral ease, 0.35–0.9 s. «далее» and the row use
ScrollToPlugin (0.9 s, mineral) to a state's scroll position. Reduced motion:
`f` is never used — `apply(round(t), 0)` at thresholds, no snap tween, no
light. Keyboard: only the current label's CTA is in the Tab order; the row and
«далее» are buttons; an `aria-live` line announces who is met.

Measured: 60 fps median, 0 % of frames over 33 ms while scrubbing on
1440 × 900 (real Chrome). Proof (`e2e/spike-portraits.interact.mjs`): scrub
lands mid-state (f 0.40 / 0.45), snap lands on a whole state with the full
label readable; «далее» → next; index 05.4 → last, «далее» hidden; one
focusable CTA; the section is left behind on scrolling on; phone touch scroll
and taps; reduced motion at 0.7 vh → whole state, no light.

## Real vs stand-in

Real: the mechanic, the driver, the snap, the secondary controls, keyboard
and touch paths, the placeholder copy from `src/data/specialists.ts`.
Stand-in: the four portraits are **four crops and grades of the one generated
test portrait** (`e2e/spike-portraits.assets.mjs`; the same woman four times,
mirrored twice), labelled on every frame; the sentence, the focus line and the
facts are bracketed placeholders. Real specialists are four different women in
one grade and one light. The staging is portrait-agnostic: each portrait
carries only its nearer eye's position.

**For the shoot brief:** 4 : 5; the head with air above; the eyes at 28–32 %
of the height; three-quarter or frontal; one light; the nearer eye's position
recorded per frame.

## Verdict (self-judged, for review)

PASS on premium / editorial / human / calm / belongs to ERA / not a team
section / not a slider / not the mechanic of Services or Cases (the driver —
page scroll, pin, snap — is shared by design; the object and the transition are
this room's own). OPEN: the mid-transition frame with real photography (a soft
double exposure for a fraction of a second, not the symmetry the mirrored
stand-ins show); a real phone.

Decisions to confirm: 100 vh per transition (Services uses 85); the name on
the eye line as the organising rule for the real shoot; «далее» as a whisper
rather than a ghost portrait.


---

## Pass 2 — THE COMPOSITION LOCKED TO A GRID (14.09.2026)

Review of pass 1: the concept holds; the text placement was unstable across
states — some states sat correctly, others drifted downward; «далее — [Имя
Фамилия 2]» unnecessary and colliding. Correction pass only.

**Cause.** Each state's label was placed from *that portrait's* eye position
(`top = eye.y − nameHeight + …`), so a one-line name and a two-line name put
the whole block at different heights, and every portrait's own eye height
moved it again.

**The rule, reversed.** The eye line is a fixed **datum** of the grid —
`--datum: 30%` of the frame height. Each portrait is cropped so that her eye
lands on the datum: `measure()` computes the cover-fit crop's vertical slack
and sets `object-position` per portrait (`anchor = (eye.y × h − datum) /
slack`, clamped); the text never moves for a portrait. On the phone the datum
is not used (the name is below the portrait); the line finds her actual eye.

**Two blocks on the datum.** `.sitter` spans the wall; inside it the **head**
(index + name) is anchored by its bottom to the datum (`bottom: calc(100% −
var(--datum))`, `padding-bottom: 0.1em` so the baseline — not the box — sits
on the line) and grows upward; the **body** (role → focus → sentence → facts →
CTA) is anchored by its top to `datum + 28 px`. Both sit in one column: from
the gutter, `min(30rem, …)` wide. The foot holds only the row of four;
`«далее»` is removed and nothing replaces it. Masks now sweep the content
range (10 %–80 % of the wall) so the lift and the set read at the same pace as
before.

**Measured** (`e2e/spike-portraits.interact.mjs`, the grid proof): name
bottom 268 · role 298 · sentence 401 · focal 270 — identical on all four
states at 1440 × 900; only the facts row follows the sentence's length (2 or
3 lines). Phone: portrait 55 % / wall 45 %; name 482 · role 519 · sentence
555 · CTA 714 on every state; facts column 13.5ch (11ch collided).

Everything else (the transition, the light, the masked lines, the driver, the
snap, reduced motion, the proofs) unchanged and re-run: all pass, 60 fps.

**For the shoot:** the datum at 30 % is now a constraint — eyes at 28–32 % of
a 4 : 5 frame; the crop can absorb about ±10 % of the frame height, no more.


---

## Pass 3 — THE MINERAL SHARD (14.09.2026)

Review of pass 2: the transition read as a thin line dragging the next image
— too literal, too UI-like, not ERA. Required: a semi-transparent mineral form
with rough, unpolished edges, turning in space and carrying the next portrait
in; not a line, wire, connector, glass bar or beam; subtle, dimensional,
crafted; the portrait stays the hero. Transition object only; everything else
unchanged.

**The object.** A tall sliver of mineral glass, 26 % of the frame wide and
112 % tall (34 % on the phone): a 13-point outline in a unit box (no two
facets parallel, a chip out of the upper right, a heel at the lower left) as
`clip-path: url(#shard-clip)`, and the whole stone under one SVG filter —
`feTurbulence 0.006 × 0.045` + `feDisplacementMap 9 px` — so its long edges
wobble at chip scale (a higher frequency read as torn vellum and was cut back).
It is translucent: inside it a copy of the incoming portrait aligned to the
frame — the same crop anchor as its plate — scaled 1.045 and displaced by
2.4 % × sin(turn), so the light bends with the turn; a mineral tint (multiply,
heavier in the thickness, a warm pool near the upper left); a sheen band
(screen) where the key crosses. Along the inner edge a rim of mineral light
(a 16 px blurred stroke clipped to the inside, soft-light); on the perimeter
one 1.4 px gold hairline with a 3 px glow, its opacity following the turn.
A dark back face 10 × 7 px behind gives it thickness. Colours: mineral green
`#1f362c` / `#0b1611` in the thickness, pale gold `#f3dfae` on the edge — the
palette of the Cases sheets.

**The motion.** The frame has 1400 px of perspective. The shard's centre runs
from 112 % to −14 % of the frame on the eased seam; it pivots on its own axis
from −20° to +22° (turned toward the visitor as it enters, away as it leaves),
hangs at −7° → −4°, and drifts down 3 %. Where it has passed the next portrait
lies clear: the reveal mask's edge trails 35 % of the shard's half-width
inside it, so the shard is always the bridge between the two portraits. The
focal line withdraws while the shard crosses (f 0.06–0.94) and returns. The
words are unchanged (masked lines). Reduced motion: no shard, whole states.

**Cost.** Still DOM + CSS + one SVG filter, no WebGL. 60 fps median, p95
16.7 ms, 0.4 % of frames over 33 ms while scrubbing on 1440 × 900 with the
displacement filter live.

**A bug found on the way:** the global `img { max-width: 100% }` capped the
through-image at the shard's width, so the first build showed a dark slab;
`max-width: none` on `.shard__through`.

Board: sections B1 (ten frames), B2 (the object close at three moments) and
the material table.


---

## Pass 4 — THE SHARD AS A BODY OF ERA MINERAL GLASS (14.09.2026)

Review of pass 3: the direction (a torn translucent transition) is right; the
CSS/SVG implementation reads as a flat glass mask, not a material object.
Required: a true 3D mineral-glass object — Three.js / R3F — with actual
volume, irregular raw edges, subtle internal structure, visible thickness,
realistic refraction, soft reflections, slight imperfections; museum object +
mineral glass + luxury architecture; not fantasy crystal, not a hologram, not
glowing. Layout unchanged; only the transition material replaced.

**The layer.** A WebGL canvas over the frame only (`spikes/portraits/scene/`),
`pointer-events: none`, alpha, `NoToneMapping`; mounted when motion is not
reduced; the section sets `data-live` when the scene has rendered and the CSS
shard of pass 3 is hidden — it remains the no-WebGL fallback. A 30° camera at
the distance where a 10-unit-tall plane exactly fills the view, so frame
pixels map to world units directly.

**The body** (`shardGeometry.ts`). The same 13-point uncut outline as a
`Shape`, extruded to 0.5 world units (≈ 45 px at 1440 × 900; 0.38 on the
phone) with a 3-segment bevel; vertices welded (`mergeVertices`) so normals
are smooth across the bevel; then roughened in the geometry: a value-noise
fbm wobble of 0.11 along the walls at chip scale, a 0.018 grain on the walls
where the stone was broken, a 0.07 undulation across the faces (a poured slab
is never flat); normals recomputed; centred on its thickness so it turns
about its own middle.

**The material** — ERA Mineral Glass, path A, exactly as approved in Spike A
(`spikes/hero/scene/materials.tsx`): drei `MeshTransmissionMaterial`,
transmission 1, thickness 0.6, ior 1.45, chromatic aberration 0.035,
anisotropic blur 0.05, roughness 0.11, attenuation `#3d6b58` (the lifted
derivative, never the logo green) at distance 6, colour `#f8f6f1`, the vein
normal map from the real entrance wall at 0.05 (planar UVs from the extrude,
repeat 0.3), clearcoat 1 / 0.06, env intensity 1.7, 6 samples at 1024
(phone: 2 at 512). The ERA environment (gold key upper left, teal fill) as
`scene.environment`; one warm directional key from the upper left.

**What it refracts.** The incoming portrait, and nothing else: a plane on
layer 1 (which the visible camera never draws), cover-fitted and anchored
exactly as its DOM plate (the crop anchor is read from the plate's
`object-position`), is rendered each frame with the same camera into a 1024²
buffer and handed to the material's `buffer` prop — drei then skips its own
scene capture and samples the buffer in NDC through the glass volume. Outside
the stone the canvas is clear and the DOM portraits show; where the stone has
passed the DOM reveals the incoming plate (mask edge trailing inside the
stone, as before). The first attempt at attenuation distance 2.6 turned the
refracted skin olive — Spike A's finding again — and was lifted to 6; the
turn was narrowed to −15° → +16° because at ±20° the grazing path through
the thickness went near-opaque against the dark studio environment.

**Pose.** From the same `apply(k, f)`: centre from 112 % to −14 % on the eased
seam, rotateY −15° → +16°, rotateZ −7° → −4°, 3 % drift down, z 1.1 in front
of the backdrop plane. The words, the focal line's withdrawal, the snap, the
row, reduced motion: unchanged.

**Cost.** 60 fps median, p95 16.7 ms, 0.4 % of frames over 33 ms while
scrubbing on 1440 × 900 (real Chrome, Metal). The phone is emulated: the
transmission pass is exactly the cost Spike A flagged for phones; on-device
measurement remains the gate, and the CSS shard is the demote step.

**Verdict (self-judged):** it is now a body — volume, a wall, refraction of
real content, green in the thickness, gold as reflected key, a broken edge —
and reads as a museum slab of glass, not a crystal, not a hologram, nothing
glows. Judge in motion on the spike. Board: sections B1 / B2 and the table.


---

## Pass 5 — PRESENCE (14.09.2026)

Review of pass 4: keep the WebGL/R3F body; the visual result moved too far
toward invisible optical glass — it reads as an image-distortion layer, not an
object. Required: visible thickness, a stronger silhouette, clearer broken
edges, subtle internal structure, depth separation from the portraits, visible
side walls when turning, controlled opacity — "museum-grade translucent
mineral sculpture", not a "transparent glass filter".

**Thickness doubled:** 1.0 world unit (≈ 90 px at 1440 × 900; 0.75 on the
phone). **Two surfaces on one geometry:** the extrude's material groups split
the slab into faces and walls (two meshes sharing the geometry via
`setDrawRange`). The **faces** stay ERA Mineral Glass but a body of it:
transmission 0.9 (so the diffuse colour `#e6ebe3` shows), roughness 0.2 with
anisotropic blur 0.22 (a little cloudier), attenuation `#3d6b58` at 3.6 (more
green in the volume), vein normal 0.09, env 2.0. The **walls** — where the
stone was broken — are a different material: `MeshPhysicalMaterial`
`#b9c5bc`, roughness 0.7, clearcoat 0.35, opacity 0.94 — frosted and milky,
lit by the key and a second cool fill from the lower right, so the thickness
reads at every angle, not only at grazing. **A fuller turn:** rotateY −24° →
+26° (with the frosted walls it no longer goes opaque-dark). **A cast
shadow:** a radial pool drawn once to a canvas on a plane 0.06 in front of the
backdrop, offset down and to the right of the key, scaled to the stone and
turning with it (peak 0.46) — the object stands in front of the picture. The
body now sits at z 1.6.

Everything else unchanged. 60 fps median, 0 % over 33 ms while scrubbing
(1440 × 900, real Chrome). Board: B1 / B2 and the table.


---

## Pass 6 — SMOKY QUARTZ AS THE MECHANISM (14.09.2026)

Review of pass 5, with a reference asset (`src/assets/парящий_дымчатый_кварц.png`):
the smoky quartz must drive the transition — a transitional body, a moving
mineral hinge / refractive seam — not a decorative foreground object; smoky
translucent taupe, restrained, cloudy inside, polished but not plastic, no
glow, no dispersion, no sparkle; integrated into the portrait panel, on the
seam; resting state clean. **The test: remove the stone and the transition
must stop working.**

**The transition moved into the stone's field.** During a transition the
frame is drawn in the WebGL layer as one composite plane
(`scene/composite.frag`): ahead of the stone the portrait being left,
compressed toward the stone's leading edge (uv + w·0.55·amount, w =
e^(−d/(0.6·wake))) and softened as it nears; behind the stone the arriving
portrait, drawn out of its trailing edge (uv − w·amount, w = e^(−d/wake)),
softened, settling with distance; under the stone the arriving portrait (the
stone draws over it, refracting the buffer of the arriving portrait as
before). The leading and trailing edges are the stone's own silhouette: a
64-row edge-profile texture of the outline's left/right x, read per row and
leaned by tan(rotZ) — the seam has the shape of the quartz, not a vertical.
Over the last 14 % (f 0.86 → 1) the field lets go; at f = 0 the composite is
pixel-equal to the DOM plate (same cover-fit and anchor, sRGB, no tone
mapping), so the hand-over to and from the DOM is invisible. Wake 0.16 of the
frame, amount 0.05 (phone 0.2 / 0.06). The DOM reveal mask is now unused
while live (the CSS shard + mask remain the no-WebGL fallback: a plain reveal,
not the field).

**The stone, from the reference** (`scene/quartzGeometry.ts`). A tall slab
with a few large polished planes and a broken flank: the convex hull of the
13-point outline set at two depths with the depth broken per corner (±0.4 ×
depth) and eight points lifted off the faces, so the hull resolves into large
flat facets at slightly different angles; the right-hand corners pull in
unevenly for the flank; flat-shaded (every facet its own normal); planar UVs.
28 % of the frame wide, 116 % tall, 1.15 units thick (phone 36 % / 0.9).
Material — ERA Mineral Glass tuned to smoky quartz: transmission 0.92, ior
1.54, roughness 0.46 under a canvas-drawn cloud map (140 soft pools, 18 fine
veils — the smoke is uneven), anisotropic blur 0.42 (phone 0.28), attenuation
`#8a7d72` at 3.4 (taupe smoke in the thickness), colour `#dcd3c8`, clearcoat
0.55 / 0.22, chromatic aberration 0.008, env 1.4; 6 samples at 1024 (phone 4
at 512 — 2 showed as grain). First build at attenuation `#4a3a2d` / 1.6 was
near-black and was lifted: the reference is a *light* stone.

**Motion.** Centre from 116 % to −22 % of the frame on the eased seam (it
leaves the frame almost completely), rotateY −16° → +14°, rotateZ −6° → −3°,
3 % drift down, z 1.7. The words, the focal line's withdrawal, the snap, the
row, reduced motion: unchanged.

**Cost.** 60 fps median, p95 16.8 ms, 0.4 % over 33 ms while scrubbing on
1440 × 900 (real Chrome). Phone emulated.

**Not yet:** the stone's silhouette is a clean convex polygon with facet
breaks; the reference's flank is rougher (a concave, chipped edge). A
non-convex body (displaced hull or a sculpted mesh) would be the next step if
the raw edge is judged insufficient.

Board: sections B1 / B2 and the mechanism table.


---

## Pass 7 — THE QUARTZ FROM THE PHOTOGRAPH (14.09.2026)

Review of pass 6: the stone was still an abstract translucent plate; the
reference must drive form, material and character — asymmetric, volumetric,
naturally broken edges, bodily, dense, inner depth, smoky grey-brown; a
premium mineral, not a UI effect; the next portrait carried *through* it.

**The trace** (`e2e/spike-portraits.quartz.mjs` → `scene/quartzTrace.ts`):
the reference's alpha gives its crop box (571 × 1338, aspect 0.427) and, for
112 rows, the outermost opaque pixels — the real chipped, concave flanks — plus
a 112 × 56 luminance grid of the smoke.

**The body** (`scene/quartzGeometry.ts`): a structured grid over the traced
silhouette (each row runs from the stone's left edge to its right, 40
columns), front and back faces swelling to a thickness that tapers into the
flanks and ends (0.18–1.0 × depth; depth 1.4 units, phone 1.1), a relief of
large planes meeting at ridges on each face (max of 7 / 6 planes × 0.55 ×
depth), four rim strips with their own normals; indexed, smooth normals. The
stone keeps the photograph's proportion (× 0.92 narrower; phone 0.8) and
stands 1.06 × the frame's height — about 46 % of the frame wide, a body, not
a sliver — so it enters and leaves fully (centre 132 % → −36 %).

**The inside** — the photograph itself: its crop box drawn to three maps at
448 px wide — a tint (36 % over `#efe9e0`: the smoke as density inside the
glass), a roughness map (0.3 + 0.6 × (1 − luminance): dark smoke is cloudier)
and a bump map (luminance, scale 0.035: the fractures and planes). UVs are in
the box, so the smoke lands where it is in the stone; the back face mirrors.

**The material:** drei transmission — transmission 0.9, thickness 1.45,
ior 1.54, roughness 0.56 × map, anisotropic blur 0.34 (phone 0.26),
attenuation `#9d9189` at 4.8, colour `#ebe4da`, clearcoat 0.5 / 0.28,
chromatic aberration 0.006, env 1.35, 6 samples at 1024 (phone 4 at 512). The
first build (tint 50 %, attenuation `#8a7b6e` at 3.2) was a dark brown slab
and was lifted twice: the reference is a light stone.

**The mechanism** is pass 6's, unchanged in principle: the frame drawn as a
field around the stone (`composite.frag`) — the portrait being left
compressed into the leading edge, the arriving one drawn out of the trailing
edge, refracted inside. Two corrections: the edge profile is now the trace
(linear-filtered, no stair-steps), and the seams are inset 22 % of the
stone's half-width so they are always under the body — never a visible edge
beside it. Pose: rotateY −14° → +12°, rotateZ −5° → −2°, rotateX −3° → +2°,
3 % drift, z 1.7.

**Cost.** 60 fps median, p95 16.8 ms, 1.3 % of frames over 33 ms while
scrubbing on 1440 × 900 (a 112 × 40 × 2 body under 6-sample transmission);
phone emulated. Board: B1 / B2 and the construction table.


---

## Pass 8 — THE REFERENCE'S DENSITY (14.09.2026)

The pass-7 brief was restated verbatim. Pass 7 already built the stone from
the photograph; what could still make it read as «стекляшка» is that the
reference is *dense* — nothing is seen clearly through it, only hazy light —
and its planes are polished and flash. Pass 8 tunes the material to that:
transmission 0.84 with a hazy volume (anisotropic blur 0.55, roughness 0.72
under the smoke map, thickness 1.9), so the arriving portrait is a cloudy
presence inside the stone rather than a picture behind glass; attenuation
`#8f847b` at 3.4; the photograph's tint at 46 %, bump 0.06; the relief deeper
(× 0.85, steeper planes) and the clearcoat harder (0.8 / 0.16) with a second
key light, so the polished planes flash as it turns; the cool fill damped to
0.18 to kill specular specks on the flank. Geometry, mechanism, motion and
layout unchanged. 60 fps median, 0 % over 33 ms while scrubbing (1440 × 900).


---

## Pass 9 — THE STONE ITSELF (14.09.2026)

Review of pass 8: non-negotiable — the actual smoky quartz stone stays in the
composition, visibly a stone, materially believable; not a silhouette, not a
refractive form; integrate it more organically, make its entrance and exit
elegant; the next portrait introduced *by* the stone.

**The surface is the photograph's own pixels.** The colour map is the
reference's crop box lifted only 14 % toward the pale body (`#e6dfd5`), on
both faces with uv in the box — every facet, fracture and cloud is where it
is in the stone. **Where the next portrait comes through is decided by the
stone's own smoke:** a `transmissionMap` from the photograph's luminance
(0.12 + 0.88 × l^1.4) × transmission 0.72 — the clear facets let the arriving
portrait through, the dense smoke does not — so the next specialist is seen
in the stone's clear zones and lost in its cloud, never as a picture behind
glass. Roughness (0.28 + 0.6 × (1 − l)) and bump (0.05) from the same
luminance. Thickness 1.3, ior 1.54, blur 0.4, attenuation `#8f847b` at 4,
colour `#efe9e0`, clearcoat 0.6 / 0.18, env 1.0 (the photograph carries its
own light); no dispersion.

**An object, not a strip.** The stone is 86 % of the frame's height (phone
72 %) at the photograph's proportion — its top and bottom in view — and
casts a soft elliptical shadow on the portrait behind it (drawn once, 0.06
in front of the picture, offset down and right of the key, turning with the
stone), so it stands in front of the picture rather than lying on it. It
enters fully from the right (centre 122 % → −26 %), comes 0.35 toward the
visitor mid-crossing, turns −14° → +12° with a slight lean and tilt, and
leaves fully. **The field beyond its ends:** above and below the stone the
two portraits cross softly along its width (smoothstep over ±0.9 × its
half-width, blended in over 12 % of its height), so there is no cut anywhere
the stone is not. Within its rows the seams are its own silhouette, inset
under the body. A first shadow texture had hard vertical edges (its radial
gradient exceeded the canvas) and was made elliptical.

**Cost.** 60 fps median, p95 16.8 ms, 0.4 % over 33 ms while scrubbing on
1440 × 900. Board: B1 / B2 and the table.


---

## Pass 10 — LIVE = BOARD, ON EVERY PATH (14.09.2026)

Review of pass 9: the board frames are approved as the target; the live
artifact showed "an abstract transparent transition, no readable stone
object". The bundle rendered correctly here (Playwright, real Chrome, the
single-file artifact served locally: `data-live`, the stone drawn). So the
failure is on the reviewer's GPU: the stone's material — drei's transmission
with a custom refraction buffer and four maps — is the most fragile shader in
the page, and when it fails to compile the mesh silently vanishes while the
composite field (a trivial shader) still draws: exactly the symptom.

**Two changes, both for robustness; the look is the pass-9 board's.**

1. The stone is rebuilt on **three's built-in physical transmission**
   (`MeshPhysicalMaterial`: transmission 0.72 × the photograph's transmission
   map, thickness 1.3, ior 1.54, roughness 0.5 × map, bump 0.05, attenuation
   `#8f847b` at 4, clearcoat 0.6 / 0.18, env 1.0). The renderer's own
   transmission pass renders the composite field plane behind the stone, and
   under the whole body the field is the arriving portrait (seams inset 16 %
   of the half-width), so what the stone lets through is the next state. The
   hidden-layer backdrop, the FBO and drei's material are gone.
2. The **no-WebGL fallback is the photograph itself**, not a translucent
   polygon: the PNG's alpha as `mask-image` over the arriving portrait, its
   pixels on top at 0.94 with a drop shadow, the same pose, proportion and
   travel (`.shard--photo`). Verified with WebGL disabled: a smoky quartz
   crosses; the DOM reveal mask trails it.

A block removal during the fallback edit dropped `readParams` and the
constants (typecheck did not catch a runtime-only reference); restored from
HEAD and the fallback re-rendered.

**Cost.** 60 fps median, p95 16.8 ms, 0.8 % over 33 ms while scrubbing on
1440 × 900. Board: B, B1 / B2 and the table (material and fallback rows).


---

## Pass 11 — THE STONE IN TWO LAYERS, NOTHING THAT CAN FAIL (14.09.2026)

Reviewer's diagnostic: `STONE_WEBGL`, quartz loaded, stone mounted, no
fallback — and still no visible stone; "the problem is only shader
compilation". On an identical GPU (Apple M4, ANGLE Metal, Chrome) the bundle
renders; the reviewer's `errors:` line was not supplied.

**What was custom, and is gone.** Passes 4–9 used drei's
`MeshTransmissionMaterial`, which replaces three's
`transmission_pars_fragment` with an injected block (a `buffer` sampler,
`anisotropicBlur`, `chromaticAberration`, its own `getIBLVolumeRefraction`)
and a half-float FBO — the one custom shader modification in the page. Pass
10 removed it. **What remains fragile:** three's own transmission pass, which
renders the scene into a half-float target before drawing a transmissive
mesh; if that target is unsupported the mesh is silently skipped and only the
field remains — the reported symptom.

**The stone no longer depends on it.** Two meshes on the same geometry:
- **the body** — stock `MeshPhysicalMaterial`, the photograph as `map`, an
  `alphaMap` opaque in the smoke and thinning in the clear zones
  (1 − 0.5 × clear), roughness map, bump, clearcoat 0.6, env 1.0; `transparent`,
  `depthWrite`. No transmission, no custom code — the portrait behind shows
  through the clear zones by alpha. This cannot fail to draw.
- **the glass** — `MeshPhysicalMaterial` with transmission 0.9, thickness 1.3,
  ior 1.54, attenuation `#8f847b` at 4, roughness 0.35 × map, an `alphaMap` of
  the clear zones only (clear^1.2 × 0.9), scale 1.004, `renderOrder` 1. Adds
  the bend and the softening where the transmission pass works; where it does
  not, the body alone is still the stone.
`?mat=body` forces the body alone. The diagnostic reports `layers`.

Verified here: full = 5 draw calls, body-only = 3, both the stone; the
bundle diag `STONE_WEBGL`, no errors. 60 fps median.


---

## ROOT CAUSE FOUND — the artifact packaging, not the shader (14.09.2026)

The reviewer's screenshot (`src/assets/log.png`): `THREE.WebGLProgram: Shader
Error … Material Type: MeshPhysicalMaterial … Fragment shader is not
compiled … ERROR: 0:1459: 'include' : invalid directive`.

**Cause.** Every artifact copy was prepared by an ad-hoc step that stripped
the page head's `<meta …>` tags with the pattern `<meta[^>]*>` over the whole
head — and the head contains the inlined three.js source, where that pattern
also matches **`<metalnessmap_fragment>`** and
**`<metalnessmap_pars_fragment>`**. The chunk names were deleted from every
physical/standard material's `#include`, leaving `#include ` with nothing:
line 1459 of `meshphysical_frag` is exactly `#include <metalnessmap_fragment>`.
The composite field is a bare `ShaderMaterial` with no metalness include, so
it compiled — hence the field without the stone. The board came from the dev
server; my earlier bundle test served the *unstripped* `dist-spike/` file —
which is why neither reproduced it. Passes 4–10 all failed on the reviewer's
machine for this one reason; drei, three's transmission pass and the GPU were
never at fault.

**Proof.** Serving the published copy locally reproduces the identical error;
`grep` shows `#include <metalnessmap_fragment>` present once in the built
bundle and absent in the published copy.

**Fix.** `scripts/artifact-copy.mjs`: removes `<meta\b…>` tags only from the
head markup *before* the first `<style>`/`<script>`, and asserts that the
count of `#include <…>` occurrences is unchanged (716 in this bundle). All
artifact copies go through it from now on. Republished: the served copy
reports `STONE_WEBGL`, 5 draw calls, no errors.

Pass 11's two-layer stone (a body that needs no transmission pass) stays —
it is the right robustness regardless — but it was not the cure.


---

## Pass 12 — THE RESIDENT QUARTZ (14.09.2026)

Brief: keep the approved stone on screen as a persistent layout object; place
it on the left near the text column, overlapping the wall/frame boundary;
part of the typography (the name) crosses in front of it; the portrait
transition keeps the stone as its mediator while the stone stays; the words
must update much faster. Refinement, not a new concept.

**Layering.** The canvas is now the section's layer (`z 2`), not the frame's:
it paints the wall (a plane matching the CSS surface, `createWall`) and the
frame (the field plane — at rest the current portrait, pixel-equal to the DOM
plate), with the stone at the boundary in front of both and its shadow on
wall and portrait alike. Above the canvas: the focal line (`z 4`) and the
words (`.wall`, `z 5`, `pointer-events: none` except links/buttons). The
wall's CSS surface moved to `.sitting::before` (`z 0`) beneath the canvas;
the DOM plates stay beneath for the no-WebGL path, where the photograph
itself stands at the same place (`.shard--photo`). Place (`LAYOUT`):
desktop x 35.5 %, y 56 %, h 74 % of the section, the photograph's proportion
× 0.92; phone x 24 %, y 55 %, h 36 %. The body column narrowed to 22 rem so
only the name (30 rem head) reaches the stone — the sentence and the facts
stay on the wall.

**The transition** (`composite.frag`, `ShardScene.tsx`). The frame is a
field around a moving FRONT. At f = 0 the frame is the current portrait.
From the first moment of a change the field under the stone is the arriving
portrait, so what the stone lets through is the next state. A front leaves
the stone's right edge (inset 14 % of its half-width; a mirror front leaves
the left edge — off the frame on desktop, used on the phone) and crosses the
frame on `smoothstep(f / 0.85)` × 1.6 frame widths; ahead of it the departing
portrait is compressed toward it (w = e^(−d/(0.6·wake))) and softened, behind
it the arriving portrait is drawn out (w = e^(−d/wake)) and settles; the
front's shape is the stone's own edge profile, rounding off beyond its ends
(lag = beyond² × 0.5); the field lets go over f 0.85 → 1. The stone turns
+7° rotY, comes 0.25 toward the visitor and scales 1.015 on a sine over
f 0 → 0.7, then settles. At rest it breathes: rotY −4° ± 3° (27 s), rotZ −4°
± 1.2° (37 s), rotX −2° ± 1.5° (48 s), bob 0.05 (20 s). Reduced motion: no
breath, whole states. The no-WebGL reveal now leaves the stone rightward.

**Timing of the words.** Was: out over f 0 → 0.5, in over 0.5 → 1 (the name
at 50 % at the earliest, the facts at 100 %). Now: out over 0 → 0.2, in
(name first) over 0.22 → 0.5; the count and index switch at 0.21; the focal
line re-aims over 0.15 → 0.5. The name is on the wall by f ≈ 0.28 and the
whole label by 0.5 while the picture changes until 0.85.

**Measured.** 60 fps median, p95 16.8 ms, 0.4 % over 33 ms while scrubbing
(1440 × 900); 7 draw calls; the interaction proof passes. Published through
`scripts/artifact-copy.mjs` (716 shader includes intact). The diagnostic
stays on desktop (`?diag=0` hides it) and is off on the phone (`?diag=1`).


---

## Pass 13 — THE MINERAL ENVIRONMENT (14.09.2026)

Brief: the crystal felt like a separate 3D object placed next to the layout.
Keep it; integrate it: move it to the boundary between the portrait and the
text panel, partially entering from the image's edge, slightly behind the
typography; reduce its dominance (more translucent, lower contrast, smokier,
softer, lit by the room); add subtle fragments of the same mineral at the
viewport's edges with slow drift and depth; keep it the transition mediator —
"the image is revealed through a natural mineral layer"; layering: portrait
→ fragments → crystal → text → UI. "The woman is the hero."

**Placement.** `LAYOUT.desktop.place` x 0.455, y 0.6, h 0.64 (the boundary
is at 0.44: the stone's left third over the wall, two-thirds entering from
the image's edge); phone x 0.2, y 0.56, h 0.3. The name stays on the wall;
the sentence's measure widened to 40ch (`.sitter__body` 38 rem, the facts
kept to the 22 rem column) so its longer lines cross the stone's edge — one
secondary text layer in front of it, plus the focal line. The fallback
photograph stands at the same place at 0.8 opacity.

**Dominance.** The colour map: the photograph at 78 % over `#8f8479` (its own
shadowed taupe) with `contrast(0.82) saturate(0.82) brightness(1.04)`; body
alpha 1 − 0.66 × clear, opacity 0.86, roughness 0.58, bump 0.04, clearcoat
0.35 / 0.24, env 0.7; glass roughness 0.46, clearcoat 0.2, env 0.45; the
shadow's peak 0.3; the change's scale pulse 1.012.

**Fragments.** Three on desktop (x 0.985 / y 0.72 / h 0.26 at z 0.55; x 0.905
/ y 0.03 / h 0.18 at z 0.35; x 0.06 / y 1.03 / h 0.2 at z 0.3), two on the
phone; the same geometry with a clone of the body material (opacity 0.62,
env 0.5, clearcoat 0.2; no glass layer); each bobs 0.08 and turns a few
degrees on its own period (33 / 45 / 57 s) and shifts (0.012 + 0.008 z) of
the width with the change (alternating direction). Behind the crystal, in
front of the picture. A first placement at x 1.02 / y −0.03 was off-frame
entirely.

**Transition** as pass 12 (the front from the stone; words out 0 → 0.2, in
0.22 → 0.5). With the stone on the boundary the front starts at the image's
own edge.

**Measured.** 60 fps median, p95 16.8 ms, 1.3 % over 33 ms (1440 × 900);
10 draw calls. Published via `scripts/artifact-copy.mjs`.

## Pass 14 — SMOKY QUARTZ → THE ERA MARBLE WALL (15.09.2026)

**Brief.** The transition out of Specialists into the next section as a
material evolution: not a CGI morph, not a texture dissolve, not a motion
demo — a quiet, believable settling of material character, object → field →
architectural surface, ending in the clinic's real wall
(`docs/references/era-marble-wall.jpg`), on which the next section stands.

**Mechanism.** The pin is extended by `EXIT = 100` vh after the last state;
that scroll is `e` (0 → 1), painted by `exit(e)` in the section and read by
the scene as `state.exit`. No snap inside the exit. `?k=3&e=` freezes a
stage. Five stages on the board: rest · early (0.25) · mid (0.55) · marble
(0.8) · settled (1).

- **The light leaves the room from the stone.** A section-wide plane in
  `MultiplyBlending` (`scene/marble.frag`, pass 0) draws the wall's veining
  (luminance of the real slab) as shading in whatever is there — plaster and
  portrait alike — plus a dimming, both spreading out of the stone's centre
  (reach `(e − 0.04) × 2.3`, edge ± 0.35; vein 0.06 → 0.16, dim 0.03 → 0.13).
  Structure before colour: plaster over stone.
- **The picture recedes into the wall.** `composite.frag` gets `uVeil`
  (`smooth((e − 0.05) / 0.55)`): colour goes first, then light, to a faint
  print in the wall's tone `#e9ebe6` — never black, never white.
- **The slab unfolds out of the stone.** The same plane again with normal
  blending (pass 1): the sheet itself, a second, later front (reach
  `(e − 0.35) × 2.2`, edge −0.3 / +0.4), its edge running ahead along the
  veins (`dist += (0.5 − vein) × 0.34`) so it is never a radial wipe; the room's
  key light from the upper left as a soft gradient. Covers by ≈ 0.85. The plane
  sits at z 0.9 and is scaled by `1 / (CAM_Z / (CAM_Z − 0.9))` so it covers
  the viewport exactly and the sheet continues pixel for pixel into 06.
- **The stone becomes the wall.** Glass 1 → 0 by 0.4 (transmission goes
  first: glass → mineral). Body 0.86 → 0 over 0.3 → 0.8. Under it a `fill`
  mesh — the same geometry, `MeshBasicMaterial` (unlit, so it is the wall's
  colour exactly) with the sheet as its map, `repeat/offset` aligned to where
  the stone is *seen* (its projected box at its z, `m = CAM_Z / (CAM_Z − z)`)
  — 0 → 1 over 0.32 → 0.72: the veins run through the stone as through the
  wall. Then a `relief` pass (`relief.vert/frag`, `MultiplyBlending`): the
  facets' lambert shading (`0.56 + 0.62 · n·L`, L from the upper left) faded
  in by `uK` 0 → 1 over 0.35 → 0.8 — a carved form reads by its shadows.
  Pose to rest (rotations × `1 − settle`), z 1.5 → 0.96, depth × 0.4; the
  shadow lifts by 0.5; the fragments sink (+0.6 z) and are hidden once their
  opacity is < 0.01 (they used to punch holes in the field through depth).
- **The reference, translated.** `e2e/spike-portraits.marble.mjs`: the
  panel right of the screen (x 1110, y 305, 330 × 530 — two tiles high,
  seams at y ≈ 305 / 565 / 835) de-foreshortened to square tiles and
  book-matched 2 × 2 into `assets/marble.jpg` 1536² (+ `marble-luma.jpg`,
  grayscale, contrast 1.15). **No grade**: colour, tone, seams and light are
  the photograph's; average `#7c7f7b`. Laid on the section's width on
  desktop (`uSheetW` 1), on twice it, centred, on the phone (0.5);
  `uSheetV = (H / W) · uSheetW`, top-aligned.
- **The next section.** `.founder-opening` stub: the same sheet at
  `100vw auto` from `0 −100svh` (`200vw` / `−50vw −100svh` on the phone),
  darkening into `#08140f` — the founder's room on the real marble.
- **No WebGL / reduced motion.** `.sitting__marble` — the sheet as a CSS
  layer over the section, `--exit-marble` 0 → 1 over 0.3 → 0.8; reduced
  motion lands on whole states (the wall arrives as a cut).

**Bugs on the way.** The frame went black and the stone vanished at every
state after the exit code landed: `apply()` rebuilt `state.current = {k, f}`
and `shardState.current = {…}` without `e`/`exit`, and the frozen prop
omitted `e` — `NaN` in every lerp. Three one-line fixes. GLSL `smoothstep`
with descending edges was suspected and rewritten ascending (harmless).
`MultiplyBlending` requires `premultipliedAlpha: true` on the material.
A lit `MeshPhysicalMaterial` for the slab on the stone came out darker and
warmer than the unlit field → unlit fill + a separate relief pass.

**Measured.** 60 fps median, p95 16.8 ms, 0 % over 33 ms while scrubbing
(1440 × 900); 11 draw calls. Published via `scripts/artifact-copy.mjs`
(717 shader includes intact); the published file tested at `?k=3&e=0.55`.

**Open for review.** Whether the settled wall should already be dimmer than
the reception's light (the darkening is currently the next section's
gradient); the diamond's scale on desktop (one book-matched pair across the
width, as on the wall) — to be judged in motion.
