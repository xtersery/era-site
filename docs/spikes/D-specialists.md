# Spike D — Специалисты / the pinned portrait gallery

**Status: pass 2 — «СЕАНС», the sitting, with the composition locked to a grid — AWAITING REVIEW (14.09.2026).** Pass 1 review: the concept holds; the text placement drifted between states; «далее — [name]» to be removed.
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
