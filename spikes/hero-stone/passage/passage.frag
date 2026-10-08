// The passage — Hero → Манифест, a vertical descent, driven by uP (0..1).
//
// An ALPHA layer over the page: it draws only the hero's layers and the
// membrane; wherever it draws nothing the manifesto's ground (DOM) shows
// through. At uP = 1 it draws nothing at all.
//
// 0.00–0.12  prepare: the hero, intact — the frame equals the DOM.
// 0.12–0.92  descent: the camera moves down; the onyx (far) and the emblem
//            (nearer) rise out of the frame at their own speeds; the onyx's
//            lower edge is not an edge but a soft front of warm light.
// 0.28–0.74  the membrane — a thin film of clear glass with a slight forest
//            tint — crosses the frame from below; it bends the hero's image
//            where it covers it and carries a line of light along its edges.
// 0.86–1.00  landing: the last of the light goes; nothing remains.
//
// Textures are sampled as data (no colour-space decode) and written raw, so
// the canvas shows the same pixels as the DOM images it takes over from.
// Output is premultiplied (the canvas is composited that way).

uniform sampler2D tOnyx;
uniform vec2 uOnyxSize;
uniform sampler2D tEmblem;
uniform vec2 uRes;    // canvas, CSS px
uniform vec3 uEmblem; // centre x, centre y (px, y down), square size (px)
uniform vec2 uDrift;  // the DOM emblem's pointer drift, px
uniform float uP;
uniform float uTime;
uniform float uQuality; // 1 full · 0 lean (fewer octaves, no drift in time)

varying vec2 vUv;

vec2 coverUv(vec2 uv, vec2 res, vec2 tex) {
  float rs = res.x / res.y;
  float ts = tex.x / tex.y;
  vec2 s = rs > ts ? vec2(1.0, ts / rs) : vec2(rs / ts, 1.0);
  return (uv - 0.5) * s + 0.5;
}

float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  int n = uQuality > 0.5 ? 4 : 2;
  for (int i = 0; i < 4; i++) {
    if (i >= n) break;
    v += a * snoise(p);
    p = p * 2.03 + 17.1;
    a *= 0.5;
  }
  return v;
}

/* two octaves — for the long, calm undulation of the film's edge */
float fbm2(vec2 p) { return 0.5 * snoise(p) + 0.25 * snoise(p * 2.03 + 17.1); }

void main() {
  vec2 uv = vUv;
  float H = uRes.y;
  vec2 px = vec2(uv.x * uRes.x, (1.0 - uv.y) * H);
  vec2 nuv = uv * vec2(uRes.x / H, 1.0);
  float time = uTime * uQuality;

  // ---- phases (the film's clock paces them; here they stay near-linear)
  float D = smoothstep(0.12, 0.92, uP);          // the descent
  float M = smoothstep(0.28, 0.74, uP);          // the membrane's crossing
  float mA = smoothstep(0.26, 0.34, uP) * (1.0 - smoothstep(0.84, 0.94, uP));

  // ---- the membrane: a horizontal film crossing from below, edges gently warped
  float warp = fbm2(vec2(nuv.x * 1.1 + time * 0.04, 3.1)) * 0.05 * H;
  float yM = H * (1.28 - 1.82 * M) + warp;
  float hw = 0.19 * H;
  float p = (px.y - yM) / hw;                    // −1 … 1 inside the film
  float ap = abs(p);
  float band = (1.0 - smoothstep(0.82, 1.0, ap)) * mA;

  // the film bends what is behind it: a vertical lens across its width, a
  // grain of micro-refraction from the field
  float n1 = fbm(nuv * 3.0 + time * 0.03);
  vec2 bend = vec2(n1 * 0.004 * uRes.x, -sin(clamp(p, -1.0, 1.0) * 3.14159) * 0.05 * H) * band;

  // ---- the hero's layers, rising out of the frame
  float shiftBg = 1.30 * D * H;                  // the onyx, far
  float shiftFg = 1.55 * D * H;                  // the emblem, nearer
  vec2 hpx = px + vec2(0.0, shiftBg) + bend;
  vec2 huv = hpx / uRes;
  vec3 hero = texture2D(tOnyx, coverUv(vec2(huv.x, 1.0 - huv.y), uRes, uOnyxSize)).rgb;

  // the onyx's lower part dissolves into warm light as it rises — a front,
  // not an edge (inside the image, so nothing is sampled past it)
  float front = smoothstep(0.0, 0.10, D);
  float feather = 0.30 * H * front;
  float grain = fbm(nuv * 2.4 + 11.0) * 0.05 * H * front;
  float edge = H - shiftBg + grain;              // the image's bottom, on screen
  float mask = smoothstep(edge, edge - feather, px.y);
  // the light at the front: the stone brightens toward ivory before it goes,
  // and a soft breath of that light lies on both sides of the line
  float glow = exp(-pow((px.y - edge) / (0.11 * H), 2.0));
  hero = mix(hero, vec3(0.975, 0.962, 0.94), (1.0 - mask) * 0.4 * front);

  // the emblem, its own layer, following the pointer's last drift
  vec2 c = uEmblem.xy + uDrift;
  vec2 epx = px + vec2(0.0, shiftFg) + bend;
  vec2 euv = (epx - (c - uEmblem.z * 0.5)) / uEmblem.z;
  if (all(greaterThan(euv, vec2(0.0))) && all(lessThan(euv, vec2(1.0)))) {
    vec4 e = texture2D(tEmblem, vec2(euv.x, 1.0 - euv.y));
    hero = mix(hero, e.rgb, e.a);
  }
  float a = mask;
  vec3 col = hero * a;                           // premultiplied

  // ---- the membrane over the hero: the slight forest tint of clear glass
  col *= mix(vec3(1.0), vec3(0.905, 0.955, 0.93), band * 0.9);

  // ---- the membrane over everything: a whisper of the same tint, and the
  // glass's own edges — a fine dark hairline where the film ends
  float lineU = exp(-pow((p + 0.95) / 0.035, 2.0));
  float lineL = exp(-pow((p - 0.95) / 0.035, 2.0));
  float rimU = exp(-pow((p + 1.01) / 0.02, 2.0));
  float rimL = exp(-pow((p - 1.01) / 0.02, 2.0));
  float ta = (0.05 * band + 0.12 * (rimU + rimL)) * mA;
  col = col * (1.0 - ta) + vec3(0.30, 0.42, 0.36) * ta;
  a = a * (1.0 - ta) + ta;

  // light along the film's edges — the upper edge carries more; a warm
  // breath of the hero's light inside it, carried into the manifesto
  float breath = exp(-pow((p + 0.6) / 0.5, 2.0)) * (1.0 - smoothstep(0.9, 1.3, ap));
  vec3 light = vec3(1.0, 0.975, 0.925) * (lineU * 0.09 + lineL * 0.04) + vec3(1.0, 0.93, 0.78) * lineU * 0.03;
  light += vec3(1.0, 0.965, 0.90) * breath * 0.04;
  col += light * mA;

  // the front's own light, on both sides of the line, fading as the descent ends
  col += vec3(1.0, 0.965, 0.90) * glow * 0.06 * front * (1.0 - smoothstep(0.85, 1.0, D));

  gl_FragColor = vec4(min(col, vec3(1.0)), a);
}
