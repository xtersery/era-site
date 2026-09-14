precision highp float;

// ONE material for the inside of the crystal and for the wall, so that the
// crystal can become the wall without a cut. uBecome runs it:
//
//   0    the crystal's interior: its own photograph — smoke, inclusions,
//        fractures — as dark mineral, lit by the room's key, thick with fog
//   →    the smoke is read as density: the dense zones keep their graphite,
//        the clear ones take the wall's blue-grey; the facet ridges (baked
//        from the geometry) become the first pale veins
//   →    the clinic's slab arrives across the surface along those veins —
//        the reference at native scale, projected in world units, never
//        stretched — and the surface polishes: a relief from the slab's own
//        luminance, one key, a broad soft sheen, grain
//   1    the wall. Where the stone was, its smoke stays as the graphite band.

uniform sampler2D uPhoto;     // the quartz's photograph in its box, alpha outside
uniform sampler2D uRidge;     // its facet ridges
uniform sampler2D uMarble;    // the wall, native scale, mirror pair
uniform sampler2D uLuma;      // its luminance
uniform vec2 uBox;            // the stone's box centre, world xy
uniform vec2 uBoxHalf;        // its half size, world
uniform vec2 uSheet;          // the sheet's centre, world xy
uniform vec2 uSheetSize;      // its size, world
uniform float uBecome;        // 0 crystal … 1 wall
uniform float uSpread;        // how far the slab has crossed from the stone (world units)
uniform float uFogDensity;    // the smoke around the viewer, inside
uniform vec3 uFogColor;
uniform vec3 uKey;            // light direction
uniform float uInside;        // 1 when seen from inside (the shell): back-lit, darker
uniform float uFlatten;       // the shell's settling into the wall (its normals turn with it)
uniform float uOpacity;
varying vec3 vWorld;
varying vec3 vNormalW;
varying vec2 vUv;

float lum(vec3 c) { return dot(c, vec3(0.2126, 0.7152, 0.0722)); }
float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }

__NOISE__

// the stone's photograph at a world point, reflected at its box so beyond
// its edges the crystal continues itself — as a slab is book-matched
vec4 interior(vec2 w) {
  vec2 b = (w - uBox) / (2.0 * uBoxHalf) + 0.5;
  b = abs(fract(b * 0.5) * 2.0 - 1.0); // mirror repeat
  vec4 c = texture2D(uPhoto, b);
  float r = texture2D(uRidge, b).r;
  // outside the silhouette (the chipped corners): pale stone from outside, smoke from inside
  return vec4(mix(mix(vec3(0.72, 0.7, 0.66), vec3(0.3, 0.27, 0.25), uInside), c.rgb, c.a), r);
}

void main() {
  vec2 suv = (vWorld.xy - uSheet) / uSheetSize + 0.5;
  suv = vec2(abs(fract(suv.x * 0.5) * 2.0 - 1.0), abs(fract(suv.y * 0.5) * 2.0 - 1.0)); // mirror repeat
  vec3 slab = texture2D(uMarble, suv).rgb;
  float vein = texture2D(uLuma, suv).r;

  // inside, each facet refracts: the smoke behind it is read shifted along
  // the facet's tilt, so the planes bend what lies past them (parallax, not blur)
  vec3 nW = normalize(vNormalW);
  vec2 refr = nW.xy * 0.045 * uInside * (1.0 - uFlatten);
  // the flanks of the shell run along z: read the smoke across them, not along
  vec4 siFace = interior(vWorld.xy + refr);
  vec4 siFlank = interior(vec2(uBox.x + (vWorld.z - 1.5) * 1.2, vWorld.y) + refr);
  float facing = smoothstep(0.25, 0.6, abs(normalize(vNormalW).z));
  vec4 si = mix(siFlank, siFace, max(facing, 1.0 - uInside * (1.0 - uFlatten)));
  float sl = lum(si.rgb);
  float density = 1.0 - smoothstep(0.18, 0.62, sl);

  // 0: the crystal's own dark interior
  // inside, the shell is lit from behind by the room: bright where the stone is
  // clear; and at the scale the viewer now sees it, the smoke has wisps the
  // photograph could not carry
  float wisp = fbm(vWorld.xy * 6.0) * 0.5 + fbm(vWorld.xy * 19.0) * 0.5;
  vec3 deep = pow(si.rgb, vec3(1.6)) * 0.7;                 // the smoke, denser than the surface shows
  vec3 raw = mix(si.rgb * 0.62 + vec3(0.05, 0.045, 0.04), deep, uInside);
  raw *= mix(1.0, 0.55 + 0.75 * wisp, uInside * (1.0 - uFlatten));
  // →: the smoke as the wall's mineral: graphite where dense, blue-grey where clear
  vec3 graphite = vec3(0.19, 0.2, 0.215);
  vec3 blueBand = vec3(0.50, 0.56, 0.63);
  vec3 mineral = mix(blueBand, graphite, smoothstep(0.25, 0.9, density));
  vec3 veinPale = vec3(0.86, 0.82, 0.72);
  float s1 = smoothstep(0.0, 0.5, uBecome);
  vec3 albedo = mix(raw, mineral, s1);
  albedo = mix(albedo, veinPale, si.a * 0.45 * s1);

  // →: the slab, crossing from the stone along the veins; the stone's smoke
  // stays where it was, as the band the wall has there
  float dist = length((vWorld.xy - uBox) / vec2(1.0, 1.8)) + (0.5 - vein) * 0.9;
  float arrive = (1.0 - smoothstep(uSpread - 1.2, uSpread + 1.4, dist)) * smoothstep(0.3, 0.6, uBecome);
  float keep = 0.3 * smoothstep(0.55, 0.9, density) * (1.0 - smoothstep(0.0, 1.6, length((vWorld.xy - uBox) / uBoxHalf) - 1.0));
  vec3 marbled = mix(slab, mineral, keep);
  marbled = mix(marbled, veinPale, si.a * 0.25 * keep);
  albedo = mix(albedo, marbled, arrive);

  // the surface: the geometry's normal, then the slab's own relief
  vec2 px = vec2(1.0 / 1672.0, 1.0 / 1882.0);
  float hx = texture2D(uLuma, suv + vec2(px.x, 0.0)).r - texture2D(uLuma, suv - vec2(px.x, 0.0)).r;
  float hy = texture2D(uLuma, suv + vec2(0.0, px.y)).r - texture2D(uLuma, suv - vec2(0.0, px.y)).r;
  vec3 nRelief = normalize(vec3(-hx * 3.0, -hy * 3.0, 1.0));
  vec3 n = normalize(mix(normalize(vNormalW) * mix(1.0, -1.0, uInside * (1.0 - uFlatten)), nRelief, arrive * 0.9));
  vec3 L = normalize(uKey);
  vec3 V = vec3(0.0, 0.0, 1.0);
  vec3 H = normalize(L + V);
  float diff = mix(0.6, 0.74, arrive) + mix(0.4, 0.28, arrive) * clamp(dot(n, L), 0.0, 1.0);
  float sheen = pow(clamp(dot(n, H), 0.0, 1.0), mix(6.0, 18.0, arrive)) * mix(mix(0.16, 0.05, uInside * (1.0 - uFlatten)), 0.10, arrive);
  float grain = (hash(vWorld.xy * 900.0) - 0.5) * 0.02;
  vec3 col = albedo * diff + sheen * mix(vec3(0.9, 0.85, 0.75), vec3(1.0), arrive) + grain;

  // the smoke around the viewer, inside
  float dCam = length(cameraPosition - vWorld);
  float fog = 1.0 - exp(-pow(dCam * uFogDensity, 2.0));
  col = mix(col, uFogColor, fog);

  gl_FragColor = vec4(col, uOpacity);
  #include <colorspace_fragment>
}
