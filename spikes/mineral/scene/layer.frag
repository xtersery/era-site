precision highp float;

// A layer of the crystal's interior: a dark translucent plane of its smoke —
// the photograph's density at the large scale, wisps of noise at the small —
// lit from behind by the room, thick with the fog around the viewer.
uniform sampler2D uPhoto;
uniform float uOpacity;
uniform float uSeed;
uniform float uFogDensity;
uniform vec3 uFogColor;
uniform float uTime;
uniform vec3 uKey;
varying vec2 vUv;
varying vec3 vWorld;
varying vec3 vNormalW;

__NOISE__

float lum(vec3 c) { return dot(c, vec3(0.2126, 0.7152, 0.0722)); }

void main() {
  vec4 ph = texture2D(uPhoto, vUv);
  float dens = (1.0 - smoothstep(0.22, 0.8, lum(ph.rgb))) * ph.a;
  vec2 w = vWorld.xy * 5.0 + uSeed * 13.0;
  float wisp = fbm(w + 0.15 * vec2(sin(uTime * 0.05 + uSeed), cos(uTime * 0.04)));
  float wisp2 = fbm(w * 3.1 - uSeed * 7.0);
  float a = smoothstep(0.25, 0.9, dens * (0.35 + 0.65 * wisp) * (0.6 + 0.4 * wisp2));
  // the smoke: warm graphite, lighter where thin
  vec3 col = mix(vec3(0.46, 0.42, 0.38), vec3(0.14, 0.13, 0.12), a);
  // the room's light passing through the plane: a soft sheen that moves as
  // the viewer moves — the planes are glass to it, seen from either side
  vec3 V = normalize(cameraPosition - vWorld);
  vec3 N = normalize(vNormalW) * sign(dot(normalize(vNormalW), V) + 0.0001);
  vec3 H = normalize(normalize(uKey) + V);
  float pass = pow(clamp(dot(N, H), 0.0, 1.0), 36.0);
  col += vec3(0.95, 0.86, 0.7) * pass * 0.42 * (1.0 - a * 0.6);
  a = max(a, pass * 0.5);
  float dCam = length(cameraPosition - vWorld);
  float fog = 1.0 - exp(-pow(dCam * uFogDensity, 2.0));
  col = mix(col, uFogColor, fog);
  gl_FragColor = vec4(col, a * uOpacity);
  #include <colorspace_fragment>
}
