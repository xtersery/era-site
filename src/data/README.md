# Content

Structured content lives here — treatments, cases, doctor bio, review quotes —
as typed TypeScript modules, so a copy change is never a component change.

Nothing here yet: no clinic copy has been written, and inventing placeholder
medical claims would be worse than an empty folder.

When content arrives:
- one module per section (`treatments.ts`, `cases.ts`, …),
- each exports a `readonly` array typed against an interface in `src/types`,
- no JSX, no markup, no class names — content only.
