---
name: webgl-shaders
description: >-
  GLSL shader technique for creative web effects — vertex and fragment shaders,
  uniforms, noise, displacement, refraction, distortion, image transitions,
  liquid effects, procedural gradients, Fresnel, and mouse- or scroll-reactive
  materials. Includes the cost model for deciding when a shader is worth it and
  how to keep it affordable on mobile. Use when writing, reviewing or optimising
  any GLSL in this project.
---

# WebGL shaders

## When a shader is the right answer

A shader is the most expensive tool in the box and the easiest to use for
decoration. Before writing one:

1. **Can CSS do it?** `filter`, `backdrop-filter`, `mask-image`, blend modes,
   `clip-path`, gradients, `mix-blend-mode`. Usually yes, and free.
2. **Can GSAP do it?** Anything about timing and choreography.
3. **Does it need per-pixel or per-vertex maths?** Real refraction, noise-driven
   displacement, light-dependent materials, a transition where the *mesh* of the
   image is what moves. Then yes — a shader.

A gradient that sits still is a CSS gradient. A "liquid" background that nobody
looks at is 16 ms a frame spent on nothing.

**The shader should be the idea, not the garnish.** One memorable shader-driven
moment beats five ambient ones, and costs a fifth as much.

---

## Project conventions

- GLSL is imported with Vite's built-in `?raw` — no plugin installed:
  ```ts
  import frag from './hero.frag?raw';
  import noise from '@three/shaders/lib/simplex2d.glsl?raw';
  ```
- Shared chunks live in `src/three/shaders/lib/`; scene-specific shaders live
  beside their scene. Compose with `composeShader()` from
  `src/three/shaders/compose.ts`.
- Materials are created through `createShaderMaterial()`
  (`src/three/materials/shaderMaterial.ts`), which gives typed uniforms.
- Naming: uniforms `uCamelCase`, varyings `vCamelCase`, attributes `aCamelCase`,
  constants `SCREAMING_CASE`.
- Every material carries the common uniforms — `uTime`, `uPointer`,
  `uResolution`, `uProgress` — so shared update code can drive any of them.

---

## The cost model

This is the part that decides whether the site works on a phone.

- **A fragment shader runs once per pixel, per frame.** At 1440×900 with DPR 2
  that is ~5.2 million invocations per frame, ~310 million per second at 60 fps.
- **A vertex shader runs once per vertex.** A 64×64 plane is 4,225 vertices.
  Three orders of magnitude cheaper.

Therefore:

1. **Move work up.** CPU (once per frame, in a uniform) → vertex shader (per
   vertex) → fragment shader (per pixel). Anything constant across the mesh is a
   uniform, not a per-pixel computation.
2. **Cut resolution before cutting the effect.** Halving DPR quarters fragment
   cost. `dprRange()` already caps this.
3. **Shrink the area.** A shader on a 400×500 card is ~7% of the cost of the
   same shader full-screen.
4. **Count your noise.** One `snoise()` call is ~50 ALU ops. Four octaves of
   fBm full-screen at DPR 2 is a mid-range Android frame budget on its own.
   Two octaves usually looks the same in motion.
5. **Avoid in fragment shaders:** `pow` in loops, `sin`/`cos` chains,
   normalising repeatedly, dynamic-length loops, branches that diverge across
   neighbouring pixels (`if` is cheap only when the whole warp agrees),
   texture reads with computed offsets (breaks cache).
6. **`texture2D` in a loop** (blur, chromatic aberration) multiplies cost by the
   sample count. A 9-tap blur is 9 full-screen texture reads.
7. **Precision:** `highp` in vertex shaders is fine; some mobile GPUs do not
   support `highp` in fragment shaders. Use `mediump` for colour and UV maths
   where you can, and test on a real device — precision bugs are invisible on
   desktop.

**Rule:** any full-screen fragment shader must be measured on a real mid-range
Android before it ships. Not an emulator.

---

## Vertex shaders

The cheap place to create form. Displacement, bending, wave motion, exploding
geometry, morphing.

```glsl
uniform float uTime;
uniform float uProgress;
varying vec2 vUv;
varying float vDisplacement;

void main() {
  vUv = uv;

  float n = snoise(uv * 3.0 + uTime * 0.15);
  vDisplacement = n;

  vec3 displaced = position + normal * n * 0.2 * uProgress;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(displaced, 1.0);
}
```

- Displacement needs geometry to displace: `planeGeometry args={[w, h, 64, 64]}`.
  Segments cost vertices — 64×64 is plenty for most screen-sized surfaces; 256×256
  is almost never justified.
- **Lighting breaks when you displace** unless you recompute normals. Either
  offset-sample the noise to derive a normal, or use a material that does not
  depend on normals.
- Pass values the fragment shader needs as varyings rather than recomputing them
  per pixel — that is the whole trick.

---

## Fragment shaders

### Procedural gradients

Genuinely better than CSS only when the gradient *moves* or reacts. Otherwise
use CSS.

```glsl
vec3 a = vec3(0.93, 0.92, 0.90);
vec3 b = vec3(0.11, 0.10, 0.09);
float t = smoothstep(0.0, 1.0, vUv.y + snoise(vUv * 2.0 + uTime * 0.05) * 0.15);
gl_FragColor = vec4(mix(a, b, t), 1.0);
```

Work in linear space and let three's tone mapping handle output, or colours will
band and look muddy.

### Noise and fBm

`snoise()` lives in `src/three/shaders/lib/simplex2d.glsl`.

```glsl
float fbm(vec2 p) {
  float v = 0.0, amp = 0.5;
  for (int i = 0; i < 3; i++) {      // fixed count — never a uniform loop bound
    v += amp * snoise(p);
    p *= 2.0; amp *= 0.5;
  }
  return v;
}
```

Three octaves maximum on a full-screen quad. Animate by moving *through* the
noise field (`p + uTime * speed`) rather than by adding time to the output —
the former looks like a flowing material, the latter like flicker.

### Distortion and liquid

The workhorse: offset the UV before sampling.

```glsl
vec2 uv = vUv;
float n = snoise(uv * 3.0 + uTime * 0.1);
uv += vec2(n) * uStrength;                 // uStrength ~0.01–0.05
vec4 col = texture2D(uTexture, uv);
```

- Strength above ~0.08 stops reading as material and starts reading as a bug.
- Drive `uStrength` from scroll velocity or hover proximity so the distortion
  responds to the visitor — static distortion is just a warped image.
- Clamp or mirror UVs at the edges, or you get smeared borders.

### Image transitions

Two textures plus a progress-driven mask. Far more distinctive than a cross-fade
and cheap — two texture reads.

```glsl
uniform sampler2D uFrom, uTo;
uniform float uProgress;

void main() {
  float n = snoise(vUv * 4.0) * 0.5 + 0.5;
  float mask = smoothstep(n - 0.1, n + 0.1, uProgress);   // noise-guided wipe
  gl_FragColor = mix(texture2D(uFrom, vUv), texture2D(uTo, vUv), mask);
}
```

Drive `uProgress` from a GSAP timeline, never from `uTime`.

### Refraction / glass

```glsl
vec3 viewDir = normalize(vWorldPosition - cameraPosition);
vec3 refracted = refract(viewDir, normalize(vNormal), 1.0 / uIor);  // uIor ~1.45 glass
vec4 col = texture2D(uSceneTexture, vUv + refracted.xy * uStrength);
```

Real refraction needs the scene rendered to a texture first — a second full
render pass. On mobile that is usually unaffordable. Cheap alternative: sample a
static environment/backdrop texture with the refracted vector; at website scale
almost nobody can tell.

Chromatic dispersion (sample R, G, B at slightly different IORs) triples the
texture reads for a subtle gain. Desktop only.

### Fresnel

The single highest-value-per-instruction effect — it is what makes a surface
look like a *material* rather than a coloured shape.

```glsl
float fresnel(vec3 normal, vec3 viewDir, float power) {
  return pow(1.0 - clamp(dot(normalize(normal), normalize(viewDir)), 0.0, 1.0), power);
}
// power 2.0–5.0; add to rim colour, or drive opacity for a glass edge.
```

---

## Reactive uniforms

### Mouse

```ts
// CPU side: damp, do not assign raw.
useFrame((state, delta) => {
  const u = material.uniforms.uPointer.value;
  u.x = damp(u.x, state.pointer.x, 0.001, delta);
  u.y = damp(u.y, state.pointer.y, 0.001, delta);
});
```

Raw pointer values make the shader twitch. Damping is what makes it feel like
the surface has weight. `state.pointer` is already normalised −1..1.

On touch devices there is no pointer. Either fall back to a slow automatic drift
or drop the interaction — do not leave the shader stuck at `(0, 0)`.

### Scroll

Scroll progress arrives as `uProgress` (0..1), computed **once** by ScrollTrigger
in the DOM layer and written into the uniform. The shader never reads the DOM
and never reads `window.scrollY`.

```ts
gsap.to(state.current, {
  progress: 1, ease: 'none',
  scrollTrigger: { trigger: section, scrub: 1 },
  onUpdate: invalidate,          // required under frameloop="demand"
});
```

Scroll **velocity** (`ScrollTrigger.getVelocity()`, damped) is a better input
than position for distortion — it makes the material feel physically pushed.

---

## Mobile and reduced motion

- Gate expensive shaders on `detectDeviceTier()`. Below `high`: fewer octaves,
  smaller area, no per-frame noise, or a static texture instead.
- Under `prefers-reduced-motion: reduce`, **freeze `uTime` and set `uProgress`
  to its resting value** — keep the material, remove the movement. Do not blank
  the surface.
- Always have a non-shader fallback: a still image that carries the same
  composition.

---

## Debugging

| Symptom | Cause |
|---|---|
| Black output | uniform not set, texture not loaded, or a NaN (check `/ 0` and `pow` of a negative) |
| Nothing renders, console silent | compile error — three logs it with line numbers; check `material.fragmentShader` |
| Correct on desktop, artefacts on mobile | `highp` unsupported in fragment shaders; reduce precision requirements |
| Banding in gradients | 8-bit output; add a tiny dither (`fract(sin(dot(uv, vec2(12.9898,78.233))) * 43758.5453) / 255.0`) |
| Seams on a plane | UVs outside 0–1 with `RepeatWrapping`, or mipmaps at the edge |
| Frame rate fine, then collapses | shader recompiled (a uniform became a define), or DPR changed |

Debug by outputting values as colour: `gl_FragColor = vec4(vUv, 0.0, 1.0)` to
verify UVs, `vec4(vec3(n * 0.5 + 0.5), 1.0)` to see a noise field.

## Checklist

- [ ] CSS and GSAP were both ruled out, with a reason.
- [ ] Work is at the highest level it can be (uniform > vertex > fragment).
- [ ] Fixed loop bounds; no more than three noise octaves full-screen.
- [ ] Uniform values are damped, not assigned raw.
- [ ] Progress comes from GSAP, not from `uTime`.
- [ ] Tier gate and reduced-motion still state both implemented.
- [ ] Measured on a real mid-range Android.
- [ ] Material and its textures are disposed on unmount.
