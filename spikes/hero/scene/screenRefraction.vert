attribute float aThick;

uniform float uVeinPhase;

varying vec3 vNormal;
varying vec3 vViewDir;
varying vec2 vUv;
varying float vThick;

void main() {
  vec4 worldPos = modelMatrix * vec4(position, 1.0);
  vec4 viewPos = viewMatrix * worldPos;
  vNormal = normalize(normalMatrix * normal);
  vViewDir = normalize(-viewPos.xyz);
  // Vein flow: slow drift along the ~35° direction of the wall's chevrons.
  vUv = uv * 1.6 + vec2(cos(0.61), sin(0.61)) * uVeinPhase;
  vThick = aThick;
  gl_Position = projectionMatrix * viewPos;
}
