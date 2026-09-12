import { BufferAttribute, ExtrudeGeometry, Shape, type BufferGeometry } from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

/**
 * The optical arc — a partial orbit of cut mineral.
 *
 * Seven segments of a much larger ring (radius R). Each segment is a solid
 * block: a thick glass face (T) with a graphite backing (B) and the image facet
 * embedded between them. Only ~3 segments are on screen; the rest are implied
 * off-frame. Turning rotates the whole arc about its distant axis.
 *
 * ONE glass geometry with `aSegment` (0..6) and UVs wrapped along the arc,
 * mirrored on odd segments when `bookMatch` is on (the wall's tile logic).
 */
export const SEGMENTS = 7;

export interface RingParams {
  radius: number;
  /** glass thickness */
  thickness: number;
  /** graphite backing thickness */
  backing: number;
  height: number;
  /** angular span of one segment, degrees */
  stepDeg: number;
  /** angular gap between segments, degrees */
  gapDeg: number;
  bookMatch: boolean;
}

export const RING: RingParams = {
  radius: 5.2,
  thickness: 0.42,
  backing: 0.12,
  height: 1.7,
  stepDeg: 13,
  gapDeg: 1.1,
  bookMatch: true,
};

const rad = (d: number) => (d * Math.PI) / 180;

function sector(rOuter: number, rInner: number, a0: number, a1: number, height: number, bevel: number) {
  const shape = new Shape();
  shape.absarc(0, 0, rOuter, a0, a1, false);
  shape.absarc(0, 0, rInner, a1, a0, true);
  shape.closePath();
  const g = new ExtrudeGeometry(shape, {
    depth: height,
    bevelEnabled: bevel > 0,
    bevelThickness: bevel,
    bevelSize: bevel * 0.8,
    bevelSegments: 2,
    curveSegments: 14,
  });
  g.rotateX(-Math.PI / 2);
  g.translate(0, -height / 2, 0);
  return g;
}

/** Segment k's centre angle: segment 0 faces +z (the camera) when the wheel angle is 0. */
export const segmentAngle = (k: number, p: RingParams = RING): number => rad(k * p.stepDeg);

export function createGlassGeometry(p: RingParams = RING): BufferGeometry {
  const parts: BufferGeometry[] = [];
  const Ro = p.radius;
  const Ri = Ro - p.thickness;
  const half = rad(p.stepDeg / 2) - rad(p.gapDeg / 2);

  for (let k = 0; k < SEGMENTS; k++) {
    // After rotateX(−90°) the shape's −y maps to +z (toward the camera): build the
    // sector around −π/2 and rotate it into place about y (positive = toward +x).
    const g = sector(Ro, Ri, -Math.PI / 2 - half, -Math.PI / 2 + half, p.height, 0.055);
    g.rotateY(segmentAngle(k, p));
    const pos = g.getAttribute('position');
    const seg = new Float32Array(pos.count).fill(k);
    const uv = new Float32Array(pos.count * 2);
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      const z = pos.getZ(i);
      let ang = Math.atan2(x, z) - segmentAngle(k, p);
      ang = Math.atan2(Math.sin(ang), Math.cos(ang));
      let u = (ang + half) / (2 * half);
      if (p.bookMatch && k % 2 === 1) u = 1 - u;
      uv[i * 2] = u * 1.4 + k * 0.29;
      uv[i * 2 + 1] = (y / p.height + 0.5) * 2.1;
    }
    g.setAttribute('aSegment', new BufferAttribute(seg, 1));
    g.setAttribute('uv', new BufferAttribute(uv, 2));
    parts.push(g);
  }
  const merged = mergeGeometries(parts, false);
  if (!merged) throw new Error('glass merge failed');
  merged.computeVertexNormals();
  for (const g of parts) g.dispose();
  return merged;
}

/** The graphite backing blocks behind the facets — one geometry. */
export function createBackingGeometry(p: RingParams = RING): BufferGeometry {
  const parts: BufferGeometry[] = [];
  const Ri = p.radius - p.thickness;
  const half = rad(p.stepDeg / 2) - rad(p.gapDeg / 2);
  for (let k = 0; k < SEGMENTS; k++) {
    const g = sector(Ri - 0.006, Ri - 0.006 - p.backing, -Math.PI / 2 - half, -Math.PI / 2 + half, p.height - 0.02, 0);
    g.rotateY(segmentAngle(k, p));
    parts.push(g);
  }
  const merged = mergeGeometries(parts, false);
  if (!merged) throw new Error('backing merge failed');
  merged.computeVertexNormals();
  for (const g of parts) g.dispose();
  return merged;
}

/** Facet: a flat image plane just inside the glass, tangent at the segment centre. */
export const facet = (p: RingParams = RING) => {
  const Ri = p.radius - p.thickness;
  const half = rad(p.stepDeg / 2) - rad(p.gapDeg / 2);
  // Overrun the glass so refraction offsets never reveal the backing at an edge.
  return { distance: Ri - 0.003, width: 2 * Ri * Math.sin(half) + 0.02, height: p.height + 0.02 };
};
