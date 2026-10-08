# Hero on onyx — pass 12 · results

**Status: BUILT — awaiting visual review (2026-09-16, pass 16 — the manifesto on the Services tone `#ece8df`, no seam between the rooms; pass 15's normal scroll; pass 13's descent; hero visuals as pass 12).** The hero rebuilt
after `docs/references/hero-ref.png`: the illuminated onyx (`docs/references/stone.png`, as it is) is the
field; the brand object — the 3D emblem `docs/references/era-logo_3.png` (gold letters «эра», a green-glass
ring), used as the asset, not redrawn — stands a little left of centre; copy on the right; two tracked
lines in the bottom corners; a transparent header with the mark, the name, the descriptor, the «Записаться»
capsule and «Меню» with a gold-ringed round button. No people. Passes 1–8 (the portrait heroes) are
superseded; the lens system stays parked in `spikes/hero-stone/_pass5/`.

- Live spike: https://claude.ai/artifact/R9pELH3eXqG7FAWFm6nyj2 · dev `/spikes/hero-stone/`
- Review board: https://claude.ai/artifact/1GSxGJYtbG5bXgzxXQ1b2i · local `docs/spikes/boards/hero-stone.html`
- Captures: `spikes/hero-stone/__captures__/` (git-ignored) · `node e2e/spike-hero-stone.capture.mjs`
  → `node e2e/spike-hero-stone.board.mjs`
- Assets (`scripts/hero-stone-assets.py`, step 9): `onyx-tiles.jpg` / `@phone` (stone.png resized 2400 / 1200,
  nothing else); `emblem.webp` / `emblem@phone.webp` (era-logo_3.png with alpha, WebP 92 / 720 px);
  `era-mark-ink.png` (step 7) for the header.

## The composition (1440 × 900)

- **Field** — the onyx, `object-fit: cover` 50 % / 50 %. No overlay, tint, grain or extra texture.
- **Emblem** — `min(80svh, 52vw)` square, centre at 37 vw / 52 svh (the letters inside ≈ 40 % of the hero
  height, the ring ≈ 77 %), `drop-shadow(0 28px 44px graphite 0.22)` for depth. Interaction: the section is
  the grip (`attachPointer` → `stage.pointer`); a rAF loop damps (0.02) a drift ≤ 10 px and a perspective
  tilt ≤ 1.5°, and moves a highlight — a screen-blended radial gradient `mask`ed by the emblem's own alpha —
  across the metal and glass. No rotation. Reduced motion: still.
- **Header** — transparent. Left: mark (2.25 rem) · «эра» (Prata 1.625 rem) · hairline · descriptor
  «Клиника эстетической косметологии» (tracked, 3 lines). Right: `GlassButton` capsule (pass 10: translucent deep-green glass over the stone — `backdrop-filter: blur(6px)`, an inner glow, a light band along the top edge, a 1 px gold outline, a warm gold-green outer glow; hover lifts the light) · «Меню» word + a 2.75 rem round button with a 1 px gold ring and a two-line icon
  (→ «×» when open). The index unfolds leftwards from the controls on the stone (per-item opacity + slide,
  0.7–1 s, 90 ms stagger); below 1440 px two short rows under the controls; on phone a column, the
  descriptor and the word «Меню» hidden.
- **Copy** — cols 9–12: eyebrow «Эстетическая косметология» (tracked) → `h1` Prata «Тонкая работа / с красотой» (pass 10; was «Больше, / чем косметика»)
  (`clamp(2rem, 1.2rem + 2.1vw, 3.25rem)`) → paragraph `t-lg` → capsule «Записаться на консультацию →».
  All copy is the reference's and is flagged `data-placeholder="copy"`; the hero headline stays formally
  pending until approved.
- **Corners** — «Забота сегодня. Красота завтра.» with a hairline (bottom-left, three lines) and
  «Наука — Гармония — Результат | 00» (bottom-right; `sectionIndex('hero')`). The secondary link
  «Смотреть услуги ↓» shows on phone only.
- **Palette** — ivory onyx, champagne, gold `#cfaf72`, deep green `#10271d`, graphite `#2f2d29`.
- **Phone (< 1024)** — a stack: header → emblem (78 vw) → copy → capsule (full width, in the first viewport)
  → corner lines → the secondary link.

## The passage (pass 11–12) — SUPERSEDED by pass 13

Kept for the record; the zoom into the emblem, the manifesto bitmap and the 300 % scrub are gone.

A scroll-driven film, GSAP ScrollTrigger + one WebGL fragment shader. The hero pins for three viewports
(`end: +=300%`, `scrub: 0.8`, `anticipatePin: 1`); the timeline's 0..1 is the shader's `uP`.

- **0–0.42 approach** — the camera zooms 1 → 3.6× about the emblem's centre (measured from the DOM into
  `uEmblem`). The header and the hero's interface leave over the first 10 %; the canvas takes over from the
  DOM at 0.02–0.11 while the zoom is still ≈ 1 (same textures, same cover maths → no seam); the DOM emblem
  hides at 0.12; the pointer parallax rests once the passage has begun.
- **0.24–0.94 membrane** — an fbm field (simplex, 4 octaves) displaces the sampling ≤ 5 % of the frame,
  a green-glass tint deepens inside the ring, one soft band of light travels with the scroll; and the
  polished onyx reveals the deeper stone — the manifesto ground — grain by grain through the same field
  (`reveal` 0.40–0.86, gated by a second fbm).
- **0.50–1 landing** — the manifesto ground settles from 1.45× to 1× (easeInOut), the field stills. At
  `uP = 1` the frame equals the DOM manifesto's background pixel for pixel.
- **0.80–1 words** — the four statement lines wipe in from the left (`clip-path`, staggered), the label,
  paragraph and aside arrive with a 12 px rise. Light travels, nothing simply fades.
- **Manifesto layer** (`Manifesto.tsx`, after `manifest-ref.png`): «01 — Манифест» with a dash; «Наша
  миссия: / Сохранять / Естественную / Красоту» in uppercase Prata (graphite / taupe / taupe / graphite) —
  uppercase as the reference sets it, against the system's headline rule; «Деликатно подчеркивать природную
  гармонию лица и кожи.»; «Забота / в равновесии / с точностью» on the dark stone. Copy is the reference's,
  flagged; the manifesto text is formally pending. `id="manifesto"` lives on the layer.
- **States** — film (WebGL + motion); reduced-motion or no WebGL → the manifesto is a still room after the
  hero (`.mf-room` with `manifest-bg` as its ground), no pin.
- **Files** — `passage/passage.frag`, `passage/PassageScene.tsx` (textures as data, no colour-space decode,
  raw output), `Manifesto.tsx`, `HeroStoneSpike.tsx` (the `useGSAP` timeline), `hero-stone.css`
  (`.hs__passage`, `.mf*`), `e2e/spike-hero-stone.passage.mjs` (frame captures), `assets/manifest-bg*.jpg`.
- **Scroll binding (pass 12)** — the film was scroll-driven from pass 11 (ScrollTrigger `pin` + `scrub` in the
  `useGSAP` block of `HeroStoneSpike.tsx`; `onUpdate` writes `progress.current`, read each frame into the
  shader's `uP` by `PassageScene.tsx`; there was no manual trigger). Pass 12 routes it through the project's
  scroller: the spike mounts `ScrollProvider` (`initTier()` first) — Lenis on the live tiers, native otherwise;
  Lenis keeps the native scroll position and calls `ScrollTrigger.update()` on its own scroll event, so the
  pin needs no proxy. The timeline's cleanup now kills only its own trigger (the provider's chapter triggers
  survive), and the pointer parallax stays alive until the canvas has taken over at 12 % so scroll and mouse
  coexist. Verified with real wheel input: `data-scroll="lenis"`, pinned at 0 px while the film plays,
  released after 300 % with the manifesto complete.
- **Measured** — 60 fps median / p10 while scrubbing the passage (1440 × 900, Chrome, this Mac).
- **Knobs** — `PASSAGE_LENGTH` (3 viewports), the membrane amplitude (0.05), the phase edges in the shader.

## Open

- The glass ring's real refraction is a raster here; a WebGL object (the `_pass5/` scene as the start) is a
  separate stage if wanted.
- The onyx and emblem references are 1672 / 1254 px: at 1440 × 2× the field is upscaled 1.7×.
- Hero and manifesto copy approval.
- The passage's rhythm and amplitude are the reviewer's call; phone GPU unmeasured on a device.

## The descent (pass 13) — Hero → 01 Манифест

The zoom-into-the-emblem concept is removed. The threshold is a **vertical descent** played by **one
gesture**; the manifesto's ground is **rebuilt from `manifest-ref.png`**, never placed as a bitmap.

- **Control — `passage/passageGateway.ts`** (`idle → armed → playing → completed → released`, adapted from
  `spikes/mineral/passageController.ts`). ScrollTrigger only **pins** the hero for one viewport
  (`+=100%`, no scrub): the pin's `start`/`end` are the two rests. The GSAP timeline is **paused** and
  driven by `tl.progress(t)` from one controller tween along the film's clock (`DESCENT_RHYTHM`: 6.4 s +
  0.35 s hold, monotone cubic, slow at both ends; the way back runs the same clock at 1.15×; `mid` tier
  0.85×, phone 0.6×). Wheel / touch / keys are read in the **capture phase** and stopped before Lenis;
  ticks accumulate (24 px over 220 ms) so trackpad noise does not fire; while playing every gesture is
  swallowed (spam cannot accelerate the film). The hold uses no `overflow: hidden` (no scrollbar drop, no
  layout shift): the document sits on `start` while t < 0.12 and is moved to `end` under the opaque canvas
  (the section is pinned at both — identical pixels), so release at either end shows nothing. The
  manifesto's rest is a wall on the way up (a Lenis lerp that overshoots it is put back); a dragged
  scrollbar inside the pin scrubs t as a fallback; `#manifesto` anchors go through the gateway.
  `?transitionDebug=1` shows STATE · DIRECTION · PROGRESS · SCROLL LOCK · VISUAL TIER.
- **The film — `passage/passage.frag`**, an ALPHA layer (canvas `alpha: true`, `frameloop="never"` since
  the performance pass of 20.09 — `docs/spikes/F-flow.md` pass 12: `apply(t)` draws the frame on the same
  tick it writes the timeline, and only while the layer can be seen; nothing renders at rest). 0–0.12 the hero intact (the canvas fades in over
  the identical DOM frame, the interface and header quiet); 0.12–0.92 the onyx (far, 1.3 vh) and the emblem
  (nearer, 1.55 vh) rise out of the frame, the onyx's lower part dissolving into warm light along a soft
  front; 0.28–0.74 the **membrane** — a horizontal film of clear glass with a ≤ 5 % forest tint — crosses
  the frame from below: a vertical lens bends the hero's image where it covers it, a fine dark hairline and
  a warm line of light mark its edges, a breath of the hero's light is carried below it; by 0.94 the canvas
  is hidden — nothing of the membrane remains in the manifesto.
- **The ground — `ManifestoGround.tsx`, `.mf-ground*`** (DOM, both in the pinned stage and in the still
  room). Left: the reference's own three illuminated slabs as a narrow strip (`assets/slabs.webp`,
  `scripts/manifest-assets.py`: crop 0–560 px, shadows lifted so nothing is near black, −12 % saturation),
  height-fit at ≈ 26 vw of slab + a feathered veil to ≈ 37 vw, a multiply vignette, a screen-blended
  illumination that comes on during the landing, two soft folds of light bleeding into the field. Field:
  five CSS gradients sampled from the reference (#f2e8d9 → #eedfcb → #e6d6c0, a light top-right, a quiet
  next to the stone, one diagonal, warmth low right) and a 256 px grain tile in overlay at 14 % against
  banding. The ground settles 1.06× → 1× with a 3.5 % rise over the descent.
- **Typography** — the statement is the section: Prata uppercase `clamp(2.75rem, 6.35vw, 7rem)`, cols
  5–12 (to the right of the stone), the label above, the paragraph below, the three tracked words at the
  bottom right. Lines rise into the field one by one (clip + 24 % rise) at 0.66–0.80; label/text/aside at
  0.84–0.96. Copy unchanged (placeholder). Phone: the stone as a 16 vw accent, the words from the top.
- **States** — film: `high`/`mid` with WebGL and motion; `reduced`/`none`: no pin, no hold, the manifesto is
  a still room after the hero (`.mf-room` + the same ground).
- **Verified** — `e2e/spike-hero-stone.gateway.mjs` (one wheel → 6.75 s film → landed at the pin's end,
  wheel spam mid-film ignored, normal scroll after, the wall, one wheel up → home at 0),
  `spike-hero-stone.input.mjs` (phone swipe both ways via CDP touch, ArrowDown/ArrowUp on desktop),
  `spike-hero-stone.film.mjs` (frames at 1440 / 768 / 390), `spike-hero-stone.rest.mjs` (rests at 1440 /
  1280 / 768 / 390, the reduced-motion room). `typecheck`, `lint`, `build`, `test:e2e` (55) pass; the
  built bundle (`dist-spike`) plays the same film.
- **Open** — the membrane's edge light and the front's brightness are tuned by eye on captures, not on a
  display; the emblem's `drop-shadow` is not reproduced on the canvas (a subtle change at 2–11 %,
  pre-existing).

## The architectural cut (pass 14) — REMOVED in pass 15

The user's verdict: too cinematic, presentation-like. Kept for the record only; `architecturalCut.ts`, the seam and the second gateway are gone.

Lighter and more graphic than the descent: typography, geometry, one seam. No new material, no WebGL.

- **Услуги as it is** — `ServicesRadial` (`spikes/radial/RadialSpike.tsx`, `radial.css`) mounted after the
  stage inside a plain frame `.sv-frame` (z 1; the stage `.hs` z 2). Its pin, 85 vh per state, snap and
  controls are untouched; nothing in `spikes/radial/` changed.
- **The planes — `passage/architecturalCut.ts`.** The ground is rendered twice (`ManifestoGround`
  `variant="upper" | "lower"`), each clipped with `clip-path: inset()` at the seam; the words are grouped by
  transform only (upper: the label, «НАША МИССИЯ:», «СОХРАНЯТЬ»; lower: «ЕСТЕСТВЕННУЮ», «КРАСОТУ», the
  paragraph, the aside). The seam's line is measured between INK — the baseline of the upper word from a
  zero-size inline-block (canvas ascents are wrong under `ascent-override`) and the cap top of the lower
  word from `measureText` — at the start of every play, when the manifesto is at rest. One paused timeline
  tweens a proxy; `paint()` writes the DOM. A 0–0.15 the halves draw apart by 6 px (the surface stays
  whole) · B 0.15–0.35 a 1→3 px seam of `#10271d` with a 1 px thread of light, a champagne edge for a few
  frames · C 0.35–0.60 the seam widens to 28 px, the planes begin to part (0.45), the upper leans back
  1.2° about the seam with a 12 % shade, the lower leans forward · D 0.55–0.82 the planes part to ± 0.5 vh;
  the green thins with the gap (gone by a hand's width) and each plane casts a soft shadow on Услуги ·
  E 0.85–1 the planes leave the frame; the seam, the shadows, the class `is-cut` all go. While `is-cut`
  the stage is transparent and the hero's field, emblem, interface and header are hidden, so Услуги is
  seen through the gap from the first millimetre. Phone / tablet: `flat` — no lean, lighter shadows.
- **Control — the same gateway, second instance** (`createPassageGateway`, generalised: `sideFor`, the
  `onStart` / `onBeforeRest` / `onRest` hooks, `anchor`, a shared hold so the two gateways never read a
  gesture while either plays, `realign()` after a ScrollTrigger refresh). Rests: the manifesto (the hero
  pin's end) and Услуги's own pin start (the frame's `offsetTop`). The document stays on the manifesto's
  rest for the WHOLE film; at `onStart` the frame is carried up by `translateY(−shift)` (Услуги's
  ScrollTrigger stays inactive — the document is before its start); on the last frame, in one task:
  `onBeforeRest` clears the frame's transform → the document is put on Услуги's start → its own pin takes
  over on identical pixels (02.1, turn 0); after release `onRest` resets the cut's DOM to 0 while the stage
  is off screen. Reverse: `onStart` measures, sets the cut to 1 and the frame to −shift, the document goes
  back to the manifesto's rest (Услуги unpins onto the same pixels), the film runs 1→0. Clock
  `CUT_RHYTHM` 4.6 s + 0.25 s hold (`mid` 0.85×, phone 0.65×); the way back 1.15× faster. `#services`
  anchors go through the gateway. `?transitionDebug=1` now shows both gateways and SERVICES OWNER:
  transition / services.
- **Verified** — `e2e/spike-hero-stone.cut.mjs` at 1440 / 768 / 390: one wheel → 4.85 s → landed at
  Услуги's start with `.radial` at 0 and the frame's transform cleared; wheel spam at 40 % ignored; a wheel
  inside Услуги turns the wheel to 02.2 (its own ScrollTrigger); one wheel up from 02.1 plays the cut back
  to the manifesto's rest. Resize at either rest re-aligns the page (`realign`). Reduced motion: no
  gateway, Услуги follows the still room normally. `typecheck`, `lint`, `build`, `test:e2e` (55) pass; the
  built bundle plays both films.
- **Open** — the lean and the shadows are tuned on captures; Услуги's own `goTo` still uses native
  `scrollTo` (pre-existing in the reference); the cut's frame timings may want a nudge once seen live.

## Манифест → Услуги (pass 15) — a normal scroll

No gateway, no hold, no pin, no wheel handling between the two: the page simply scrolls from the
manifesto's rest into Услуги (Lenis as before). One lightweight ScrollTrigger over the viewport between
them (`trigger: .sv-frame`, `start: 'top bottom'`, `end: 'top top'`, no pin, no scrub, `onUpdate` only)
writes three small things, smoothstepped: the manifesto's words soften 1 → 0.85 and drift 24 px ahead of
the page; the ground lags it by 36 px (a shallow parallax); Услуги's frame arrives from 40 px with its
opacity 0.9 → 1. At the trigger's end every value is at rest and the frame carries NO transform, so
Услуги's own pin (its start = the trigger's end) takes over with its containing block untouched
(`onRefreshInit` clears the frame for measurement). The way up is the same scroll; the descent's gateway
wall at the manifesto's rest stays as approved. Reduced motion: nothing is written; the rooms follow.
Verified: `e2e/spike-hero-stone.flow.mjs` at 1440 and 390 — every wheel tick moves the page, no hold, the
frame interpolates and is clean at the pin, Услуги scrolls to 02.2 by its own trigger, the way up returns
to the manifesto's rest. `typecheck`, `lint`, `build`, `test:e2e` (55) pass; built bundle checked.

## One canvas (pass 16) — the manifesto on the Services tone

The manifesto's ground was warmer and more golden than Услуги (`.radial` `#ece8df`). Now the two share one
tone: `--mf-field: #ece8df` is the ground's base (was `#eedfcb`; the vertical gradient ran `#f2e8d9 →
#e6d6c0`), with only the quietest variation above it — a little light top-right (`#f6f3ec` at 0.85 →
0), a little weight next to the stone (`#e2ddd4` at 0.5 → 0), a soft top light (`#f0ede6` at 0.6 → 0 by
45 %) — and NONE in the field's last fifth. Every other layer is gone before the boundary as well: the
slab strip and the veil are masked out over the bottom 26 % (two masks, `mask-composite: intersect`), the
grain over the bottom 30 %, so the last rows of the manifesto are pixel-identical to the first rows of
Услуги (sampled: `236 232 223` across the boundary). The page (`.hs-page`) carries the same tone, so the
frame's 0.9 → 1 entrance blends into nothing else. The slabs are quieter (`scripts/manifest-assets.py`:
saturation 0.60, contrast 0.78 about the field's luminance, a touch cooler), the illumination and the
veil folds halved, the vignette reduced to the top only. The descent's light front is a touch cooler to
match. Typography and layout unchanged. `.mf-room` (the still room) takes the same base.
