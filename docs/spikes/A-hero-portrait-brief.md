# Spike A — test-only hero portrait · Higgsfield brief

**Status: authorised as a test asset, not a production asset.** One image. It exists to judge the
emotional criterion of the material on a real face; it is replaced by the production campaign
portrait later.

## Deliver to

`spikes/hero/assets/portrait-test.jpg` — the spike detects the file and uses it instead of the
procedural plate. Optional placement file `spikes/hero/assets/portrait-test.json`
(`{ "offsetX": 0.09, "offsetY": 0.02, "scale": 1.35 }` — fractions of the plate; tune from the HUD).

## Technical spec

- Aspect **3:2 landscape**, ≥ **3000 × 2000 px**, JPEG quality ≥ 90 (or PNG). No alpha.
- **Warm-neutral grade**, lifted blacks, fine grain retained. No colour cast on skin, no green.
- Composition (see the placement guide below): the **face contour** (cheek → jaw line) runs
  diagonally through the **centre-left** of the frame; the lit cheek occupies roughly the centre;
  **at least a third of the face stays outside** the lens footprint as a direct colour reference.
- Negative space on the left and bottom (graphite/green-black), so the lens has depth to sit in.

## The prompt

> Editorial beauty portrait, a woman about 45–50, sophisticated, mature, calm — three-quarter angle
> turning slightly away from camera, eyes open and soft, no smile, hair pulled back and controlled
> away from the jaw and cheek, bare neck and shoulders with a simple dark matte fabric at the
> collarbone, no jewellery. Hyperrealistic skin with natural texture — visible pores, fine lines, no
> retouching, no plastic smoothing. Lighting: one warm gold key light from upper left grazing the
> cheekbone and jaw, very restrained cool teal fill from the right, deep graphite green-black
> studio background falling to black on the left. Warm-neutral skin tone, no green cast on skin.
> Medium-format look, 85 mm, shallow depth of field, fine grain. Luxury skincare campaign, quiet,
> precise, feminine. 3:2.

**Negative:** smile to camera, stock photography, clinic, white coat, jewellery, glossy retouching,
plastic skin, sci-fi, neon, lens flare, green tint on skin, emerald, gold foil, text, watermark,
men, hands near face, makeup-ad gloss.

## Placement guide (why the composition matters)

The lens is a circle ≈ 46 % of the viewport height, centred ~30 % from the left, ~55 % down
(desktop 1440 × 900). The material can only be judged if:

1. the **jaw/cheek contour crosses the glass** — refraction of an edge is what reads as glass;
2. the **eye or cheekbone geometry is inside or at the edge** of the glass — enough information to
   see bending without distorting a whole face;
3. **part of the same skin is outside** the glass at the same exposure — the direct reference for
   the colour-shift measurement.

If the generated frame doesn't land there, don't regenerate — tune `portrait-test.json` from the
spike HUD (`?hud=1` shows the current offsets; arrow keys nudge, `S` copies the JSON).

## Checks after the rerun

`node e2e/spike-hero.capture.mjs` produces the hero still, the close-up crop
(`closeup-skin-A.png`: through glass vs outside, same scale), the interaction strips, posters,
the A/B/C same-portrait comparison and the diagnostics. The verdict is written against:
PREMIUM · SENSUAL · MINERAL · ARCHITECTURAL · ERA-SPECIFIC · SKIN STILL HUMAN · NOT SCI-FI ·
NOT GLASSMORPHISM · NOT EMERALD LUXURY · NOT A WEBGL DEMO.
