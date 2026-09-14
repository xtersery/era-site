precision highp float;

// The transition, as a field around the stone. Everything ahead of the stone is
// the portrait being left; everything behind it is the portrait arriving; the
// stone's body (drawn over this plane, refracting the arriving portrait) is the
// threshold between them. Near the stone both images are pulled toward it —
// the one ahead compressed into the seam, the one behind stretched out of it
// and settling — and softened, as if reorganised through the mineral.
// Without the stone there is no seam and no field: nothing happens.

uniform sampler2D uOut;      // the outgoing portrait
uniform sampler2D uIn;       // the incoming portrait
uniform vec2 uOutRepeat; uniform vec2 uOutOffset;
uniform vec2 uInRepeat;  uniform vec2 uInOffset;
uniform sampler2D uProfile;  // the stone's left/right edge per row of its height
uniform vec2 uStone;         // the stone's centre, in frame uv
uniform vec2 uStoneSize;     // its projected half-size, in frame uv
uniform float uSkew;         // tan of its tilt: the edges lean
uniform float uWake;         // how far the field reaches, in frame uv
uniform float uAmount;       // how hard it pulls, in frame uv
uniform float uAspect;       // frame width / height
uniform float uSettle;       // 0 → 1 as the transition ends: the field lets go
varying vec2 vUv;

vec3 sampleSoft(sampler2D t, vec2 uv, float soft) {
  vec2 d = vec2(soft / uAspect, soft) * 0.6;
  vec3 c = texture2D(t, uv).rgb * 0.4;
  c += texture2D(t, uv + vec2(d.x, 0.0)).rgb * 0.15;
  c += texture2D(t, uv - vec2(d.x, 0.0)).rgb * 0.15;
  c += texture2D(t, uv + vec2(0.0, d.y)).rgb * 0.15;
  c += texture2D(t, uv - vec2(0.0, d.y)).rgb * 0.15;
  return c;
}

void main() {
  // where the stone's edges are on this row
  float row = clamp(0.5 - (vUv.y - uStone.y) / (2.0 * uStoneSize.y), 0.0, 1.0);
  vec2 prof = texture2D(uProfile, vec2(0.5, 1.0 - row)).rg;
  float lean = (vUv.y - uStone.y) * uSkew;
  // the seams sit a little inside the stone's silhouette, so they are always under its body
  float inset = uStoneSize.x * 0.22;
  float xL = uStone.x + (prof.r - 0.5) * 2.0 * uStoneSize.x + lean + inset; // leading edge (it travels left)
  float xR = uStone.x + (prof.g - 0.5) * 2.0 * uStoneSize.x + lean - inset; // trailing edge

  float ahead = xL - vUv.x;   // > 0: the portrait being left
  float behind = vUv.x - xR;  // > 0: the portrait arriving
  float release = 1.0 - uSettle;

  vec3 col;
  if (ahead > 0.0) {
    // compressed toward the seam, and softened as it nears the stone
    float w = exp(-ahead / (uWake * 0.6)) * release;
    vec2 uv = vUv + vec2(w * uAmount * 0.55, 0.0);
    col = sampleSoft(uOut, uv * uOutRepeat + uOutOffset, w * 0.012);
  } else if (behind > 0.0) {
    // pulled out of the stone: stretched toward it, settling with distance
    float w = exp(-behind / uWake) * release;
    vec2 uv = vUv - vec2(w * uAmount, 0.0);
    col = sampleSoft(uIn, uv * uInRepeat + uInOffset, w * 0.02);
  } else {
    // under the stone: the arriving portrait (the stone draws over this)
    col = texture2D(uIn, vUv * uInRepeat + uInOffset).rgb;
  }
  gl_FragColor = vec4(col, 1.0);
  #include <colorspace_fragment>
}
