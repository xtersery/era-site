precision highp float;

// What remains of the quartz once it has settled: its relief. The stone's own
// facets, shaded by the room's key light, multiplied into the slab — a carved
// form in the wall reads by its shadows. uK fades it in as the stone settles.
uniform float uK;
varying vec3 vN;

void main() {
  vec3 L = normalize(vec3(-0.7, 0.5, 0.5));
  float lam = clamp(dot(normalize(vN), L), 0.0, 1.0);
  float shade = min(0.56 + 0.62 * lam, 1.0);
  gl_FragColor = vec4(vec3(mix(1.0, shade, uK)), 1.0);
}
