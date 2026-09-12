# Design tokens — status

The art direction (THROUGH GLASS) is approved. Token status by file:

| File | Status |
|---|---|
| `typography.css`, `fonts.css` | **Approved system**, development faces (Prata / Inter / JetBrains Mono). Production faces swap three `--font-*` lines — see `docs/TYPOGRAPHY.md`. |
| `layout.css`, `spacing.css`, `z-index.css`, `breakpoints.css` | Approved structure. |
| `motion.css`, `tokens.ts` | Approved vocabulary; values may be tuned in the motion phase. |
| `color.css` | **Greyscale phase.** Neutral ramp active on purpose. The approved palette is recorded in the file header and is activated in the colour phase only. |

Rules:
- Components consume `var(--token)`, never raw hex / px / seconds.
- Motion code consumes `src/styles/tokens/tokens.ts`, which mirrors the subset
  of tokens that JavaScript needs (durations, easings, breakpoints). Keep it in
  sync with `motion.css` and `breakpoints.css` by hand.
- Adding a token is cheap. Adding a one-off literal in a component is not.
