// The crystal's shell becoming the wall: its vertices settle toward the wall's
// plane (uFlatten 0 → 1), their normals with them. The wall plane uses the
// same shader with uFlatten 1, so the two meet as one surface.
uniform float uFlatten;
uniform float uWallZ;
varying vec3 vWorld;
varying vec3 vNormalW;
varying vec2 vUv;

void main() {
  vec4 w = modelMatrix * vec4(position, 1.0);
  w.z = mix(w.z, uWallZ, uFlatten);
  vec3 n = normalize(mat3(modelMatrix) * normal);
  vNormalW = normalize(mix(n, vec3(0.0, 0.0, 1.0), uFlatten));
  vWorld = w.xyz;
  vUv = uv;
  gl_Position = projectionMatrix * viewMatrix * w;
}
