# scroll-craft — how it is used in this project

**Source:** https://github.com/nateherkai/scroll-craft
(`plugins/nateherk-design/skills/scroll-craft/`)

## What was adapted

- The upstream repo is a Claude Code **plugin**. The skill subtree was lifted out
  of `plugins/nateherk-design/skills/` and placed here unchanged; the plugin
  wrapper (`.claude-plugin/`, marketplace manifest, media) was not imported.
- **Nothing inside the skill was edited.** Read it as-is.

## Constraints specific to this project

1. **Asset generation via kie.ai is unavailable.** `scripts/kie.mjs` needs an
   API key this project does not have; do not attempt to run it. Generated
   campaign imagery for this project is produced with Higgsfield under the
   asset policy in `CLAUDE.md` (Hard rule 3): women 35–60 only, hyperrealistic,
   editorial; real team members are always real photography; cases at launch
   are consented real patients or labelled «Визуализация».

2. **We build in React, not standalone HTML.** The skill's `engine/scrollcraft.js`
   and `references/template.html` assume a hand-written HTML page. Use them as
   **reference for technique** — layered hero planes, scroll grammar, pacing —
   and implement in React + GSAP ScrollTrigger through `src/animations/`. Do not
   copy the engine into the app.

3. **Verification.** `references/verify.md` and `scripts/shoot.mjs` describe
   checking desktop / mobile / reduced-motion scroll states visually. That
   discipline applies; run it against `npm run dev` (see `webapp-testing`).

## When to use it here

This is the strongest reference we have for **scroll as a narrative timeline**:
journey planning, page grammar, the emotional peak, the one signature move per
site, and separate mobile composition. Reach for it when deciding *what the
scroll does*. Reach for `gsap-motion` when deciding *how to implement it*.
