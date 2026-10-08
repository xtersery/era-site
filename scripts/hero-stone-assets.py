"""Hero-on-stone asset preparation — the portrait cutout, its halo, the wall.

Reads docs/references/{hero-woman.png, hero-onyx-bg.png}; writes spikes/hero-stone/assets/.
One-off tooling (Python, not part of the build):

    python3.11 -m venv .venv-assets && .venv-assets/bin/pip install pillow numpy "rembg[cpu]"
    .venv-assets/bin/python scripts/hero-stone-assets.py

The matte comes from rembg's `birefnet-portrait` (isnet-general-use and
u2net_human_seg were compared: both leave a green fringe in the hair).
"""

import numpy as np
from PIL import Image, ImageEnhance, ImageFilter
from rembg import new_session, remove

REF = 'docs/references/'
OUT = 'spikes/hero-stone/assets/'

src = Image.open(REF + 'hero-woman.png').convert('RGB')
W, H = src.size
rgb = np.asarray(src).astype(np.float32) / 255
a = np.asarray(remove(src, session=new_session('birefnet-portrait'), only_mask=True, post_process_mask=False).convert('L')).astype(np.float32) / 255

# --- 1. matte refinement: tighten the soft edge slightly (gamma), kill stray specks
a = np.clip((a - 0.02) / 0.96, 0, 1) ** 1.15

# --- 2. despill: in the soft edge, the original grey-green backdrop bleeds in.
# Pull green down to the mean of R,B where it dominates, weighted by edge softness.
edge_w = 1 - np.abs(a * 2 - 1)            # 1 at a=0.5, 0 at 0/1
edge_w = np.clip(edge_w * 1.6, 0, 1)
g_excess = np.clip(rgb[..., 1] - (rgb[..., 0] + rgb[..., 2]) / 2, 0, None)
rgb[..., 1] -= g_excess * edge_w * 0.9

# --- 3. light wrap: the backlit ivory wall wraps her contour. A band inside the
# silhouette (alpha eroded vs alpha) is blended toward warm ivory.
a_img = Image.fromarray((a * 255).astype(np.uint8))
a_blur = np.asarray(a_img.filter(ImageFilter.GaussianBlur(6))).astype(np.float32) / 255
wrap = np.clip((a - a_blur) * 2.2, 0, 1) * a        # inner side of the contour only
wrap = np.asarray(Image.fromarray((wrap * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(2))).astype(np.float32) / 255
ivory = np.array([0.94, 0.90, 0.82], dtype=np.float32)
# stronger on the lit (right) side of her, weaker on the shadow side — the wall glows behind
xs = np.linspace(0, 1, W, dtype=np.float32)[None, :, None]
side = 0.55 + 0.45 * xs
rgb = rgb * (1 - wrap[..., None] * 0.22 * side) + ivory * (wrap[..., None] * 0.22 * side)

# --- 4. grade toward the wall: a touch warmer in the mids, shadows lifted a hair
rgb = np.clip(rgb, 0, 1)
rgb[..., 0] *= 1.015
rgb[..., 2] *= 0.985
rgb = np.clip(rgb, 0, 1)

out = np.concatenate([rgb, a[..., None]], axis=2)
cut = Image.fromarray((out * 255).astype(np.uint8), 'RGBA')
# crop to her bounds (she touches the left/top/bottom edges of the plate)
ys_, xs_ = np.where(a > 0.01)
x1 = min(W, xs_.max() + 8)
cut = cut.crop((0, 0, x1, H))
cut.save(OUT + 'portrait.webp', quality=90, method=6)

print('portrait', cut.size)

# --- 5. halo: her original surroundings (green marble, its light) as a wide,
# feathered plate — multiplied over the stone it becomes the shadow zone around her.
dil = a_img.filter(ImageFilter.MaxFilter(51)).filter(ImageFilter.GaussianBlur(70))
dil = np.asarray(dil).astype(np.float32) / 255
halo_a = np.clip(dil * (1 - a) * 1.25, 0, 1)
# feather the plate's own borders (top, right) so the halo never shows an edge
yy = np.linspace(0, 1, H, dtype=np.float32)[:, None]
xx = np.linspace(0, 1, W, dtype=np.float32)[None, :]
feather = np.clip(yy * H / 160, 0, 1) * np.clip((1 - xx) * W / 160, 0, 1)
halo_a *= feather
halo_rgb = np.asarray(src).astype(np.float32) / 255
halo_rgb = np.asarray(Image.fromarray((halo_rgb*255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(6))).astype(np.float32)/255
halo = np.concatenate([halo_rgb, halo_a[..., None]], axis=2)
halo_img = Image.fromarray((halo * 255).astype(np.uint8), 'RGBA').crop((0, 0, x1, H))
halo_img = halo_img.resize((x1 // 2, H // 2), Image.LANCZOS)
halo_img.save(OUT + 'halo.webp', quality=80, method=6)
print('halo', halo_img.size)

# --- 6. the onyx field: the reference (hero-onyx-bg.png, one continuous slab —
# no tiles) upscaled a little for 2x desktop, contrast eased a hair. Its own green
# mineral band on the left is where she stands; the luminous ivory holds the copy.
wall = Image.open(REF + 'hero-onyx-bg.png').convert('RGB')
wall = wall.resize((2400, round(2400 * wall.height / wall.width)), Image.LANCZOS)
wall = ImageEnhance.Contrast(wall).enhance(0.97)
wall.save(OUT + 'onyx.jpg', quality=88, optimize=True, progressive=True)
wall.resize((1200, round(1200 * wall.height / wall.width)), Image.LANCZOS).save(OUT + 'onyx@phone.jpg', quality=84, optimize=True)
print('onyx', wall.size)

# --- 7. the official mark for the header: the gold isolated from the reference's
# green field and refilled flat (ink on light, gold on dark) — never refracted.
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
for name, rgb in (('era-mark-ink.png', (13, 12, 11)), ('era-mark-gold.png', (207, 175, 114))):
    out_img = Image.new('RGBA', (512, 512), rgb + (0,))
    out_img.putalpha(square)
    out_img.save(OUT + name, optimize=True)
print('mark', box)

# --- 8. the composed hero plate (pass 6): the reference as is — resized only,
# no grading, no crop. Desktop 2400 px, phone 1200 px.
plate = Image.open(REF + 'hero-photo.png').convert('RGB')
plate.resize((2400, round(2400 * plate.height / plate.width)), Image.LANCZOS).save(OUT + 'hero.jpg', quality=90, optimize=True, progressive=True)
plate.resize((1200, round(1200 * plate.height / plate.width)), Image.LANCZOS).save(OUT + 'hero@phone.jpg', quality=86, optimize=True)
print('hero plate', plate.size)

# --- 9. pass 9: the illuminated onyx (stone.png, as is — resized only) and the
# 3D emblem (era-logo_3.png, alpha kept, WebP for the web).
onyx = Image.open(REF + 'stone.png').convert('RGB')
onyx.resize((2400, round(2400 * onyx.height / onyx.width)), Image.LANCZOS).save(OUT + 'onyx-tiles.jpg', quality=90, optimize=True, progressive=True)
onyx.resize((1200, round(1200 * onyx.height / onyx.width)), Image.LANCZOS).save(OUT + 'onyx-tiles@phone.jpg', quality=86, optimize=True)
emblem = Image.open(REF + 'era-logo_3.png').convert('RGBA')
emblem.save(OUT + 'emblem.webp', quality=92, method=6)
emblem.resize((720, 720), Image.LANCZOS).save(OUT + 'emblem@phone.webp', quality=90, method=6)
print('onyx', onyx.size, 'emblem', emblem.size)

# --- 10. pass 11: the manifesto ground (manifest-bg.png, as is — resized only).
mf = Image.open(REF + 'manifest-bg.png').convert('RGB')
mf.resize((2400, round(2400 * mf.height / mf.width)), Image.LANCZOS).save(OUT + 'manifest-bg.jpg', quality=90, optimize=True, progressive=True)
mf.resize((1200, round(1200 * mf.height / mf.width)), Image.LANCZOS).save(OUT + 'manifest-bg@phone.jpg', quality=86, optimize=True)
print('manifest', mf.size)
