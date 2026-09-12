precision highp float;

uniform sampler2D uMap;
uniform sampler2D uNext;
uniform float uMix;
uniform float uBand;
uniform float uCount;
uniform float uAngle;
uniform float uGlint;
uniform vec3 uGold;
uniform vec3 uTeal;
uniform float uBrightness;

varying vec2 vUv;

void main() {
  // Diagonal coordinate across the image (the wall's ~35°), normalised 0..1.
  vec2 d = vec2(cos(uAngle), sin(uAngle));
  float s = dot(vUv - 0.5, d) / 0.95 + 0.5;
  float band = floor(clamp(s, 0.0, 0.999) * uCount);
  if (band != uBand) discard;
  vec3 a = texture2D(uMap, vUv).rgb;
  vec3 b = texture2D(uNext, vUv).rgb;
  vec3 col = mix(a, b, uMix) * uBrightness;
  // Cut edges: a hairline of light on each stratum boundary (teal in, gold out).
  float local = fract(s * uCount);
  float edge = smoothstep(0.0, 0.035, local) * smoothstep(0.0, 0.035, 1.0 - local);
  col += (1.0 - edge) * mix(uTeal, uGold, local) * uGlint;
  gl_FragColor = linearToOutputTexel(vec4(col, 1.0));
}
