# Design tokens — PLACEHOLDER VALUES

Nothing in this folder is a branding decision. Every value is a neutral, boring
placeholder that exists so components can be wired against a token name instead
of a literal.

The final palette, typefaces and scale are chosen during the art-direction pass
(see `.claude/skills/premium-web-design`). When that happens, change values here
**only** — never in components.

Rules:
- Components consume `var(--token)`, never raw hex / px / seconds.
- Motion code consumes `src/styles/tokens/tokens.ts`, which mirrors the subset
  of tokens that JavaScript needs (durations, easings, breakpoints).
- Adding a token is cheap. Adding a one-off literal in a component is not.
