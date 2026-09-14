import { BufferGeometry, DataTexture, Float32BufferAttribute, LinearFilter, RGFormat, UnsignedByteType } from 'three';

import { trace } from './quartzTrace';

/**
 * The quartz, from the photograph.
 *
 * `quartzTrace.ts` is the reference (`src/assets/smoky-quartz.png`) traced:
 * its silhouette per row — the real chipped, concave flanks — and the
 * luminance of the smoke inside. The body is a structured grid laid over that
 * silhouette: every row runs from the stone's left edge to its right, so the
 * outline is the photograph's, not a polygon's. The front and back faces
 * swell to a thickness that tapers into the flanks, and carry a relief of a
 * few large planes meeting at ridges — a crystal's faces. Four rim strips
 * close the body. Indexed, with smooth normals: the planes shade flat because
 * they are flat; the ridges soften only over one cell.
 */
const ROWS: readonly (readonly [number, number])[] = trace.rows;

/** the reference's width-to-height, so the stone keeps the photograph's proportion */
export const QUARTZ_ASPECT: number = trace.box.aspect;

export interface QuartzOptions {
  /** the stone's height in world units; its width follows the reference's aspect × `narrow` */
  height: number;
  /** thickness at the fullest point, world units */
  depth: number;
  /** 1 keeps the photograph's proportion; < 1 narrows a little */
  narrow?: number;
  seed?: number;
}

const hash = (n: number) => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
const smooth = (t: number) => { const s = Math.min(1, Math.max(0, t)); return s * s * (3 - 2 * s); };

/** a crystal's relief: a few large planes, the highest wins — ridges where they meet */
function facets(seed: number, count: number) {
  const planes = Array.from({ length: count }, (_, i) => ({
    cx: hash(seed + i * 3) - 0.5,
    cy: hash(seed + i * 3 + 1) - 0.5,
    ax: (hash(seed + i * 7 + 2) - 0.5) * 0.7,
    ay: (hash(seed + i * 7 + 5) - 0.5) * 0.36,
    c: hash(seed + i * 11 + 9) * 0.12,
  }));
  return (u: number, v: number) => {
    let m = -Infinity;
    for (const p of planes) m = Math.max(m, p.ax * (u - p.cx) + p.ay * (v - p.cy) + p.c);
    return m;
  };
}

export function createQuartzGeometry({ height, depth, narrow = 1, seed = 0 }: QuartzOptions): BufferGeometry {
  const rows = ROWS.length;
  const cols = 40;
  const width = height * QUARTZ_ASPECT * narrow;
  const front = facets(seed, 7);
  const back = facets(seed + 100, 6);

  const pos: number[] = [];
  const uv: number[] = [];
  const idx: number[] = [];

  // the thickness field: full in the body, tapering into the flanks and the ends
  const thick = (r: number, u: number) => {
    const [l, rr] = ROWS[r]!;
    const rowW = Math.max(0.02, rr - l);
    const acrossFrac = Math.min(u, 1 - u) * rowW; // distance to the nearer flank, in box widths
    const alongFrac = Math.min(r, rows - 1 - r) / rows; // distance to the nearer end
    const t = smooth(acrossFrac / 0.22) * smooth(alongFrac / 0.12);
    return depth * (0.18 + 0.82 * Math.pow(t, 0.6));
  };
  const xy = (r: number, u: number): [number, number] => {
    const [l, rr] = ROWS[r]!;
    const x = (l + (rr - l) * u - 0.5) * width;
    const y = (0.5 - (r + 0.5) / rows) * height;
    return [x, y];
  };

  // front and back faces: rows × cols each
  const put = (r: number, c: number, side: 1 | -1) => {
    const u = c / (cols - 1);
    const [x, y] = xy(r, u);
    const v = 1 - (r + 0.5) / rows;
    const relief = side === 1 ? front(u - 0.5, v - 0.5) : back(u - 0.5, v - 0.5);
    const th = thick(r, u);
    const z = side * (th * 0.5 + relief * depth * 0.85 * Math.pow(th / depth, 0.5));
    pos.push(x, y, z);
    // uv in the photograph's crop box, so its smoke lands where it is in the stone
    const [l, rr] = ROWS[r]!;
    const bu = l + (rr - l) * u;
    uv.push(side === 1 ? bu : 1 - bu, v);
  };
  const face = (side: 1 | -1) => {
    const first = pos.length / 3;
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) put(r, c, side);
    for (let r = 0; r < rows - 1; r++) {
      for (let c = 0; c < cols - 1; c++) {
        const a = first + r * cols + c, b = a + 1, d = a + cols, e = d + 1;
        if (side === 1) idx.push(a, d, b, b, d, e); else idx.push(a, b, d, b, e, d);
      }
    }
    return first;
  };
  const f0 = face(1);
  const b0 = face(-1);

  // the rim: strips joining the two faces along both flanks and both ends
  const strip = (frontIds: number[], backIds: number[], flip: boolean) => {
    // duplicate the vertices so the rim keeps its own normals
    const dup = (i: number) => {
      pos.push(pos[i * 3]!, pos[i * 3 + 1]!, pos[i * 3 + 2]!);
      uv.push(uv[i * 2]!, uv[i * 2 + 1]!);
      return pos.length / 3 - 1;
    };
    const fa = frontIds.map(dup);
    const ba = backIds.map(dup);
    for (let i = 0; i < fa.length - 1; i++) {
      const a = fa[i]!, b = fa[i + 1]!, c = ba[i]!, d = ba[i + 1]!;
      if (flip) idx.push(a, b, c, b, d, c); else idx.push(a, c, b, b, c, d);
    }
  };
  const col = (first: number, c: number) => Array.from({ length: rows }, (_, r) => first + r * cols + c);
  const row = (first: number, r: number) => Array.from({ length: cols }, (_, c) => first + r * cols + c);
  strip(col(f0, 0), col(b0, 0), false); // left flank
  strip(col(f0, cols - 1), col(b0, cols - 1), true); // right flank
  strip(row(f0, 0), row(b0, 0), true); // top
  strip(row(f0, rows - 1), row(b0, rows - 1), false); // bottom

  const geo = new BufferGeometry();
  geo.setAttribute('position', new Float32BufferAttribute(pos, 3));
  geo.setAttribute('uv', new Float32BufferAttribute(uv, 2));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  geo.computeBoundingSphere();
  return geo;
}

/**
 * The stone's silhouette as a profile for the composite: for each row, its
 * left and right edge (0…1 of its width) — straight from the trace.
 */
export function createEdgeProfile(): DataTexture {
  const rows = ROWS.length;
  const data = new Uint8Array(rows * 2);
  for (let r = 0; r < rows; r++) {
    const [l, rr] = ROWS[r]!;
    data[r * 2] = Math.round(l * 255);
    data[r * 2 + 1] = Math.round(rr * 255);
  }
  const t = new DataTexture(data, 1, rows, RGFormat, UnsignedByteType);
  t.minFilter = LinearFilter;
  t.magFilter = LinearFilter;
  t.needsUpdate = true;
  return t;
}
