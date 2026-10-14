/*
 * The water passage's parameters — a module of its own, free of three.js, so
 * the room (`PortraitsSpike`) can read them without pulling the scene into the
 * page's first load. `WaterScene` re-exports them.
 */
/** The passage's parameters, in one place (fractions of the pin's exit range unless noted). */
export const PASSAGE = {
  /** the glints' intensity at rest (0 … 1) */
  glint: 0.5,
  /** the light's centre and half-width at rest, as fractions of the section's width */
  field: { desktop: { x: 0.49, hw: 0.125 }, phone: { x: 0.5, hw: 0.3 } },
  /** section x beyond which the light never lies — her face */
  face: { desktop: 0.64, phone: 1.1 },
  /** where the wall has fully risen inside the light (t) — after this only the glints settle */
  marbleIn: 0.9,
} as const;
