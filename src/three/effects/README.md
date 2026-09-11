# Post-processing effects

Empty on purpose. `postprocessing` / `@react-three/postprocessing` are **not**
installed.

Post-processing is a full-screen pass per effect: bloom, DOF and chromatic
aberration each re-read every pixel. On a mid-range phone that is frequently the
difference between 60 fps and 30 fps, and it is almost always the first thing to
cut.

Install it only when:

1. the effect is central to the concept, not a garnish, and
2. it has been measured on a real mid-range Android, and
3. there is a tier-gated path that disables it below `detectDeviceTier() === 'high'`.

When that happens, add `@react-three/postprocessing` (which brings
`postprocessing` with it — mind the `three` peer range) and put the composed
`<EffectComposer>` here, not inside individual scenes.
