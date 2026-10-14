"""Hero-on-stone asset preparation — the assets the live hero uses (14.10).

Reads docs/references/{stone.png, era-logo_3.png, era-logo.jpg} (all in Git);
writes into spikes/hero-stone/assets/ (or the folder given as the first argument):

    hero/onyx.{avif,webp}                    the illuminated onyx, the source's own size
    hero/emblem{,@phone}.{avif,webp}         the 3D emblem, alpha kept (desktop 1254 · phone 900);
                                             the imprint at the foot of Заявка reads the same files
    era-mark-ink.png                         the official mark for the header, ink, flat

One-off tooling (Python, not part of the build):

    python3.11 -m venv .venv-assets && .venv-assets/bin/pip install pillow numpy
    .venv-assets/bin/python scripts/hero-stone-assets.py [out-dir]

Earlier passes made more here — the rembg portrait cutout and its halo, the
continuous onyx slab, the composed hero plate, the gold mark, the old
manifesto ground. None of those is used by the site any more and their
sources are kept out of Git, so those steps were removed (14.10). The current
manifesto's assets come from `scripts/manifest-gold.py`.
"""

import sys

import numpy as np
from PIL import Image, ImageFilter

REF = 'docs/references/'
OUT = (sys.argv[1].rstrip('/') + '/') if len(sys.argv) > 1 else 'spikes/hero-stone/assets/'

# --- the official mark for the header: the gold isolated from the reference's
# green field and refilled flat (ink on light) — never refracted.
logo = Image.open(REF + 'era-logo.jpg').convert('RGB')
lg = np.asarray(logo).astype(np.float32) / 255
# gold vs the green field: red dominates the mark, green dominates the ground
mark = np.clip((lg[..., 0] - lg[..., 1] * 0.55 - 0.08) * 5.0, 0, 1)
mark_img = Image.fromarray((mark * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(0.8))
ys_, xs_ = np.where(np.asarray(mark_img) > 40)
pad = 24
box = (max(0, xs_.min() - pad), max(0, ys_.min() - pad), min(logo.width, xs_.max() + pad), min(logo.height, ys_.max() + pad))
mark_img = mark_img.crop(box)
side = max(mark_img.size)
square = Image.new('L', (side, side), 0)
square.paste(mark_img, ((side - mark_img.width) // 2, (side - mark_img.height) // 2))
square = square.resize((512, 512), Image.LANCZOS)
ink = Image.new('RGBA', (512, 512), (13, 12, 11, 0))
ink.putalpha(square)
ink.save(OUT + 'era-mark-ink.png', optimize=True)
print('mark', box)

# --- the illuminated onyx (stone.png, as is — resized only) and the 3D emblem
# (era-logo_3.png, alpha kept, WebP for the web).
onyx = Image.open(REF + 'stone.png').convert('RGB')
emblem = Image.open(REF + 'era-logo_3.png').convert('RGBA')

# --- the hero's own delivery (14.10, performance pass): AVIF first, WebP for
# the browsers without it — every file straight from the source, never from
# another lossy file. The onyx at the source's own size (1672 × 941): the old
# 2400 px JPEG was an upscale (bytes, no detail), and the phone shows a
# portrait crop of the full height, so it needs every source pixel too — one
# file for both. The emblem: the source size for the desktop (≈ 720 css px at
# 2×), 900 px for the phone (≈ 300 css px at 3×). Qualities chosen on 5×
# crops of the darkest onyx and the emblem's glass edge: no banding, no blocks;
# below q72 the onyx's fine veins soften.
H = OUT + 'hero/'
import os
os.makedirs(H, exist_ok=True)
onyx.save(H + 'onyx.avif', quality=75, speed=4)
onyx.save(H + 'onyx.webp', quality=88, method=6)
emblem.save(H + 'emblem.avif', quality=74, speed=4)
emblem.save(H + 'emblem.webp', quality=88, method=6)
phone_emblem = emblem.resize((900, 900), Image.LANCZOS)
phone_emblem.save(H + 'emblem@phone.avif', quality=74, speed=4)
phone_emblem.save(H + 'emblem@phone.webp', quality=88, method=6)
print('onyx', onyx.size, 'emblem', emblem.size, '->', sorted(os.listdir(H)))
