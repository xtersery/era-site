import { DataTexture, Float32BufferAttribute, RGFormat, UnsignedByteType, Vector3, type BufferGeometry } from 'three';
import { ConvexGeometry } from 'three/examples/jsm/geometries/ConvexGeometry.js';

/**
 * The quartz: a tall smoky slab with a few large polished facets and a rough
 * broken flank — the form of the reference (`src/assets/парящий_дымчатый_кварц.png`),
 * not a gem. Built as the convex hull of the slab's outline set at two depths
 * with the depth broken per corner, plus a handful of points pushed out of
 * the faces — so the hull resolves into large flat planes at slightly
 * different angles, the way a quartz face is a few crystal planes, not one.
 * Flat-shaded: every facet keeps its own normal.
 */
export const QUARTZ_OUTLINE: readonly (readonly [number, number])[] = [
  [0.40, -0.02], [0.66, -0.03], [0.84, 0.10], [0.80, 0.30], [0.94, 0.47], [0.90, 0.69],
  [0.96, 0.88], [0.70, 1.03], [0.38, 1.02], [0.14, 0.90], [0.22, 0.62], [0.05, 0.42], [0.13, 0.16],
];

const hash = (n: number) => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };

export interface QuartzOptions {
  width: number;
  height: number;
  depth: number;
  seed?: number;
}

export function createQuartzGeometry({ width, height, depth, seed = 0 }: QuartzOptions): BufferGeometry {
  const pts: Vector3[] = [];
  QUARTZ_OUTLINE.forEach(([u, v], i) => {
    const x = (u - 0.5) * width;
    const y = (0.5 - v) * height;
    // each corner sits at its own depth on each face: the faces break into planes
    const jf = (hash(i + seed) - 0.5) * depth * 0.8;
    const jb = (hash(i + 40 + seed) - 0.5) * depth * 0.8;
    // the broken flank: the right-hand corners pull in a little, unevenly
    const flank = u > 0.75 ? -(hash(i + 80 + seed) * 0.06 * width) : 0;
    pts.push(new Vector3(x + flank, y, depth / 2 + jf));
    pts.push(new Vector3(x + flank, y, -depth / 2 + jb));
  });
  // a few points lifted off the faces: the large polished planes of the reference
  const lifts: [number, number, number][] = [
    [0.42, 0.22, 0.38], [0.6, 0.46, 0.48], [0.34, 0.7, 0.34], [0.64, 0.86, 0.3], [0.5, 0.58, 0.44],
    [0.5, 0.35, -0.34], [0.44, 0.66, -0.4], [0.62, 0.2, -0.3],
  ];
  lifts.forEach(([u, v, dz]) => pts.push(new Vector3((u - 0.5) * width, (0.5 - v) * height, dz * depth)));
  const geo = new ConvexGeometry(pts);
  geo.computeVertexNormals(); // non-indexed: one normal per facet
  // planar UVs from the outline box, for the cloud map
  const pos = geo.getAttribute('position');
  const uv = new Float32Array(pos.count * 2);
  for (let i = 0; i < pos.count; i++) {
    uv[i * 2] = pos.getX(i) / width + 0.5;
    uv[i * 2 + 1] = pos.getY(i) / height + 0.5;
  }
  geo.setAttribute('uv', new Float32BufferAttribute(uv, 2));
  geo.computeBoundingSphere();
  return geo;
}

/**
 * The slab's silhouette as a profile: for each row of its height, where its
 * left and right edges are (0…1 of its width). The composite shader reads it
 * to know where the stone's leading and trailing edges fall on every row —
 * the seam has the stone's shape, not a straight line.
 */
export function createEdgeProfile(rows = 64): DataTexture {
  const data = new Uint8Array(rows * 2);
  const pts = QUARTZ_OUTLINE;
  for (let r = 0; r < rows; r++) {
    const v = (r + 0.5) / rows;
    let l = 1, rgt = 0;
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i]!, b = pts[(i + 1) % pts.length]!;
      if ((a[1] <= v && b[1] > v) || (b[1] <= v && a[1] > v)) {
        const t = (v - a[1]) / (b[1] - a[1]);
        const x = a[0] + (b[0] - a[0]) * t;
        l = Math.min(l, x);
        rgt = Math.max(rgt, x);
      }
    }
    if (rgt < l) { l = 0.5; rgt = 0.5; }
    data[r * 2] = Math.round(Math.max(0, Math.min(1, l)) * 255);
    data[r * 2 + 1] = Math.round(Math.max(0, Math.min(1, rgt)) * 255);
  }
  const t = new DataTexture(data, 1, rows, RGFormat, UnsignedByteType);
  t.needsUpdate = true;
  return t;
}
