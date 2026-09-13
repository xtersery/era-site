import { BufferGeometry, ExtrudeGeometry, Shape, TorusGeometry } from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

/**
 * The ERA threshold — a portal cut from mineral glass, not a ring primitive.
 *
 * It is built from a handful of annular **segments**, each with its own inner
 * and outer radius, its own depth and its own small gap, so the object is
 * imperfectly circular: thick where it carries weight, thin where the light
 * gets through, slightly elliptical, and never symmetrical. The segments are
 * merged into one geometry so the whole threshold is a single draw and a single
 * transmission pass.
 *
 * Everything is deterministic — a portal is *authored*, so the same case always
 * stands in the same threshold.
 */

/** deterministic hash → 0..1, so every portal is stable across reloads */
function rand(seed: number, salt: number): number {
  const x = Math.sin(seed * 127.1 + salt * 311.7) * 43758.5453;
  return x - Math.floor(x);
}

/** one annular sector, extruded and bevelled — a block of cut glass */
function segment(
  a0: number,
  a1: number,
  rIn: number,
  rOut: number,
  depth: number,
  bevel: number,
): ExtrudeGeometry {
  const shape = new Shape();
  const steps = Math.max(6, Math.round(((a1 - a0) / Math.PI) * 40));
  shape.moveTo(Math.cos(a0) * rIn, Math.sin(a0) * rIn);
  for (let i = 0; i <= steps; i++) {
    const a = a0 + ((a1 - a0) * i) / steps;
    shape.lineTo(Math.cos(a) * rOut, Math.sin(a) * rOut);
  }
  for (let i = steps; i >= 0; i--) {
    const a = a0 + ((a1 - a0) * i) / steps;
    shape.lineTo(Math.cos(a) * rIn, Math.sin(a) * rIn);
  }
  shape.closePath();
  return new ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: true,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: 3,
    curveSegments: steps,
  });
}

export interface PortalSpec {
  /** aperture radius — the opening the case is seen through */
  aperture: number;
  /** how far the glass reaches beyond the aperture at its widest */
  reach: number;
  /** ellipticity of the whole threshold */
  squash: number;
}

export const PORTAL: PortalSpec = { aperture: 1.78, reach: 1.62, squash: 1.07 };

/**
 * The threshold's glass. `seed` authors one portal: segment count, where it is
 * thick, where the gaps fall.
 */
export function createPortalGeometry(seed: number, spec: PortalSpec = PORTAL): BufferGeometry {
  const count = 7 + Math.floor(rand(seed, 1) * 3); // 7…9 blocks
  const parts: BufferGeometry[] = [];
  let a = rand(seed, 2) * Math.PI * 2;
  for (let i = 0; i < count; i++) {
    const share = (Math.PI * 2) / count;
    const gap = 0.012 + rand(seed, i * 3 + 4) * 0.05; // the seams between blocks
    const a0 = a + gap * 0.5;
    const a1 = a + share - gap * 0.5;
    a += share;
    // thickness varies around the ring: two blocks carry the weight, the rest thin out
    const heavy = rand(seed, i * 5 + 7);
    const rIn = spec.aperture * (0.985 + rand(seed, i * 7 + 11) * 0.05);
    const rOut = rIn + spec.reach * (0.42 + heavy * 0.72);
    const depth = 0.3 + heavy * 0.62;
    const g = segment(a0, a1, rIn, rOut, depth, 0.05 + heavy * 0.05);
    // each block sits slightly differently in its own plane — nothing is flush
    g.translate(0, 0, -depth * 0.5 + (rand(seed, i * 11 + 13) - 0.5) * 0.22);
    g.rotateX((rand(seed, i * 13 + 17) - 0.5) * 0.05);
    g.rotateY((rand(seed, i * 17 + 19) - 0.5) * 0.05);
    parts.push(g);
  }
  const merged = mergeGeometries(parts, false);
  parts.forEach((p) => p.dispose());
  if (!merged) throw new Error('portal geometry merge failed');
  merged.scale(spec.squash, 1, 1); // slightly elliptical
  merged.computeVertexNormals();
  return merged;
}

/**
 * The gold is light, not decoration: two or three short arcs of polished metal
 * lying on the aperture edge, where a key would actually catch it.
 */
export function createGlintGeometry(seed: number, spec: PortalSpec = PORTAL): BufferGeometry {
  const parts: BufferGeometry[] = [];
  const n = 2 + Math.floor(rand(seed, 23) * 2);
  for (let i = 0; i < n; i++) {
    const arc = 0.22 + rand(seed, i * 3 + 29) * 0.5;
    const start = rand(seed, i * 5 + 31) * Math.PI * 2;
    const r = spec.aperture * (1.005 + rand(seed, i * 7 + 37) * 0.02);
    const g = new TorusGeometry(r, 0.008 + rand(seed, i * 11 + 41) * 0.006, 6, 64, arc);
    g.rotateZ(start);
    g.translate(0, 0, (rand(seed, i * 13 + 43) - 0.5) * 0.3);
    parts.push(g);
  }
  const merged = mergeGeometries(parts, false);
  parts.forEach((p) => p.dispose());
  if (!merged) throw new Error('glint geometry merge failed');
  merged.scale(spec.squash, 1, 1);
  return merged;
}
