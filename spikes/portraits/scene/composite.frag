precision highp float;

// The change comes out of the stone. The stone stands still on the frame's
// left edge; a FRONT leaves its edges and crosses the frame, and the field
// around the front is what moves the portraits: ahead of it the portrait being
// left is compressed toward it and softened; behind it (on the stone's side)
// the portrait arriving is drawn out and settles. The front has the stone's
// own edge for its shape, rounded beyond the stone's ends. Under the stone
// the field is the arriving portrait from the first moment — what the stone
// lets through is the next state. At rest the frame is the current portrait,
// pixel for pixel the DOM plate.

uniform sampler2D uOut;      // the portrait being left
uniform sampler2D uIn;       // the portrait arriving
uniform vec2 uOutRepeat; uniform vec2 uOutOffset;
uniform vec2 uInRepeat;  uniform vec2 uInOffset;
uniform sampler2D uProfile;  // the stone's left/right edge per row of its height
uniform vec2 uStone;         // the stone's centre, in frame uv
uniform vec2 uStoneSize;     // its projected half-size, in frame uv
uniform float uSkew;         // tan of its tilt: the edges lean
uniform float uWake;         // how far the field reaches, in frame uv
uniform float uAmount;       // how hard it pulls, in frame uv
uniform float uAspect;       // frame width / height
uniform float uFront;        // 0 at the stone's edge … 1 past the far edges
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
  // the stone's edges on this row (clamped beyond its ends), leaning with its tilt
  float rowRaw = 0.5 - (vUv.y - uStone.y) / (2.0 * uStoneSize.y);
  float row = clamp(rowRaw, 0.0, 1.0);
  float beyond = max(-rowRaw, rowRaw - 1.0); // > 0 above or below the stone
  vec2 prof = texture2D(uProfile, vec2(0.5, 1.0 - row)).rg;
  float lean = (vUv.y - uStone.y) * uSkew;
  // beyond the ends the front rounds off: it lags the further from the stone
  float lag = clamp(beyond, 0.0, 1.0);
  float lagX = lag * lag * 0.5;
  float inset = uStoneSize.x * 0.14;
  float xR = uStone.x + (prof.g - 0.5) * 2.0 * uStoneSize.x + lean - inset; // the stone's right edge
  float xL = uStone.x + (prof.r - 0.5) * 2.0 * uStoneSize.x + lean + inset; // its left edge

  // the two fronts: from the right edge rightward, from the left edge leftward
  float reach = uFront * 1.6;
  float frontR = xR + reach - lagX;
  float frontL = xL - reach + lagX;

  // ahead: still the portrait being left; behind: the portrait arriving
  float aheadR = vUv.x - frontR;      // > 0: right of the right front
  float aheadL = frontL - vUv.x;      // > 0: left of the left front
  float ahead = max(aheadR, aheadL);  // > 0 anywhere the change has not reached
  float behind = min(frontR - vUv.x, vUv.x - frontL); // > 0 between the fronts
  float release = 1.0 - uSettle;

  vec3 col;
  if (uFront <= 0.0) {
    col = texture2D(uOut, vUv * uOutRepeat + uOutOffset).rgb;
  } else if (ahead > 0.0) {
    // compressed toward the front, and softened as it nears it
    float w = exp(-ahead / (uWake * 0.6)) * release;
    float dir = aheadR > aheadL ? -1.0 : 1.0; // toward the front
    vec2 uv = vUv + vec2(dir * w * uAmount * 0.55, 0.0);
    col = sampleSoft(uOut, uv * uOutRepeat + uOutOffset, w * 0.012);
  } else {
    // pulled out of the stone: stretched toward the front, settling with distance
    float w = exp(-behind / uWake) * release;
    float dir = (frontR - vUv.x) < (vUv.x - frontL) ? 1.0 : -1.0; // toward the nearer front
    vec2 uv = vUv + vec2(dir * w * uAmount, 0.0);
    col = sampleSoft(uIn, uv * uInRepeat + uInOffset, w * 0.02);
  }
  gl_FragColor = vec4(col, 1.0);
  #include <colorspace_fragment>
}
