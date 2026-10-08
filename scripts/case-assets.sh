#!/usr/bin/env bash
# Real case photographs → web derivatives for the Cases archive (Spike C).
#
# Reads public/images/case*.{HEIC,JPG} (the clinic's originals, untouched);
# writes spikes/gallery/assets/case*.jpg in two tiers:
#   <name>.jpg        the open sheet   — 1280 px wide (or the original width, if smaller)
#   <name>@rail.jpg   the rail / phone —  800 px wide
#
# PRESENTATION ONLY. Format (HEIC → JPEG), orientation, crop and resize — the
# same operations a browser does with `object-fit` / `object-position`. No
# retouching, no enhancement, no colour work; nothing in the photograph moves.
#
#   case1, case4, case5   the clinic's own side-by-side diptychs (1 : 1) — kept whole
#   case2_*               shot with the patient lying down: both frames turned
#                         −90° so the face is upright, then ONE shared 4 : 5 crop
#                         (x 1456 · y 0 · 2570 × 3213 of the upright 5712 × 3213
#                         frame) around the lips, so «до» and «после» share a viewport
#   case3_*               3 : 4 as shot, both frames — the sheet's 4 : 5 cover
#                         crop is done in the material with one shared focus
#
# PRIVACY. sips copies the original's EXIF into every JPEG it writes — GPS,
# camera make/model, lens, dates, MakerNote. Every derivative is therefore
# passed through scripts/strip-image-meta.mjs (lossless: drops EXIF/XMP/IPTC
# and comments, keeps JFIF + the ICC profile, never re-encodes) and the run
# FAILS unless the --check pass finds nothing. Rotations are baked into the
# pixels (sips -r) before the strip, so no orientation tag is needed.
#
# macOS only (sips) + node. One-off tooling, not part of the build:
#   bash scripts/case-assets.sh
set -euo pipefail
IN=public/images
OUT=spikes/gallery/assets
TMP=$(mktemp -d)
mkdir -p "$OUT"

# emit <src> <dst-stem> [rotate] [crop: H W Y X]
emit() {
  local src=$1 stem=$2 rot=${3:-0}
  local work="$TMP/$stem.jpg"
  sips -s format jpeg -s formatOptions 100 "$src" --out "$work" >/dev/null
  if [ "$rot" != 0 ]; then sips -r "$rot" "$work" >/dev/null; fi
  if [ $# -ge 7 ]; then sips -c "$4" "$5" --cropOffset "$6" "$7" "$work" >/dev/null; fi
  local w h
  w=$(sips -g pixelWidth "$work" | awk 'END{print $2}')
  h=$(sips -g pixelHeight "$work" | awk 'END{print $2}')
  # resize by width, never upward: a 960 px original stays 960 px
  local open=1280 rail=800
  [ "$w" -lt "$open" ] && open=$w
  [ "$w" -lt "$rail" ] && rail=$w
  sips -s format jpeg -s formatOptions 88 --resampleWidth "$open" "$work" --out "$OUT/$stem.jpg" >/dev/null
  sips -s format jpeg -s formatOptions 84 --resampleWidth "$rail" "$work" --out "$OUT/$stem@rail.jpg" >/dev/null
  node scripts/strip-image-meta.mjs "$OUT/$stem.jpg" "$OUT/$stem@rail.jpg" >/dev/null
  echo "$stem  ← $(basename "$src")  ${w}×${h}  rot $rot"
}

emit "$IN/case1.HEIC"        case1
emit "$IN/case2_before.HEIC" case2-before -90 3213 2570 0 1456
emit "$IN/case2_after.HEIC"  case2-after  -90 3213 2570 0 1456
emit "$IN/case3_before.JPG"  case3-before
emit "$IN/case3_after.JPG"   case3-after
emit "$IN/case4.HEIC"        case4
emit "$IN/case5.HEIC"        case5
rm -rf "$TMP"
# gate: no derivative may leave this script with private metadata
node scripts/strip-image-meta.mjs --check "$OUT"/case*.jpg
ls -la "$OUT"
