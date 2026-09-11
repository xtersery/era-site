// Full-screen quad pass-through.
// Use with a PlaneGeometry(2, 2) and a material that ignores the camera,
// or with the standard R3F plane when the effect is confined to a mesh.

varying vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
