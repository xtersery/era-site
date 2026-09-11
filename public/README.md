# public/

Served verbatim at the site root. Nothing here is processed, hashed or
optimised by Vite — anything that *should* be optimised belongs in `src/assets`
and must be imported.

```
images/    hero and editorial imagery (AVIF/WebP + fallback, responsive sizes)
video/     .mp4 / .webm — NOT committed (see .gitignore); host on a CDN
models/    .glb only, Draco- or Meshopt-compressed
textures/  KTX2/Basis where supported, otherwise compressed WebP
fonts/     .woff2 only, subset to the glyphs actually used
```

Budgets (see `.claude/skills/web-performance`):
- hero image ≤ 250 KB after compression,
- any single `.glb` ≤ 2 MB,
- any single texture ≤ 1024x1024 unless it is demonstrably visible,
- at most two preloaded font faces.
