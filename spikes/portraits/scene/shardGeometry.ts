import { ExtrudeGeometry, Shape, Vector3, type BufferGeometry } from 'three';
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

/**
 * The shard's body: the same uncut outline as the CSS fallback, given volume.
 *
 * A tall sliver of stone — no two facets parallel, a chip out of the upper
 * right, a heel at the lower left — extruded to a real thickness with a soft
 * bevel, then roughened: a low-frequency wobble along every edge, a slower
 * undulation across the faces (poured glass is never flat), and a fine grain
 * on the side walls where the stone was broken rather than cut.
 */
export const SHARD_OUTLINE: readonly (readonly [number, number])[] = [
  [0.34, -0.02], [0.70, -0.03], [0.86, 0.09], [0.79, 0.27], [0.93, 0.44], [0.88, 0.67],
  [0.97, 0.86], [0.72, 1.03], [0.38, 1.02], [0.16, 0.90], [0.24, 0.62], [0.05, 0.43], [0.12, 0.17],
];

/** value noise, 3-d, smooth — enough for stone, no library */
const hash = (x: number, y: number, z: number) => {
  const s = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453;
  return s - Math.floor(s);
};
const fade = (t: number) => t * t * (3 - 2 * t);
function noise(x: number, y: number, z: number): number {
  const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
  const xf = fade(x - xi), yf = fade(y - yi), zf = fade(z - zi);
  const l = (a: number, b: number, t: number) => a + (b - a) * t;
  const c = (dx: number, dy: number, dz: number) => hash(xi + dx, yi + dy, zi + dz);
  return l(
    l(l(c(0, 0, 0), c(1, 0, 0), xf), l(c(0, 1, 0), c(1, 1, 0), xf), yf),
    l(l(c(0, 0, 1), c(1, 0, 1), xf), l(c(0, 1, 1), c(1, 1, 1), xf), yf),
    zf,
  ) * 2 - 1;
}
const fbm = (x: number, y: number, z: number) =>
  noise(x, y, z) * 0.6 + noise(x * 2.1 + 5, y * 2.1 + 3, z * 2.1) * 0.28 + noise(x * 4.3 + 9, y * 4.3 + 1, z * 4.3) * 0.12;

export interface ShardGeometryOptions {
  /** width and height of the outline's box, world units */
  width: number;
  height: number;
  /** the stone's thickness, world units */
  depth: number;
  seed?: number;
}

export function createShardGeometry({ width, height, depth, seed = 0 }: ShardGeometryOptions): BufferGeometry {
  const shape = new Shape();
  SHARD_OUTLINE.forEach(([u, v], i) => {
    const x = (u - 0.5) * width;
    const y = (0.5 - v) * height;
    if (i === 0) shape.moveTo(x, y); else shape.lineTo(x, y);
  });
  shape.closePath();

  const raw = new ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: true,
    bevelThickness: depth * 0.16,
    bevelSize: Math.min(width, height) * 0.035,
    bevelSegments: 3,
    steps: 2,
    curveSegments: 1,
  });
  // weld so the normals can be smooth across the bevel, then roughen
  const geo = mergeVertices(raw, 1e-4);
  raw.dispose();
  geo.computeVertexNormals();

  const pos = geo.getAttribute('position');
  const nor = geo.getAttribute('normal');
  const p = new Vector3(), n = new Vector3();
  const halfDepth = depth / 2;
  for (let i = 0; i < pos.count; i++) {
    p.fromBufferAttribute(pos, i);
    n.fromBufferAttribute(nor, i);
    // how much this vertex belongs to a side wall (0 on the faces, 1 on the walls)
    const wall = 1 - Math.abs(n.z);
    // the break: a wobble along the walls at chip scale, and a fine grain
    const chip = fbm(p.x * 0.9 + seed, p.y * 0.9, p.z * 0.9) * 0.11 * (0.35 + wall);
    const grain = noise(p.x * 6 + seed, p.y * 6, p.z * 6) * 0.018 * wall;
    // the pour: the faces undulate slowly, as a thick slab of glass does
    const pour = fbm(p.x * 0.28 + 3 + seed, p.y * 0.28 + 7, 0) * 0.07 * (1 - wall);
    p.addScaledVector(n, chip + grain);
    p.z += pour * Math.sign(p.z - halfDepth + 1e-6);
    pos.setXYZ(i, p.x, p.y, p.z);
  }
  pos.needsUpdate = true;
  geo.computeVertexNormals();
  // centre the thickness on the origin so it turns about its own middle
  geo.translate(0, 0, -halfDepth);
  geo.computeBoundingSphere();
  return geo;
}
