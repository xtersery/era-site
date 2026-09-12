# Post-processing effects

`postprocessing` and `@react-three/postprocessing` are **installed** for the
glass phase and **not mounted** — nothing in this folder runs yet.

Post-processing is a full-screen pass per effect: every pass re-reads every
pixel. On a mid-range phone that is frequently the difference between 60 fps
and 30 fps, and it is always the first thing to cut.

The approved use (docs/ARCHITECTURE.md §3) is narrow:

- one `<EffectComposer>`, composed here, not inside scenes;
- film grain so the glass render matches the photography grade;
- a very subtle bloom on the dispersion edge **only if it earns its place**
  when measured;
- tier-gated: the composer is skipped below `detectDeviceTier() === 'high'`,
  and the `reduced` / `none` states render the designed still instead.

Nothing else. No DOF, no chromatic aberration as a pass (dispersion lives in
the transmission material), no vignette.
