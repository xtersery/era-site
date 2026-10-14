precision highp float;

// Water as light — the glints — and the passage in which that light settles
// into the wall of the clinic.
//
// AT REST. Nothing pours: the room is lit by water somewhere out of frame.
// A caustic network — the light a rippling surface throws — lies on the
// boundary between the wall and the frame and over the picture's backdrop,
// never over her face: slow, breathing, warm (one key, champagne), with the
// faintest forest in the cells between the light. Under it the backdrop
// bends by a hair, the way a wall looks through moving water's light. It is
// a mood, not an object (docs/references/water-glints-ref.png).
//
// THE PASSAGE (uT 0 → 1, scrubbed by the page's scroll). The same light: it
// spreads over the whole view and grows as the view comes closer; its motion
// slows to stillness and its cells draw out along the flow of the wall's
// veins — light sliding on a surface; the network's threads thin into lines
// and take the gold of the veins (the light mineralising); inside them the
// wall's own structure rises, its veins first, its pale slab last; the glints
// settle into the veins and go out; what is left is the sheet as the
// founder's room lays it — the hero's onyx. Every quantity is continuous in
// uT.

uniform sampler2D uPortrait; uniform vec2 uRepeat; uniform vec2 uOffset;
uniform vec4 uFrame;       // the frame's rect in world units: x0, y0, x1, y1
uniform vec3 uWallTone;
uniform sampler2D uMarble;  // the onyx sheet (mipmapped: read broad for its structure)
uniform vec4 uSheet;       // the sheet's place in world units: x0, yTop, width, height
uniform vec4 uView;        // the world rect this plane shows
uniform float uAspect;
uniform float uTime;
uniform float uT;          // the passage
uniform vec2 uField;       // the light's centre (section x) and half-width (fraction of the width) at rest
uniform float uGlint;      // the glints' intensity at rest
uniform float uFace;       // section x beyond which the light never lies (her face)
uniform vec2 uPointer;     // −1 … 1
uniform float uPhone;
varying vec2 vUv;

// ---- noise ----
vec2 hash2(vec2 p) { p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3))); return fract(sin(p) * 43758.5453123); }
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  vec2 g00 = hash2(i) * 2.0 - 1.0, g10 = hash2(i + vec2(1.0, 0.0)) * 2.0 - 1.0, g01 = hash2(i + vec2(0.0, 1.0)) * 2.0 - 1.0, g11 = hash2(i + vec2(1.0, 1.0)) * 2.0 - 1.0;
  return mix(mix(dot(g00, f), dot(g10, f - vec2(1.0, 0.0)), u.x), mix(dot(g01, f - vec2(0.0, 1.0)), dot(g11, f - vec2(1.0, 1.0)), u.x), u.y);
}
float fbm(vec2 p) {
  float v = 0.0, a = 0.5;
  for (int i = 0; i < 3; i++) { v += a * noise(p); p = p * 2.07 + vec2(1.3, 7.1); a *= 0.5; }
  return v;
}
float sm(float a, float b, float x) { return smoothstep(a, b, x); }
float seg(float t, float a, float b) { return sm(0.0, 1.0, (t - a) / (b - a)); }

/**
 * The caustic: the edges of a slowly moving Voronoi cell field — the bright
 * lines a rippling surface focuses. `motion` is how much the points move
 * (0 = still); `edge` how thin the light is. Returns 0 … 1.
 */
float caustic(vec2 q, float time, float motion, float edge) {
  vec2 cell = floor(q), f = fract(q);
  float d1 = 8.0, d2 = 8.0;
  for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++) {
    vec2 o = vec2(float(x), float(y));
    vec2 r = hash2(cell + o);
    vec2 pt = o + 0.5 + 0.42 * sin(time * (0.6 + 0.5 * r) + 6.2831 * r) * motion + (1.0 - motion) * (r - 0.5) * 0.9;
    float d = length(pt - f);
    if (d < d1) { d2 = d1; d1 = d; } else if (d < d2) { d2 = d; }
  }
  // the light is on the cell edges: where the two nearest points are equally near — soft, as thrown light is
  float e = 1.0 - sm(0.0, edge, d2 - d1);
  return e * e;
}

vec3 room(vec2 p, float veil) {
  vec2 uv = (p - uFrame.xy) / (uFrame.zw - uFrame.xy);
  if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) return uWallTone;
  vec3 c = texture2D(uPortrait, uv * uRepeat + uOffset).rgb;
  float lum = dot(c, vec3(0.2126, 0.7152, 0.0722));
  vec3 print = uWallTone * (1.0 + 0.06 * (lum - 0.5) * (1.0 - veil));
  return mix(c, mix(vec3(lum), print, veil), veil);
}
vec2 sheetUv(vec2 p) { return vec2((p.x - uSheet.x) / uSheet.z, 1.0 - (uSheet.y - p.y) / uSheet.w); }

void main() {
  vec2 p = mix(uView.xy, uView.zw, vUv);
  vec2 s = vec2(vUv.x, 1.0 - vUv.y); // section space, y down
  float T = uT;

  // ---- the passage's continuous quantities ----
  float veil   = seg(T, 0.16, 0.44);    // the picture recedes into the plaster — before the light reaches her
  float spread = seg(T, 0.24, 0.56);    // the light spreads over the whole view, quieter as it does
  float closer = seg(T, 0.34, 0.8);     // the view comes closer: the network grows
  float still  = seg(T, 0.48, 0.84);    // its motion slows to stillness
  float draw   = seg(T, 0.5, 0.8);      // the cells draw out along the flow of the veins and mineralise — gold, in the stone
  float dark   = seg(T, 0.56, 0.86);    // the wall's structure rises in the light's shadows
  float rise   = seg(T, 0.58, 0.92);    // the wall rises inside the light — its veins first, in the plaster's light, the pale slab last
  float tone   = seg(T, 0.74, 0.97);    // and then its own colour (complete just before the pin's end: the last frames are the wall)
  float settle = seg(T, 0.8, 0.97);     // the gilt threads settle into the veins and go out

  // ---- where the light lies at rest: a soft band on the boundary, never on her face ----
  float band = 1.0 - sm(uField.y * 0.6, uField.y * 1.5, abs(s.x - uField.x));
  band *= 1.0 - sm(uFace - 0.06, uFace + 0.02, s.x);
  // the phone has no boundary beside her — the portrait spans the view — so at rest there is no light;
  // it arrives only with the passage (`spread`), once the picture has receded
  band *= 1.0 - uPhone;
  band *= (0.7 + 0.3 * fbm(vec2(s.x * 3.0, s.y * 2.0 - uTime * 0.03))); // uneven, as thrown light is
  float where = mix(band, 1.0, spread);

  // ---- the caustic field ----
  // measured against the view; slowly drifting; larger as the view comes closer;
  // in the passage its coordinates turn onto the veins' flow and stretch along it
  float ang = radians(35.0) * draw;
  vec2 c0 = vec2(vUv.x * uAspect, vUv.y) - vec2(0.5 * uAspect, 0.5);
  vec2 c1 = vec2(cos(ang) * c0.x - sin(ang) * c0.y, sin(ang) * c0.x + cos(ang) * c0.y);
  c1.x /= 1.0 + 4.0 * draw; // long along the flow
  float scale = (uPhone > 0.5 ? 4.0 : 6.0) / (1.0 + 1.6 * closer);
  float motion = 1.0 - still;
  float time = uTime * (0.3 + 0.05 * uPointer.x);
  // the field is warped, so the cells are never polygons — water, not a net
  vec2 warp = vec2(fbm(c1 * 1.7 + time * 0.08), fbm(c1 * 1.7 + vec2(5.0, 2.0) - time * 0.06)) * 0.35 * motion;
  vec2 q = (c1 + warp) * scale + vec2(0.0, -uTime * 0.015 * motion);
  float thin = mix(0.32, 0.15, draw);
  float ca = caustic(q, time, motion, thin);
  float cb = caustic(q * 1.7 + vec2(3.7, 1.1), time * 0.8 + 2.0, motion, thin * 1.3);
  float glint = ca * 0.7 + cb * 0.5;
  // the cells' shade: between the light, water's own faint green
  float shade = (1.0 - ca) * (1.0 - cb);

  // ---- the surface under the light: the room, and in the passage the wall — its veins first ----
  vec2 su = sheetUv(p);
  vec3 marble = texture2D(uMarble, su).rgb;
  const vec3 LUM = vec3(0.2126, 0.7152, 0.0722);
  float luma = dot(texture2D(uMarble, su, 3.0).rgb, LUM); // broad: the slab's clouds and bands
  float veins = sm(0.08, 0.3, luma - dot(marble, LUM));   // fine: where the stone is darker than its surround — the veins
  float wRise = max(sm(0.0, 1.0, rise * 1.25 - luma * 0.35 + veins * 0.3), tone); // the veins first, the pale slab last, all of it by the end
  // under moving light the backdrop bends by a hair
  vec2 bend = vec2(fbm(q * 0.7 + uTime * 0.05), fbm(q * 0.7 + vec2(4.1, 2.3) - uTime * 0.04)) * 0.006 * (uView.z - uView.x) * (1.0 - still) * where;
  // the stone arrives as structure before it arrives as colour: in the plaster's own light first, then itself
  vec3 stone = mix(mix(uWallTone, marble, 0.7), marble, tone);
  vec3 surface = mix(room(p + bend, veil), stone, wRise);

  // ---- the light on it ----
  vec3 champagne = vec3(0.99, 0.92, 0.76);
  vec3 gold = vec3(0.93, 0.78, 0.50);
  vec3 forest = vec3(0.74, 0.84, 0.79);
  // the light mineralises: as the threads draw out along the flow they take the gold of the veins
  vec3 key = mix(champagne, gold, 0.65 * draw);
  // the glints: strongest at rest and while they spread; as the wall rises they take its structure
  // (gathering on the veins, thinning on the open slab) and, settling, go out
  float placed = mix(glint, glint * (0.35 + 0.65 * luma) * (1.0 + 1.6 * veins), dark);
  float intensity = uGlint * (1.0 - 0.45 * spread) * (1.0 - 0.3 * draw) * (1.0 - settle);
  vec3 col = surface;
  col *= mix(vec3(1.0), forest, 0.16 * shade * where * (1.0 - dark));
  // light is added, not painted: it lifts what it falls on toward champagne — less on what is already light
  float lumS = dot(surface, vec3(0.2126, 0.7152, 0.0722));
  vec3 lit = col + key * placed * intensity * where * (1.0 - 0.55 * lumS);
  // … until it mineralises: as the threads still and draw out they stop being light and become
  // the gold of the veins IN the stone — pigment, darker than the slab — and go out with the settling
  float mineral = draw * (1.0 - settle);
  vec3 veinGold = vec3(0.80, 0.62, 0.34);
  vec3 gilt = col * mix(vec3(1.0), veinGold, clamp(placed * 1.4, 0.0, 1.0) * uGlint * 1.6 * where);
  col = mix(lit, gilt, mineral);
  // the wall's dark rises first in the light's shadows — the cells between the threads
  col *= mix(1.0, 0.5 + 0.5 * luma, dark * (1.0 - wRise) * shade * where);

  // outside the light, before the wall: nothing of ours
  float alpha = max(where, wRise);
  gl_FragColor = vec4(col, alpha);
  #include <colorspace_fragment>
}
