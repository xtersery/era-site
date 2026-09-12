---
name: gsap-motion
description: >-
  Implementation-level motion expertise with GSAP, @gsap/react and ScrollTrigger
  for premium editorial websites. Covers timelines, pinned sections,
  scroll-scrubbing, masked text reveals, clip-path and image reveals, parallax
  done well, horizontal scroll scenes, cinematic section transitions,
  interaction choreography, cleanup with gsap.context()/useGSAP, reduced-motion
  accessibility and mobile degradation. Use when building, reviewing or
  debugging any animation in this project.
---

# GSAP motion

## The principle that overrides everything

**Motion exists to create hierarchy, carry the story and signal quality.**
A page where everything animates has no hierarchy — it has noise. The visitor's
eye can only be led somewhere if most things stay still.

Rules of thumb:

- **One or two animated moments per section.** Not per element — per section.
- The thing that animates is the thing that matters. If the heading, the image,
  the caption, the button and the divider all fade up, none of them is the point.
- **Stillness is the default.** Earn each animation.
- Motion the visitor notices as *animation* has usually failed. Motion they
  experience as *the page feeling good* has succeeded.

### Banned by default

Overriding any of these requires an actual reason written in a comment:

- **Fade-up-on-scroll applied uniformly.** It is the single clearest tell of a
  template. If every block does it, delete it from every block.
- **Bounce, elastic, overshoot** on anything editorial. It reads as playful,
  cheap and dated. This is a clinic, not a toy.
- **Parallax with no idea behind it.** Moving a background 20% slower is not
  depth, it is drift. Parallax is justified when it separates *distinct planes*
  in a composed image.
- **Counters, typewriter text, marquee tickers** — unless the concept genuinely
  calls for one.
- **Animating everything on the page load.** The first screen should be
  composed and readable instantly; one deliberate entrance, not a cascade.
- **Long entrances.** Above ~800 ms an entrance stops feeling considered and
  starts feeling slow. Scrubbed motion is the exception — it is driven by the
  visitor.

---

## Setup in this project

Plugins are registered once, in `src/animations/gsap/register.ts`, called from
`src/main.tsx`. Never call `gsap.registerPlugin` anywhere else.

Available: **gsap core**, **ScrollTrigger**, **@gsap/react (`useGSAP`)** — and,
since GSAP 3.13 made every formerly Club plugin free, **Draggable**,
**InertiaPlugin**, **SplitText**, **Flip**, **CustomEase**, **DrawSVG**,
**MorphSVG** all ship inside the installed `gsap` package (`gsap/Draggable`,
`gsap/InertiaPlugin`, `gsap/SplitText`, …). Register only what a feature
actually uses, in `src/animations/gsap/register.ts`. `ScrollSmoother` is
available but **not adopted** — Lenis is the scroller. Use `SplitText` (3.13+)
for line splitting: it keeps screen-reader flow (`aria-label` on the parent,
`aria-hidden` on the pieces) without hand-written wrappers.

Durations, easings and staggers come from `src/styles/tokens/tokens.ts`. Do not
invent a new easing curve per component — a house curve is what makes a site
feel authored.

---

## Cleanup — `useGSAP`, always

React 19 StrictMode mounts twice in dev. Without cleanup you get doubled
timelines, doubled ScrollTriggers and motion that accelerates on every hot
reload.

```tsx
import { useGSAP } from '@gsap/react';

const container = useRef<HTMLElement>(null);

useGSAP(
  () => {
    // Every animation created in here is reverted automatically on unmount,
    // and selector strings are scoped to `container`.
    gsap.to('.line', { yPercent: 0, stagger: 0.06 });
  },
  { scope: container, dependencies: [someValue] },
);
```

- `useGSAP` wraps `gsap.context()` — it reverts tweens **and** kills
  ScrollTriggers created inside it.
- `{ scope }` means `'.line'` resolves inside the container only. Use it; global
  selector strings in a component are a bug waiting for a second instance.
- Anything created outside the callback (an event listener, an observer) still
  needs manual cleanup — return a function, or use `contextSafe` for handlers.
- For imperative code outside React, use `gsap.context()` directly and call
  `ctx.revert()`.

---

## Timelines

Build a timeline, not a pile of tweens. A timeline is readable, re-timeable and
reversible.

```ts
const tl = gsap.timeline({ defaults: { ease: ease.out, duration: duration.slow } });

tl.from(lines, { yPercent: 110, stagger: stagger.base })
  .from(image, { clipPath: 'inset(0 0 100% 0)' }, '-=0.5')   // relative offset
  .from(meta,  { opacity: 0 }, '<0.2');                       // start of previous + 0.2
```

- Position parameters (`'<'`, `'>'`, `'-=0.3'`, `'myLabel'`) are the whole point.
  Overlap is what makes a sequence feel choreographed instead of queued.
- `defaults` on the timeline keeps each tween to the property that matters.
- Use labels for anything with more than four steps.
- `tl.timeScale()` lets you tune the whole feel with one number while designing.

---

## ScrollTrigger

### Scrubbing

```ts
ScrollTrigger.create({
  trigger: section,
  start: 'top top',
  end: '+=150%',
  scrub: 1,        // seconds of catch-up smoothing; `true` = 1:1, often too twitchy
  pin: true,
  animation: tl,
});
```

- **`scrub: 1` beats `scrub: true`** for cinematic work — the slight lag reads
  as weight. `true` feels nervous.
- **`ease: 'none'` on scrubbed tweens.** Easing a scrubbed tween fights the
  visitor's input; the scroll *is* the easing.
- `end: '+=100%'` (viewport-relative) survives content changes better than a
  selector-based end.
- `invalidateOnRefresh: true` when tween values are computed from layout —
  otherwise they keep stale pixel values after a resize.

### Pinning

Pinning is the strongest tool here and the easiest to overuse.

- Pin **one** section per page, two at most. Every pinned section is a moment
  the visitor cannot scroll past — make it worth the toll.
- Pinning changes layout. Use `pinSpacing: true` (default) unless you have
  handled the space yourself, and expect `position: sticky` inside a pin to
  conflict.
- Keep the pinned duration short enough that a visitor scrolling normally clears
  it in 2–4 seconds. `end: '+=300%'` is a hostage situation.
- **Disable pinning on mobile** unless it has been tested there:
  `ScrollTrigger.matchMedia` / `gsap.matchMedia()`.

### Refresh discipline

- `ScrollTrigger.refresh()` after fonts load, images load, or the DOM height
  changes. Stale start/end values are the most common ScrollTrigger bug.
- Create triggers in DOM order, or call `ScrollTrigger.sort()`.
- With a smooth-scroll library, wire `scrollerProxy` — see
  `src/animations/scroll/smoothScroll.ts`.

---

## The house reveal vocabulary

Primitives live in `src/animations/gsap/timelines.ts`. Use them so motion reads
as one system.

### Masked line reveal — the display-type entrance

```html
<span class="line-mask"><span class="line">Aesthetic medicine</span></span>
```
```css
.line-mask { display: block; overflow: hidden; }
```
```ts
gsap.from('.line', { yPercent: 110, duration: 0.72, stagger: 0.06, ease: 'power3.out' });
```

Why this and not opacity: the mask implies the text was always there and is
being *revealed*, which reads as editorial. A fade reads as a web page loading.

Accessibility: keep the real sentence on the parent as text; if you split into
per-line spans, put `aria-label` on the parent and `aria-hidden="true"` on the
pieces so screen readers get one clean string.

### Clip-path image reveal

```ts
gsap.fromTo(img,
  { clipPath: 'inset(0 0 100% 0)' },
  { clipPath: 'inset(0 0 0% 0)', duration: 1.1, ease: 'power2.inOut' });
```

Add a counter-move on the inner image (`scale: 1.08 → 1`) so the frame reveals
*over* the photograph rather than sliding it. That counter-move is the
difference between cheap and considered.

### Parallax, when justified

Only between genuinely separate planes, and only small: 4–12% of the element's
height across the whole scroll. Anything larger detaches from the composition.

```ts
gsap.to(plane, { yPercent: -8, ease: 'none',
  scrollTrigger: { trigger: section, start: 'top bottom', end: 'bottom top', scrub: 1 } });
```

### Horizontal scroll scene

```ts
const track = trackRef.current!;
gsap.to(track, {
  x: () => -(track.scrollWidth - window.innerWidth),
  ease: 'none',
  scrollTrigger: {
    trigger: section, pin: true, scrub: 1,
    end: () => '+=' + (track.scrollWidth - window.innerWidth),
    invalidateOnRefresh: true,
  },
});
```

Function-based values + `invalidateOnRefresh` are mandatory here — hard-coded
widths break on every resize and on font load.

On mobile, a horizontal pin fights native scrolling. Either give it a real
swipeable carousel (`overflow-x: auto; scroll-snap-type: x mandatory`) or stack
it vertically. Do not ship a pinned horizontal scene to phones untested.

### Cinematic section transitions

Keep total out+in under ~900 ms. Never block first paint, never block the back
button. A clip/mask wipe at `--z-transition` is the house approach; a curtain
that fully covers the viewport for more than ~400 ms feels broken.

---

## Interaction choreography

- **Hover is desktop-only.** Gate it on `(hover: hover) and (pointer: fine)`.
  Coarse pointers get the hover state stuck on after a tap.
- Response to input should be **fast** (120–240 ms), entrances can be slower.
  An interaction that lags feels broken; an entrance that lingers feels
  intentional.
- `gsap.quickTo()` for pointer-tracked values — it reuses one tween instead of
  creating one per mousemove.
- Magnetic buttons, custom cursors, hover distortion: at most **one** such
  device on the whole site, and only if the concept asks for it. Two is a
  showreel, not a clinic.

---

## Reduced motion — non-negotiable

CSS is already handled by the global `@media (prefers-reduced-motion: reduce)`
block. **GSAP is not.** Every JS animation must branch.

```ts
useGSAP(() => {
  const mm = gsap.matchMedia();

  mm.add('(prefers-reduced-motion: no-preference)', () => {
    gsap.from(lines, { yPercent: 110, stagger: 0.06 });
  });

  mm.add('(prefers-reduced-motion: reduce)', () => {
    // Land in the final state. Never simply skip the tween — elements left in a
    // `from` state stay invisible, which is worse than any animation.
    gsap.set(lines, { yPercent: 0, opacity: 1, clearProps: 'transform' });
  });
}, { scope: container });
```

- `gsap.matchMedia()` handles cleanup between breakpoints automatically.
- Scrubbed scroll animations are the worst offenders for vestibular disorders.
  Under reduced motion, unpin and show the end state.
- `reducedMotionSettle()` in `timelines.ts` is the shared helper.

---

## Mobile degradation

Use one `gsap.matchMedia()` per component rather than scattering `isMobile` checks.

```ts
const mm = gsap.matchMedia();
mm.add('(min-width: 1024px)', () => { /* pinned, scrubbed, full choreography */ });
mm.add('(max-width: 1023px)', () => { /* simpler: no pin, shorter, fewer steps */ });
```

- **Mobile is not desktop scaled down.** Design the mobile motion separately —
  usually: no pinning, no horizontal scenes, shorter distances, fewer staggers.
- `100vh` changes when the browser chrome hides. Use `100dvh`, and set
  `ScrollTrigger.config({ ignoreMobileResize: true })` (already configured) so
  triggers do not refresh on every toolbar collapse.
- Animate `transform` and `opacity`. Animating `top`, `height`, `filter` or
  `box-shadow` triggers layout or paint every frame — on a phone that is a
  dropped-frame guarantee.
- `will-change` on the two or three elements that actually animate, removed
  afterwards. Applied broadly it exhausts GPU memory and makes things slower.

---

## Debugging

- `markers: true` on a ScrollTrigger shows start/end. Strip before shipping.
- `ScrollTrigger.getAll().length` climbing on navigation means cleanup is missing.
- Motion accelerating after hot reload means a timeline is being created twice —
  you skipped `useGSAP`.
- Jank on scrub: check whether the tweened property causes layout (it usually
  is), and check DPR if a canvas is involved.

## Checklist

- [ ] Created inside `useGSAP` with a `scope`.
- [ ] Duration, ease and stagger come from tokens.
- [ ] Fewer than three animated moments in this section.
- [ ] Scrubbed tweens use `ease: 'none'`.
- [ ] `invalidateOnRefresh` on anything with computed values.
- [ ] Reduced-motion branch lands in the final state.
- [ ] Separate, simpler mobile branch — and it was actually opened on a phone.
- [ ] `markers` removed.
- [ ] Only `transform` / `opacity` are animated per frame.
