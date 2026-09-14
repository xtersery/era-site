precision highp float;

// A natural mineral becomes the architecture of ERA.
//
// One plane over the section, two passes, driven by the exit e (0 → 1):
//
//   uPass 0 — STRUCTURE (multiply): the wall's veining appears as shading in
//   whatever is there — plaster, portrait — spreading out of the stone, the
//   room's light going with it. Structure before colour: plaster over stone.
//
//   uPass 1 — THE SURFACE: a lit slab. Its albedo is the clinic's wall at
//   native scale (the reference cut, never stretched), but around the stone
//   the albedo is THE STONE'S OWN INTERIOR — its photograph sampled with
//   coordinates pulled toward it and reflected at its silhouette (the crystal
//   book-matching itself), expanding outward over e and re-coloured into the
//   wall's graphite palette, its facet ridges carried along as the first pale
//   veins. The slab surface is polished, not mirrored: a normal from the
//   wall's own luminance, one key from the upper left, a broad soft sheen, a
//   fine grain. The slab arrives from the stone and from the right edge; the
//   typography column on the left receives it last and calmest.

uniform sampler2D uMarble;    // the wall, native scale, a vertical mirror pair
uniform sampler2D uLuma;      // its luminance
uniform sampler2D uStoneTex;  // the quartz's photograph in its box (the body's tint map)
uniform sampler2D uProfile;   // the stone's left/right edge per row of its height
uniform sampler2D uRidge;     // the front face's facet ridges in the box
uniform vec2 uStone;          // the stone's centre in section uv, as seen
uniform vec2 uStoneSize;      // its half-size in section uv, as seen
uniform float uAspect;        // section width / height
uniform float uE;
uniform float uSheetW;        // how much of the sheet's width the section shows (1 desktop · ½ phone)
uniform float uSheetV;        // how much of its height
uniform float uSheetTop;      // where the section's top sits on the sheet (from the top)
uniform float uPass;
varying vec2 vUv;

float lum(vec3 c) { return dot(c, vec3(0.2126, 0.7152, 0.0722)); }
float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }

// the sheet, laid on the section's width (twice it on the phone), top-aligned
vec2 sheetUv(vec2 uv) {
  return vec2(0.5 - uSheetW * 0.5 + uv.x * uSheetW, 1.0 - uSheetTop - (1.0 - uv.y) * uSheetV);
}

// the stone's interior at a point of the section, reflected at its silhouette
// so that beyond its edges it continues itself — the way a slab is book-matched
vec4 stoneInterior(vec2 p) {
  vec2 b = (p - uStone) / (2.0 * uStoneSize) + 0.5; // the box uv
  float row = clamp(1.0 - b.y, 0.0, 1.0);
  vec2 edge = texture2D(uProfile, vec2(0.5, 1.0 - row)).rg; // left, right in box u
  float u = b.x;
  // reflect into the silhouette, twice at most
  if (u > edge.g) u = edge.g - (u - edge.g);
  if (u < edge.r) u = edge.r + (edge.r - u);
  if (u > edge.g) u = edge.g - (u - edge.g);
  float v = b.y;
  if (v > 1.0) v = 2.0 - v;
  if (v < 0.0) v = -v;
  vec4 c = texture2D(uStoneTex, vec2(clamp(u, 0.0, 1.0), clamp(v, 0.0, 1.0)));
  float ridge = texture2D(uRidge, vec2(clamp(u, 0.0, 1.0), clamp(v, 0.0, 1.0))).r;
  // outside the silhouette (its chipped corners) the stone is clear
  return vec4(mix(vec3(0.72, 0.7, 0.66), c.rgb, c.a), ridge);
}

void main() {
  vec2 suv = sheetUv(vUv);
  float vein = texture2D(uLuma, suv).r;

  // distance from the stone, in section heights (x scaled by the aspect)
  vec2 d = (vUv - uStone) * vec2(uAspect, 1.0);
  float dist = length(d) + (0.5 - vein) * 0.3; // the fronts run ahead along the veins

  // — structure —
  float reach = max(uE - 0.04, 0.0) * 2.3;
  float spread = 1.0 - smoothstep(reach - 0.3, reach + 0.4, dist);
  if (uPass < 0.5) {
    float veinStrength = 0.05 + 0.08 * smoothstep(0.0, 0.6, uE);
    float dim = 0.03 + 0.09 * smoothstep(0.1, 0.75, uE);
    float factor = 1.0 - spread * (veinStrength * (1.0 - vein) + dim);
    gl_FragColor = vec4(vec3(factor), 1.0);
    return;
  }

  // — the surface —
  // albedo: the wall
  vec3 slab = texture2D(uMarble, suv).rgb;

  // the stone's interior, expanding: coordinates pulled toward the stone
  float grow = smoothstep(0.12, 0.72, uE);
  float expansion = 1.0 + 2.6 * grow;
  vec2 p = uStone + (vUv - uStone) / expansion;
  // a slow warp, so the reflections at the silhouette fold like stone, not like glass
  p += 0.005 * grow * vec2(sin(vUv.y * 9.0 + vUv.x * 4.0), cos(vUv.x * 7.0 - vUv.y * 5.0));
  vec4 si = stoneInterior(p);
  // the crystal's smoke in the wall's palette: graphite in the thick zones,
  // the pale stone in the clear ones, a little of the wall's blue between
  float sl = lum(si.rgb);
  vec3 graphite = vec3(0.19, 0.2, 0.215);
  vec3 blueBand = vec3(0.50, 0.56, 0.63);
  // only the smoke expands — the dense inclusions — the clear zones let the
  // wall's own stone show; the smoke takes the wall's graphite, its edges its blue
  float density = 1.0 - smoothstep(0.18, 0.62, sl);
  vec3 smoke = mix(blueBand, graphite, smoothstep(0.3, 0.9, density));
  // the ridges: the fractures, now thin pale veins with a breath of gold
  vec3 veinPale = vec3(0.86, 0.82, 0.72);
  // where the stone's interior rules: a region around the stone that grows,
  // then settles back into the band the wall itself has there
  vec2 rel = (vUv - uStone) / uStoneSize;
  float rBox = length(rel);
  float local = 1.0 - smoothstep(0.45 + 1.2 * grow, 1.0 + 3.0 * grow, rBox);
  // the interior spreads sideways, along the band — little beyond the stone's ends
  local *= 1.0 - smoothstep(0.85, 1.5, abs(rel.y));
  float settleBack = 0.7 * smoothstep(0.62, 1.0, uE);
  float w = 0.78 * local * (1.0 - settleBack) * smoothstep(0.08, 0.3, uE); // the wall's own stone always shows through
  vec3 albedo = mix(slab, smoke, w * smoothstep(0.15, 0.6, density));
  albedo = mix(albedo, veinPale, w * si.a * 0.35);

  // relief: the wall's luminance as a height field — polished stone has depth
  vec2 px = vec2(1.0 / 836.0, 1.0 / 1882.0);
  float hx = texture2D(uLuma, suv + vec2(px.x, 0.0)).r - texture2D(uLuma, suv - vec2(px.x, 0.0)).r;
  float hy = texture2D(uLuma, suv + vec2(0.0, px.y)).r - texture2D(uLuma, suv - vec2(0.0, px.y)).r;
  // the stone's interior has its own relief while it rules
  float sx = lum(stoneInterior(p + vec2(0.004, 0.0)).rgb) - lum(stoneInterior(p - vec2(0.004, 0.0)).rgb);
  float sy = lum(stoneInterior(p + vec2(0.0, 0.004)).rgb) - lum(stoneInterior(p - vec2(0.0, 0.004)).rgb);
  vec2 grad = mix(vec2(hx, hy) * 3.0, vec2(sx, sy) * 1.6, w);
  vec3 n = normalize(vec3(-grad.x, -grad.y, 1.0));
  vec3 L = normalize(vec3(-0.5, 0.55, 0.75));   // the room's key, upper left
  vec3 V = vec3(0.0, 0.0, 1.0);
  vec3 H = normalize(L + V);
  float diff = 0.74 + 0.28 * clamp(dot(n, L), 0.0, 1.0);
  float sheen = pow(clamp(dot(n, H), 0.0, 1.0), 18.0) * 0.10;     // broad, soft: polished, not mirror
  // the key falls across the wall: a little brighter toward the upper left
  float fall = 0.95 + 0.09 * smoothstep(0.0, 1.0, (1.0 - vUv.x) * 0.5 + vUv.y * 0.5);
  // fine grain: stone is never flat
  float grain = (hash(vUv * vec2(1440.0, 900.0)) - 0.5) * 0.02;
  vec3 col = albedo * diff * fall + sheen + grain;

  // the slab arrives: out of the stone, and in from the right edge; the left
  // column last — the typography's breathing space
  float reachS = max(uE - 0.3, 0.0) * 2.2;
  float fromStone = 1.0 - smoothstep(reachS - 0.3, reachS + 0.4, dist);
  float reachE = max(uE - 0.22, 0.0) * 1.7;
  float fromEdge = 1.0 - smoothstep(reachE - 0.25, reachE + 0.3, (1.0 - vUv.x) * uAspect + (0.5 - vein) * 0.3);
  float arrive = max(fromStone, fromEdge) * smoothstep(0.28, 0.45, uE);
  // under the stone the surface is there from the start of the growth: the
  // stone's own interior, so its body can give way to itself
  arrive = max(arrive, w * smoothstep(0.2, 0.4, uE));
  gl_FragColor = vec4(col, arrive);
  #include <colorspace_fragment>
}
