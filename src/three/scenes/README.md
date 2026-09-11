# Scenes

One folder per scene. A scene is a self-contained R3F subtree plus the shaders,
materials and assets only it uses:

```
scenes/
  Hero/
    HeroScene.tsx     the R3F subtree (no <Canvas> — that is SceneCanvas's job)
    hero.vert
    hero.frag
    index.ts          lazy-friendly barrel
```

## Rules

- A scene never renders `<Canvas>`. It is always mounted inside `SceneCanvas`.
- A scene never reaches into the DOM. Scroll progress, pointer position and
  section state arrive as props or through a store — never via `document.querySelector`.
- A scene is always lazy: `const HeroScene = lazy(() => import('@three/scenes/Hero'))`.
  three.js must not be in the initial bundle.
- Per-frame work mutates refs inside `useFrame`. Never `setState` in a frame loop.
- Every scene ships a still fallback (poster image or CSS composition) for
  no-WebGL and reduced-motion visitors.

Empty for now — scenes are created during the design pass.
