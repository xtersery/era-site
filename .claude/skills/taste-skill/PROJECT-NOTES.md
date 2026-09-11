# taste-skill — how it is used in this project

**Source:** https://github.com/Leonxlnx/taste-skill (`skills/taste-skill/`)

## What was adapted

- The upstream repo is a Claude Code **plugin marketplace** containing 13 skills
  (brandkit, brutalist, minimalist, soft, stitch, redesign, image-to-code, …).
  Only the primary `taste-skill` was imported. Importing all 13 would have put a
  dozen competing aesthetic doctrines in front of Claude at once, which is worse
  than having none.
- One edit to `SKILL.md`: the frontmatter `name` was `design-taste-frontend`,
  which does not match the folder Claude Code loads it from. Changed to
  `taste-skill`. Nothing else in the file was touched.
- The other 12 skills remain readable at
  `.references/taste-skill/skills/` if a specific one is ever wanted.

## When to use it here

Use it as a **quality gate**, not a generator. Its value on this project is
Section 0 (brief inference) and the pre-flight check: catching output that has
drifted toward templated defaults.

Its landing-page conventions are written for generic SaaS/portfolio work. Where
they conflict with `premium-web-design`, **`premium-web-design` wins** — that
skill encodes this clinic's specific art direction.
