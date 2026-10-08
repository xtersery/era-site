"""Manifesto ground — the slab strip derived from docs/references/manifest-ref.png.

The reference is NOT used as a background bitmap. Only its left quarter — the
three illuminated onyx slabs — becomes a narrow texture (`slabs.webp`); the
field to its right is CSS (gradients + a noise tile) in `hero-stone.css`.
One-off tooling (Python, not part of the build):

    python3.11 -m venv .venv-assets && .venv-assets/bin/pip install pillow numpy
    .venv-assets/bin/python scripts/manifest-assets.py
"""

import numpy as np
from PIL import Image

REF = 'docs/references/manifest-ref.png'
OUT = 'spikes/hero-stone/assets/'

src = Image.open(REF).convert('RGB')
W, H = src.size

# --- 1. the strip: the three slabs (seams at x ≈ 162 and 390) and the start of the veil
CUT = 560
strip = np.asarray(src.crop((0, 0, CUT, H))).astype(np.float32) / 255

# --- 2. restraint: the reference's leftmost slab has near-black mineral clouds;
# the brief asks for low-contrast variation and no black areas. Lift the shadows
# with a soft toe (luminance-preserving); then (pass 16) quieter and cooler, to
# sit on the Services tone (#ece8df): contrast compressed toward the field's
# luminance, 40 % of the saturation out, the gold pulled toward greige.
lum = strip @ np.array([0.299, 0.587, 0.114], dtype=np.float32)
lifted = 0.42 + lum * 0.62                     # 0 → 0.42, 1 → 1.04
k = np.clip(1 - lum / 0.55, 0, 1) ** 1.6       # only the dark end moves
target = lum * (1 - k) + lifted * k
gain = np.where(lum > 1e-4, target / np.maximum(lum, 1e-4), 1)[..., None]
out = np.clip(strip * gain, 0, 1)
grey = (out @ np.array([0.299, 0.587, 0.114], dtype=np.float32))[..., None]
out = np.clip(grey + (out - grey) * 0.60, 0, 1)          # saturation
FIELD = 0.905                                              # the luminance of #ece8df
out = np.clip(FIELD + (out - FIELD) * 0.78, 0, 1)          # contrast, about the field
out = np.clip(out * np.array([0.985, 0.995, 1.02], dtype=np.float32), 0, 1)  # a touch cooler

img = Image.fromarray((out * 255 + 0.5).astype(np.uint8))
img.save(OUT + 'slabs.webp', quality=88, method=6)
img.resize((CUT // 2, H // 2), Image.LANCZOS).save(OUT + 'slabs@phone.webp', quality=84, method=6)
print('slabs', img.size, 'lum min', float(grey.min()), 'mean', float(grey.mean()))

# --- 3. a noise tile against gradient banding: 8-bit grey, tiled at 3–4 % opacity
rng = np.random.default_rng(7)
n = rng.normal(0.5, 0.16, (256, 256)).clip(0, 1)
Image.fromarray((n * 255).astype(np.uint8), 'L').save(OUT + 'grain.png', optimize=True)
print('grain 256')
