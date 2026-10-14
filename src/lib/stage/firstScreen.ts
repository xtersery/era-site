/**
 * The first screen is complete: the hero's pictures are in and its film is
 * ready (or will not come — no WebGL, reduced motion, a failed load). Work
 * for rooms further down (their scenes' code and textures) waits for this,
 * so it never takes the network from the hero or its film.
 */
let resolve: () => void = () => {};
let done = false;
const settled = new Promise<void>((r) => {
  resolve = r;
});

export function markFirstScreenSettled(): void {
  if (done) return;
  done = true;
  resolve();
}

/** resolves once the first screen is complete — or after `ceilingMs`, for a page without a hero */
export function afterFirstScreen(ceilingMs = 15_000): Promise<void> {
  return Promise.race([settled, new Promise<void>((r) => window.setTimeout(r, ceilingMs))]);
}
