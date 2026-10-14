"""Hero-on-stone asset preparation — the assets the live hero uses (14.10).

Reads docs/references/{stone.png, era-logo_3.png, era-logo.jpg} (all in Git);
writes into spikes/hero-stone/assets/ (or the folder given as the first argument):

    onyx-tiles.jpg · onyx-tiles@phone.jpg   the illuminated onyx (pass 9), resized only
    emblem.webp · emblem@phone.webp          the 3D emblem (pass 9), alpha kept
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
onyx.resize((2400, round(2400 * onyx.height / onyx.width)), Image.LANCZOS).save(OUT + 'onyx-tiles.jpg', quality=90, optimize=True, progressive=True)
onyx.resize((1200, round(1200 * onyx.height / onyx.width)), Image.LANCZOS).save(OUT + 'onyx-tiles@phone.jpg', quality=86, optimize=True)
emblem = Image.open(REF + 'era-logo_3.png').convert('RGBA')
emblem.save(OUT + 'emblem.webp', quality=92, method=6)
emblem.resize((720, 720), Image.LANCZOS).save(OUT + 'emblem@phone.webp', quality=90, method=6)
print('onyx', onyx.size, 'emblem', emblem.size)
