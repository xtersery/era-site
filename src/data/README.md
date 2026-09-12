# Content

Structured content lives here as typed TypeScript modules, so a copy change is
never a component change.

**Everything here is a clearly marked placeholder** (CLAUDE.md → Hard rule 4):

- every module exports `placeholder = true`; every record has `isPlaceholder: true`
- client facts are bracketed — `[Имя Фамилия]`, `[ул. Адрес, 00]`, `[00] лет`
- prices are format examples, not quotes
- pending copy decisions render their bracket verbatim (`copy.ts → pending`)
- proposed copy lines (`copy.ts → proposed`) are rendered and flagged with
  `data-placeholder="copy"`
- reviews are format examples and say so in their source line

Rules:
- one module per room (`services.ts`, `pricing.ts`, `cases.ts`, …),
- each exports a `readonly` array typed against `src/types/content.ts`,
- all copy passes through `ru()` once, here — never in JSX,
- no JSX, no markup, no class names — content only,
- people are `gender: 'f'` by type; the clinic is for women.
