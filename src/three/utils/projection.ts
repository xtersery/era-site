import type { PerspectiveCamera } from 'three';

/**
 * DOM → world projection at the camera's focal plane (docs/ARCHITECTURE.md §0.8).
 *
 * The scene places its planes where the DOM says. Anchors are elements marked
 * `data-stage-anchor="<name>"`; their viewport rects are converted to world
 * units at a given depth `z` for a camera at `camera.position.z` looking down −z.
 */

export interface AnchorRect {
  /** Viewport-normalised centre, −1..1 (x right, y up). */
  cx: number;
  cy: number;
  /** Viewport-normalised size, 0..2. */
  w: number;
  h: number;
  /** Raw pixels for QA. */
  px: DOMRect;
}

export function measureAnchor(name: string): AnchorRect | null {
  const el = document.querySelector<HTMLElement>(`[data-stage-anchor="${name}"]`);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  return {
    cx: ((r.left + r.width / 2) / vw) * 2 - 1,
    cy: -(((r.top + r.height / 2) / vh) * 2 - 1),
    w: (r.width / vw) * 2,
    h: (r.height / vh) * 2,
    px: r,
  };
}

/** Visible world height/width at depth `z` for a perspective camera. */
export function viewportAtDepth(
  camera: PerspectiveCamera,
  z: number,
): { width: number; height: number } {
  const distance = Math.abs(camera.position.z - z);
  const height = 2 * distance * Math.tan((camera.fov * Math.PI) / 360);
  return { width: height * camera.aspect, height };
}

/** World position and size for an anchor rect placed at depth `z`. */
export function anchorToWorld(
  anchor: AnchorRect,
  camera: PerspectiveCamera,
  z: number,
): { x: number; y: number; width: number; height: number } {
  const view = viewportAtDepth(camera, z);
  return {
    x: (anchor.cx * view.width) / 2,
    y: (anchor.cy * view.height) / 2,
    width: (anchor.w * view.width) / 2,
    height: (anchor.h * view.height) / 2,
  };
}
