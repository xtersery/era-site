# webapp-testing — how it is used in this project

**Source:** https://github.com/anthropics/skills (`skills/webapp-testing/`)

## What was adapted

Imported verbatim.

## When to use it here

This is how visual work gets **verified instead of assumed**. On a site whose
whole value is motion and composition, "it compiles" proves nothing.

Run it against `npm run dev` to check, at minimum:

- the hero at 390px, 768px and 1440px widths,
- scroll states at 0%, the pinned section, and the end of the page,
- `prefers-reduced-motion: reduce` (Playwright: `emulateMedia`),
- the no-WebGL fallback path,
- console clean of three.js warnings and React key warnings.

Chromium is already installed in this environment at `/opt/pw-browsers` —
`PLAYWRIGHT_BROWSERS_PATH` is set. Do **not** run `playwright install`.
