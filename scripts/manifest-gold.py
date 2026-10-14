"""Манифест on forest — web exports of the client's finished assets (14.10, pass 2).

The client supplied the wall and the two gold objects ready-made (the gold
already cut out on alpha), so nothing is keyed or re-toned here: the walls are
re-encoded at their own size, the gold gets its near-opaque interior (alpha
~252 in the source) made opaque so the wall never shows through the metal.

The sources (manifest-wall-src.png, manifest-wall-phone-src.png,
manifest-gold-sculpture-src.png, manifest-gold-flower-src.png — the client's
originals, ~11 MB) are kept OUT of Git; the four WebP exports are the
committed runtime assets. To re-export, put the originals in a folder and:

    .venv-assets/bin/python scripts/manifest-gold.py <sources> spikes/hero-stone/assets/manifest
"""
import sys
import numpy as np
from PIL import Image

src, out = sys.argv[1], sys.argv[2]


def wall(name, dest):
    im = Image.open(f'{src}/{name}').convert('RGB')
    im.save(f'{out}/{dest}', 'WEBP', quality=86, method=6)
    print(dest, im.size)


def gold(name, dest, height):
    im = Image.open(f'{src}/{name}').convert('RGBA')
    a = np.asarray(im).copy()
    al = a[..., 3].astype(np.float64)
    a[..., 3] = np.where(al > 235, 255, al).astype(np.uint8)
    im = Image.fromarray(a, 'RGBA')
    im = im.crop(im.getbbox())
    if im.height > height:
        im = im.resize((round(im.width * height / im.height), height), Image.LANCZOS)
    im.save(f'{out}/{dest}', 'WEBP', quality=88, method=6, alpha_quality=95)
    print(dest, im.size)


wall('manifest-wall-src.png', 'mf-wall.webp')
wall('manifest-wall-phone-src.png', 'mf-wall@phone.webp')
gold('manifest-gold-sculpture-src.png', 'gold-drape.webp', 1400)
gold('manifest-gold-flower-src.png', 'gold-ginkgo.webp', 1100)
