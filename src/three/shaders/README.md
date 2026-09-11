# Shaders

## Importing GLSL

No shader plugin is installed. Vite's built-in `?raw` suffix already does what
we need, and it keeps the build honest:

```ts
import vertexShader from '@three/shaders/lib/fullscreen.vert?raw';
import fragmentShader from '@three/scenes/Hero/hero.frag?raw';
```

Install `vite-plugin-glsl` **only** if `#include` composition becomes genuinely
painful. Until then, share GLSL by importing chunks and concatenating them —
see `lib/` and `compose.ts`.

## Layout

```
shaders/
  lib/        reusable GLSL chunks (noise, easing, colour, sdf) — no uniforms of their own
  compose.ts  string composition helper for #include-style reuse
```

Scene-specific shaders live next to the scene that owns them
(`three/scenes/<Scene>/<name>.vert|.frag`), not here. `lib/` is for GLSL that
more than one scene will genuinely use.

## Rules

- A shader is a cost, not a decoration. If CSS or GSAP can do it, they should.
- Keep the fragment shader cheap: it runs once per pixel per frame. Noise in a
  fragment shader on a full-screen quad at 2x DPR is a mobile frame-rate cliff.
- Prefer moving work to the vertex shader or to a uniform computed on the CPU.
- Every custom material declares its uniforms in one typed place — see
  `three/materials/shaderMaterial.ts`.
- Uniform names are `uCamelCase`, varyings are `vCamelCase`, attributes `aCamelCase`.
