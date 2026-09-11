---
name: react-three-fiber
description: >-
  Build WebGL scenes in React with @react-three/fiber and @react-three/drei for
  premium interactive websites — not games. Covers Canvas setup, useFrame,
  useThree, useLoader, ref-based per-frame animation, avoiding React re-renders,
  responsive camera and layout, model and texture loading, DPR management, lazy
  loading, disposal, draw calls, mobile performance, GSAP coordination,
  scroll-driven scenes and progressive enhancement. Use when adding, debugging
  or optimising any R3F / three.js scene in this project, or when deciding
  whether a visual idea should be WebGL at all.
---

# React Three Fiber — for websites, not games

R3F here is a **finishing layer on an editorial website**. The page works with
the canvas removed. WebGL adds depth, material and a sense of craft to two or
three moments — it is not the medium the content lives in.

Reference source: `.references/react-three-fiber` (docs in `docs/`, packages in
`packages/`). Drei source: `.references/drei/src`.

---

## 0. Should this be WebGL at all?

Answer in order, and stop at the first yes:

1. **CSS?** Transforms, `clip-path`, `mask-image`, blend modes, `filter`,
   scroll-driven CSS animations. Free, accessible, works everywhere.
2. **GSAP?** Choreography, scrubbing, pinning, sequencing across elements.
3. **WebGL?** Only when the effect *needs* per-pixel or per-vertex work:
   real refraction, displacement driven by noise, depth with parallax that CSS
   layers cannot fake, a material that responds to light.

A blurred gradient, a soft glow, a parallax image, a fade — these are CSS. Do
not spend 180 kB of three.js and a GPU context on them.

---

## 1. Canvas

**Never write a bare `<Canvas>`.** Mount through `src/three/components/SceneCanvas.tsx`,
which owns the WebGL capability gate, DPR ceiling, `frameloop`, pointer-events
and the Suspense boundary.

```tsx
const HeroScene = lazy(() => import('@three/scenes/Hero'));

<SceneCanvas fallback={<HeroPoster />}>
  <HeroScene progress={progress} />
</SceneCanvas>
```

Rules:

- **One canvas per page** wherever possible. Each `<Canvas>` is a separate
  WebGL context, a separate render loop and a separate copy of the renderer
  state. Browsers cap live contexts (~8–16); more importantly, four canvases
  means four full render passes per frame. Use one fixed, full-viewport canvas
  behind the content (`.u-canvas-layer`, `--z-canvas`) and position objects to
  line up with DOM elements. drei's `<View>` (`.references/drei/src/web/View.tsx`)
  does exactly this if separate viewports are genuinely needed.
- **`frameloop="demand"` is the default.** Nothing renders until something calls
  `invalidate()`. A scene that only moves on scroll or hover should never run a
  continuous loop. Opt into `frameloop="always"` only for scenes with genuinely
  continuous motion, and say why in a comment.
- **`antialias: false`.** MSAA on a full-screen canvas is expensive. Prefer
  spending that budget on DPR or on an FXAA pass if edges actually alias.
- **The canvas is `pointer-events: none`.** Interaction, semantics, focus order
  and screen-reader content stay in the DOM. If something on the canvas must be
  clickable, put a real `<button>` over it.

---

## 2. useFrame — the hot path

`useFrame` runs 60–120 times a second. Everything about it is a performance
decision.

```tsx
function Piece({ progress }: { progress: number }) {
  const mesh = useRef<THREE.Mesh>(null);
  const target = useRef(0);

  useFrame((_, delta) => {
    if (!mesh.current) return;
    // Frame-rate independent smoothing — NOT raw lerp.
    target.current = damp(target.current, progress, 0.001, delta);
    mesh.current.position.y = target.current * 2;
  });

  return <mesh ref={mesh}>{/* … */}</mesh>;
}
```

Hard rules:

- **Never `setState` in `useFrame`.** It re-renders the React tree every frame.
  Mutate refs and object properties directly — three.js objects are mutable and
  R3F expects you to mutate them.
- **Never allocate in `useFrame`.** No `new THREE.Vector3()`, no object
  literals, no `.map()`, no array spreads. Hoist scratch vectors to module scope
  or `useMemo`. Sixty allocations a second is a GC pause you will feel.
- **Always use `delta`.** `lerp(a, b, 0.1)` moves at a different speed on a
  120 Hz display than on a 60 Hz one. Use `damp()` from `@/lib/utils`.
- **Guard the ref.** `if (!ref.current) return;` — refs are null on the frame
  before mount and after unmount.
- **Order matters.** `useFrame(cb, renderPriority)`. Positive priority takes
  over rendering entirely — you must then call `gl.render()` yourself. Only do
  this for a manual composer.

---

## 3. Minimising React re-renders

The React tree and the render loop are separate systems. Keep them separate.

- **Props that change every frame do not belong in props.** Scroll progress,
  pointer position and time should reach a scene through a **ref or a mutable
  store**, not through state that re-renders the tree.

  ```tsx
  // Bad: re-renders the whole scene subtree on every scroll event.
  <HeroScene progress={scrollProgress} />

  // Good: the component renders once; the loop reads the current value.
  <HeroScene progressRef={progressRef} />
  ```

  R3F already ships `zustand` as a dependency — a tiny store is free if a
  ref chain gets awkward.
- **`useMemo` every geometry, material and texture.** An unmemoised
  `new THREE.PlaneGeometry()` inside a component body allocates a new GPU
  buffer on every render.
- **Declarative args are memo-friendly:** `<planeGeometry args={[2, 2, 64, 64]} />`
  is re-created only when `args` changes identity — pass a stable array.
- **Split the tree.** A component that re-renders should not contain the
  component that owns the expensive geometry.

---

## 4. useThree, camera and responsive layout

```tsx
const { viewport, size, camera, gl, invalidate } = useThree();
```

- `viewport` is in **three.js world units** at z=0; `size` is in **CSS pixels**.
  Sizing a plane to fill the screen uses `viewport.width / viewport.height`.
- Selecting `useThree(state => state.size)` subscribes to only that slice —
  prefer selectors over destructuring the whole state when inside a component
  that renders often.
- **Responsive cameras:** on a perspective camera, keep the subject framed by
  moving the camera on z or adjusting `fov` from the aspect ratio, not by
  scaling the mesh. A phone in portrait has a radically different aspect —
  design the composition for portrait first and widen it, exactly as with CSS.
- Under `frameloop="demand"`, anything that changes the scene outside the loop
  must call `invalidate()`.

---

## 5. Loading models and textures

```tsx
const gltf = useLoader(GLTFLoader, '/models/piece.glb', (loader) => {
  const draco = new DRACOLoader();
  draco.setDecoderPath('https://www.gstatic.com/draco/v1/decoders/');
  loader.setDRACOLoader(draco);
});
```

- **`useLoader` suspends.** That is why `SceneCanvas` wraps children in
  `<Suspense>`. Never let a model block first paint — the scene is lazy, and the
  page must be readable while it loads.
- **Preload deliberately:** `useLoader.preload(GLTFLoader, url)` from an event
  (hover on a nav link, section entering the viewport), never on page load.
- **`.glb` only, compressed.** Draco for geometry, Meshopt for large meshes,
  KTX2/Basis for textures. An uncompressed 8 MB `.gltf` is not shippable.
- **Textures:** power-of-two dimensions, no larger than the screen area they
  cover. `texture.colorSpace = THREE.SRGBColorSpace` for colour maps, linear for
  data maps (normal, roughness, displacement) — getting this wrong is the usual
  cause of "the colours look washed out".
- **Set `texture.generateMipmaps = false`** for full-screen quads that are never
  minified; it saves memory and upload time.
- drei's `useTexture`, `useGLTF` and `<Environment>` wrap all of this — read
  `.references/drei/src/core/` before writing your own.

---

## 6. DPR, tiers and adaptive quality

Fragment cost scales with the **square** of DPR. A 3x phone is 9x the pixels.

- `SceneCanvas` passes `dpr={dprRange()}` from `src/three/utils/webgl.ts`:
  `[1,1]` low tier, `[1,1.5]` mid, `[1,2]` high. Never pass
  `window.devicePixelRatio`.
- The static tier is a starting guess. Add drei's `<AdaptiveDpr pixelated />`
  and `<AdaptiveEvents />` inside heavy scenes so quality drops under real load
  instead of dropping frames.
- **Degrade the scene, not just the resolution.** Below `high` tier: fewer
  instances, no post-processing, lower-subdivision geometry, smaller textures,
  no per-frame noise.

---

## 7. Disposal and memory

R3F disposes what **it** created when a component unmounts. It does not dispose:

- objects created imperatively (`new THREE.ShaderMaterial()`, render targets),
- loader results cached by `useLoader` (deliberately — they are shared),
- anything attached with `<primitive object={…} />`.

Use `disposeObject` / `disposeMaterial` from `@three/utils` in a cleanup effect:

```tsx
const material = useMemo(() => createShaderMaterial({ … }), []);
useEffect(() => () => disposeMaterial(material), [material]);
```

Symptom of getting this wrong: the site gets progressively slower and the tab's
memory climbs as the visitor scrolls back and forth.

---

## 8. Draw calls and scene cost

The budget on a mid-range phone is roughly **under 100 draw calls** and
**well under 200k triangles** for a website.

- **Merge or instance.** Fifty identical objects should be one
  `<instancedMesh>`, not fifty meshes. drei's `<Instances>`/`<Instance>` makes
  this declarative.
- **Share materials.** Each distinct material is a shader program compile and a
  state change. Two meshes with the same material batch; two meshes with
  identical-but-separate materials do not.
- **Shader compilation stalls the main thread** on first render. Warm it with
  `gl.compile(scene, camera)` behind the loading state, or accept a hitch the
  first time a scene appears.
- Check `gl.info.render.calls` and `gl.info.memory` in dev before shipping.

---

## 9. Coordinating with GSAP

GSAP owns **timing and choreography**. R3F owns **rendering**. Do not let them
both drive the same value.

The pattern: GSAP tweens a plain JS object; `useFrame` reads it.

```tsx
const state = useRef({ progress: 0 });

useGSAP(() => {
  gsap.to(state.current, {
    progress: 1,
    ease: 'none',
    scrollTrigger: { trigger: sectionEl, start: 'top top', end: '+=100%', scrub: 1 },
    // Under frameloop="demand", tell R3F a frame is needed.
    onUpdate: invalidate,
  });
}, { scope: sectionEl });

useFrame(() => { mesh.current.rotation.y = state.current.progress * Math.PI; });
```

Why not tween `mesh.rotation` directly? It works, but it couples the timeline to
the scene graph, breaks under `frameloop="demand"` without manual `invalidate`,
and makes reduced-motion fallbacks harder. A plain object is a clean seam.

`useGSAP` from `@gsap/react` handles cleanup via `gsap.context()` — always use
it rather than a bare `useEffect`.

---

## 10. Scroll-driven scenes

- Scroll progress is computed **once**, by ScrollTrigger, in the DOM layer, and
  handed to the scene as a ref. The scene never reads `window.scrollY` and never
  queries the DOM.
- Objects that must line up with DOM elements: measure the element, convert to
  world units through `viewport`, and re-measure on resize (`ScrollTrigger.refresh()`
  and R3F's own resize both fire — do not do it per frame).
- **Unmount off-screen scenes.** A scene three sections away should not be
  rendering. Gate mounting on an IntersectionObserver with generous rootMargin,
  and keep `frameloop="demand"` so an idle mounted scene costs nothing.

---

## 11. Progressive enhancement — non-negotiable

Every scene ships three states:

1. **Full** — WebGL available, high tier, no reduced-motion preference.
2. **Reduced** — motion preference set or mid/low tier: render the scene
   **still** (one frame at the composition's resting pose) rather than removing
   it. Removing it leaves a hole where a designed composition was.
3. **None** — no WebGL, or a load failure: the `fallback` prop. A real image or
   a CSS composition that keeps the layout and the meaning intact.

Check `hasWebGL()` and `usePrefersReducedMotion()`. Test all three before
calling a scene done — see the `webapp-testing` skill.

---

## Checklist before a scene is done

- [ ] Scene is `lazy()`-imported; three.js is not in the initial chunk.
- [ ] Mounted through `SceneCanvas`; no bare `<Canvas>`.
- [ ] `frameloop="demand"` unless continuous motion is justified in a comment.
- [ ] No `setState`, no allocation, no DOM access inside `useFrame`.
- [ ] All smoothing is `delta`-based.
- [ ] Geometries, materials and textures are memoised and disposed.
- [ ] Draw calls checked in `gl.info`.
- [ ] Composition holds at 390px portrait, not only at 1440px.
- [ ] Reduced-motion still state and no-WebGL fallback both verified.
- [ ] Measured on a real mid-range device, not only on the dev machine.
