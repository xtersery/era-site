---
name: premium-web-design
description: >-
  Art direction for this project — a high-end aesthetic medicine clinic.
  Editorial composition, typography, visual rhythm, intentional asymmetry,
  premium whitespace, sophisticated contrast, immersive hero sections and a
  distinctive visual identity. Defines the concept-first process and the
  specific things this site must not look like. Use before designing any page,
  section or component, and when reviewing whether visual work clears the bar.
---

# Premium web design — this project's art direction

This skill **overrides** `frontend-design`, `taste-skill` and `scroll-craft`
wherever they conflict. Those carry general craft; this carries the brief.

---

## 1. Concept before pixels — mandatory

Before any markup, any layout, any colour:

**Write the visual concept in three or four sentences.** It must answer:

1. **What is the idea?** Not "clean and elegant" — that is a mood board caption,
   not a concept. A concept is a specific, arguable position: *"the site is
   structured like a print editorial: one full-bleed image per spread, text set
   in a narrow column that never centres, and the reader turns pages rather than
   scrolls a feed."*
2. **What is the one thing people will remember?** A site has one signature
   move. Name it. If you cannot, there is no concept yet.
3. **What is deliberately absent?** The restraint is the luxury. Name what you
   are refusing: no cards, no icons, no gradient buttons, whatever it is.
4. **Why this, for this clinic?** The concept has to connect to aesthetic
   medicine — precision, restraint, the body, light on skin, the passage of
   time, the idea of *era* — not to generic premium.

**Do not settle for the first idea.** Generate three genuinely different
directions, argue for and against each, then commit. The first idea is almost
always the average of everything in the training data, which is exactly what
this site must not be.

Once committed, the concept governs. Every later decision is checked against it,
not against "does this look nice".

---

## 2. What this must never look like

If any of these is recognisable in the output, it has failed:

- **A generic clinic site.** Stock smiling models, blue-and-white, a "Book a
  consultation" hero with a background photo and a centred headline, trust
  badges, a treatments grid of identical cards with icons.
- **A Tilda / Readymag / Webflow template.** Alternating image-left/image-right
  sections. A full-width centred hero followed by three feature columns
  followed by testimonials followed by a CTA band.
- **A SaaS landing page.** Gradient mesh backgrounds, a floating "product"
  screenshot with a drop shadow, pill buttons, 8px-radius cards on a light grey
  background, feature icon triplets, logo bar.
- **A beauty marketplace.** Price tags, star ratings, filter chips, "from
  ₽X,XXX", carousels of practitioners.
- **A beige medspa.** Cream background, thin gold serif capitals, a sprig of
  eucalyptus, `letter-spacing: 0.3em` on everything, an italic script word.
  This one is the most likely failure mode because it is what "premium clinic"
  looks like in the training distribution. Recognise it and refuse it.
- **A corporate landing page.** Sticky header with seven nav items, a hero with
  two buttons, sections with a small eyebrow label above every heading.

### Banned devices

Not because they are always wrong — because here they are a tell:

random glassmorphism · large rounded cards · pill buttons everywhere ·
purple/blue gradients · decorative blobs and floating shapes · predictable
alternating sections · icon-heavy layouts · drop shadows used as hierarchy ·
emoji · three-column feature grids · centred everything · "eyebrow label +
heading + paragraph" repeated for every section · stock photography ·
AI-generated faces or bodies (also: legally and ethically wrong for a clinic).

---

## 3. What to prioritise instead

### Editorial composition

Think spreads, not sections. A print editor asks: where does the eye enter,
where does it rest, where does it leave? Build each screen as a composition with
a clear entry point and a clear focal hierarchy — not as a container of
components.

- **Intentional asymmetry.** A 12-column grid exists so that things can sit at
  columns 2–7 and 9–12, not 1–12 and 1–12. Off-centre placement, deliberate
  imbalance held by a counterweight elsewhere. Symmetry is the safe default and
  it reads as generic.
- **Overlap and bleed.** Type that crosses an image edge, an image that runs off
  the viewport, a caption that hangs into the margin. This is what separates
  editorial from brochure.
- **Vary the rhythm.** Full-bleed, then a narrow column, then white space, then
  a tight pairing. If every section has the same vertical extent and the same
  internal structure, the page is a list.

### Typography

Typography *is* the identity here. Given the restraint this brief requires,
it is carrying most of the load.

- **Two families maximum.** One display face with real character for headlines,
  one quiet text face. A third is almost always a mistake.
- **Real scale contrast.** Display type at 6–10 rem against body at 1 rem. Timid
  scale contrast (h1 at 2.5rem) is the most common reason a layout looks
  amateur.
- **Set the details.** Negative tracking on large display type (−0.02 to
  −0.04em), tight leading on headlines (0.95–1.1), comfortable leading on body
  (1.5–1.65), measure capped at ~65–70 characters.
- **Never letterspace lowercase body text.** Wide tracking belongs on small
  caps and labels only, and even there, use it once.
- Hanging punctuation, real quotation marks, proper dashes, non-breaking spaces
  before units. These are invisible individually and obvious in aggregate.

### Whitespace

Premium whitespace is **large and uneven**. Generous space around one element
and tight space around another is composition. Uniform 80px padding everywhere
is a template.

Whitespace must feel like a decision. If a section could lose 40% of its
vertical space without changing anything, the space is padding, not silence.

### Contrast and colour

- Sophisticated contrast is **not** low contrast. Beige-on-beige is not
  subtlety, it is mush — and it fails WCAG.
- Work with a restrained palette: one deep neutral, one light ground, one
  accent that appears rarely enough to mean something. The accent earns its
  keep by scarcity.
- Dark passages against light ones create the rhythm. A site that is one
  brightness the whole way down is flat.
- Body text contrast ≥ 4.5:1, always. Non-negotiable — this is a medical
  business with an older client base.

### Imagery

- Imagery carries the premium feel more than any effect will. **Strong art
  direction on photography beats every shader on this list.**
- Real photography of the real clinic, real equipment, real light. Texture:
  skin, glass, water, stone, linen, light falling across a surface.
- Consistent treatment — one grade, one grain, one crop logic across the site.
  Inconsistent photography is the fastest way to look cheap.
- Full-bleed and large. A premium image at 400px wide in a card is not a
  premium image.
- No stock. No generated people. If the photography does not exist yet, design
  around its absence honestly and flag it.

### The hero

The hero is the concept, stated. It should be understandable in two seconds and
memorable in five.

- It must be **immersive** — but immersive means *committed*, not busy. A single
  full-bleed image with one line of type placed unexpectedly is immersive.
- It must be readable before anything loads. Type first, effect second.
- It must work in portrait on a phone as a *separate composition*, not as the
  desktop hero squeezed.

---

## 4. References in spirit

Look at: fashion editorial layout (Vogue Italia, Purple, Kinfolk), premium
skincare (Aesop, Augustinus Bader), luxury fragrance, gallery and museum sites,
experimental digital studios, Awwwards Site of the Day winners in the beauty and
architecture categories.

**Take structure, restraint and rhythm. Never take a brand's identity.** Do not
reproduce Aesop's typography, Chanel's layout or any recognisable house style.
The output must be its own thing.

---

## 5. The quality bar

For every screen, ask: **"Would this feel credible on Awwwards?"**

More usefully, ask the diagnostic questions:

- Could this be any other clinic's site if I swapped the logo? → **fail**
- Can I name the one thing someone would remember? → if not, **fail**
- Is there a moment of genuine surprise? → if not, it is competent, not premium
- Did I choose this, or is it the default? → check every value
- Does the restraint read as confidence, or as unfinished? → be honest
- Would a print art director sign off on this spread? → the real bar

---

## 6. Order of work

1. Concept — three directions, choose one, write it down.
2. Typography and scale — the identity, before any colour.
3. Grid and composition — the spread logic, in greyscale.
4. Colour and imagery treatment.
5. **Then** motion (`gsap-motion`), and only where it serves the concept.
6. **Then** WebGL (`react-three-fiber`, `webgl-shaders`), and only for the one
   signature moment.

Steps 5 and 6 do not rescue steps 1–4. A weak composition with a shader on it is
a weak composition with a shader on it. If the page is not good in greyscale
with no motion, stop and go back to step 1.

---

## 7. Working with the other skills

- **`design-dna`** — to extract structure from references and to define the real
  tokens. Feed the result into `src/styles/tokens/`.
- **`taste-skill`** — as a pre-flight quality gate. Its general landing-page
  conventions defer to this skill.
- **`scroll-craft`** — for scroll narrative, page grammar and the signature move.
- **`frontend-design`** — baseline craft. This skill is the ceiling.
