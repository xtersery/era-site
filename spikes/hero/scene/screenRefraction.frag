precision highp float;

uniform sampler2D uScene;
uniform sampler2D uNormalMap;
uniform vec2 uResolution;
uniform float uIor;
uniform float uDispersion;
uniform vec3 uAttenuation;      // deep green — where the glass is thick
uniform float uAttenuationDistance;
uniform vec3 uTeal;             // cool dispersion pole (grazing)
uniform vec3 uGold;             // warm pole (key highlight)
uniform vec3 uKeyDir;           // view-space key light direction
uniform float uClarity;         // 0 refracting → 1 clear
uniform float uVeinStrength;

varying vec3 vNormal;
varying vec3 vViewDir;
varying vec2 vUv;
varying float vThick;

void main() {
  vec2 screen = gl_FragCoord.xy / uResolution;

  // Mineral flow inside the glass: perturb the surface normal by the vein map.
  vec3 vein = texture2D(uNormalMap, vUv).xyz * 2.0 - 1.0;
  vec3 n = normalize(vNormal + vec3(vein.xy, 0.0) * uVeinStrength * (0.5 + 0.5 * vThick));
  vec3 v = normalize(vViewDir);
  float ndv = clamp(dot(n, v), 0.0, 1.0);

  // Screen-space refraction: the tangential normal bends the sampled scene,
  // more where the lens is thick and less as it clears.
  // Bend falls to zero at the rim so samples never leave the lens footprint (no tearing).
  float bend = (uIor - 1.0) * 1.1 * (0.25 + 0.75 * vThick) * (1.0 - uClarity) * pow(ndv, 1.5);
  vec2 off = n.xy * bend;
  float r = texture2D(uScene, screen - off * (1.0 + uDispersion)).r;
  float g = texture2D(uScene, screen - off).g;
  float b = texture2D(uScene, screen - off * (1.0 - uDispersion)).b;
  vec3 col = vec3(r, g, b);

  // Beer–Lambert toward the attenuation colour: green lives in thickness.
  float path = (0.1 + vThick) * 0.6 / max(ndv, 0.25);
  vec3 att = exp(-(vec3(1.0) - uAttenuation) * path / uAttenuationDistance);
  col *= mix(att, vec3(1.0), uClarity);

  // Fresnel edge: teal at grazing; gold only where the key light catches.
  float fres = pow(1.0 - ndv, 3.2);
  vec3 h = normalize(uKeyDir + v);
  float spec = pow(max(dot(n, h), 0.0), 220.0);
  float rimGlint = pow(max(dot(n, h), 0.0), 24.0) * fres;
  col += uTeal * fres * 0.3 * (1.0 - uClarity);
  col += uGold * (spec * 0.85 + rimGlint * 0.35);
  // Rare sparkles along vein highlights where the key hits.
  col += uGold * pow(max(vein.z, 0.0), 60.0) * spec * 1.5;

  gl_FragColor = linearToOutputTexel(vec4(col, 1.0));
}
