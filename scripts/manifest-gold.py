"""Манифест on forest — web exports of the client's finished assets (14.10, pass 2).

The client supplied the wall and the gold objects ready-made (the gold
already cut out on alpha), so nothing is keyed or re-toned here: the walls are
re-encoded at their own size.

The filigree net (14.10, replaces the drapery) is exported LOSSLESSLY and
untouched — no colour, contrast or alpha change, only the empty transparent
margin cropped — so the gold stays the client's cold champagne pixel for pixel.

The ginkgo (14.10, v2 — replaces the first flower) is the supplied file as
is: cropped to its visible box (alpha >= 8), alpha kept lossless, colour
lossy at q92 for the phone's weight (mean colour shift < 0.4/255); the
interior's alpha is NOT altered.

The sources (manifest-wall-src.png, manifest-wall-phone-src.png,
manifest-gold-ginkgo-v2-src.png, manifest-gold-filigree-src.png — the
client's originals) are kept OUT of Git; the WebP exports are the committed runtime
assets. To re-export, put the originals in a folder and:

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


def ginkgo(name, dest):
    im = Image.open(f'{src}/{name}').convert('RGBA')
    al = np.asarray(im)[..., 3]
    ys, xs = np.where(al >= 8)
    im = im.crop((xs.min(), ys.min(), xs.max() + 1, ys.max() + 1))
    im.save(f'{out}/{dest}', 'WEBP', quality=92, method=6, alpha_quality=100)
    print(dest, im.size)


def filigree(name, dest):
    im = Image.open(f'{src}/{name}').convert('RGBA')
    im = im.crop(im.getbbox())
    im.save(f'{out}/{dest}', 'WEBP', lossless=True, quality=100, method=6, exact=True)
    assert np.array_equal(np.asarray(Image.open(f'{out}/{dest}').convert('RGBA')), np.asarray(im))
    print(dest, im.size, 'lossless, pixel-identical')


wall('manifest-wall-src.png', 'mf-wall.webp')
wall('manifest-wall-phone-src.png', 'mf-wall@phone.webp')
ginkgo('manifest-gold-ginkgo-v2-src.png', 'gold-ginkgo-v2.webp')
filigree('manifest-gold-filigree-src.png', 'gold-filigree.webp')
