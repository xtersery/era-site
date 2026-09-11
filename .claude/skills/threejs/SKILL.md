---
name: threejs
description: >-
  Core three.js knowledge for scene architecture, cameras, lighting, PBR
  materials, environment maps, geometry, instancing, render performance,
  shaders, textures, colour management, animation and WebGL debugging. Use when
  working with three.js concepts directly — material setup, lighting a scene,
  diagnosing washed-out colours, cutting draw calls, reading renderer info — or
  when an escape hatch below React Three Fiber is genuinely needed.
---

# Three.js

**Inside React, prefer React Three Fiber.** R3F is three.js — same objects, same
properties, declaratively expressed with a reconciler that handles mounting and
disposal. Dropping to imperative three.js inside a React component means owning
the lifecycle by hand, and it is almost always the wrong trade.

Reach for direct three.js when:

- configuring the renderer, tone mapping or colour space,
- building a material, geometry or loader **outside** the component tree
  (`src/three/materials/`, `src/three/utils/`),
- writing a manual render pass or render target,
- debugging: reading `gl.info`, inspecting compiled shader source, checking a
  matrix.

Reference source: `.references/threejs` — `docs/` (with `docs/llms.txt` and
`docs/llms-full.txt` as compact API indexes), `manual/` for guides, `src/` for
the actual implementation, `examples/jsm/` for addons.

---

## 1. Scene architecture

- **Scene graph = transform hierarchy.** Parent a group to move children
  together. Deep hierarchies cost matrix updates; keep them shallow.
- **`object.matrixAutoUpdate = false`** for anything static, then call
  `updateMatrix()` once. Free win on scenes with many static objects.
- **Units matter.** Pick a scale (1 unit = 1 metre is the sane default) and keep
  it. Mixing scales breaks lighting falloff, shadow bias and camera near/far.
- **`near`/`far` are precision, not just clipping.** A `near` of 0.001 with a
  `far` of 10000 destroys depth-buffer precision and produces z-fighting. Keep
  the ratio tight — `0.1` to `100` covers most website scenes.

## 2. Cameras

- `PerspectiveCamera(fov, aspect, near, far)` — a **low fov (25–40)** reads as
  cinematic and photographic; a high fov (70+) reads as a game or a webcam. For
  an editorial site, stay low.
- `OrthographicCamera` for flat, graphic, diagram-like compositions and for
  full-screen quad passes.
- After changing `aspect` or `fov`, call `camera.updateProjectionMatrix()`.
- Framing across aspect ratios: solve for the distance that keeps a known
  object height in frame —
  `distance = (height / 2) / Math.tan((fov * Math.PI / 180) / 2)` — and adjust
  for the horizontal case when `aspect < 1` (portrait phones).

## 3. Lighting

Physically-based lighting with default settings is the fastest route to
"expensive-looking".

- `renderer.toneMapping = THREE.ACESFilmicToneMapping` and tune
  `toneMappingExposure`. Untoned output looks flat and clips highlights.
- `renderer.outputColorSpace = THREE.SRGBColorSpace` (the default in modern
  three) and `texture.colorSpace = THREE.SRGBColorSpace` on **colour** maps
  only. Data maps (normal, roughness, metalness, AO, displacement) stay linear.
  Getting this backwards is the number-one cause of washed-out or muddy renders.
- **Prefer image-based lighting to lamps.** One good HDRI through
  `<Environment>` / `PMREMGenerator` beats three point lights for realism and
  costs less. Add a single directional light for shape and shadow direction.
- **Shadows are expensive.** A shadow map is a second render pass per casting
  light. On a website, contact shadows (drei `<ContactShadows>`) or a baked
  shadow plane usually look better and cost a fraction. If real shadows are
  needed: one light casts, tight `shadow.camera` bounds, `shadow.mapSize` no
  larger than 1024, and tune `shadow.bias`/`normalBias` to kill acne.
- `AmbientLight` flattens everything. Use `HemisphereLight` or an environment
  map instead if a fill is needed.

## 4. PBR materials

| Material | Cost | Use for |
|---|---|---|
| `MeshBasicMaterial` | lowest | unlit surfaces, video/image planes, masks |
| `MeshLambert` / `MeshPhong` | low | legacy; rarely the right answer now |
| `MeshStandardMaterial` | medium | the default PBR workhorse |
| `MeshPhysicalMaterial` | high | only when you need clearcoat, transmission, sheen or iridescence |
| `ShaderMaterial` | depends | custom vertex/fragment work |

- `MeshPhysicalMaterial` with `transmission` is a **second render of the scene**
  per transmissive object. Glass is beautiful and it is the single most common
  way to tank a mobile frame rate. Budget for it explicitly or fake it.
- Roughness and metalness are the whole look. Metal is 0 or 1, never in between
  (except at a transition edge). Dielectrics are metalness 0.
- `envMapIntensity` is the dial that makes a material sit in the scene.
- Extend a stock material without rewriting it via `material.onBeforeCompile`
  (string-replace into the generated shader) — cheaper and more maintainable
  than a full custom `ShaderMaterial` when you only need one modification.
  three's shader chunks live in `.references/threejs/src/renderers/shaders/ShaderChunk/`.

## 5. Geometry

- Vertex count is not the main cost on a website — **draw calls and fragments**
  are. A 100k-triangle mesh in one draw call is cheaper than 200 cubes.
- `BufferGeometry` only. Set `geometry.computeBoundingSphere()` after mutating
  positions or frustum culling breaks.
- Subdivide only where displacement needs it. A plane displaced in the vertex
  shader needs segments; a flat plane needs `1, 1`.
- `geometry.dispose()` releases the GPU buffer. Reuse one geometry across many
  meshes instead of cloning.

## 6. Instancing

The single biggest win for repeated objects.

```js
const mesh = new THREE.InstancedMesh(geometry, material, count);
const dummy = new THREE.Object3D();          // hoisted, reused
for (let i = 0; i < count; i++) {
  dummy.position.set(…); dummy.rotation.set(…); dummy.scale.setScalar(…);
  dummy.updateMatrix();
  mesh.setMatrixAt(i, dummy.matrix);
}
mesh.instanceMatrix.needsUpdate = true;
```

- Per-instance colour: `mesh.setColorAt(i, color)` + `instanceColor.needsUpdate`.
- Per-instance arbitrary data: an `InstancedBufferAttribute` read as an
  attribute in a custom shader.
- `BatchedMesh` handles multiple *different* geometries in one draw call.
- Instanced meshes are frustum-culled as a whole — set
  `mesh.frustumCulled = false` if instances are scattered widely and popping
  appears.

## 7. Render performance

Read the numbers before optimising:

```js
console.log(renderer.info.render.calls, renderer.info.render.triangles);
console.log(renderer.info.memory.geometries, renderer.info.memory.textures);
console.log(renderer.info.programs.length);   // shader programs compiled
```

Website budget on a mid-range phone: **< 100 draw calls, < 200k triangles,
< 60 MB texture memory, 0 per-frame allocations.**

Order of impact, highest first:

1. Fragment cost × resolution (DPR, transmission, post-processing, full-screen
   noise). Halving DPR quarters this.
2. Draw calls (merge, instance, share materials).
3. Shader program count — each unique material compiles a program, and
   compilation stalls the main thread. Warm with `renderer.compile()`.
4. Shadow passes.
5. Triangle count — usually last.

Other wins: `renderer.setPixelRatio(Math.min(devicePixelRatio, 2))`, render on
demand rather than continuously, `powerPreference: 'high-performance'`,
`antialias: false` plus a cheap post AA if needed.

## 8. Textures

- `.ktx2` (Basis Universal) stays compressed on the GPU — often 4–8x less VRAM
  than PNG/JPEG, which decompress to raw RGBA. Use `KTX2Loader` for anything
  large or repeated.
- Size to screen coverage. A 4096² texture on a element 300px wide is waste.
- `generateMipmaps = false` + `minFilter = LinearFilter` for full-screen quads;
  keep mipmaps for anything seen at an angle or at distance.
- `anisotropy = renderer.capabilities.getMaxAnisotropy()` only on surfaces
  viewed at grazing angles (floors) — it costs samples.
- `texture.dispose()` when done. Textures are the usual memory leak.

## 9. Shaders

See the `webgl-shaders` skill for GLSL technique. Three.js specifics:

- `ShaderMaterial` gets three's uniforms/attributes/precision injected
  automatically (`projectionMatrix`, `modelViewMatrix`, `position`, `uv`,
  `normal`). `RawShaderMaterial` gets nothing — declare everything yourself.
- Include three's own chunks with `#include <fog_pars_fragment>` etc. inside a
  `ShaderMaterial`; the source is in `src/renderers/shaders/ShaderChunk/`.
- Debug a compiled shader with `console.log(material.vertexShader)` after
  compile, or read `gl.getShaderInfoLog` output — three surfaces compile errors
  with line numbers in the console.

## 10. Animation

- `AnimationMixer` + `AnimationClip` for baked GLTF animation:
  `mixer.update(delta)` every frame.
- For anything driven by scroll, hover or timeline choreography, **GSAP owns the
  timing** — see the `gsap-motion` and `react-three-fiber` skills. Do not mix
  two animation systems on the same property.
- Always drive by `delta`, never by frame count.

## 11. WebGL debugging

| Symptom | Usual cause |
|---|---|
| Black screen | camera inside geometry, `near`/`far` wrong, material not lit, or NaN in a transform |
| Washed-out / grey colours | colour space on textures, or missing tone mapping |
| Z-fighting | `near`/`far` ratio too extreme, or coplanar surfaces |
| Flickering on mobile only | precision — `highp` unavailable in fragment shaders on some GPUs |
| Frame rate collapses on resize | re-creating render targets or geometry in the resize handler |
| Memory climbs over time | undisposed textures/geometries, or a `useLoader` cache growing |
| First appearance hitches | shader compilation; warm with `renderer.compile()` |
| `Context Lost` | too many live contexts, or GPU memory exhausted |

Tools: Spector.js for frame capture, `renderer.info` for counts, Chrome
DevTools Performance panel with GPU track enabled, and the three.js devtools
extension.
