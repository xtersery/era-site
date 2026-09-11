# frontend-design — how it is used in this project

**Source:** https://github.com/anthropics/skills (`skills/frontend-design/`)

## What was adapted

Imported verbatim. It is already a valid, concise Claude Code skill.

The upstream repo contains ~19 skills. Only two were imported — this one and
`webapp-testing`. The rest (docx, xlsx, pptx, pdf, mcp-builder, slack-gif,
internal-comms, brand-guidelines, canvas-design, algorithmic-art,
theme-factory, …) are document tooling or unrelated domains; dumping them here
would bury the skills that matter. All remain readable under
`.references/anthropics-skills/skills/`.

## When to use it here

General baseline for typography, spacing and avoiding templated defaults. It is
the *floor*, not the ceiling. `premium-web-design` sets the actual bar for this
project and overrides it wherever the two differ.
