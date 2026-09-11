# scroll-craft — how it is used in this project

**Source:** https://github.com/nateherkai/scroll-craft
(`plugins/nateherk-design/skills/scroll-craft/`)

## What was adapted

- The upstream repo is a Claude Code **plugin**. The skill subtree was lifted out
  of `plugins/nateherk-design/skills/` and placed here unchanged; the plugin
  wrapper (`.claude-plugin/`, marketplace manifest, media) was not imported.
- **Nothing inside the skill was edited.** Read it as-is.

## Constraints specific to this project

1. **Asset generation is unavailable.** `scripts/kie.mjs` generates photoreal
   imagery through kie.ai and needs an API key this project does not have. Do
   not attempt to run it. Clinic imagery is real photography of a real clinic —
   generated faces and generated bodies are not acceptable for an aesthetic
   medicine site, legally or ethically.

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
