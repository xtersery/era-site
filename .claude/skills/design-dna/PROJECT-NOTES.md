# design-dna — how it is used in this project

**Source:** https://github.com/zanwei/design-dna

## What was adapted

Nothing. The repository root *is* a valid Claude Code skill (`SKILL.md` +
`references/` + `scripts/`), so it was imported verbatim. Localised READMEs and
doc screenshots were not copied — they are in `.references/design-dna/`.

`scripts/` contains real, runnable tooling (`measure-colors.mjs`,
`color-math.mjs`, `verify.mjs`) with its own `package.json`. Install its deps
inside that folder if you need to run it; do not add them to the app's
`package.json`.

## When to use it here

Two moments:

1. **Reference intake.** When we gather art-direction references (fashion
   editorial, luxury skincare, fragrance, experimental studios), run the
   extraction phase to turn them into a structured Design DNA profile instead of
   vague adjectives. Its third dimension — *visual effects* (WebGL, shaders,
   scroll, particles) — maps directly onto our `src/three` layer.

2. **Token definition.** When the placeholder values in `src/styles/tokens/`
   are replaced with the real identity, the generated design-system dimension is
   the input. Write the result into the token CSS files — never into components.

Do **not** use its generation phase to produce finished pages. That is what
`premium-web-design` + `scroll-craft` + our own components are for.
