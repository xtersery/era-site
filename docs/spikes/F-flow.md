# Spike F — THE FLOW: Услуги → Кейсы, and where Стоимость goes (18.09.2026)

**Brief.** Remove Стоимость from the linear scroll: the story runs
Главная → Манифест → Услуги → Кейсы → Специалисты → Основатель → Отзывы →
Контакты → Заявка, and a visitor who simply scrolls goes from what ERA does
straight to what ERA achieves. Стоимость stays, unchanged, reachable only on
purpose from the top navigation. Then make Услуги end and Кейсы begin as
premium website scrolling — natural scroll, the visitor in control, no
hijack, no autoplay, no snap, no pin between them, no wipe, no scene, no new
material — subtle enough that the visitor barely notices where one ends and
the other begins. Both approved sections stay exactly as approved. Work in
spikes only; the wireframe untouched.

**Spike** `spikes/flow/` · `/spikes/flow/` (dev server) · `?exit=0` the
control (the same page with a hard ground cut) · `?hud=1` the readout ·
`?drive=` `?d=` pass through to Услуги · `#pricing` deep-links the layer.
**Live** `docs/spikes/boards/flow-spike.html` (`SPIKE=flow` build → `inline-spike` → `artifact-copy`)
· https://claude.ai/artifact/9Y6Kgcw3ur4B2VppFaLE7g
**Proof** `node e2e/spike-flow.handoff.mjs` (dev server up) → 204 checks at
1440 × 900, 1280 × 800, 820 × 1180 (tablet, touch), 390 × 844 (phone) and
reduced motion, stills in `spikes/flow/__captures__/`.

## What was there, and what was reverted

Pass 8 of Spike B (17.09) had built the opposite handover — Услуги →
Стоимость as one continued bone surface — inside the approved Services spike
page, so `/spikes/radial/` flowed into the price list by default. Reverted
from `spikes/radial/`: the `?after=` switch, the `.spike-pricing` styles, the
`html, body` ground rule and the `03 — Стоимость` neighbour stub (now
`04 — Кейсы`). Kept: the opt-in `exit` prop and the inert `.radial__exit`
layer, off by default — with it unset `ServicesRadial` renders exactly what
Spike B approved. The Стоимость scaffold moved to `spikes/flow/Pricing.tsx`
(its entrance tween dropped — it lives in a layer now) and is the content of
the price layer. `e2e/spike-radial.handoff.mjs` was replaced by the flow
proof. The wireframe (`src/sections`, `src/App.tsx`, `Header`,
`lib/constants/sections.ts`) has no change; the pending edits to
`src/animations/scroll/` belong to the hero-stone spike and were left alone.

## Information architecture — Стоимость as a layer

- **The document has no Стоимость.** `FlowSpike` composes `ServicesRadial`
  and `CasesArchive` with nothing between them: no spacer, no hidden
  section, no bridge element.
- **The top navigation** follows the wireframe header's model (fixed, light
  ink in `mix-blend-mode: difference`, mono index with the architectural
  numbers). `03 Стоимость` is a plain `href="#pricing"` like the wireframe's
  own link, set apart at the end of the index by a hairline. On the phone the
  bar keeps the wordmark, the CTA and this one entry (the wireframe's index
  is hidden below 1024 px and has no menu yet).
- **One delegated click** on any `#pricing` anchor — the header entry, the
  state's own «Стоимость →» — opens the layer; modified clicks keep their
  browser meaning. The layer is its own scroller over the page
  (`overscroll-behavior: contain`); the document is held with the project's
  `html.is-scroll-locked`, which keeps `scrollY` — the two pinned sections
  beneath never see an event and need no refresh. Focus moves into the layer
  and returns to the opener on close.
- **Leaving** is always one step: «← Назад к сайту», Esc, browser Back
  (opening pushed one `#pricing` entry; a deep-linked visitor has nothing to
  pop, so close just drops the hash), or the layer's own links out
  («Посмотреть результаты →» closes it and goes to Кейсы). The page owns
  scroll restoration while it is up (`ScrollTrigger.clearScrollMemory('manual')`
  — ScrollTrigger re-applies its own record after every refresh, so plain
  `history.scrollRestoration` is overwritten): the layer never moves the page,
  and the browser's restore, which lands after `popstate`, would otherwise
  cancel a link out of the layer.

Measured on all four runs: opening never moves the page (`scrollY` identical
before, during, after); the wheel scrolls the layer, not the page; Esc, Back,
the button and the link out all close it and the page is where it was; the
deep link opens it and «Назад к сайту» stays on the page.

## The handover — two pins and a tonal bridge (pass 1, 18.09 morning)

Two strictly sequential pins with 100 vh of unowned document scroll between
them, and one gradient layer inside Услуги whose reach grew 0 → 30 % of the
section over the first 22 vh after release, landing on the Кейсы edge tone.
Reviewed the same day as **too short and visually abrupt**: the tone-matched
line was not the problem; the 22 vh ramp above it and the archive's full dark
ground entering below it as a straight-edged block were.

## Pass 2 — THE BLEND ACROSS THE WHOLE WINDOW (18.09.2026, afternoon)

Brief: extend the blend to ~80–120 vh, layered rather than a gradient block,
the atmosphere changing rather than one section covering the other; Lenis
stays the scroller; no capture, autoplay, snap or pin for the transition.

**Range: the full 100 vh between the Услуги pin release and the Кейсы pin
start** — no spacer, no added distance, the content of both sections leaves
and arrives by ordinary scrolling. One scrubbed timeline reads the position
(`trigger` = the Услуги pin-spacer, `bottom bottom` → `+=100vh`, `scrub:
true`) and writes four custom properties on the page; it moves and holds
nothing.

**Structure — two page-owned layers, one seam tone.**

- `--seam-k` 0 → 1 over 0.05–0.82 of the window, `power1.in`: the seam tone
  `color-mix(bone → Кейсы edge)` is what both layers are painted from, so the
  line where the sections meet is the same colour on both sides at every
  position, and while Услуги is pinned it is bone on bone — nothing.
- **Above the line** — the atmosphere inside Услуги (`.radial__exit`, now an
  inert box in `radial.css`; its paint lives in `flow.css`). It sits UNDER
  the states and the dial (z 0, over the section's own ground): the ground
  deepens — transparent → graphite → the seam tone — and ink stays ink until
  the ground meets it; nothing in Услуги is faded. Reach 18 → 72 % of the
  section over 0.1–0.9. Depth: the layer lags the leaving content by up to
  6 svh (`--a-shift`), with a solid 10 svh band at its foot so the clipped
  edge tone never changes.
- **Below the line** — a veil over the top 52 svh of Кейсы (`.flow-veil`, a
  sibling in a `position: relative` wrapper, over the ribbon's label and
  words, pointer-events none): the seam tone solid over the top quarter,
  released downward into the archive's own ground. So Кейсы arrives as
  atmosphere, the sheets surface through the lower, thinner part first
  (~0.45), the title and service line at ~0.55–0.75, the label and the rail
  as the veil goes (`--b-opacity` 1 → 0 over 0.84–0.98). Gone when Кейсы pins.

Measured (1440 × 900; the same at 1280 and 390):

| window | Услуги | Кейсы | tone k | reach | veil |
| --- | --- | --- | --- | --- | --- |
| 0 | 100 % | 0 % | 0.00 | 18 % | 1 |
| 0.2 | 80 % | 20 % | 0.04 | 25 % | 1 |
| 0.3 | 70 % | 30 % | 0.10 | 32 % | 1 |
| 0.45 | 55 % | 45 % | 0.27 | 42 % | 1 |
| 0.6 | 40 % | 60 % | 0.51 | 52 % | 1 |
| 0.7 | 30 % | 70 % | 0.71 | 59 % | 1 |
| 0.8 | 20 % | 80 % | 0.95 | 65 % | 1 |
| 0.9 | 10 % | 90 % | 1.00 | 72 % | 0.5 |
| 1.0 | 0 % | 100 % | 1.00 | 72 % | 0 |

Tone monotone; measurable change from +0.2 to +0.9 vh (70 vh of change in
the 100 vh window); meeting-line step ≤ 0.9 luminance points at every frame;
the snap does not pull back past release (0 px); wheel monotone down and up;
back up re-enters the pin with the blend at nothing; resize mid-window keeps
the sections flush and the pins sequential. Reduced motion: the same
position-linked scrub on the native scroller — no autonomous tween exists.

**Scroller.** Pass 1 ran on native scroll (as the radial and gallery spikes
do). Pass 2 mounts the page in the project's `ScrollProvider`
(`src/animations/scroll`): Lenis on the live tiers — `lenis.raf` on
`gsap.ticker`, `lagSmoothing(0)`, `ScrollTrigger.update()` on every Lenis
scroll event, one instance (`window.__lenis` in dev) — and the native scroller
under reduced motion. Nothing in the integration was changed; the spike adds
no RAF loop and no wrapper. Measured: a Lenis-only scroll moves the pinned
Услуги trigger's progress 0 → 0.5 without a native scroll event; no second
smooth-scroll wrapper. Two consequences handled: the price layer's lock now
goes through the scroller (`setLocked`: `lenis.stop()` + the class) and its
link out through `scrollTo`; and the layer's own scroller carries
`data-lenis-prevent`, because a stopped Lenis otherwise prevents default on
every wheel event, including over the layer.

Note for integration: `useChapterTriggers` (inside `ScrollProvider`)
measures a pinned room's `bottom top` end from its unpinned bounds (ends
1800 for Услуги instead of 6390) — the chapter progress it writes to `stage`
is off for pinned rooms. Nothing on this page reads it.

Live: https://claude.ai/artifact/9Y6Kgcw3ur4B2VppFaLE7g (version 2).

## Pass 3 — КЕЙСЫ → СПЕЦИАЛИСТЫ: results, then the person (18.09.2026)

Brief: the next handover, natural and premium, no gateway / hijack / autoplay
/ object / wipe; a subtle DEPTH COMPRESSION — the archive grows calmer as it
leaves while the first portrait enters — over ~80–120 vh; Lenis stays the
scroller; Кейсы and Специалисты unchanged.

**Composition.** `Sitting` (`spikes/portraits/`, the approved «Сеанс») is
now the next thing in the document after `CasesArchive`, in a
`position: relative` wrapper like Кейсы, followed by the portraits spike's
own `06 — Основатель` opening. The page reads 02 → 04 → 05. The three pins
are strictly sequential: Услуги 900→5490 · Кейсы 6390→12150 · Специалисты
13050→16650 at 1440 × 900 — each window exactly 1 vh of scroll owned by
nobody; never more than one pinned trigger active (measured at every frame).

**Range: the 100 vh between the Кейсы pin release and the Специалисты pin
start.** One scrubbed timeline on the Кейсы pin-spacer (`bottom bottom` →
`+=100vh`, `scrub: true`) — it ends on the exact pixel the Специалисты pin
begins, so the section's own trigger (pin + snap + its 100 vh settling exit)
is untouched and takes over cleanly (not pinned at +0.97 vh, pinned just
past +1 vh, veil height 0).

**The tone.** Dark → light this time: a second seam tone from the archive's
own bottom edge (`#0c1713` desktop / `#050e0b` phone, sampled) to the wall
`#e9ebe6`, `power1.in` over 0.05–0.82, painted on two page-owned veils:
- at the FOOT of Кейсы (`.flow-veil--foot`, 64 svh, a long soft rise with
  no band beyond a 5 % edge — light over dark is read easily) — off for the
  whole pin (it would sit over the last case) and on within the first 6 % of
  the exit while its tone is still the archive's, so nothing appears;
- over the HEAD of Специалисты (`.flow-veil--head`, 58 svh, over the wall
  AND the portrait): the portrait surfaces as the tone lightens (in the
  viewport with the tone past 0.3 by +0.55 vh), and the veil then LIFTS —
  it shrinks from below over 0.84–1.0 so its edge band stays on the meeting
  line until Кейсы has gone — rather than fading, which had left a step over
  the portrait's dark hair at +0.9. Measured step across the line ≤ 0.9
  luminance points at every frame, over the wall and over the portrait.

**The depth compression — `calm`.** The only thing the archive's scene reads
from the page: an optional `calm` ref on `CasesArchive` → `RibbonScene`
(unset = exactly Spike C). At 1 the same view is flatter: the lens narrows
30 % while the camera moves back so the docked case keeps its size
(measured 474 → 468 px, 1.3 %) and everything behind it foreshortens less
(the neighbour 173 → 229 px, +32 %); the eye drops (elev × 0.5); the ±1.7°
breath stops; `FogExp2` density 0.05 → 0.12 and each sheet's fog share rises,
so the far side of the turn sinks; the rail dims 55 %. Driven 0 → 1 over
0.02–0.7 (`sine.inOut`); amplitude 1 on desktop, 0.5 on the tablet, 0 on the
phone and under reduced motion (where the tone still follows scroll). Nothing
is faded, scaled, blurred, rotated or morphed; the archive loses dominance
and the portrait takes the frame.

Measured (1440 × 900):

| window | Кейсы | Специалисты | tone | calm | head veil |
| --- | --- | --- | --- | --- | --- |
| 0 | 100 % | 0 % | 0.00 | 0.00 | 58 svh |
| 0.2 | 80 % | 20 % | 0.04 | 0.16 | 58 |
| 0.3 | 70 % | 30 % | 0.10 | 0.36 | 58 |
| 0.45 | 55 % | 45 % | 0.27 | 0.70 | 58 |
| 0.55 | 45 % | 55 % | 0.42 | 0.88 | 58 |
| 0.65 | 35 % | 65 % | 0.61 | 0.99 | 58 |
| 0.8 | 20 % | 80 % | 0.95 | 1.00 | 58 |
| 0.9 | 10 % | 90 % | 1.00 | 1.00 | 36 |
| 1.0 | 0 % | 100 % | 1.00 | 1.00 | 0 |

Wheel monotone down and up across the boundary (Lenis); back up re-enters
the Кейсы pin with calm 0 and the tone at 0; resize mid-window keeps all
three flush and both windows at 1 vh. Scroller unchanged (the project's
`ScrollProvider`, one Lenis, no second loop). Reduced motion: the native
scroller, tone scrubbed, no perspective interpolation.

Page accommodations: `.wall__label` moves down under the fixed header like
the other two labels; the portraits spike's diagnostic panel is hidden on
the composed page. The portraits are the approved assets, all women.

Live: https://claude.ai/artifact/9Y6Kgcw3ur4B2VppFaLE7g (version 3).

## Numbering

The rooms read `02 — Услуги` → `04 — Кейсы` on the page. Numbering is
architectural — `SECTION_IDS` in `src/lib/constants/sections.ts` is the
single source for anchors, labels, ScrollTrigger keys and the wall-label
index, and `04` is baked into the Кейсы spike's `subIndex('04', …)` and its
data — so it was preserved, not renumbered. **Consequence to decide at
integration:** the visible story skips 03. Either 03 stays a room that is
not on the vertical path (the index in the header shows it as such), or
Стоимость is renumbered out of the sequence and every room after it shifts —
a project decision, not a spike's.

## Two things found on the way

- **The reduced-motion reset breaks sequential pins.**
  `src/styles/globals/reset.css` sets `transition-duration: 0.01ms !important`
  on `*` under `prefers-reduced-motion`, which turns every style write into
  a micro-transition. In one synchronous `ScrollTrigger.refresh()` pass the
  Услуги pin-spacer's height is written and then measured by the Кейсы
  trigger — which reads the pre-transition size, and the Кейсы pin started
  ~4.6k px early. The spike excludes `.pin-spacer` from the rule (`flow.css`);
  the wireframe will need the same exclusion when it has two pinned rooms.
- **Pointer capture in Услуги swallows mouse clicks on the phone layout.**
  `ServicesRadial` captures the pointer on the state for the swipe, so a
  mouse click on «Записаться» / «Стоимость →» in the < 1024 px layout is
  delivered to the container, not the link; a real tap reaches the link. Not
  touched here — it is inside the approved section — but worth a line in
  Spike B's integration notes.

## One accommodation

The sections were built without a header over them. Under the fixed 64 px
bar the two top-anchored wall labels, and the Кейсы text that hangs from the
same line (`.browse` on desktop, `.rail` on the phone), move down by the
header's extra height — a uniform 40 px offset the composing page applies
(`--flow-offset`), the same accommodation production will make. Nothing inside
either composition changes relative to itself.

## Pass 4 — the Specialists object and its passage (18.09.2026)

Not a flow change: `Sitting` now carries Spike D pass 16 — the thin optical
plate in place of the quartz, and the pin's last viewport played as one
continuous passage by one gesture (the hero-stone gateway on this page's
Lenis) instead of scrubbed. Record: `docs/spikes/D-specialists.md` → pass
16. The proof gained the passage's checks (218). A dev-server race — the
triggers measured before the stylesheet applied (the body's default 8 px
margin) — is closed by one `ScrollTrigger.refresh()` when the document is
complete and the fonts are in.

## Pass 5 — the water veil (18.09.2026)

`Sitting` carries Spike D pass 17: the plate and its gateway film are gone;
a thin water veil on the boundary, and the pin's last 110 vh scrubbed by the
page's scroll as water → refraction → veins → material. Record:
`docs/spikes/D-specialists.md` → pass 17. Proof 223 checks.

## Pass 6 — water as light (18.09.2026)

`Sitting` carries Spike D pass 18: the glints (`docs/references/
water-glints-ref.png`) in place of the stream, and the pin's last 130 vh
scrubbed with a soft finish (`AUTO_FINISH`, `FINISH` in `PortraitsSpike.tsx`)
into the project's existing marble. Record: `docs/spikes/D-specialists.md`
→ pass 18. Proof 232 checks.

## Pass 8 — Основатель → Отзывы (18.09.2026)

`spikes/reviews/` composed after Основатель as ordinary scroll: a page-owned
forest veil at the founder's foot (`BLEND3`, `.flow-veil--founder`) rising
12 → 72 svh as the marble leaves, the head of Отзывы the same shade. Record:
`docs/spikes/G-reviews.md`. The header index gains 07. Proof: a
Основатель → Отзывы block in `e2e/spike-flow.handoff.mjs`.

## Pass 9 — Отзывы → Адрес: the place (19.09.2026)

**Status: BUILT — awaiting review.** `spikes/contact/` (standalone
`/spikes/contact/`), composed after Отзывы; Заявка is NOT on the page yet
(the next pass). The wireframe's `src/sections/Contact` and `src/data/contact`
are untouched.

THE ROOM — `Place.tsx`, `contact.css`. The wireframe's Contact structure,
elevated, nothing invented: the same fields in the same order — the address
as the second headline in the serif (`[Город], [ул. Адрес, 00]` + the
entrance line), metro, parking, the hours with today lifted, the phone as
the `tel:` link with Telegram / WhatsApp beside it — as one table of fine
rules on the bone; the title «Место, куда / возвращаются» at display scale,
sentence case (CLAUDE.md: capitals in headlines are deliberately absent;
`text-transform` is the one-line switch if the caps are wanted); the route
as the room's one CTA — «Построить маршрут →», a thin ink outline, filled
on hover — with «Открыть в картах ↗» and «Скопировать адрес» (the
wireframe's clipboard) beside it. Both map links point at `contact.mapHref`
and are `aria-disabled` + bracketed while that is a hash (the reviews room's
pattern), so the CTA is a real, focusable link whose destination waits for
the client's map card. The map is the wireframe's labelled map placeholder
inside `MapSlot` — the boundary a real map plugs into: a mineral plate a
shade below the bone, bled to the right edge, cols 7–12 (≈ 48 %), the
wireframe's register marks at its corners, a pin where the door is, the
wireframe's caption; no drawn streets, no widget frame. The door-photograph
placeholder of the wireframe is not in this composition (the brief's right
column is the map alone) — a decision for the review. Every fact carries
`data-placeholder`.

THE PASSAGE — ordinary scroll and the simplest of the flow's: neither
section is pinned, so no timeline. The head of Адрес is itself the
atmosphere (`.place__dawn`, `--dawn` 64 svh on desktop, 46 on the phone):
deep forest → graphite → a warm greige (`#6d675d` → `#a8a297`) → the bone,
thirteen soft stops on an eased ramp, painted in the document —
position-linked by nature, identical under reduced motion, exactly
reversible. At the meeting line it is Отзывы's own ground (`#08140f`), so no
edge exists (Δlum 0.0 at four positions on every viewport); the composition
begins 6 svh before the ramp ends, so the words enter the light rather than
starting at its edge. The header index gains 08.

PROOF — an Отзывы → Адрес block in `e2e/spike-flow.handoff.mjs` (order, no
Заявка, no pin, flush, the atmosphere's length, the meeting line's tone, the
environment only lightening, the wireframe's facts verbatim, the tel link,
the hours with today, the route CTA and its focus, the labelled map, no
overflow, the free return to Отзывы): 20 checks × 5 runs, all pass. One
pre-existing check in the Специалисты → Основатель block («the wall is the
same surface across the hand», t820) is timing-flaky in the full run and
passes in isolation. Typecheck, lint, production build: clean.

## Pass 10 — Адрес → Заявка: the corridor (19.09.2026)

**Status: BUILT — awaiting review.** `spikes/inquiry/` (standalone
`/spikes/inquiry/`), composed after Адрес as the last thing on the page;
the flow now runs to its end. The wireframe's `src/sections/Inquiry` is
untouched; Адрес is untouched.

THE ROOM — `Talk.tsx`, `inquiry.css`. The wireframe's Inquiry, field for
field and rule for rule, through the project's own `Field` components
(labels, ids, `aria-describedby`, `role="alert"` errors, the `role="status"`
success — the wireframe's chrome read through the room's tokens): name
(≥ 2), phone or messenger (≥ 10 digits or an @handle), procedure (the
service categories, «Пока не знаю» first), specialist (optional), message
(optional), consent (required); the pre-fill through `useInquiry()` (the
flow is now wrapped in the project's `InquiryProvider`; its CTAs stay plain
`#inquiry` anchors), cleared on send; the same simulated 600 ms request
(`TODO(backend)`); «Отправить заявку →» / «Отправляем…» and «Или напишите
в Telegram ↗». One correction: the wireframe focuses the first invalid
field before React has rendered the error, so it lands nowhere; here the
focus follows the render. Copy: «Начнём / с разговора.» (sentence case, as
Адрес's title — CLAUDE.md bans capitals in headlines; `text-transform` is
the switch), the support line and the success line «Спасибо. / Мы свяжемся
с вами и подберём удобное время.» are this pass's proposals
(`data-placeholder="copy"`); the consent text and the button are the
wireframe's. Composition: the words in cols 2–6, the form in cols 8–12 with
its head 9 svh below the title's; the room inset a column on each side and
its measure short — more intimate than Адрес, not smaller. The CTA: the
site's deep green, ivory, a fine champagne edge — the only gold. No card.
Success in place, in the serif, with the time; no modal.

THE CORRIDOR — light alone, no object. Both rooms stand on the same bone,
so there is no line to hide (Δlum 0.0 at five positions on every viewport).
Across the 100 vh in which Заявка's top crosses the viewport, one scrubbed
timeline (`CORRIDOR` in `FlowSpike.tsx`) writes two numbers for two fixed
layers the page owns (`Corridor` in `Talk.tsx`): `--t-k` — the walls, the
outer fifths of the viewport calming by a few per cent with a long falloff
(`multiply`, ≤ 9 % at the edge; ink stays ink; measured edge −17 lum vs
the middle +7), from 0.25 to 0.8, eased in — and `--t-lamp` — a warm light
held to the middle (`overlay`), from 0.4 to 0.95. Phase A (0–25 %) leaves
Адрес exactly as it is; the map's outer edge is the first thing to recede;
the empty foot of Адрес and the 52 svh head of Заявка (`--hush`) are the
narrowing. No pin, no snap, nothing moved; position-linked, so the same
under reduced motion and exactly reversible — scrolling back into Адрес
withdraws both layers to nothing. The room's parts arrive in document order
as they enter the viewport — marker, title, support, then each field and
the actions — each a masked wipe scrubbed from its top at 98 % to its
bottom at 93 % of the viewport (`useStaging`), so a part at the very end of
the page still completes; under reduced motion there are no triggers and
the CSS holds every part at rest. The header keeps its `difference` logic.
The header index gains 09.

ONE THING FOUND: the page's height changes after mount without a resize —
Отзывы grows when the CMS answers with the real, longer reviews — and every
ScrollTrigger below it was measured short by ~260 px (the corridor ran
early; the flow's own per-section chapter trigger shows the same). One
`ResizeObserver` on `.flowpage` now refreshes ScrollTrigger on a settled
height change (`FlowSpike.tsx`).

PROOF — an Адрес → Заявка block in `e2e/spike-flow.handoff.mjs` (order,
last, no pin, one tone, the line at five positions, the four phases by
number, edge vs middle, the header, the headline, the wireframe's fields
and required marks, bound labels, the button and its alternative, no card,
no overflow, the staging in order and complete at the page's end, the three
quiet ink errors and the focus landing, no jump, Tab order, a bad phone, a
handle, «Отправляем…», the success in place with the time, the reverse):
36 checks × 5 runs, all pass. Typecheck, lint, production build: clean.

### Pass 10b — the closing scene (19.09.2026)

The corridor was too subtle and the room too empty. Now: the walls come in
over 70 vh (`CORRIDOR` 0.15–0.85; the lamp 0.3–0.95) and reach 15 % at the
extreme edge with the falloff to 47 % (measured edge −38 lum vs the middle,
the phone −31); the room's own ground settles a shade below the bone across
its head (`--bone-2` #e5e0d5 by `--hush` + 20 svh — the line with Адрес is
still the bone, Δ 0.0), so the private room is a little dimmer than the
open place while the lamp keeps its middle bright. THE IMPRINT: the
official mark (`spikes/hero-stone/assets/era-mark-ink.png`, the hero
spike's isolated ring) debossed in the surface at the room's lower left —
42 vw, out of the left and bottom edges, opacity 0.09, the deep green as
the body with a 1.5 px ivory lip above-left; under the words, never
touching the title. THE COLOPHON: one 56 px row at the foot of the room on
a hairline — «© 2026 ЭРА cosmetology · [ООО «Название», лицензия № 00000]»,
the wireframe footer's two legal links (no URLs yet — `aria-disabled`,
bracketed), «[Город] · Telegram · WhatsApp» from `contact`; a short stack
on the tablet and the phone. THE FORM: baselines capped at 30 rem, the
phone field lifted (label in ink, 1.5 rem, ink baseline), the consent
pulled to the action, the CTA 60 px with a firmer champagne edge, the
column given room for the errors and the success. Proof: five more checks
(the imprint's size, bleed, opacity and distance from the title; the
colophon's facts and height); all 5 runs pass.

### Pass 10c — the imprint is the hero's emblem (19.09.2026)

The ring-mark watermark is gone. The imprint is now the approved hero's
brand object — `docs/references/era-logo_3.png`, the 3D emblem of gold
letters in a green-glass ring — through the hero spike's own web copy
(`spikes/hero-stone/assets/emblem.webp`, `emblem@phone.webp`; alpha kept,
nothing redrawn), so Заявка closes on the same object Главная opens on.
48 vw at 1440 (52 on the tablet, 80 on the phone), at the room's lower left
(−12 vw, −9 vw): the ring runs out of the left and bottom edges, the crown
sits ~55 px under the support copy, the letters end above the colophon
row. Pressed into the surface with `multiply` at 0.22 (0.16 on the phone;
`saturate(0.85)`) — the gold becomes champagne in the bone, the ring stays
green, the light in the metal stays where the hero put it — with the
emblem's own shape as a tight faint shadow 4 × 6 px below (0.1, blurred):
the relief of an impression. Proof: the asset, the size by layout, the
opacity window, and no contact with the title, the support or the form.

## Pass 11 — THE WHOLE PAGE: `spikes/full/` (19.09.2026)

**Status: BUILT — awaiting review.** One canonical route, `/spikes/full/`
(`spikes/full/FullSpike.tsx`, `main.tsx`, `full.css`), every approved spike
in the approved order on the project's one scroller:

    00 Главная → 01 Манифест     spikes/hero-stone/ — HeroStage: the hero on
                                 onyx (untouched), the descent (pass 13
                                 gateway + film, pass 16 ground), Манифест →
                                 Услуги as pass 15's normal scroll
    02 Услуги → 04 Кейсы → 05 Специалисты → 06 Основатель → 07 Отзывы →
    08 Адрес → 09 Заявка         spikes/flow/ — FlowPage, its blends, the
                                 pass-19 passage, the corridor, the layer
    03 Стоимость                 the #pricing layer, from the navigation only

Composition: `FlowPage` gained a `head` slot (`(services) => ReactNode`) and
a `home` anchor; `HeroStage` gained a `services` slot and `onPassage`. The
full page passes the hero's stage as the head, and the stage puts the
flow's own driven Услуги node into its `.sv-frame` — so the Манифест →
Услуги trigger and the Услуги pin see exactly the element they were built
against. Both standalone pages render as before (defaults). One
`ScrollProvider`, one `InquiryProvider`, no second RAF loop; five pins
(hero, services, cases, specialists, founder), strictly sequential.

THE TWO HEADERS. The hero's approved header (`.hh`, in the section) is
faded by the descent's first tenth; the flow's fixed bar (`.flowbar`,
`difference`) is the navigation everywhere else. The page holds the bar at
nothing while the hero's header is up (`--bar`, `--bar-visibility`) and
brings it in over the film's last frames (`onPassage` 0.86 → 1); the way
back takes it out again; without the film it arrives as the still
manifesto room does. The hero's own «Меню» index and the bar's index both
reach every room; `#pricing` from either opens the layer.

PERFORMANCE. The archive's ribbon and the water were R3F `frameloop:
always` — drawing every frame even a screen away; both scenes now take an
opt-in `frameloop` (default unchanged) and the page sets `demand` while the
section is more than a viewport away (an `IntersectionObserver` in
`FlowPage`, `rootMargin` 100 %), `always` a viewport before it arrives.
The hero's film is `demand` by design. Three canvases on the page, at most
two drawing at once.

ОТЗЫВЫ: the title is now «Ваши отзывы.» (sentence case, as every headline
here; the lede unchanged).

ЗАЯВКА ON BLACK: `.talk` is `#070707`; ivory `#eae6dc` for the headline,
entries, labels of the phone field, errors and the success; a warm ivory
at 0.72 (≈ 9:1) for the support, the other labels and the colophon;
champagne at 0.26 / 0.5 for the baselines, the phone's at 0.72, the focus
line ivory; placeholders ivory at 0.42; `color-scheme: dark` for the native
select; the CTA the deep green with an 88 % champagne edge, ivory text,
brighter on hover; the checkbox a champagne edge with an ivory mark; the
colophon's rule ivory at 0.14. The emblem (`era-logo_3.png` via the hero's
`emblem.webp`) is the emblem itself in the dark — `brightness(0.62)
saturate(0.82)` at 0.58, with a wide, very low breath of its own warmth
behind it — dark gold letters, the green-glass ring, clearly the object
from Главная; 48 vw, the same crop and clearances as before. Nothing else
in the room moved.

АДРЕС → ЗАЯВКА, TO BLACK — the flow's seam-tone grammar, three numbers from
one scrubbed timeline over the 100 vh in which Заявка's top crosses the
viewport, no pin, no snap: THE DIM (`.flow-veil--place-dim`, over the whole
of Адрес, `multiply` with a warm greige, `--p-dim` 0.06 → 0.82, sine) — the
paper loses its light and goes greige, ink stays ink, every word readable;
THE DUSK — one tone `--dusk` = dimmed bone → black (`--p-k` 0.05 → 0.9,
sine), painted on BOTH sides of the meeting line: solid at the foot of
Адрес and fading 10 → 58 svh up the leaving room (`.flow-veil--place`), and
at the head of Заявка whose 52 svh hush runs dusk → black — so the line is
one tone at every position (Δlum ≤ 1 at five positions) and the page
darkens as a whole, never as an edge, over ~110 vh of perception; THE WALLS
as before (0.15 → 0.85). Measured at the line: 229 → 190 → 82 → 17 lum at
10 / 25 / 50 / 75 %; at 100 % black. Identical under reduced motion;
reversible — back into Адрес the light returns to 0.01.

PROOF. `e2e/spike-full.mjs` (d1440 / m390 / reduced): every room once, in
order; Стоимость not in the document; the pins; one scroller; three
canvases; the hero's header up and the bar held at the top; one wheel plays
the film, the hero's header gone, the bar in at the landing; the page then
scrolls as a document; one wheel up from the rest plays the film back to
the hero; the bar's index; the layer from the bar with the page held, Esc;
the black room at the end; no overflow — all pass. `e2e/spike-flow.handoff.mjs`
now takes `BASE=` and runs against both routes (the Отзывы title, the black
room's colours and the dusk added; 5 runs each — 613 checks pass on the
full route, all pass on the flow route). `e2e/spike-hero-stone.flow.mjs`
(pass 15's entrance) unchanged and passing. Typecheck, lint, production
build: clean.

TWO SCROLL DEFECTS FOUND ON THE WAY, both pre-existing in the hero spike and
inherited by the full page. (1) `<html style="scroll-behavior: smooth">`:
ScrollTrigger caches whether the viewport is `smooth` when it first meets it
— before the ScrollProvider's `data-scroll="lenis"` lands, since children's
effects (the hero's pin) run first — and after every refresh restores an
INLINE `scroll-behavior: smooth` on `<html>`, which beat the stylesheet's
`html[data-scroll='lenis'] { scroll-behavior: auto }`. Every programmatic
scroll then animated; ScrollTrigger's own snap tweens read a lagging
position (> 3 px), killed themselves and re-armed — Услуги's snap crawled
1 px per frame on `/spikes/hero-stone/`, and on the full page so did the
Специалисты soft finish. The flow page never showed it only because a snap
trigger created there clears the flag. Fix: `src/styles/globals/base.css`
— the Lenis rule is now `!important`; measured: computed `auto` on every
page, the snaps converge. (2) The Манифест → Услуги entrance (40 px on
`.sv-frame`) was cleared for measurement by a per-trigger `onRefreshInit`,
which fires only just before its own trigger recalculates — Услуги's pin,
created earlier, and everything after it were measured 40 px late on every
refresh. Fix: `HeroStoneSpike.tsx` clears it on ScrollTrigger's global
`refreshInit` / `refresh` events, and the frame carries the transform only
INSIDE its window (below the viewport it was invisible anyway) — so a trigger
created at any time outside the window measures the true layout.

REMAINING. The dev server on 5173 that was already running had a stale
dependency cache (the full page and the hero page both 504'd on it); a
restart fixes it. On port 5174 the Sanity origin is not allowed, so the
proofs saw the sample reviews. The hero's copy, the manifesto and the
Заявка copy remain proposals.

## Status

Pass 2 (Услуги → Кейсы) approved 18.09; pass 3 (Кейсы → Специалисты) and
pass 7 (the glints, the onyx and the founder's room opening on it) built ·
awaiting review. The IA change (Стоимость out of the vertical page)
is a proposal this spike demonstrates; CLAUDE.md's approved order and
`SECTION_IDS` still list 03 in sequence until it is approved.

## Pass 7 — the passage ends in the founder's room (18.09.2026)

`Sitting` carries Spike D pass 19 and the page composes the new
`spikes/founder/` room after it: the water's light mineralises into the
hero's onyx (the material changed from `wallpapers.png` to `stone.png`), and
Основатель — standing under the specialists' last frame, pinned for the same
110 vh — opens on that wall while Специалисты lets go of it. No window
between these two pins: the passage is one continuous pin of 300 + 130 +
110 vh with one soft finish. The header index gains 06. Record:
`docs/spikes/D-specialists.md` → pass 19. Proof: the passage block of
`e2e/spike-flow.handoff.mjs` rewritten (the founder's pin, the hand, the
staging, the CTA in the opened viewport, the wall across the hand, the
return thresholds).

## Pass 12 — THE PERFORMANCE PASS: Hero → Манифест no longer stalls (20.09.2026)

**Status: BUILT — measured, no visual change.** The full page stuttered
heavily, sometimes for over a second, on the first transition. Profiled
before anything was touched (Chrome trace through CDP, frame timing, rAF
source accounting, per-canvas GPU timer queries, React commit counting, a
DOM mutation log), on the dev server and on the packaged bundle.

### What it was

The stall was never on the main thread: no long task, the renderer idle,
the GPU process waiting 0.3–1.6 s in `IOSurfaceImageBacking::
WaitForCommandsToBeScheduled` / `CALayerTreeCoordinator::ApplyBackpressure`
— the GPU saturated and the compositor unable to present. Three causes,
all of them the composition (the hero alone played at 60 fps):

1. **The water scene rendered every frame from five viewports away.**
   `WaterScene` reported its draw calls to `Sitting` on every `useFrame`
   (`onDiag`, the pass-10 diagnostic), a React state write; the section
   re-rendered, React re-rendered the R3F tree, R3F invalidated the root —
   and `frameloop="demand"` drew the next frame. A self-sustaining 60 fps
   loop, ~9 ms of GPU a frame, invisible. With the film's own ~7 ms on top
   the GPU was over budget and Metal's queue backed up.
2. **Every canvas drew a frame after every scroll.** R3F measures its
   container on scroll by default (`react-use-measure`, `scroll: true`,
   50 ms debounce) for pointer maths; the rect's `top` changes, the root
   re-renders, the canvas draws. The archive uploaded its textures (5 MP +
   mipmaps) on that frame, in the middle of the film.
3. **The film's canvas drew only every other frame** — pre-existing, also
   in `/spikes/hero-stone/`. The gateway wrote t on the GSAP tick and
   `invalidate()`d; R3F's demand loop had already run that frame and
   cancelled its rAF, so the draw landed a frame later, and the next tick's
   invalidate was swallowed while it ran: 193 draws for 405 ticks.

Two smaller things found on the way: `--bar` (the flow bar's presence,
written by the descent's last tenth) was set on `.flowpage`, the page root
— a custom-property write there recalculates the style of every element on
the page, measured up to 35 ms a frame in the packaged bundle; and a frame
drawn into the film's layer while it is at opacity 0 is GPU work nobody
schedules — the first shown frame then waited for all of it, a 50–85 ms
hitch at t 0.02 on every play but the first.

### What changed (no visual change — frames at t 0 … 1 compared pixel for pixel)

- `spikes/portraits/scene/WaterScene.tsx` — the draw-call readout is
  reported only when it changes; `Sitting` (`PortraitsSpike.tsx`) ignores a
  report that changes nothing and drops its stale-scene timer once the
  scene is live. Textures ask for one frame when they arrive (uploads at
  idle, not mid-film).
- `spikes/gallery/scene/RibbonScene.tsx` — the same: `loadPhoto` takes
  `onLoad`, the scene passes `invalidate`. `GallerySpike.tsx` — the grips
  loop writes the DOM only on change.
- **`resize={{ scroll: false }}`** on every canvas — `RibbonScene`,
  `WaterScene` and the project's `SceneCanvas` (`src/three/components/`):
  the canvas never takes the pointer (CLAUDE.md), so its scroll position is
  of no use to it.
- `spikes/hero-stone/passage/PassageScene.tsx` + `HeroStoneSpike.tsx` —
  the film's canvas is `frameloop="never"`: `apply(t)` writes the timeline
  and then `advance()`s the scene in the same tick (383 draws for 405
  ticks; DOM and canvas in the same rAF), and only while the layer can be
  seen (`t` in (0.02, 1)). The layer is hidden by `opacity` alone, never
  `visibility` (`.hs__passage`). The transition HUD samples t at 10 Hz
  instead of on every write. The pointer loop writes on change only.
- `spikes/flow/FlowSpike.tsx` — the rooms' readouts (`onTurn`, `onState`,
  the blends' progress) live in a ref and become React state only for
  `?hud=1`; before, every scroll frame of every room re-rendered the whole
  page and, through it, every canvas.
- `spikes/full/FullSpike.tsx` — `--bar` is written on `.flowbar`, the one
  element that reads it.
- `src/hooks/useMediaQuery.ts` — one subscribe function per query
  (`useSyncExternalStore` re-subscribed on every render).
- `spikes/perf/PerfHud.tsx` — **`?perfDebug=1`** on the full page: fps,
  frame time (p50 / max), ScrollTriggers (pins), canvases, transition
  state, lock, tier, DPR, heap. Refs and text nodes, never state.

### Ownership, by state of the gateway (`passageGateway.ts`)

| state | page scroll | transition progress t | the film's canvas |
| --- | --- | --- | --- |
| `armed` / `released` (at a rest) | Lenis, from wheel / touch / keys / scrollbar | nothing writes t (the pin's progress is 0 or 1) | idle, no loop |
| `playing` | held: gestures swallowed in capture; the document sits on `start` (t < 0.12) then `end`, moved once by `moveTo` under the opaque cover; a stray scroll is put back | ONE tween on the film's clock → `write(t)` → `apply(t)`: the paused timeline, the canvas, `onPassage` | drawn by `apply` on the same tick, while visible |
| between the rests, free (a dragged scrollbar, a deep link) | Lenis | the pin's `onUpdate` → `sync(t)` (the only other writer, and only while not locked) | drawn by `apply` |

One Lenis (`ScrollProvider`), on `gsap.ticker`; `ScrollTrigger.update()`
on its scroll event (ScrollTrigger's own scroll listener also schedules a
`_sync`, a second, change-less pass). Permanent rAF loops on the page:
GSAP's ticker (GSAP + Lenis), ScrollTrigger's empty `_rafBugFix`, the
hero's pointer loop (writes on change only), the archive's two grip loops
(writes on change only; `setBox` bails out on equal state). R3F's loop
runs only while a root has frames pending or is `always` (the two far
scenes, only within a viewport of their section — `near`).

### Measured (MacBook Pro M4, Chrome, 1440 × 900, DPR 2)

|  | before | after |
| --- | --- | --- |
| film, dev — worst frame | 1 216 / 1 500 / 1 616 ms (three runs) | 17 ms in all five cycles, both ways |
| film, packaged bundle — fps · p99 · worst | 57.5 · 33 ms · 33–50 ms | 60.1 · 16.8 ms · 17 ms (three cycles, both ways) |
| reverse film — worst frame | 1 133–3 366 ms | 17 ms |
| GPU per frame during the film | passage 7.2 ms + water 9.4 ms (+ archive once, with uploads) | passage 5.1 ms; water 0, archive 0 |
| React commits at the hero, idle | 3 per frame (Sitting, 120 renders/s) | 0 |
| film canvas draws per tick | every other (193 / 405) | every (383 / 405) |
| ScrollTriggers · canvases · window listeners · heap over 5 cycles | 30 · 3 · 107 · 57 MB | 30 · 3 · 104 · 57 → 58 MB (stable) |
| the whole page down and up, by the scroller | — | 59.4 / 60 fps, worst 83 / 17 ms (the 83 in a handoff window — see Remaining) |

The packaged bundle's own load is 1–2 s of main-thread work (script and
inlined assets) before anything can be scrolled — that is the artifact
packaging, not the page.

### Proofs

`e2e/spike-full.stress.mjs` (5× Hero ⇄ Манифест: fps, worst frame, no
frame over 100 ms, the lock released at both rests, ScrollTrigger /
canvas / listener / heap counts stable; then the whole page down and up
once), `e2e/spike-full.perf.mjs` (the phases A–E and the reverse, rAF
sources, long tasks, `trace` for a Chrome trace), `e2e/spike-full.gpu.mjs`
(per-canvas GPU time, draws and uploads through the film),
`e2e/spike-full.prod.mjs` (the packaged bundle on `vite preview`). All
existing proofs pass: `spike-full.mjs`, `spike-hero-stone.gateway.mjs`,
`spike-hero-stone.input.mjs`, `spike-flow.handoff.mjs` (t820's wall check
is the known timing flake, passes on rerun), `npm run test:e2e` (55),
`typecheck`, `lint`, `build`.

### Remaining

- The page-level blends (`--seam-k`, `--a-reach`, … on `.flowpage`) are
  the same pattern as `--bar`: a custom property written on the page root
  on every scroll frame of a handoff window. Not on the Hero → Манифест
  path; worth moving onto their consumers (`.radial__exit`, the veils) in
  the same way if the handoffs ever show style-recalc cost.
- `useChapterTriggers` reads every room's rect on every scroll update
  (cheap while layout is clean; measured negligible).
- A programmatic scroll that lands INSIDE the hero pin (the way up from
  Услуги by an eased `scrollTo` past the manifesto's rest) shows a
  mid-film frame — the pin's scrollbar fallback, by design; the wheel and
  touch paths cannot do this.

## Стоимость — the real price list, 2026 (29.09)

The layer's placeholder rows are gone; it renders the clinic's own 2026 list
from one source, `src/data/priceList.ts` (typed `PriceCategory → PriceGroup →
PriceItem / PriceNote` in `src/types/content.ts`). 7 categories, 116 priced
items, 125 source lines including notes. Only typography is normalised
(`formatRub` / `formatRubRange`, `ru()`, sentence case for all-caps
headings, brand names as written).

- **Structure:** one `<table>` per category under a numbered serif head
  (03.1–03.7); groups are row groups; one level of nesting (Morpheus8 → Тело,
  Lumecca → Локальные зоны, ROBOLEX → Курс). The meta column (duration ·
  course) is dropped — durations stay in the source's names.
- **Index:** buttons, not `#` anchors (the layer treats every `#` link as a
  way out). Desktop: a vertical sticky list in the empty left rail (a
  zero-height sticky box — it never covers the column). Phone: one sideways
  rail under the bar that follows the current category.
- **Notes:** gifts and offers are mono secondary lines with a kicker
  («подарок» / «предложение») and a 1 px champagne tick; «Хит» is a 1 px
  outlined mono mark. No banners.
- **Proof:** `e2e/spike-flow.pricing.mjs` opens the layer from the menu at
  1440 and 390 and compares every rendered line against the source, in
  order (0 mismatches), plus index jump, price-beside-name, no overflow.
- `src/data/pricing.ts` (format examples) now feeds only the wireframe's
  `src/sections/Pricing`, untouched until integration.

## Pass 13 — the header's CTA, and a stability pass (06.10.2026)

**CTA.** Both headers' CTA — the hero's capsule (`.hh__cta`) and the bar's
(`.flowbar__cta`) — now read «Стоимость» and point at `#pricing`, which the
page's delegated handler turns into the price layer (the page never moves;
Esc / Back close it). Стоимость stays out of the vertical page.

**Кейсы, images gone on the way back — fixed.** R3F resets a root's clock to
0 whenever the page switches its frameloop (parked `demand` → `always`). The
archive's `dt = Math.min(0.05, t − last)` let the large negative step through;
the hover easing `1 − exp(−dt·9)` overflowed to NaN and every sheet's scale
became NaN for good — only the rail (which does not read it) was left. `dt` is
clamped to [0, 0.05]. The water keeps its own accumulated time for the same
reason.

**After Основатель — the hidden water.** Once the founder's room has the
wall (`--hand` 1) Специалисты is at opacity 0, yet the water drew a full
screen every frame under the read (≈ 10 ms GPU through the read, 18 ms avg /
55 ms max across Основатель → Отзывы). It is parked (`demand`) from that
moment (a coarse state, two changes per passage) and wakes as the hand
returns.

**Page-root writes.** All four scrubbed blends wrote their variables on
`.flowpage`, restyling the whole page on every scroll frame of every blend.
Each timeline now writes only on the elements that paint it; the tones
derived from those variables are declared there too. Pixel-identical
(A/B at each blend's midpoint: Δ ≤ 1). Style-recalc time over one traversal
2.6 s → 1.1 s. The founder's unused `--o` write is gone; `--k-band` is written
on the band; the room's writes skip unchanged values.

**Отзывы → Адрес.** Turning the page of the reviews (also by HOVER on the
index — the pointer resting on it while the wheel scrolls) changed the
section's height, and the page's ResizeObserver ran a full
`ScrollTrigger.refresh()` (≈ 30 ms, every pin re-measured) under the scroll.
Where the index stands beside the voice (≥ 1280) every voice is laid out
unseen in the same cell, so the frame is as tall as the longest and the
height never changes; below 1280 (the index under the voice) the layout is
as before.

**Proofs.** `e2e/spike-full.handoffs.mjs` (frames by scroll range, GPU ms per
canvas, React commits, long tasks, ScrollTrigger / canvas / heap per
checkpoint; real wheel, N cycles) and `e2e/spike-full.handoffs.trace.mjs`
(compositor side). `spike-flow.handoff.mjs` reads the blend values from their
consumers; `GPU=1` renders on Metal. `?perfDebug=1` adds the room under the
viewport's centre and each R3F scene's frameloop.
