import { BufferAttribute, LatheGeometry, Vector2 } from 'three';

/**
 * A thick plano-convex mineral lens, lathed. Front surface toward +z after the
 * mesh's rotation; flat back. Two shallow grooves at the rim are the **double
 * optical rim** — the official mark's double ring as geometry, read only as two
 * hairlines of refracted/reflected light. Adds `aThick` (0..1 thickness proxy)
 * for the screen-refraction path.
 */
export function createLensGeometry(radius = 1, thickness = 0.42, segments = 96): LatheGeometry {
  const points: Vector2[] = [];
  const edge = thickness * 0.42; // edge thickness (a heavy lens, not a bubble)
  // Back face, centre → rim
  points.push(new Vector2(0, 0));
  points.push(new Vector2(radius * 0.985, 0));
  // Rim band with two grooves
  const rimH = edge;
  points.push(new Vector2(radius, rimH * 0.1));
  points.push(new Vector2(radius, rimH * 0.28));
  points.push(new Vector2(radius * 0.992, rimH * 0.36)); // groove 1
  points.push(new Vector2(radius, rimH * 0.44));
  points.push(new Vector2(radius, rimH * 0.62));
  points.push(new Vector2(radius * 0.992, rimH * 0.7)); // groove 2
  points.push(new Vector2(radius, rimH * 0.78));
  points.push(new Vector2(radius, rimH));
  // Front surface: a shallow spherical cap from rim to centre
  const capSteps = 28;
  for (let i = 1; i <= capSteps; i++) {
    const t = i / capSteps;
    const r = radius * (1 - t);
    // sphere cap: height rises toward centre; ease for a heavier centre
    const h = edge + (thickness - edge) * Math.sqrt(1 - (r / radius) * (r / radius));
    points.push(new Vector2(Math.max(r, 0.0001), h));
  }
  points.push(new Vector2(0, thickness));

  const geometry = new LatheGeometry(points, segments);
  geometry.rotateX(-Math.PI / 2); // lathe axis Y → face +z
  geometry.computeVertexNormals();

  // Thickness proxy: local z after rotation (0 at back, thickness at centre front).
  const pos = geometry.getAttribute('position');
  const thick = new Float32Array(pos.count);
  const uv = new Float32Array(pos.count * 2);
  for (let i = 0; i < pos.count; i++) {
    thick[i] = Math.max(0, pos.getZ(i)) / thickness;
    // Planar UVs: the vein flow reads as a slab of mineral, not as a lathe's polar map.
    uv[i * 2] = (pos.getX(i) / radius) * 0.5 + 0.5;
    uv[i * 2 + 1] = (pos.getY(i) / radius) * 0.5 + 0.5;
  }
  geometry.setAttribute('aThick', new BufferAttribute(thick, 1));
  geometry.setAttribute('uv', new BufferAttribute(uv, 2));
  return geometry;
}
