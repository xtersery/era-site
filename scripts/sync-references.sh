#!/usr/bin/env bash
#
# Clone (or refresh) the read-only reference repositories under .references/.
#
# .references/ is git-ignored on purpose: it is ~300 MB of third-party source
# that Claude Code reads as knowledge. It is never committed and never edited.
#
#   npm run refs:sync
#
set -uo pipefail

REF_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)/.references"
mkdir -p "$REF_DIR"
cd "$REF_DIR"

fail=0

retry_clone() {
  local dir="$1"; shift
  for attempt in 1 2 3 4; do
    if git clone "$@" "$dir"; then
      return 0
    fi
    echo "  retry $dir (attempt $attempt)" >&2
    sleep $((2 ** attempt))
  done
  echo "  FAILED: $dir" >&2
  fail=1
  return 1
}

sync_repo() {
  local url="$1" dir="$2"
  if [ -d "$dir/.git" ]; then
    echo "==> updating $dir"
    (cd "$dir" && git fetch --depth 1 origin && git reset --hard "@{upstream}" >/dev/null) \
      || { echo "  FAILED to update $dir" >&2; fail=1; }
  else
    echo "==> cloning $dir"
    retry_clone "$dir" --depth 1 --single-branch "$url"
  fi
}

# three.js ships ~1 GB of example assets; take only what is useful as reference.
sync_threejs() {
  local dir="threejs"
  if [ -d "$dir/.git" ]; then
    echo "==> updating $dir"
    (cd "$dir" && git fetch --depth 1 origin && git reset --hard "@{upstream}" >/dev/null) \
      || { echo "  FAILED to update $dir" >&2; fail=1; }
    return
  fi
  echo "==> cloning $dir (sparse)"
  if retry_clone "$dir" --depth 1 --single-branch --filter=blob:none --sparse \
      https://github.com/mrdoob/three.js.git; then
    (cd "$dir" && git sparse-checkout set docs src examples/jsm manual)
  fi
}

sync_repo https://github.com/zanwei/design-dna.git             design-dna
sync_repo https://github.com/Leonxlnx/taste-skill.git          taste-skill
sync_repo https://github.com/nateherkai/scroll-craft.git       scroll-craft
sync_repo https://github.com/anthropics/skills.git             anthropics-skills
sync_repo https://github.com/pmndrs/react-three-fiber.git      react-three-fiber
sync_repo https://github.com/pmndrs/drei.git                   drei
sync_threejs

echo
if [ "$fail" -ne 0 ]; then
  echo "Some repositories failed to sync. See errors above." >&2
  exit 1
fi
echo "References ready in $REF_DIR"
